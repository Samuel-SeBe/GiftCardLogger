import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createInventorySpreadsheet,
  ensureExpirationHeader,
  getGoogleAccessToken,
  GoogleReauthRequiredError,
  spreadsheetExists,
} from "@/lib/google";

export type ProvisioningResult =
  | {
      status: "ready";
      spreadsheetId: string;
      accessToken: string;
      // True when the spreadsheet was created just now (first visit, or
      // the user had deleted theirs) so the UI can announce it once.
      created: boolean;
    }
  | { status: "reauth" };

// Makes sure the signed-in user has their inventory spreadsheet: creates
// it on first visit and recreates it if the user deleted it from Drive.
// Returns "reauth" when the user's Google connection is missing or expired
// and they need to sign in with Google again.
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
  if (!user.google_refresh_token) {
    return { status: "reauth" };
  }

  let accessToken: string;
  try {
    accessToken = await getGoogleAccessToken(user.google_refresh_token);
  } catch (e) {
    if (e instanceof GoogleReauthRequiredError) {
      return { status: "reauth" };
    }
    throw e;
  }

  if (
    user.spreadsheet_id &&
    (await spreadsheetExists(accessToken, user.spreadsheet_id))
  ) {
    // Older sheets predate the Expiration column; patch the header in.
    try {
      await ensureExpirationHeader(accessToken, user.spreadsheet_id);
    } catch (e) {
      console.error("Header check failed (continuing):", e);
    }
    return {
      status: "ready",
      spreadsheetId: user.spreadsheet_id,
      accessToken,
      created: false,
    };
  }

  const spreadsheetId = await createInventorySpreadsheet(accessToken);

  // Only replace the exact value we read, so two simultaneous visits can't
  // both save their own new spreadsheet.
  let update = admin
    .from("users")
    .update({
      spreadsheet_id: spreadsheetId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
  update = user.spreadsheet_id
    ? update.eq("spreadsheet_id", user.spreadsheet_id)
    : update.is("spreadsheet_id", null);

  const { error: updateError } = await update;
  if (updateError) {
    throw new Error(`Failed to save spreadsheet ID: ${updateError.message}`);
  }
  return { status: "ready", spreadsheetId, accessToken, created: true };
}
