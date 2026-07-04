// The Gift Card Snapper mark: a phone in camera mode with a gift card in
// the viewfinder and a red shutter button. Inline SVG so it's crisp at
// every size and costs no extra download.
export function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="gcs-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3b82f6" />
          <stop offset="1" stopColor="#1d4ed8" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill="url(#gcs-grad)" />
      <rect x="16" y="5" width="32" height="54" rx="6" fill="#0b1220" />
      <rect x="29" y="6.2" width="6" height="1" rx="0.5" fill="#33415c" />
      <rect x="17.6" y="8" width="28.8" height="40.5" rx="3" fill="#a97a49" />
      <g transform="rotate(-3 32 21)">
        <rect
          x="20.4"
          y="12.6"
          width="24"
          height="18"
          rx="2"
          fill="#0b1e52"
          opacity="0.22"
        />
        <rect x="20" y="12" width="24" height="18" rx="2" fill="#2563eb" />
        <rect x="20" y="12" width="24" height="4.3" fill="#1e40af" />
        <text
          x="32"
          y="20.2"
          fontFamily="Arial, sans-serif"
          fontWeight="800"
          fontSize="3.5"
          fill="#ffffff"
          textAnchor="middle"
        >
          GIFT CARD
        </text>
        <text
          x="32"
          y="26.6"
          fontFamily="monospace"
          fontWeight="700"
          fontSize="3"
          fill="#dbeafe"
          textAnchor="middle"
        >
          1234 5678
        </text>
        <path
          d="M40.4 13 l0.8 1.6 1.6 0.8 -1.6 0.8 -0.8 1.6 -0.8 -1.6 -1.6 -0.8 1.6 -0.8 z"
          fill="#fde047"
        />
      </g>
      <circle
        cx="32"
        cy="53.5"
        r="4"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.3"
      />
      <circle cx="32" cy="53.5" r="2.8" fill="#ef4444" />
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
