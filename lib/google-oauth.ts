// Shared Google OAuth settings used by the login and reconnect screens.
//
// `drive.file` grants access ONLY to files this app creates — it can never
// see the user's other Drive files.
export const GOOGLE_OAUTH_SCOPES = "https://www.googleapis.com/auth/drive.file";

// Required for Google to issue a refresh token, which lets the app write
// to the spreadsheet without re-asking the user every hour.
export const GOOGLE_OAUTH_QUERY_PARAMS = {
  access_type: "offline",
  prompt: "consent",
};
