"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SupportLink } from "@/components/ui";

type Referral = { name: string; joined: string; subscribed: boolean };

type State =
  | { name: "loading" }
  | {
      name: "ready";
      url: string;
      monthsEarned: number;
      referrals: Referral[];
    }
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
        setState(
          data?.url
            ? {
                name: "ready",
                url: data.url,
                monthsEarned: data.monthsEarned ?? 0,
                referrals: data.referrals ?? [],
              }
            : { name: "error" }
        )
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
      <p className="max-w-xs text-sm text-slate-600">
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

          <div className="mt-4 rounded-2xl border border-black/10 p-4 text-left dark:border-white/15">
            <p className="text-sm">
              <span className="text-2xl font-bold">{state.monthsEarned}</span>{" "}
              <span className="opacity-70">
                free {state.monthsEarned === 1 ? "month" : "months"} earned
              </span>
            </p>
            {state.referrals.length === 0 ? (
              <p className="mt-2 text-xs opacity-60">
                No sign-ups yet — share your link to get started.
              </p>
            ) : (
              <ul className="mt-3 flex flex-col gap-2">
                {state.referrals.map((r, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between gap-2 border-t border-black/5 pt-2 text-xs dark:border-white/10"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        {r.name}
                      </span>
                      <span className="opacity-60">
                        joined{" "}
                        {new Date(r.joined).toLocaleDateString("en-US", {
                          month: "2-digit",
                          day: "2-digit",
                          year: "numeric",
                        })}
                      </span>
                    </span>
                    {r.subscribed ? (
                      <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 font-semibold text-green-800 dark:bg-green-950 dark:text-green-300">
                        Subscribed ✓
                      </span>
                    ) : (
                      <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        Still on trial
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <div className="mt-4 flex items-center gap-4">
        <Link href="/" className="text-xs font-medium text-slate-500 underline">
          ← Back
        </Link>
        <SupportLink />
      </div>
    </main>
  );
}
