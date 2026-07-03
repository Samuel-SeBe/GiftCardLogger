import { NextResponse } from "next/server";
import { cookies } from "next/headers";
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

      // Referral attribution happens only at account creation, never on
      // later sign-ins, and never to oneself.
      const { data: existing } = await admin
        .from("users")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();
      if (!existing) {
        const cookieStore = await cookies();
        const refCode = cookieStore.get("gcs_ref")?.value;
        if (refCode) {
          const { data: referrer } = await admin
            .from("users")
            .select("id")
            .eq("referral_code", refCode)
            .maybeSingle();
          if (referrer && referrer.id !== user.id) {
            row.referred_by = referrer.id;
          }
        }
      }

      const { error: upsertError } = await admin.from("users").upsert(row);

      if (!upsertError) {
        const res = NextResponse.redirect(`${origin}/`);
        res.cookies.delete("gcs_ref");
        return res;
      }
      console.error("Failed to upsert user row:", upsertError.message);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
