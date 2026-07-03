"use client";

import { useState } from "react";

export default function SubscribeButton({
  plan,
  label,
}: {
  plan: string;
  label: string;
}) {
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");

  async function subscribe() {
    setState("loading");
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
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
    <div className="flex flex-col gap-2">
      {state === "error" && (
        <p className="rounded-lg bg-red-100 px-3 py-2 text-xs text-red-800 dark:bg-red-950 dark:text-red-200">
          Couldn&apos;t start checkout. Please try again.
        </p>
      )}
      <button
        onClick={subscribe}
        disabled={state === "loading"}
        className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-md transition active:scale-[0.98] disabled:opacity-60"
      >
        {state === "loading" ? "Opening checkout…" : label}
      </button>
    </div>
  );
}
