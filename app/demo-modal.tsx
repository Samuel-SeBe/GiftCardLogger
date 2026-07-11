"use client";

import { useEffect, useRef, useState } from "react";

// "Watch demo" button + accessible modal playing the promo video.
export default function DemoModal({ label }: { label: string }) {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="py-1.5 text-[15px] font-bold text-blue-600"
      >
        {label}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Product demo video"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-2xl bg-black"
            onClick={(e) => e.stopPropagation()}
          >
            <video
              src="/demo.mp4"
              controls
              autoPlay
              playsInline
              className="w-full"
            />
            <div className="flex justify-end bg-black p-2">
              <button
                ref={closeRef}
                onClick={() => setOpen(false)}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
