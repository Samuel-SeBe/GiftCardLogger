"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Card = {
  vendor: string;
  card_number: string;
  pin: string;
  value: string;
};

type Phase =
  | { name: "home" }
  | { name: "processing" }
  | { name: "review"; cards: Card[] }
  | { name: "error"; message: string };

// The entire primary workflow lives here:
// Take Photo -> Processing -> Review -> (Save arrives in Step 4)
export default function HomeFlow() {
  const [phase, setPhase] = useState<Phase>({ name: "home" });
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

      if (!res.ok) {
        setPhase({
          name: "error",
          message: data?.error ?? "Something went wrong. Please try again.",
        });
        return;
      }
      if (!data?.cards?.length) {
        setPhase({
          name: "error",
          message:
            "No gift cards were found in that photo. Try again with the card details clearly visible.",
        });
        return;
      }
      setPhase({ name: "review", cards: data.cards });
    } catch {
      setPhase({
        name: "error",
        message: "Something went wrong. Please try again.",
      });
    }
  }

  function updateCard(index: number, field: keyof Card, value: string) {
    setPhase((p) => {
      if (p.name !== "review") return p;
      const cards = p.cards.map((card, i) =>
        i === index ? { ...card, [field]: value } : card
      );
      return { name: "review", cards };
    });
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

  if (phase.name === "processing") {
    return (
      <div className="flex flex-col items-center gap-6">
        <div
          className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"
          aria-hidden="true"
        />
        <p className="text-lg font-medium">Processing Image...</p>
      </div>
    );
  }

  if (phase.name === "review") {
    return (
      <div className="flex w-full max-w-md flex-col gap-4">
        {fileInputs}
        <h1 className="text-xl font-bold">
          {phase.cards.length === 1
            ? "1 gift card found"
            : `${phase.cards.length} gift cards found`}
        </h1>
        <p className="text-sm opacity-70">
          Check every field against the physical card, then save.
        </p>
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
            />
          </div>
        ))}
        <button
          onClick={() => alert("Saving to Google Sheets arrives in Step 4!")}
          className="mt-2 w-full rounded-2xl bg-blue-600 px-6 py-5 text-lg font-semibold text-white shadow-md transition active:scale-[0.98]"
        >
          Approve &amp; Save
        </button>
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  inputMode?: "decimal";
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
        className="rounded-lg border border-black/15 px-3 py-2 text-base dark:border-white/20 dark:bg-transparent"
      />
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
