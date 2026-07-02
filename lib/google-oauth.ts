// Shared Google OAuth settings used by the login and reconnect screens.
//
// `drive.file` grants access ONLY to files this app creates — it can never
// see the user's other Drive files.
export const GOOGLE_OAUTH_SCOPES = "https://www.googleapis.com/auth/drive.file";

// `access_type: offline` asks Google for a refresh token, which lets the
// app write to the spreadsheet without re-asking the user every hour.
// Google shows the consent screen on the user's first-ever sign-in (and
// returns the refresh token then); later sign-ins go straight through.
export const GOOGLE_OAUTH_QUERY_PARAMS = {
  access_type: "offline",
};

// Used by the reconnect screen only: forces the consent screen so Google
// issues a fresh refresh token after the stored one expired or was revoked.
export const GOOGLE_OAUTH_RECONSENT_QUERY_PARAMS = {
  access_type: "offline",
  prompt: "consent",
};
