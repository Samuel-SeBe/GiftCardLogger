"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { PrimaryButton, SecondaryButton, SupportLink } from "@/components/ui";

// fetch with an abort timeout so a stalled network can't hang the UI.
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  ms: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

type Card = {
  vendor: string;
  card_number: string;
  pin: string;
  value: string;
  expiration: string;
};

type Phase =
  | { name: "home" }
  | { name: "processing" }
  | { name: "review"; cards: Card[]; attempted?: boolean }
  | { name: "saving"; cards: Card[] }
  | { name: "success"; count: number }
  | { name: "savefail"; cards: Card[]; failed: boolean[] }
  | { name: "error"; message: string };

// The entire primary workflow lives here:
// Take Photo -> Processing -> Review -> Save -> Success (repeat)
type Usage = { used: number; limit: number; kind: "trial" | "plan" } | null;

export default function HomeFlow({
  sheetUrl,
  sheetJustCreated,
  initialUsage,
  subscribed = false,
  complimentary = false,
  justSubscribed = false,
  planName = null,
  paymentPastDue = false,
  initialPhase,
}: {
  sheetUrl: string | null;
  sheetJustCreated: boolean;
  initialUsage: Usage;
  subscribed?: boolean;
  complimentary?: boolean;
  justSubscribed?: boolean;
  planName?: string | null;
  paymentPastDue?: boolean;
  initialPhase?: Phase;
}) {
  const [phase, setPhase] = useState<Phase>(initialPhase ?? { name: "home" });
  const [usage, setUsage] = useState<Usage>(initialUsage);
  const [showSubBanner, setShowSubBanner] = useState(justSubscribed);
  const [truncated, setTruncated] = useState(false);
  // Independent space preferences for the review screen: whether codes are
  // shown grouped, and whether they're saved grouped. Both default on (the
  // original behavior) and are remembered across snaps via localStorage. The
  // toggles only render in the review phase, so reading storage during the
  // initial (home) render causes no hydration mismatch.
  const [showSpaces, setShowSpaces] = useState(() =>
    readSpacePref("gcs_show_spaces")
  );
  const [saveSpaces, setSaveSpaces] = useState(() =>
    readSpacePref("gcs_save_spaces")
  );
  function toggleShowSpaces() {
    setShowSpaces((prev) => {
      const next = !prev;
      localStorage.setItem("gcs_show_spaces", next ? "1" : "0");
      return next;
    });
  }
  function toggleSaveSpaces() {
    setSaveSpaces((prev) => {
      const next = !prev;
      localStorage.setItem("gcs_save_spaces", next ? "1" : "0");
      return next;
    });
  }
  // Which card's Value field was edited last — anchors the "apply to all
  // cards" suggestion chip.
  const [lastValueEdit, setLastValueEdit] = useState<number | null>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const libraryInput = useRef<HTMLInputElement>(null);
  // Idempotency key for the current review batch, so a double-submit or a
  // retry-after-timeout can't append the same rows twice.
  const batchIdRef = useRef<string | null>(null);
  const router = useRouter();

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setPhase({ name: "processing" });

    try {
      const image = await shrinkImage(file);
      const form = new FormData();
      form.append("image", image, "photo.jpg");

      const res = await fetchWithTimeout(
        "/api/ocr",
        { method: "POST", body: form },
        60000
      );
      const data = await res.json().catch(() => null);

      if (res.status === 402) {
        router.push(
          data?.error === "plan_limit" ? "/subscribe?limit=hit" : "/subscribe"
        );
        return;
      }
      if (data?.error === "image_too_large") {
        setPhase({
          name: "error",
          message:
            "That photo is too large to process. Tip: snap the card directly (that shrinks the image for you), or take a screenshot of the picture and use that instead — screenshots are much smaller.",
        });
        return;
      }
      if (!res.ok) {
        setPhase({
          name: "error",
          message: data?.error ?? "Something went wrong. Please try again.",
        });
        return;
      }
      if (data?.usage !== undefined) {
        setUsage(data.usage);
      }
      if (!data?.cards?.length) {
        setPhase({
          name: "error",
          message:
            "No gift cards were found in that photo. Try again with the card details clearly visible.",
        });
        return;
      }
      setTruncated(Boolean(data.truncated));
      setLastValueEdit(null);
      batchIdRef.current = crypto.randomUUID();
      setPhase({ name: "review", cards: data.cards });
    } catch (e) {
      const timedOut = e instanceof DOMException && e.name === "AbortError";
      setPhase({
        name: "error",
        message: timedOut
          ? "That took too long — check your connection and try again."
          : "Something went wrong. Please try again.",
      });
    }
  }

  function updateCard(index: number, field: keyof Card, value: string) {
    if (field === "value") {
      setLastValueEdit(index);
    }
    setPhase((p) => {
      if (p.name !== "review") return p;
      const cards = p.cards.map((card, i) =>
        i === index ? { ...card, [field]: value } : card
      );
      return { ...p, cards };
    });
  }

  function applyValueToAll(index: number) {
    setLastValueEdit(null);
    setPhase((p) => {
      if (p.name !== "review") return p;
      const value = p.cards[index].value;
      return { ...p, cards: p.cards.map((card) => ({ ...card, value })) };
    });
  }

  async function saveCards(cards: Card[]) {
    setPhase({ name: "saving", cards });
    try {
      const date = new Date().toLocaleDateString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
      });
      const res = await fetchWithTimeout(
        "/api/save",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cards, date, batchId: batchIdRef.current }),
        },
        45000
      );
      const data = await res.json().catch(() => null);

      if (res.status === 409 && data?.error === "reauth") {
        router.push("/reconnect");
        return;
      }
      if (!res.ok || !Array.isArray(data?.results)) {
        setPhase({ name: "savefail", cards, failed: cards.map(() => true) });
        return;
      }
      const failed = data.results.map((r: { ok?: boolean }) => !r?.ok);
      if (failed.some(Boolean)) {
        setPhase({ name: "savefail", cards, failed });
      } else {
        setPhase({ name: "success", count: cards.length });
      }
    } catch {
      setPhase({ name: "savefail", cards, failed: cards.map(() => true) });
    }
  }

  async function openBillingPortal() {
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
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  // Hidden file inputs shared by every phase. `capture` opens the camera
  // directly on phones; the other input opens the photo library.
  const fileInputs = (
    <>
      <input
        ref={cameraInput}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <input
        ref={libraryInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </>
  );

  if (phase.name === "processing" || phase.name === "saving") {
    return (
      <div
        role="status"
        aria-live="polite"
        className="my-auto flex flex-col items-center gap-6"
      >
        <div
          className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"
          aria-hidden="true"
        />
        <p className="text-lg font-medium">
          {phase.name === "processing" ? "Processing Image..." : "Saving..."}
        </p>
        {phase.name === "processing" && (
          <p className="text-sm text-slate-500">
            Reading every card in your photo
          </p>
        )}
      </div>
    );
  }

  if (phase.name === "success") {
    return (
      <div className="flex w-full max-w-xs flex-col items-center gap-4 text-center">
        {fileInputs}
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl"
          aria-hidden="true"
        >
          ✓
        </div>
        <h1 className="text-2xl font-bold">Success</h1>
        <p className="text-slate-600">
          {phase.count} of {phase.count} cards saved.
        </p>
        {sheetUrl && (
          <a
            href={sheetUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-blue-600 underline"
          >
            View them in your sheet
          </a>
        )}
        <p className="max-w-xs text-xs text-slate-500">
          Note: on mobile you may need to exit and re-enter your Google Sheet to
          see the new rows.
        </p>
        <p className="text-sm text-slate-500">
          Tip: several cards fit in one photo.
        </p>
        <PrimaryButton className="mt-4" onClick={() => cameraInput.current?.click()}>
          Take Next Photo
        </PrimaryButton>
        <SecondaryButton onClick={() => libraryInput.current?.click()}>
          Choose Existing Photo
        </SecondaryButton>
        {usage && !(subscribed && usage.kind === "trial") && (
          <p className="text-xs text-slate-500">
            {usage.kind === "trial"
              ? `Free trial: ${usage.used} of ${usage.limit} snaps used`
              : `This billing month: ${usage.used} of ${usage.limit} snaps used`}
          </p>
        )}
      </div>
    );
  }

  if (phase.name === "savefail") {
    const failedCount = phase.failed.filter(Boolean).length;
    return (
      <div className="flex w-full max-w-md flex-col gap-4">
        <h1 className="text-2xl font-bold text-red-700">Save Failed</h1>
        <p className="text-sm text-slate-600">
          {failedCount} of {phase.cards.length}{" "}
          {failedCount === 1 ? "card" : "cards"} could not be written to your
          spreadsheet. The details are still shown below so you can copy them
          into your sheet manually.
        </p>
        {phase.cards.map((card, i) => (
          <div
            key={i}
            className={`flex flex-col gap-1 rounded-2xl border p-4 text-sm ${
              phase.failed[i]
                ? "border-red-400"
                : "border-slate-200 opacity-70"
            }`}
          >
            <p className="text-xs font-semibold uppercase tracking-wide">
              {phase.failed[i] ? (
                <span className="text-red-700">Not saved</span>
              ) : (
                <span className="text-slate-500">Saved</span>
              )}
            </p>
            <p>
              <span className="text-slate-500">Vendor:</span> {card.vendor}
            </p>
            <p className="break-all">
              <span className="text-slate-500">Card Number:</span>{" "}
              {card.card_number}
            </p>
            <p>
              <span className="text-slate-500">PIN:</span> {card.pin}
            </p>
            <p>
              <span className="text-slate-500">Value:</span> {card.value}
            </p>
            {card.expiration && (
              <p>
                <span className="text-slate-500">Expiration:</span>{" "}
                {card.expiration}
              </p>
            )}
          </div>
        ))}
        <button
          onClick={() => setPhase({ name: "home" })}
          className="mt-2 w-full rounded-2xl bg-blue-600 px-6 py-5 text-lg font-semibold text-white shadow-md transition active:scale-[0.98]"
        >
          Done
        </button>
      </div>
    );
  }

  if (phase.name === "review") {
    const missingValue = phase.cards.map((card) => !card.value.trim());
    return (
      <div className="flex w-full max-w-md flex-col gap-4">
        {fileInputs}
        <h1 className="text-xl font-bold">
          {phase.cards.length === 1
            ? "1 gift card found"
            : `${phase.cards.length} gift cards found`}
        </h1>
        <p className="text-sm opacity-70">
          Check each field against the card, then save.
        </p>
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <Toggle
            label="Show spaces in codes"
            checked={showSpaces}
            onChange={toggleShowSpaces}
          />
          <Toggle
            label="Save spaces in codes"
            checked={saveSpaces}
            onChange={toggleSaveSpaces}
          />
        </div>
        {truncated && (
          <p className="rounded-lg bg-amber-100 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
            We captured the first 10 cards from this photo. Snap any extras
            in a separate photo.
          </p>
        )}
        {phase.attempted && missingValue.some(Boolean) && (
          <p className="rounded-lg bg-red-100 px-4 py-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
            Enter a value for every card before saving.
          </p>
        )}
        {phase.cards.map((card, i) => (
          <div
            key={i}
            className="flex flex-col gap-3 rounded-2xl border border-black/10 p-4 shadow-sm dark:border-white/15"
          >
            <Field
              label="Vendor"
              value={card.vendor}
              onChange={(v) => updateCard(i, "vendor", v)}
            />
            <Field
              label="Card Number"
              value={showSpaces ? card.card_number : stripSpaces(card.card_number)}
              onChange={(v) => updateCard(i, "card_number", v)}
            />
            <Field
              label="PIN"
              value={showSpaces ? card.pin : stripSpaces(card.pin)}
              onChange={(v) => updateCard(i, "pin", v)}
            />
            <Field
              label="Value"
              value={card.value}
              onChange={(v) => updateCard(i, "value", v)}
              inputMode="decimal"
              error={phase.attempted && missingValue[i]}
            />
            {lastValueEdit === i &&
              card.value.trim() !== "" &&
              phase.cards.some(
                (other, j) => j !== i && other.value !== card.value
              ) && (
                <button
                  onClick={() => applyValueToAll(i)}
                  className="flex items-center gap-1.5 self-start rounded-full border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition active:scale-[0.97] dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 16 16"
                    aria-hidden="true"
                  >
                    <path
                      d="M8 2 v9 M4.5 7.5 L8 11 l3.5 -3.5"
                      stroke="currentColor"
                      strokeWidth="2"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M3 14 h10"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                  Apply {card.value.trim()} to the other{" "}
                  {phase.cards.length - 1 === 1
                    ? "card"
                    : `${phase.cards.length - 1} cards`}
                </button>
              )}
            <Field
              label="Expiration (if any)"
              value={card.expiration}
              onChange={(v) => updateCard(i, "expiration", v)}
            />
          </div>
        ))}
        <PrimaryButton
          className="mt-2"
          onClick={() => {
            if (missingValue.some(Boolean)) {
              setPhase({ ...phase, attempted: true });
              return;
            }
            const cards = saveSpaces
              ? phase.cards
              : phase.cards.map((c) => ({
                  ...c,
                  card_number: stripSpaces(c.card_number),
                  pin: stripSpaces(c.pin),
                }));
            saveCards(cards);
          }}
        >
          Approve &amp; Save
        </PrimaryButton>
        <p className="text-center text-xs text-slate-500">
          Card details are never stored — they go only to your sheet.
        </p>
        <button
          onClick={() => setPhase({ name: "home" })}
          className="text-center text-sm text-slate-500 underline"
        >
          Cancel
        </button>
      </div>
    );
  }

  const usageLabel = usage
    ? usage.kind === "trial"
      ? `${usage.used} / ${usage.limit}`
      : `${usage.used} / ${usage.limit}`
    : null;
  const usagePct =
    usage && usage.limit > 0
      ? Math.min(100, Math.round((usage.used / usage.limit) * 100))
      : 0;

  return (
    <div className="flex w-full max-w-sm flex-col gap-3.5">
      {fileInputs}

      {phase.name === "error" && (
        <p className="rounded-xl bg-red-100 px-4 py-3 text-sm text-red-800">
          {phase.message}
        </p>
      )}
      {paymentPastDue && (
        <div className="flex flex-col items-center gap-2 rounded-2xl bg-amber-100 px-4 py-4 text-center">
          <p className="text-sm font-semibold text-amber-900">
            ⚠️ Your last payment didn&apos;t go through
          </p>
          <p className="text-xs text-amber-800">
            Update your card to keep your subscription active.
          </p>
          <button
            onClick={openBillingPortal}
            className="mt-1 rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white transition active:scale-[0.98]"
          >
            Update payment method
          </button>
        </div>
      )}
      {showSubBanner && (
        <div className="flex flex-col items-center gap-1 rounded-2xl bg-green-100 px-4 py-4 text-center">
          <span className="text-2xl" aria-hidden="true">
            🎉
          </span>
          <p className="font-semibold text-green-900">
            {planName ? `You're on the ${planName} plan!` : "You're subscribed!"}
          </p>
          <p className="text-xs text-green-800 opacity-80">
            Snap away — you&apos;re all set.
          </p>
          <button
            onClick={() => setShowSubBanner(false)}
            className="mt-1 text-xs text-green-800 underline opacity-70"
          >
            Dismiss
          </button>
        </div>
      )}
      {sheetJustCreated && sheetUrl && (
        <p className="rounded-xl bg-green-100 px-4 py-3 text-center text-sm text-green-900">
          We created{" "}
          <a
            href={sheetUrl}
            target="_blank"
            rel="noreferrer"
            className="font-semibold underline"
          >
            Gift Card Inventory
          </a>{" "}
          in your Google Drive.
        </p>
      )}

      {/* Quick guide */}
      <ol className="flex flex-col gap-2.5">
        {[
          <>
            Snap a photo of one or more gift cards with the card number and PIN
            clearly visible.
          </>,
          <>Confirm the card details.</>,
          sheetUrl ? (
            <>
              Card details are uploaded to your{" "}
              <a
                href={sheetUrl}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-blue-600 underline"
              >
                Google Sheet
              </a>
              .
            </>
          ) : (
            <>Card details are uploaded to your Google Sheet.</>
          ),
        ].map((step, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold text-white">
              {i + 1}
            </span>
            <span className="text-sm leading-snug text-slate-600">{step}</span>
          </li>
        ))}
      </ol>
      <p className="text-center text-xs text-slate-500">
        Photos &amp; card details are never stored, they only go to your sheet.
      </p>

      {/* Primary actions */}
      <PrimaryButton
        className="py-5 text-lg"
        onClick={() => cameraInput.current?.click()}
      >
        <span aria-hidden="true">📷</span> Snap your card(s)
      </PrimaryButton>
      <SecondaryButton onClick={() => libraryInput.current?.click()}>
        Choose Existing Photo
      </SecondaryButton>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Usage */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-[13px] font-extrabold">Usage</div>
          {usage ? (
            <>
              <div className="mt-1 text-xs font-semibold text-slate-500">
                {usage.kind === "trial" ? "Free trial" : "This month"} ·{" "}
                {usageLabel} snaps
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-blue-600"
                  style={{ width: `${usagePct}%` }}
                />
              </div>
              <div className="mt-2 text-[11px] font-semibold text-slate-400">
                Up to 10 cards per snap
              </div>
            </>
          ) : (
            <>
              <div className="mt-1 text-xs font-semibold text-green-600">
                Unlimited snaps ✓
              </div>
              <div className="mt-2 text-[11px] font-semibold text-slate-400">
                Up to 10 cards per snap
              </div>
            </>
          )}
        </div>

        {/* Your Sheet */}
        <a
          href={sheetUrl ?? "#"}
          target="_blank"
          rel="noreferrer"
          className="rounded-2xl border border-slate-200 bg-white p-4"
        >
          <div className="text-[13px] font-extrabold">Your Sheet</div>
          <div className="mt-1 text-xs font-semibold text-blue-600">
            Open in Google Sheets
          </div>
          <div className="mt-2 text-[11px] font-semibold text-slate-400">
            Gift Card Inventory
          </div>
        </a>

        {/* Refer */}
        <Link
          href="/referral"
          className="rounded-2xl border border-slate-200 bg-white p-4"
        >
          <div className="text-[13px] font-extrabold">Refer a friend</div>
          <div className="mt-1 text-xs font-semibold text-green-600">
            Earn free months
          </div>
        </Link>

        {/* Plan */}
        {complimentary ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-[13px] font-extrabold">Plan</div>
            <div className="mt-1 text-xs font-semibold text-green-600">
              Complimentary
            </div>
            <div className="mt-1 text-[11px] font-semibold text-slate-400">
              Unlimited access
            </div>
          </div>
        ) : subscribed ? (
          <button
            onClick={openBillingPortal}
            className="rounded-2xl border border-slate-200 bg-white p-4 text-left"
          >
            <div className="text-[13px] font-extrabold">Plan</div>
            <div className="mt-1 text-xs font-semibold text-slate-500">
              {planName ?? "Active"} · Manage ▸
            </div>
          </button>
        ) : (
          <Link
            href="/subscribe"
            className="rounded-2xl border border-slate-200 bg-white p-4"
          >
            <div className="text-[13px] font-extrabold">Plan</div>
            <div className="mt-1 text-xs font-semibold text-blue-600">
              Free trial · Upgrade ▸
            </div>
          </Link>
        )}
      </div>

      <div className="mt-2 flex items-center justify-center gap-4">
        <SupportLink />
        <button
          onClick={signOut}
          className="cursor-pointer text-xs font-medium text-slate-500 underline"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

// Removes whitespace only, so grouped codes collapse (e.g. "6050 1234" ->
// "60501234") while dashes in claim codes (Amazon/DoorDash) are preserved.
function stripSpaces(value: string): string {
  return value.replace(/\s+/g, "");
}

// Reads a saved space preference, defaulting to on (grouped) when unset.
function readSpacePref(key: string): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(key) !== "0";
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className="flex cursor-pointer items-center justify-between gap-3 text-left"
    >
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <span
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
          checked ? "bg-blue-600" : "bg-slate-300"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
            checked ? "translate-x-[22px]" : "translate-x-0.5"
          }`}
        />
      </span>
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  inputMode,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  inputMode?: "decimal";
  error?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <input
        type="text"
        value={value}
        inputMode={inputMode}
        onChange={(e) => onChange(e.target.value)}
        // Gift card numbers/PINs must never be stored by the browser
        // (autofill / keyboard history), and generic names avoid triggering
        // credit-card autofill.
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        className={`rounded-xl border px-3 py-2 text-base ${
          error ? "border-red-500" : "border-slate-300"
        }`}
      />
      {error && <span className="text-xs text-red-700">Required</span>}
    </label>
  );
}

// Photos from phone cameras are often 5-10 MB — beyond what the server
// accepts and slower to OCR. Shrink to at most 2048px JPEG before upload.
// The image never leaves memory here either.
async function shrinkImage(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 2048 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.85)
    );
    return blob ?? file;
  } catch {
    // Fall back to the original file (e.g. formats the canvas can't read).
    return file;
  }
}
