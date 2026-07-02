// Server-side helpers for talking to Google APIs on the user's behalf.

// Thrown when the stored refresh token is expired or revoked and the user
// must sign in with Google again.
export class GoogleReauthRequiredError extends Error {
  constructor() {
    super("Google access expired; the user must reconnect their account.");
  }
}

// Exchanges the long-lived refresh token for a short-lived access token.
export async function getGoogleAccessToken(
  refreshToken: string
): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    if (data.error === "invalid_grant") {
      throw new GoogleReauthRequiredError();
    }
    throw new Error(`Google token refresh failed: ${data.error ?? res.status}`);
  }
  return data.access_token;
}

// True when the spreadsheet still exists and is not in the Drive trash.
// Transient errors count as "exists" so we never create duplicates just
// because Google had a hiccup.
export async function spreadsheetExists(
  accessToken: string,
  spreadsheetId: string
): Promise<boolean> {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${spreadsheetId}?fields=trashed`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (res.status === 404) return false;
  if (!res.ok) return true;
  const data = await res.json();
  return !data.trashed;
}

export const SHEET_NAME = "Inventory";
const SPREADSHEET_TITLE = "Gift Card Inventory";
const HEADER_ROW = ["Date", "Vendor", "Card Number", "PIN", "Value"];

// Creates the user's inventory spreadsheet with its header row and returns
// the new spreadsheet's ID.
export async function createInventorySpreadsheet(
  accessToken: string
): Promise<string> {
  const res = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: { title: SPREADSHEET_TITLE },
      sheets: [
        {
          properties: { title: SHEET_NAME },
          data: [
            {
              startRow: 0,
              startColumn: 0,
              rowData: [
                {
                  values: HEADER_ROW.map((title) => ({
                    userEnteredValue: { stringValue: title },
                  })),
                },
              ],
            },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(
      `Failed to create spreadsheet: ${res.status} ${await res.text()}`
    );
  }
  const data = await res.json();
  return data.spreadsheetId;
}

// Appends one row to the bottom of the Inventory worksheet.
// valueInputOption=RAW stores values exactly as sent, so card numbers keep
// their leading zeros and dashes instead of being mangled into numbers.
export async function appendRow(
  accessToken: string,
  spreadsheetId: string,
  row: string[]
): Promise<void> {
  const range = encodeURIComponent(`${SHEET_NAME}!A:E`);
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ values: [row] }),
    }
  );
  if (!res.ok) {
    throw new Error(`Failed to append row: ${res.status} ${await res.text()}`);
  }
}
