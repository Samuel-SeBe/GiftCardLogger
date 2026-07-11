import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe, stripeConfigured } from "@/lib/stripe";
import { PLAN_IDS, PLANS, isPlanId, priceIdFor, type PlanId } from "@/lib/plans";
import { SupportLink } from "@/components/ui";
import SubscribeButton from "./subscribe-button";
import UpgradeButton from "./upgrade-button";

// Always render fresh so a price change in Stripe shows up immediately.
export const dynamic = "force-dynamic";

// Plan picker. Shown when the free trial is used up, when a limited plan
// hits its monthly cap (?limit=hit), or via upgrade links.
export default async function SubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ limit?: string }>;
}) {
  const { limit } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("users")
    .select("subscription_status, plan")
    .eq("id", user.id)
    .single();
  const subscribed = row?.subscription_status === "active";
  const currentPlan: PlanId | null =
    subscribed && isPlanId(row?.plan) ? row.plan : null;

  const configured = stripeConfigured();
  const prices: Partial<Record<PlanId, string>> = {};
  if (configured) {
    try {
      const stripe = getStripe();
      await Promise.all(
        PLAN_IDS.map(async (plan) => {
          const price = await stripe.prices.retrieve(priceIdFor(plan));
          if (price.unit_amount) {
            prices[plan] = `$${(price.unit_amount / 100).toFixed(2)}`;
          }
        })
      );
    } catch (e) {
      console.error("Failed to load Stripe prices:", e);
    }
  }

  const hitPlanLimit = limit === "hit" && subscribed && currentPlan;

  return (
    <main className="flex flex-1 flex-col items-center gap-5 p-6 pt-[6vh] text-center">
      <h1 className="text-2xl font-bold">
        {hitPlanLimit
          ? `You've used this month's ${PLANS[currentPlan].name} snaps`
          : "Your free trial is complete"}
      </h1>
      <p className="max-w-xs text-sm opacity-70">
        {hitPlanLimit
          ? "Upgrade for a bigger monthly allowance — the change takes effect immediately and Stripe prorates the difference automatically."
          : "Pick a plan and keep logging cards straight into your spreadsheet."}
      </p>

      {!configured ? (
        <p className="max-w-xs rounded-lg bg-amber-100 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          Subscriptions aren&apos;t available quite yet. Please check back
          soon.
        </p>
      ) : (
        <div className="flex w-full max-w-xs flex-col gap-3">
          {PLAN_IDS.map((plan) => {
            const isCurrent = currentPlan === plan;
            const cap = PLANS[plan].uploadsPerMonth;
            return (
              <div
                key={plan}
                className={`flex flex-col gap-2 rounded-2xl border p-4 ${
                  plan === "pro"
                    ? "border-blue-500 ring-1 ring-blue-500"
                    : "border-black/15 dark:border-white/20"
                }`}
              >
                <div className="flex items-baseline justify-between">
                  <span className="font-bold">
                    {PLANS[plan].name}
                    {plan === "pro" && (
                      <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                        Popular
                      </span>
                    )}
                  </span>
                  <span className="text-lg font-bold">
                    {prices[plan] ?? "—"}
                    <span className="text-xs font-normal opacity-60">
                      /mo
                    </span>
                  </span>
                </div>
                <p className="text-left text-xs opacity-70">
                  {cap === null
                    ? "Unlimited snaps"
                    : `${cap} snaps per month`}
                </p>
                {isCurrent ? (
                  <p className="rounded-xl bg-black/5 py-2 text-xs font-medium opacity-70 dark:bg-white/10">
                    Your current plan
                  </p>
                ) : subscribed ? null : (
                  <SubscribeButton plan={plan} label={`Choose ${PLANS[plan].name}`} />
                )}
              </div>
            );
          })}

          {subscribed && (
            <>
              <UpgradeButton />
              <p className="text-xs text-slate-500">
                Plan changes happen in secure billing settings and prorate
                automatically.
              </p>
            </>
          )}
        </div>
      )}

      {configured && !subscribed && (
        <p className="max-w-xs text-xs text-slate-500">
          Cancel anytime. Payments are handled securely by Stripe.
        </p>
      )}

      <div className="mt-2 flex items-center gap-4">
        <Link href="/" className="text-sm font-medium text-slate-500 underline">
          ← Back
        </Link>
        <SupportLink />
      </div>
    </main>
  );
}
