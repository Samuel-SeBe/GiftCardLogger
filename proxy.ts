import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";

// Runs before every request: keeps the Supabase session cookie fresh and
// redirects signed-out visitors to the login screen.
export default async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Referral links look like /?ref=CODE. Remember the code for 30 days so
  // it survives the Google sign-in round-trip.
  const ref = request.nextUrl.searchParams.get("ref");
  const stamp = (res: NextResponse) => {
    if (ref && /^[A-Z0-9]{4,16}$/i.test(ref)) {
      res.cookies.set("gcs_ref", ref.toUpperCase(), {
        maxAge: 60 * 60 * 24 * 30,
        path: "/",
        sameSite: "lax",
      });
    }
    return res;
  };

  const supabase = createServerClient(supabaseUrl(), supabaseAnonKey(), {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic =
    path === "/login" ||
    path === "/privacy" ||
    path === "/terms" ||
    path.startsWith("/auth");

  // API routes speak JSON and enforce auth themselves — a redirect to the
  // login page would only confuse their callers.
  if (path.startsWith("/api")) {
    return stamp(response);
  }

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return stamp(NextResponse.redirect(url));
  }

  if (user && path === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return stamp(NextResponse.redirect(url));
  }

  return stamp(response);
}

export const config = {
  // Run on every route except static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
