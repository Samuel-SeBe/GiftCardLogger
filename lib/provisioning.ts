import { createAdminClient } from "@/lib/supabase/admin";
import {
  createInventorySpreadsheet,
  getGoogleAccessToken,
  GoogleReauthRequiredError,
} from "@/lib/google";

export type ProvisioningResult = "ready" | "reauth";

// Makes sure the signed-in user has their inventory spreadsheet, creating
// it on first visit. Returns "reauth" when the user's Google connection is
// missing or expired and they need to sign in with Google again.
export async function ensureSpreadsheet(
  userId: string
): Promise<ProvisioningResult> {
  const admin = createAdminClient();

  const { data: user, error } = await admin
    .from("users")
    .select("spreadsheet_id, google_refresh_token")
    .eq("id", userId)
    .single();

  if (error) {
    throw new Error(`Failed to load user row: ${error.message}`);
  }
  if (user.spreadsheet_id) {
    return "ready";
  }
  if (!user.google_refresh_token) {
    return "reauth";
  }

  let accessToken: string;
  try {
    accessToken = await getGoogleAccessToken(user.google_refresh_token);
  } catch (e) {
    if (e instanceof GoogleReauthRequiredError) {
      return "reauth";
    }
    throw e;
  }

  const spreadsheetId = await createInventorySpreadsheet(accessToken);

  // `.is(null)` guards against two simultaneous first visits both saving:
  // only the first write wins.
  const { error: updateError } = await admin
    .from("users")
    .update({ spreadsheet_id: spreadsheetId, updated_at: new Date().toISOString() })
    .eq("id", userId)
    .is("spreadsheet_id", null);

  if (updateError) {
    throw new Error(`Failed to save spreadsheet ID: ${updateError.message}`);
  }
  return "ready";
}
