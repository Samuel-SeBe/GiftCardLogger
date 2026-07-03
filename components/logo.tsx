// The Gift Card Snapper mark: a gift card being "snapped" by a camera
// lens, with a flash sparkle. Inline SVG so it's crisp at every size and
// costs no extra download.
export function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="gcs-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3b82f6" />
          <stop offset="1" stopColor="#1d4ed8" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="14" fill="url(#gcs-grad)" />
      <g transform="rotate(-6 28 30)">
        <rect x="9" y="17" width="37" height="25" rx="4" fill="#ffffff" />
        <rect x="9" y="23" width="37" height="5" fill="#93c5fd" />
        <rect x="13" y="33" width="14" height="3" rx="1.5" fill="#cbd5e1" />
      </g>
      <circle cx="44" cy="43" r="11.5" fill="#1e3a8a" />
      <circle
        cx="44"
        cy="43"
        r="7.5"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2.5"
      />
      <circle cx="47" cy="40" r="2" fill="#ffffff" opacity="0.9" />
      <path
        d="M51 9 l2.3 4.6 4.6 2.3 -4.6 2.3 -2.3 4.6 -2.3 -4.6 -4.6 -2.3 4.6 -2.3 z"
        fill="#fde047"
      />
    </svg>
  );
}

export function BetaBadge() {
  return (
    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:bg-blue-950 dark:text-blue-300">
      Beta
    </span>
  );
}
