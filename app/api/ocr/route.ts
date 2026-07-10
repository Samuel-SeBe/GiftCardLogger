import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { extractCardsFromImage } from "@/lib/gemini";
import { MAX_CARDS_PER_UPLOAD, TRIAL_UPLOAD_LIMIT } from "@/lib/access";
import { getAllowance, recordUpload } from "@/lib/usage";
import { syncSubscriptionFromStripe } from "@/lib/subscription-sync";

const ACCOUNT_COLUMNS =
  "trial_uploads_used, subscription_status, plan, current_period_start";

// Accepts one photo, runs OCR, and returns the extracted gift cards.
// The image lives only in memory for the duration of this request — it is
// never written to disk or stored anywhere.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  // Enforce trial and plan limits before doing any work.
  const admin = createAdminClient();
  const load = () =>
    admin.from("users").select(ACCOUNT_COLUMNS).eq("id", user.id).single();

  const first = await load();
  let row = first.data;
  if (first.error || !row) {
    return NextResponse.json(
      { error: "Could not load your account. Please try again." },
      { status: 500 }
    );
  }
  let allowance = await getAllowance({ id: user.id, ...row });

  // Reconcile-on-block: before turning anyone away, double-check against
  // Stripe directly. This guarantees a real paying customer is never
  // wrongly blocked by a stale local status (e.g. a missed webhook), and
  // costs a Stripe call only on the rare block path.
  if (!allowance.allowed) {
    try {
      await syncSubscriptionFromStripe(user.id);
      ({ data: row } = await load());
      if (row) {
        allowance = await getAllowance({ id: user.id, ...row });
      }
    } catch (e) {
      console.error("Reconcile-on-block failed:", e);
    }
  }
  if (!row || !allowance.allowed) {
    return NextResponse.json(
      { error: allowance.reason ?? "trial_expired" },
      { status: 402 }
    );
  }

  const form = await request.formData();
  const image = form.get("image");
  if (!(image instanceof File) || image.size === 0) {
    return NextResponse.json({ error: "No image received" }, { status: 400 });
  }
  if (image.size > 15 * 1024 * 1024) {
    // Specific code so the client can show downscaling guidance.
    return NextResponse.json({ error: "image_too_large" }, { status: 400 });
  }

  let cards;
  try {
    const bytes = Buffer.from(await image.arrayBuffer());
    cards = await extractCardsFromImage(bytes, image.type || "image/jpeg");
  } catch (e) {
    console.error("OCR failed:", e);
    return NextResponse.json(
      { error: "Could not read the image. Please try again." },
      { status: 502 }
    );
  }

  // Cap the batch; extras are dropped with a note so a huge photo never
  // fails the whole upload.
  const truncated = cards.length > MAX_CARDS_PER_UPLOAD;
  if (truncated) {
    cards = cards.slice(0, MAX_CARDS_PER_UPLOAD);
  }

  // Record the successful upload (all tiers — this is also the usage
  // dataset for pricing decisions).
  await recordUpload(user.id, cards.length);

  const onTrial =
    row.subscription_status !== "active" &&
    row.subscription_status !== "complimentary";
  if (onTrial) {
    await admin
      .from("users")
      .update({
        trial_uploads_used: row.trial_uploads_used + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);
  }

  // Tell the client where the counter now stands (null = unlimited).
  const usage = onTrial
    ? {
        used: Math.min(row.trial_uploads_used + 1, TRIAL_UPLOAD_LIMIT),
        limit: TRIAL_UPLOAD_LIMIT,
        kind: "trial" as const,
      }
    : allowance.usage
      ? {
          ...allowance.usage,
          used: Math.min(allowance.usage.used + 1, allowance.usage.limit),
        }
      : null;

  return NextResponse.json({ cards, usage, truncated });
}
