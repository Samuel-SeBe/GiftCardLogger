"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  GOOGLE_OAUTH_QUERY_PARAMS,
  GOOGLE_OAUTH_SCOPES,
} from "@/lib/google-oauth";

// Shown when the app's permission to access Google Sheets is missing or
// has expired. One tap re-runs the Google consent flow.
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
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="text-2xl font-bold">Reconnect Google</h1>
      <p className="max-w-xs text-sm opacity-70">
        The app&apos;s access to your Google Sheets has expired. Reconnect to
        keep saving gift cards to your spreadsheet.
      </p>
      <button
        onClick={reconnect}
        disabled={loading}
        className="w-full max-w-xs rounded-2xl bg-blue-600 px-6 py-4 text-base font-semibold text-white shadow-md transition active:scale-[0.98] disabled:opacity-60"
      >
        {loading ? "Redirecting…" : "Reconnect Google"}
      </button>
    </main>
  );
}
