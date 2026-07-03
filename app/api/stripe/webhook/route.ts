import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { grantReferralReward } from "@/lib/referral";
import { planForPriceId } from "@/lib/plans";

// Stripe calls this endpoint (configured in the Stripe dashboard) whenever
// a subscription changes. It is the single source of truth for whether a
// user's subscription_status is "active".
export async function POST(request: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secretKey || !webhookSecret) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const stripe = new Stripe(secretKey);
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      await request.text(),
      signature,
      webhookSecret
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const admin = createAdminClient();

  switch (event.type) {
    // Payment completed: unlock immediately.
    case "checkout.session.completed": {
      const session = event.data.object;
      const userId = session.client_reference_id;
      if (userId && session.mode === "subscription") {
        await admin
          .from("users")
          .update({
            subscription_status: "active",
            stripe_customer_id: (session.customer as string) ?? null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);

        // First successful payment: reward this user's referrer, if any.
        try {
          await grantReferralReward(stripe, userId);
        } catch (e) {
          console.error("Referral reward failed:", e);
        }
      }
      break;
    }

    // Plan choices, upgrades/downgrades, renewals, cancellations.
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      const userId = subscription.metadata?.user_id;
      if (userId) {
        const active =
          event.type !== "customer.subscription.deleted" &&
          (subscription.status === "active" ||
            subscription.status === "trialing");

        const update: Record<string, unknown> = {
          subscription_status: active ? "active" : "canceled",
          stripe_customer_id: subscription.customer as string,
          updated_at: new Date().toISOString(),
        };

        // Which tier, and when its current billing period started (the
        // anchor for monthly upload metering). Newer Stripe API versions
        // carry the period on the subscription item.
        const item = subscription.items?.data?.[0];
        const plan = item?.price?.id ? planForPriceId(item.price.id) : null;
        if (plan) {
          update.plan = plan;
        }
        const periodStart =
          (item as { current_period_start?: number } | undefined)
            ?.current_period_start ??
          (subscription as unknown as { current_period_start?: number })
            .current_period_start;
        if (periodStart) {
          update.current_period_start = new Date(
            periodStart * 1000
          ).toISOString();
        }

        await admin
          .from("users")
          .update(update)
          .eq("id", userId)
          // A hand-granted free pass always survives subscription churn.
          .neq("subscription_status", "complimentary");
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
