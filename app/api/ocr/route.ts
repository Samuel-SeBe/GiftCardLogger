import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { extractCardsFromImage } from "@/lib/gemini";
import { canUpload } from "@/lib/access";

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

  // Enforce the free-trial limit before doing any work.
  const admin = createAdminClient();
  const { data: row, error: rowError } = await admin
    .from("users")
    .select("trial_uploads_used, subscription_status")
    .eq("id", user.id)
    .single();
  if (rowError || !row) {
    return NextResponse.json(
      { error: "Could not load your account. Please try again." },
      { status: 500 }
    );
  }
  if (!canUpload(row)) {
    return NextResponse.json({ error: "trial_expired" }, { status: 402 });
  }

  const form = await request.formData();
  const image = form.get("image");
  if (!(image instanceof File) || image.size === 0) {
    return NextResponse.json({ error: "No image received" }, { status: 400 });
  }
  if (image.size > 15 * 1024 * 1024) {
    return NextResponse.json({ error: "Image is too large" }, { status: 400 });
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

  // Count the successful upload against the free trial.
  await admin
    .from("users")
    .update({
      trial_uploads_used: row.trial_uploads_used + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  return NextResponse.json({ cards });
}
