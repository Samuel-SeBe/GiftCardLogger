import "server-only";

// The three subscription tiers. Caps are per billing month (anchored to
// each subscriber's own billing cycle, not the calendar). Prices live in
// Stripe; the app displays whatever the price IDs below point to.
export type PlanId = "basic" | "pro" | "unlimited";

export const PLAN_IDS: PlanId[] = ["basic", "pro", "unlimited"];

export const PLANS: Record<
  PlanId,
  { name: string; uploadsPerMonth: number | null }
> = {
  basic: { name: "Basic", uploadsPerMonth: 50 },
  pro: { name: "Pro", uploadsPerMonth: 250 },
  unlimited: { name: "Unlimited", uploadsPerMonth: null },
};

const PRICE_ENV: Record<PlanId, string> = {
  basic: "STRIPE_PRICE_ID_BASIC",
  pro: "STRIPE_PRICE_ID_PRO",
  unlimited: "STRIPE_PRICE_ID_UNLIMITED",
};

export function isPlanId(value: unknown): value is PlanId {
  return value === "basic" || value === "pro" || value === "unlimited";
}

export function priceIdFor(plan: PlanId): string {
  const value = process.env[PRICE_ENV[plan]]?.trim();
  if (!value) {
    throw new Error(`${PRICE_ENV[plan]} is not set`);
  }
  return value;
}

export function planForPriceId(priceId: string): PlanId | null {
  for (const plan of PLAN_IDS) {
    if (process.env[PRICE_ENV[plan]]?.trim() === priceId) {
      return plan;
    }
  }
  return null;
}

export function plansConfigured(): boolean {
  return PLAN_IDS.every((plan) => process.env[PRICE_ENV[plan]]?.trim());
}
