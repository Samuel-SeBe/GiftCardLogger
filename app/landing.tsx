import Link from "next/link";
import { unstable_cache } from "next/cache";
import { Logo } from "@/components/logo";
import { SupportLink } from "@/components/ui";
import { getStripe, stripeConfigured } from "@/lib/stripe";
import { priceIdFor, type PlanId } from "@/lib/plans";
import DemoModal from "./demo-modal";

// Public marketing page shown to signed-out visitors at the root.
// Mobile-first; scales up with a centered max-width column.

const SAMPLE = [
  { vendor: "Best Buy", num: "6050 1234 5678", val: "25" },
  { vendor: "Visa", num: "4941 6017 9480 4285", val: "50" },
  { vendor: "Amazon", num: "Q4X7-KPLMN9", val: "50" },
  { vendor: "Home Depot", num: "9876 5432 1098", val: "100" },
];

const BENEFITS = [
  {
    icon: "📸",
    title: "Snap 1–10 at once",
    body: "One photo captures a whole stack — no typing card numbers one by one, no barcode scanning.",
  },
  {
    icon: "🤖",
    title: "AI detects every card",
    body: "Card type, number, PIN, value, and expiration — read automatically in seconds.",
  },
  {
    icon: "📊",
    title: "Straight to your Sheet",
    body: "Rows land in a Google Sheet in your own Drive. We never store your card data.",
  },
];

const STEPS = [
  { n: "1", title: "Snap", body: "Photograph your gift cards on any surface." },
  { n: "2", title: "Review", body: "Check the details — every field is editable." },
  { n: "3", title: "Save", body: "Tap once; every row appears in your Sheet." },
];

// Free trial first, then the paid tiers. Tiers with a `plan` get their
// price from Stripe; the free trial shows a "Start free trial" CTA instead.
const TIERS: {
  plan?: PlanId;
  name: string;
  detail: string;
}[] = [
  { name: "Free Trial", detail: "5 snaps to start" },
  { plan: "basic", name: "Basic", detail: "50 snaps / month" },
  { plan: "pro", name: "Pro", detail: "250 snaps / month" },
  { plan: "unlimited", name: "Unlimited", detail: "Unlimited snaps" },
];

// Look up each tier's live price from Stripe so the landing page always
// shows what subscribers actually pay. Cached for an hour so the public
// homepage doesn't call Stripe on every visit; prices change rarely.
// Falls back to no price on any error.
const loadPrices = unstable_cache(
  async (): Promise<Partial<Record<PlanId, string>>> => {
    const prices: Partial<Record<PlanId, string>> = {};
    if (!stripeConfigured()) return prices;
    try {
      const stripe = getStripe();
      const paidPlans = TIERS.map((t) => t.plan).filter(
        (p): p is PlanId => Boolean(p)
      );
      await Promise.all(
        paidPlans.map(async (plan) => {
          const price = await stripe.prices.retrieve(priceIdFor(plan));
          if (price.unit_amount) {
            prices[plan] = `$${(price.unit_amount / 100).toFixed(2)}`;
          }
        })
      );
    } catch (e) {
      console.error("Failed to load Stripe prices on landing:", e);
    }
    return prices;
  },
  ["landing-stripe-prices"],
  { revalidate: 3600, tags: ["stripe-prices"] }
);

export default async function Landing() {
  const prices = await loadPrices();
  return (
    <div className="flex flex-1 flex-col bg-white text-slate-900">
      {/* Header */}
      <header className="mx-auto flex w-full max-w-md items-center justify-between px-5 py-3.5">
        <div className="flex items-center gap-2">
          <Logo size={30} />
          <span className="text-base font-extrabold">Gift Card Snapper</span>
        </div>
        <Link href="/login" className="text-sm font-bold text-blue-600">
          Sign in
        </Link>
      </header>

      {/* Hero */}
      <section className="mx-auto w-full max-w-md px-5 pb-8 pt-4 text-center">
        <span className="mb-4 inline-block rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-600">
          Built for gift card resellers
        </span>
        <h1 className="text-[27px] font-extrabold leading-tight tracking-tight">
          No more one-at-a-time manual entry or barcode scanning.
        </h1>
        <p className="mx-auto mt-4 max-w-sm text-[15px] leading-relaxed text-slate-600">
          Snap one picture with 1–10 cards in it. AI detects each card type and
          its details, then adds every row to your Google Sheet all at once.
          Works for Visa, Mastercard, and virtually any store gift card.
        </p>
        <div className="mt-6 flex flex-col items-center gap-2.5">
          <CtaButton />
          <DemoModal label="Watch 30s demo ▸" />
        </div>
        <TrustLine />

        {/* Phone screenshot */}
        <div className="mt-7">
          <PhoneMock />
        </div>
        <div className="mt-[-18px] flex justify-center">
          <div className="relative z-10 inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-[0_8px_22px_rgba(2,6,23,0.15)]">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-green-600 text-xs font-extrabold text-white">
              ✓
            </span>
            <span className="text-left">
              <span className="block text-[11px] font-extrabold">
                Saved to Google Sheets
              </span>
              <span className="block text-[10px] font-semibold text-green-600">
                4 rows added
              </span>
            </span>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="bg-slate-50 px-5 py-7">
        <div className="mx-auto w-full max-w-md">
          <p className="mb-4 text-center text-xs font-bold tracking-widest text-blue-600">
            WHY RESELLERS LOVE IT
          </p>
          <div className="flex flex-col gap-3.5">
            {BENEFITS.map((b) => (
              <div
                key={b.title}
                className="rounded-2xl border border-slate-100 bg-white p-5"
              >
                <div className="text-3xl">{b.icon}</div>
                <div className="mb-1.5 mt-2 text-lg font-extrabold">
                  {b.title}
                </div>
                <div className="text-sm leading-relaxed text-slate-600">
                  {b.body}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-5 py-8">
        <div className="mx-auto w-full max-w-md">
          <h2 className="mb-5 text-center text-2xl font-extrabold tracking-tight">
            Three taps, done
          </h2>
          <div className="flex flex-col gap-4">
            {STEPS.map((s) => (
              <div key={s.n} className="flex items-start gap-3.5">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-base font-extrabold text-white">
                  {s.n}
                </div>
                <div>
                  <div className="text-[17px] font-extrabold">{s.title}</div>
                  <div className="mt-0.5 text-sm leading-relaxed text-slate-600">
                    {s.body}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-slate-50 px-5 py-8">
        <div className="mx-auto w-full max-w-md">
          <h2 className="text-center text-2xl font-extrabold tracking-tight">
            Simple pricing
          </h2>
          <p className="mb-5 mt-1.5 text-center text-sm text-slate-600">
            Start with a free trial. Upgrade whenever you&apos;re ready.
          </p>
          <div className="flex flex-col gap-2.5">
            {TIERS.map((t) => (
              <div
                key={t.name}
                className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4"
              >
                <div className="text-left">
                  <div className="text-base font-extrabold">{t.name}</div>
                  {!t.plan && (
                    <div className="text-base font-extrabold">
                      No credit card required
                    </div>
                  )}
                  <div className="mt-0.5 text-sm font-semibold text-slate-500">
                    {t.detail}
                  </div>
                  <div className="mt-1 text-xs font-bold text-blue-600">
                    Up to 10 cards per snap
                  </div>
                </div>
                {t.plan ? (
                  prices[t.plan] && (
                    <span className="whitespace-nowrap text-lg font-extrabold">
                      {prices[t.plan]}
                      <span className="text-xs font-semibold text-slate-500">
                        /mo
                      </span>
                    </span>
                  )
                ) : (
                  <Link
                    href="/login"
                    className="whitespace-nowrap rounded-xl bg-blue-600 px-4 py-2.5 text-center text-sm font-extrabold text-white"
                  >
                    Start free trial
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="bg-gradient-to-br from-blue-700 to-blue-600 px-5 py-9 text-center text-white">
        <div className="mx-auto w-full max-w-md">
          <h2 className="text-2xl font-extrabold tracking-tight">
            Clear your backlog today
          </h2>
          <p className="mb-5 mt-2.5 text-[15px] opacity-90">
            Log your first cards free in under a minute.
          </p>
          <Link
            href="/login"
            className="block rounded-xl bg-white py-4 text-base font-extrabold text-blue-600"
          >
            Start free trial
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-100 px-5 py-5 text-center text-xs font-semibold text-slate-500">
        <div className="mx-auto flex w-full max-w-md flex-col items-center gap-2">
          <span>Gift Card Snapper</span>
          <span className="flex flex-wrap items-center justify-center gap-x-2">
            <Link href="/privacy" className="underline">
              Privacy
            </Link>
            <span aria-hidden="true">·</span>
            <Link href="/terms" className="underline">
              Terms
            </Link>
            <span aria-hidden="true">·</span>
            <SupportLink />
          </span>
        </div>
      </footer>
    </div>
  );
}

function CtaButton() {
  return (
    <Link
      href="/login"
      className="rounded-2xl bg-blue-600 px-6 py-4 text-base font-bold text-white shadow-[0_10px_22px_rgba(37,99,235,0.32)] transition active:scale-[0.99]"
    >
      Start free trial
    </Link>
  );
}

function TrustLine() {
  return (
    <p className="mt-4 text-[13px] font-semibold text-slate-500">
      ✓ Free trial&nbsp;&nbsp; ✓ No credit card&nbsp;&nbsp; ✓ Cancel anytime
    </p>
  );
}

function PhoneMock() {
  return (
    <div className="mx-auto w-[220px] rounded-[34px] bg-[#0b1220] p-2.5 shadow-[0_22px_44px_rgba(2,6,23,0.3)]">
      <div className="flex h-[430px] flex-col overflow-hidden rounded-[26px] bg-white">
        <div className="flex items-center gap-1.5 border-b border-slate-100 px-3 py-2.5">
          <Logo size={18} />
          <span className="text-[11px] font-extrabold">Gift Card Snapper</span>
        </div>
        <div className="flex flex-1 flex-col gap-1.5 p-2.5">
          <div className="text-[13px] font-extrabold">4 gift cards found</div>
          {SAMPLE.map((c) => (
            <div
              key={c.vendor}
              className="flex items-center justify-between rounded-[10px] border border-slate-200 px-2.5 py-1.5"
            >
              <div className="text-left">
                <div className="text-[11px] font-bold">{c.vendor}</div>
                <div className="font-mono text-[8.5px] font-semibold text-slate-500">
                  {c.num}
                </div>
              </div>
              <div className="rounded-md border border-slate-300 bg-slate-50 px-1.5 py-1 font-mono text-[10px] font-extrabold">
                ${c.val}
              </div>
            </div>
          ))}
          <div className="mt-auto rounded-xl bg-blue-600 py-2.5 text-center text-[12px] font-bold text-white">
            Approve &amp; Save
          </div>
        </div>
      </div>
    </div>
  );
}
