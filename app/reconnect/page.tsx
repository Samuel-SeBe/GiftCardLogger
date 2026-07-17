"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  GOOGLE_OAUTH_QUERY_PARAMS,
  GOOGLE_OAUTH_SCOPES,
} from "@/lib/google-oauth";
import { SupportLink } from "@/components/ui";

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
        queryParams: GOOGLE_OAUTH_QUERY_PARAMS,
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
        screen — tap <b>Allow</b> to finish.
      </p>

      {/* Mock of Google's consent screen: a single permission you grant by
          tapping Allow (Google shows no checkbox for one scope). */}
      <div className="w-full max-w-xs rounded-xl border border-black/15 bg-white p-4 text-left shadow-sm dark:border-white/20 dark:bg-zinc-900">
        <p className="mb-3 text-xs font-medium opacity-60">
          On Google&apos;s screen, tap <b>Allow</b>:
        </p>
        <p className="rounded-lg bg-black/[0.03] p-3 text-xs leading-snug text-gray-800 dark:bg-white/5 dark:text-gray-200">
          See, edit, create and delete only the specific Google Drive files you
          use with this app
        </p>
        <div className="mt-3 flex justify-end">
          <span className="rounded-full px-5 py-2 text-sm font-semibold text-blue-700 ring-2 ring-blue-500 dark:text-blue-300">
            Allow
          </span>
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
      <SupportLink className="mt-2" />
    </main>
  );
}
