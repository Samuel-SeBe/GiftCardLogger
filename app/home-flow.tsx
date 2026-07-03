"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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
type Trial = { used: number; limit: number } | null;

export default function HomeFlow({
  sheetUrl,
  sheetJustCreated,
  initialTrial,
  initialPhase,
}: {
  sheetUrl: string | null;
  sheetJustCreated: boolean;
  initialTrial: Trial;
  initialPhase?: Phase;
}) {
  const [phase, setPhase] = useState<Phase>(initialPhase ?? { name: "home" });
  const [trial, setTrial] = useState<Trial>(initialTrial);
  // Which card's Value field was edited last — anchors the "apply to all
  // cards" suggestion chip.
  const [lastValueEdit, setLastValueEdit] = useState<number | null>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const libraryInput = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setPhase({ name: "processing" });

    try {
      const image = await shrinkImage(file);
      const form = new FormData();
      form.append("image", image, "photo.jpg");

      const res = await fetch("/api/ocr", { method: "POST", body: form });
      const data = await res.json().catch(() => null);

      if (res.status === 402) {
        router.push("/subscribe");
        return;
      }
      if (!res.ok) {
        setPhase({
          name: "error",
          message: data?.error ?? "Something went wrong. Please try again.",
        });
        return;
      }
      if (data?.trial !== undefined) {
        setTrial(data.trial);
      }
      if (!data?.cards?.length) {
        setPhase({
          name: "error",
          message:
            "No gift cards were found in that photo. Try again with the card details clearly visible.",
        });
        return;
      }
      setLastValueEdit(null);
      setPhase({ name: "review", cards: data.cards });
    } catch {
      setPhase({
        name: "error",
        message: "Something went wrong. Please try again.",
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
      const res = await fetch("/api/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cards, date }),
      });
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

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
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
      <div className="my-auto flex flex-col items-center gap-6">
        <div
          className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"
          aria-hidden="true"
        />
        <p className="text-lg font-medium">
          {phase.name === "processing" ? "Processing Image..." : "Saving..."}
        </p>
        {phase.name === "processing" && (
          <p className="text-sm opacity-60">Reading every card in your photo</p>
        )}
      </div>
    );
  }

  if (phase.name === "success") {
    return (
      <div className="flex w-full max-w-xs flex-col items-center gap-4 text-center">
        {fileInputs}
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl dark:bg-green-950"
          aria-hidden="true"
        >
          ✓
        </div>
        <h1 className="text-2xl font-bold">Success</h1>
        <p className="opacity-70">
          {phase.count} of {phase.count} cards saved.
        </p>
        {sheetUrl && (
          <a
            href={sheetUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-blue-600 underline dark:text-blue-400"
          >
            View them in your sheet
          </a>
        )}
        <p className="text-sm opacity-60">
          Tip: several cards fit in one photo.
        </p>
        <button
          onClick={() => cameraInput.current?.click()}
          className="mt-4 w-full rounded-2xl bg-blue-600 px-6 py-5 text-lg font-semibold text-white shadow-md transition active:scale-[0.98]"
        >
          Take Next Photo
        </button>
        <button
          onClick={() => libraryInput.current?.click()}
          className="w-full rounded-2xl border border-black/15 px-6 py-4 text-base font-medium transition active:scale-[0.98] dark:border-white/20"
        >
          Choose Existing Photo
        </button>
        {trial && (
          <p className="text-xs opacity-60">
            Free trial: {trial.used} of {trial.limit} uploads used
          </p>
        )}
      </div>
    );
  }

  if (phase.name === "savefail") {
    const failedCount = phase.failed.filter(Boolean).length;
    return (
      <div className="flex w-full max-w-md flex-col gap-4">
        <h1 className="text-2xl font-bold text-red-700 dark:text-red-400">
          Save Failed
        </h1>
        <p className="text-sm opacity-70">
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
                ? "border-red-400 dark:border-red-700"
                : "border-black/10 opacity-60 dark:border-white/15"
            }`}
          >
            <p className="text-xs font-semibold uppercase tracking-wide">
              {phase.failed[i] ? (
                <span className="text-red-700 dark:text-red-400">
                  Not saved
                </span>
              ) : (
                <span className="opacity-60">Saved</span>
              )}
            </p>
            <p>
              <span className="opacity-60">Vendor:</span> {card.vendor}
            </p>
            <p className="break-all">
              <span className="opacity-60">Card Number:</span>{" "}
              {card.card_number}
            </p>
            <p>
              <span className="opacity-60">PIN:</span> {card.pin}
            </p>
            <p>
              <span className="opacity-60">Value:</span> {card.value}
            </p>
            {card.expiration && (
              <p>
                <span className="opacity-60">Expiration:</span>{" "}
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
              value={card.card_number}
              onChange={(v) => updateCard(i, "card_number", v)}
            />
            <Field
              label="PIN"
              value={card.pin}
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
        <button
          onClick={() => {
            if (missingValue.some(Boolean)) {
              setPhase({ ...phase, attempted: true });
              return;
            }
            saveCards(phase.cards);
          }}
          className="mt-2 w-full rounded-2xl bg-blue-600 px-6 py-5 text-lg font-semibold text-white shadow-md transition active:scale-[0.98]"
        >
          Approve &amp; Save
        </button>
        <p className="text-center text-xs opacity-50">
          Card details are never stored — they go only to your sheet.
        </p>
        <button
          onClick={() => setPhase({ name: "home" })}
          className="text-center text-sm opacity-60 underline"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-xs flex-col gap-4">
      {fileInputs}
      {phase.name === "error" && (
        <p className="rounded-lg bg-red-100 px-4 py-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          {phase.message}
        </p>
      )}
      {sheetJustCreated && sheetUrl && (
        <p className="rounded-lg bg-green-100 px-4 py-3 text-center text-sm text-green-900 dark:bg-green-950 dark:text-green-200">
          We created{" "}
          <a
            href={sheetUrl}
            target="_blank"
            rel="noreferrer"
            className="font-medium underline"
          >
            Gift Card Inventory
          </a>{" "}
          in your Google Drive — every card you save lands there.
        </p>
      )}
      <p className="text-center text-sm opacity-70">
        Lay out your gift cards — one photo can capture several at once.
      </p>
      <button
        onClick={() => cameraInput.current?.click()}
        className="w-full rounded-2xl bg-blue-600 px-6 py-5 text-lg font-semibold text-white shadow-md transition active:scale-[0.98]"
      >
        Take Photo
      </button>
      <button
        onClick={() => libraryInput.current?.click()}
        className="w-full rounded-2xl border border-black/15 px-6 py-4 text-base font-medium transition active:scale-[0.98] dark:border-white/20"
      >
        Choose Existing Photo
      </button>
      <p className="text-center text-xs opacity-50">
        Photos and card details are never stored — they go only to your
        sheet.
      </p>
      {trial && (
        <p className="text-center text-xs opacity-60">
          Free trial: {trial.used} of {trial.limit} uploads used
        </p>
      )}

      {/* Temporary while building: lets us test with multiple accounts. */}
      <button
        onClick={signOut}
        className="mt-8 text-center text-xs opacity-50 underline"
      >
        Sign out
      </button>
    </div>
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
      <span className="text-xs font-medium uppercase tracking-wide opacity-60">
        {label}
      </span>
      <input
        type="text"
        value={value}
        inputMode={inputMode}
        onChange={(e) => onChange(e.target.value)}
        className={`rounded-lg border px-3 py-2 text-base dark:bg-transparent ${
          error
            ? "border-red-500 dark:border-red-600"
            : "border-black/15 dark:border-white/20"
        }`}
      />
      {error && (
        <span className="text-xs text-red-700 dark:text-red-400">
          Required
        </span>
      )}
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
