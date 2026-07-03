import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureSpreadsheet } from "@/lib/provisioning";
import HomeFlow from "./home-flow";

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

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
      <HomeFlow sheetUrl={sheetUrl} sheetJustCreated={sheetJustCreated} />
    </main>
  );
}
