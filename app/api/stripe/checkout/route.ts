import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe, stripeConfigured } from "@/lib/stripe";
import { isPlanId, priceIdFor } from "@/lib/plans";

// Starts a Stripe Checkout session for the chosen plan and returns its
// URL for the browser to redirect to.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  if (!stripeConfigured()) {
    return NextResponse.json(
      { error: "Billing is not configured" },
      { status: 503 }
    );
  }

  const body = await request.json().catch(() => null);
  const plan = body?.plan;
  if (!isPlanId(plan)) {
    return NextResponse.json({ error: "Unknown plan" }, { status: 400 });
  }

  const stripe = getStripe();
  const admin = createAdminClient();

  const { data: row, error } = await admin
    .from("users")
    .select("email, stripe_customer_id")
    .eq("id", user.id)
    .single();
  if (error || !row) {
    return NextResponse.json({ error: "Account not found" }, { status: 500 });
  }

  try {
    let customerId = row.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: row.email,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;
      await admin
        .from("users")
        .update({
          stripe_customer_id: customerId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);
    }

    const origin = new URL(request.url).origin;
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceIdFor(plan), quantity: 1 }],
      client_reference_id: user.id,
      subscription_data: { metadata: { user_id: user.id } },
      allow_promotion_codes: true,
      success_url: `${origin}/`,
      cancel_url: `${origin}/subscribe`,
    });

    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error("Checkout session failed:", e);
    return NextResponse.json(
      { error: "Could not start checkout" },
      { status: 502 }
    );
  }
}
