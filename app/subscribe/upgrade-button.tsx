"use client";

import { useState } from "react";

// Existing subscribers change plans in Stripe's billing portal, which
// handles the proration math.
export default function UpgradeButton() {
  const [loading, setLoading] = useState(false);

  async function openPortal() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.url) {
        window.location.assign(data.url);
        return;
      }
      alert(data?.error ?? "Could not open billing settings.");
    } catch {
      alert("Could not open billing settings.");
    }
    setLoading(false);
  }

  return (
    <button
      onClick={openPortal}
      disabled={loading}
      className="w-full rounded-2xl bg-blue-600 px-6 py-4 text-base font-semibold text-white shadow-md transition active:scale-[0.98] disabled:opacity-60"
    >
      {loading ? "Opening…" : "Upgrade My Plan"}
    </button>
  );
}
