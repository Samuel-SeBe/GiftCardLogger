"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  GOOGLE_OAUTH_RECONSENT_QUERY_PARAMS,
  GOOGLE_OAUTH_SCOPES,
} from "@/lib/google-oauth";

// Shown when the app can't access Google Sheets — either the permission
// was never granted (the easy-to-miss checkbox on Google's consent
// screen) or it expired. One tap re-runs the consent flow, with a visual
// of exactly what to check.
export default function ReconnectPage() {
  const [loading, setLoading] = useState(false);

  async function reconnect() {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: GOOGLE_OAUTH_SCOPES,
        queryParams: GOOGLE_OAUTH_RECONSENT_QUERY_PARAMS,
      },
    });
    if (error) setLoading(false);
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-5 p-6 text-center">
      <h1 className="text-2xl font-bold">One more permission needed</h1>
      <p className="max-w-xs text-sm opacity-70">
        Gift Card Snapper can&apos;t reach Google Sheets yet, so it can&apos;t
        create your inventory spreadsheet. Google will show a permission
        screen — make sure the box below is <b>checked</b> before tapping{" "}
        <b>Continue</b>.
      </p>

      {/* Mock of the row on Google's consent screen that must be checked. */}
      <div className="w-full max-w-xs rounded-xl border border-black/15 bg-white p-4 text-left shadow-sm dark:border-white/20 dark:bg-zinc-900">
        <p className="mb-3 text-xs font-medium opacity-60">
          On Google&apos;s screen, check this box:
        </p>
        <div className="flex items-start gap-3 rounded-lg bg-blue-50 p-3 ring-2 ring-blue-500 dark:bg-blue-950">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            className="mt-0.5 shrink-0"
            aria-hidden="true"
          >
            <rect width="24" height="24" rx="4" fill="#1a73e8" />
            <path
              d="M6 12.5 L10 16.5 L18 8"
              stroke="#fff"
              strokeWidth="2.5"
              fill="none"
            />
          </svg>
          <p className="text-xs leading-snug text-gray-800 dark:text-gray-200">
            See, edit, create and delete only the specific Google Drive files
            you use with this app
          </p>
        </div>
        <p className="mt-2 text-[11px] opacity-50">
          This only lets the app touch the spreadsheet it creates — nothing
          else in your Drive.
        </p>
      </div>

      <button
        onClick={reconnect}
        disabled={loading}
        className="w-full max-w-xs rounded-2xl bg-blue-600 px-6 py-4 text-base font-semibold text-white shadow-md transition active:scale-[0.98] disabled:opacity-60"
      >
        {loading ? "Redirecting…" : "Try Again with Google"}
      </button>
    </main>
  );
}
