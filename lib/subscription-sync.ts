import "server-only";
import { getStripe, stripeConfigured } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { GRACE_ACTIVE_STATUSES, subscriptionToUpdate } from "@/lib/subscription";
import { grantReferralReward } from "@/lib/referral";

// Reconciles a user's subscription state directly from Stripe. Runs when a
// user returns from Stripe checkout or the billing portal, so activation
// never depends solely on the webhook arriving (a webhook can be delayed,
// redirected, or misconfigured). Idempotent and safe to call repeatedly.
export async function syncSubscriptionFromStripe(userId: string): Promise<void> {
  if (!stripeConfigured()) return;

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("users")
    .select("stripe_customer_id, subscription_status")
    .eq("id", userId)
    .single();

  // No Stripe customer yet, or a hand-granted free pass we must never touch.
  if (!row?.stripe_customer_id || row.subscription_status === "complimentary") {
    return;
  }

  const stripe = getStripe();
  const subs = await stripe.subscriptions.list({
    customer: row.stripe_customer_id,
    status: "all",
    limit: 10,
  });

  // Prefer a currently-active (incl. grace) subscription; otherwise the most
  // recent one, to reflect a cancellation.
  const sub =
    subs.data.find((s) => GRACE_ACTIVE_STATUSES.has(s.status)) ?? subs.data[0];
  if (!sub) return;

  const { active, plan, periodStartIso } = subscriptionToUpdate(sub);
  const update: Record<string, unknown> = {
    subscription_status: active ? "active" : "canceled",
    stripe_customer_id: row.stripe_customer_id,
    updated_at: new Date().toISOString(),
  };
  if (plan) update.plan = plan;
  if (periodStartIso) update.current_period_start = periodStartIso;

  await admin
    .from("users")
    .update(update)
    .eq("id", userId)
    .neq("subscription_status", "complimentary");

  // First payment may have earned a referrer a reward; guarded so it can't
  // double-grant even if the webhook also fired.
  if (active) {
    try {
      await grantReferralReward(stripe, userId);
    } catch (e) {
      console.error("Referral reward during sync failed:", e);
    }
  }
}
