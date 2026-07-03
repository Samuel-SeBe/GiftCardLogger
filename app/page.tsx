import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureSpreadsheet } from "@/lib/provisioning";
import { TRIAL_UPLOAD_LIMIT } from "@/lib/access";
import HomeFlow from "./home-flow";
import { BetaBadge, Logo } from "@/components/logo";

// Home screen: exactly one primary action (Take Photo) and one secondary
// action (Choose Existing Photo). Nothing else, per the spec.
export default async function HomePage() {
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

  // Trial users see how many free uploads they've used; subscribers and
  // free-pass users see nothing.
  let trial: { used: number; limit: number } | null = null;
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("users")
    .select("trial_uploads_used, subscription_status")
    .eq("id", user.id)
    .single();
  if (
    row &&
    row.subscription_status !== "active" &&
    row.subscription_status !== "complimentary"
  ) {
    trial = {
      used: Math.min(row.trial_uploads_used, TRIAL_UPLOAD_LIMIT),
      limit: TRIAL_UPLOAD_LIMIT,
    };
  }
  const subscribed = row?.subscription_status === "active";

  return (
    <>
      <header className="flex items-center justify-center gap-2 p-4">
        <Logo size={26} />
        <span className="text-sm font-bold">Gift Card Snapper</span>
        <BetaBadge />
      </header>
      <main className="flex flex-1 flex-col items-center gap-4 p-6 pt-[8vh]">
        <HomeFlow
          sheetUrl={sheetUrl}
          sheetJustCreated={sheetJustCreated}
          initialTrial={trial}
          subscribed={subscribed}
        />
      </main>
    </>
  );
}
