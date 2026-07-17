// Shared Google OAuth settings used by the login and reconnect screens.
//
// `drive.file` grants access ONLY to files this app creates — it can never
// see the user's other Drive files.
export const GOOGLE_OAUTH_SCOPES = "https://www.googleapis.com/auth/drive.file";

// `access_type: offline` asks Google for a refresh token, which lets the
// app write to the spreadsheet without re-asking the user every hour.
// `prompt: consent` forces the consent screen on every sign-in — and that
// is what makes Google actually return the refresh token. Without it,
// returning users are signed in silently with no token, so provisioning
// fails and they get bounced to /reconnect for a second sign-in. Real users
// rarely see the consent screen because they stay signed in via their
// Supabase session; the login page only shows when they're signed out.
export const GOOGLE_OAUTH_QUERY_PARAMS = {
  access_type: "offline",
  prompt: "consent",
};
