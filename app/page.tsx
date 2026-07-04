import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureSpreadsheet } from "@/lib/provisioning";
import { getAllowance } from "@/lib/usage";
import { syncSubscriptionFromStripe } from "@/lib/subscription-sync";
import { PLANS, isPlanId } from "@/lib/plans";
import HomeFlow from "./home-flow";
import { Logo } from "@/components/logo";

// Home screen: exactly one primary action (Take Photo) and one secondary
// action (Choose Existing Photo). Nothing else, per the spec.
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ subscribed?: string; billing?: string }>;
}) {
  const { subscribed: subParam, billing: billingParam } = await searchParams;
  const returnedFromBilling = subParam === "1" || billingParam === "1";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // First visit: create the user's "Gift Card Inventory" spreadsheet.
  let needsReauth = false;
  let sheetUrl: string | null = null;
  let sheetJustCreated = false;
  try {
    const provisioning = await ensureSpreadsheet(user.id);
    if (provisioning.status === "reauth") {
      needsReauth = true;
    } else {
      sheetUrl = `https://docs.google.com/spreadsheets/d/${provisioning.spreadsheetId}`;
      sheetJustCreated = provisioning.created;
    }
  } catch (e) {
    // Don't block the home screen on a hiccup; provisioning is retried on
    // the next visit and before any save.
    console.error("Spreadsheet provisioning failed:", e);
  }
  if (needsReauth) {
    redirect("/reconnect");
  }

  const admin = createAdminClient();
  const columns =
    "trial_uploads_used, subscription_status, plan, current_period_start, payment_past_due";

  // If we just came back from Stripe checkout / billing portal, reconcile
  // the subscription straight from Stripe rather than waiting on the
  // webhook — so activation is correct even if the webhook is delayed,
  // redirected, or misconfigured.
  if (returnedFromBilling) {
    try {
      await syncSubscriptionFromStripe(user.id);
    } catch (e) {
      console.error("Subscription sync failed:", e);
    }
  }

  const { data: row } = await admin
    .from("users")
    .select(columns)
    .eq("id", user.id)
    .single();

  // Usage counter: trial progress for trial users, this-billing-month
  // progress for limited plans, nothing for unlimited/free-pass users.
  let usage = null;
  if (row) {
    try {
      usage = (await getAllowance({ id: user.id, ...row })).usage;
    } catch (e) {
      console.error("Usage check failed (continuing):", e);
    }
  }

  const subscribed = row?.subscription_status === "active";
  const planName =
    subscribed && isPlanId(row?.plan) ? PLANS[row.plan].name : null;
  const paymentPastDue = subscribed && row?.payment_past_due === true;

  return (
    <>
      <header className="flex items-center justify-center gap-2.5 p-4">
        <Logo size={40} />
        <span className="text-lg font-bold">Gift Card Snapper</span>
        {planName && (
          <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            {planName}
          </span>
        )}
      </header>
      <main className="flex flex-1 flex-col items-center gap-4 p-6 pt-[6vh]">
        <HomeFlow
          sheetUrl={sheetUrl}
          sheetJustCreated={sheetJustCreated}
          initialUsage={usage}
          subscribed={subscribed}
          justSubscribed={returnedFromBilling && subscribed}
          planName={planName}
          paymentPastDue={paymentPastDue}
        />
      </main>
    </>
  );
}
