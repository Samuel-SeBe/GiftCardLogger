import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe, stripeConfigured } from "@/lib/stripe";

// Opens Stripe's hosted Customer Portal, where subscribers can cancel,
// change their card, or view invoices. Stripe hosts and secures it all.
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

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("users")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();
  if (!row?.stripe_customer_id) {
    return NextResponse.json(
      { error: "No subscription found" },
      { status: 400 }
    );
  }

  try {
    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: row.stripe_customer_id,
      return_url: new URL(request.url).origin,
    });
    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error("Billing portal failed:", e);
    return NextResponse.json(
      { error: "Could not open billing settings" },
      { status: 502 }
    );
  }
}
