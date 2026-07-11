import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

// Shared design-system primitives so every screen uses one set of tokens
// (button shapes, card, muted text, support link). Presentational only —
// no hooks — so these can be used from both server and client components.

const PRIMARY =
  "w-full rounded-2xl bg-blue-600 px-6 py-4 text-base font-bold text-white shadow-[0_10px_24px_rgba(37,99,235,0.3)] transition active:scale-[0.98] disabled:opacity-60";
const SECONDARY =
  "w-full rounded-2xl border border-slate-200 bg-white px-6 py-4 text-base font-semibold text-slate-900 transition active:scale-[0.98] disabled:opacity-60";

export function PrimaryButton({
  className = "",
  ...props
}: ComponentProps<"button">) {
  return <button className={`${PRIMARY} ${className}`} {...props} />;
}

export function SecondaryButton({
  className = "",
  ...props
}: ComponentProps<"button">) {
  return <button className={`${SECONDARY} ${className}`} {...props} />;
}

// A primary-styled link (for CTAs that navigate).
export function PrimaryLink({
  className = "",
  ...props
}: ComponentProps<typeof Link>) {
  return <Link className={`${PRIMARY} block text-center ${className}`} {...props} />;
}

export function Card({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-4 ${className}`}>
      {children}
    </div>
  );
}

// Consistent support/suggestions link for the footer of every screen.
export function SupportLink({ className = "" }: { className?: string }) {
  return (
    <a
      href="mailto:support@giftcardsnapper.com?subject=Gift%20Card%20Snapper%20support"
      className={`text-xs font-medium text-slate-500 underline ${className}`}
    >
      Support &amp; suggestions
    </a>
  );
}
