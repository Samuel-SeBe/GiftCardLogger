"use client";

import { useState } from "react";

export default function SubscribeButton() {
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");

  async function subscribe() {
    setState("loading");
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.url) {
        window.location.assign(data.url);
        return;
      }
      setState("error");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="flex w-full max-w-xs flex-col gap-3">
      {state === "error" && (
        <p className="rounded-lg bg-red-100 px-4 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          Couldn&apos;t start checkout. Please try again.
        </p>
      )}
      <button
        onClick={subscribe}
        disabled={state === "loading"}
        className="w-full rounded-2xl bg-blue-600 px-6 py-5 text-lg font-semibold text-white shadow-md transition active:scale-[0.98] disabled:opacity-60"
      >
        {state === "loading" ? "Opening checkout…" : "Subscribe"}
      </button>
    </div>
  );
}
