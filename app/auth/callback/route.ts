import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Google redirects here after the user signs in. We exchange the one-time
// code for a session, make sure a users row exists, and store the Google
// refresh token needed for Sheets access.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.session) {
      const user = data.session.user;

      const row: Record<string, unknown> = {
        id: user.id,
        email: user.email,
        display_name: user.user_metadata?.full_name ?? null,
        updated_at: new Date().toISOString(),
      };

      // Google only returns a refresh token on a full consent flow; keep
      // the previously stored one when it's absent.
      if (data.session.provider_refresh_token) {
        row.google_refresh_token = data.session.provider_refresh_token;
      }

      const admin = createAdminClient();
      const { error: upsertError } = await admin.from("users").upsert(row);

      if (!upsertError) {
        return NextResponse.redirect(`${origin}/`);
      }
      console.error("Failed to upsert user row:", upsertError.message);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
