"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type State =
  | { name: "loading" }
  | { name: "ready"; url: string }
  | { name: "error" };

// The user's personal referral link: share it, and when a friend signs up
// and subscribes, the referrer's next month is free.
export default function ReferralPage() {
  const [state, setState] = useState<State>({ name: "loading" });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/referral")
      .then((res) => res.json())
      .then((data) =>
        setState(data?.url ? { name: "ready", url: data.url } : { name: "error" })
      )
      .catch(() => setState({ name: "error" }));
  }, []);

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Selection fallback: the input below is selectable.
    }
  }

  async function share(url: string) {
    try {
      await navigator.share({
        title: "Gift Card Snapper",
        text: "I use Gift Card Snapper to photograph gift cards straight into a Google Sheet. Try it:",
        url,
      });
    } catch {
      // User closed the share sheet — nothing to do.
    }
  }

  return (
    <main className="flex flex-1 flex-col items-center gap-5 p-6 pt-[8vh] text-center">
      <h1 className="text-2xl font-bold">Refer a friend</h1>
      <p className="max-w-xs text-sm opacity-70">
        Share your personal link. When a friend signs up <b>and subscribes</b>,
        you get <b>one month free</b> — credited automatically. Refer as many
        friends as you like.
      </p>

      {state.name === "loading" && (
        <div
          className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"
          aria-hidden="true"
        />
      )}

      {state.name === "error" && (
        <p className="rounded-lg bg-red-100 px-4 py-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          Couldn&apos;t load your link. Pull to refresh and try again.
        </p>
      )}

      {state.name === "ready" && (
        <div className="flex w-full max-w-xs flex-col gap-3">
          <input
            readOnly
            value={state.url}
            onFocus={(e) => e.target.select()}
            className="w-full rounded-xl border border-black/15 bg-black/5 px-3 py-3 text-center text-sm dark:border-white/20 dark:bg-white/10"
          />
          {typeof navigator !== "undefined" && "share" in navigator ? (
            <button
              onClick={() => share(state.url)}
              className="w-full rounded-2xl bg-blue-600 px-6 py-4 text-base font-semibold text-white shadow-md transition active:scale-[0.98]"
            >
              Share Link
            </button>
          ) : null}
          <button
            onClick={() => copy(state.url)}
            className="w-full rounded-2xl border border-black/15 px-6 py-3 text-base font-medium transition active:scale-[0.98] dark:border-white/20"
          >
            {copied ? "Copied ✓" : "Copy Link"}
          </button>
        </div>
      )}

      <Link href="/" className="mt-4 text-sm opacity-60 underline">
        Back
      </Link>
    </main>
  );
}
