import { getStripe, stripeConfigured } from "@/lib/stripe";
import SubscribeButton from "./subscribe-button";

// Always render fresh so a price change in Stripe shows up immediately.
export const dynamic = "force-dynamic";

// Shown when the free trial is used up. One plan, one button.
export default async function SubscribePage() {
  const configured = stripeConfigured();

  let priceLabel: string | null = null;
  if (configured) {
    try {
      const stripe = getStripe();
      const price = await stripe.prices.retrieve(
        process.env.STRIPE_PRICE_ID!.trim()
      );
      if (price.unit_amount) {
        const amount = (price.unit_amount / 100).toFixed(2);
        priceLabel = `$${amount} / ${price.recurring?.interval ?? "month"}`;
      }
    } catch (e) {
      console.error("Failed to load Stripe price:", e);
    }
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="text-2xl font-bold">Your free trial is complete</h1>
      <p className="max-w-xs text-sm opacity-70">
        You&apos;ve used your 3 free uploads. Subscribe for unlimited uploads
        and keep logging cards straight into your spreadsheet.
      </p>
      {configured ? (
        <>
          {priceLabel && (
            <p className="text-3xl font-bold">
              {priceLabel.split(" / ")[0]}
              <span className="text-base font-normal opacity-60">
                {" "}
                / {priceLabel.split(" / ")[1]}
              </span>
            </p>
          )}
          <SubscribeButton />
          <p className="max-w-xs text-xs opacity-50">
            Cancel anytime. Payments are handled securely by Stripe.
          </p>
        </>
      ) : (
        <p className="max-w-xs rounded-lg bg-amber-100 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          Subscriptions aren&apos;t available quite yet. Please check back
          soon.
        </p>
      )}
    </main>
  );
}
