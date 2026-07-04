import "server-only";
import type Stripe from "stripe";
import { planForPriceId, type PlanId } from "@/lib/plans";

// Statuses that should keep the user's access ON. past_due is included so a
// failed auto-renewal doesn't instantly lock a paying customer out while
// Stripe retries the card (dunning) — they keep working through the grace
// period and only lose access if the subscription is ultimately canceled.
export const GRACE_ACTIVE_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
]);

// Reduces a Stripe subscription to the fields we store.
export function subscriptionToUpdate(sub: Stripe.Subscription): {
  active: boolean;
  plan: PlanId | null;
  periodStartIso: string | null;
} {
  const active = GRACE_ACTIVE_STATUSES.has(sub.status);
  const item = sub.items?.data?.[0];
  const plan = item?.price?.id ? planForPriceId(item.price.id) : null;
  // Newer Stripe API versions carry the period on the subscription item.
  const raw =
    (item as { current_period_start?: number } | undefined)
      ?.current_period_start ??
    (sub as unknown as { current_period_start?: number }).current_period_start;
  return {
    active,
    plan,
    periodStartIso: raw ? new Date(raw * 1000).toISOString() : null,
  };
}
