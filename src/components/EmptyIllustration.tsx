import { cn } from '@/lib/cn';

/**
 * Empty-state illustration matching Figma:
 * - Pale gray circle backdrop
 * - White rounded document with horizontal lines
 * - Red X mark over the document
 * - Translucent lavender magnifying glass with darker handle
 * - Top-left hand-drawn black squiggle
 * - Top-right small gray placeholder pill
 * - Mid-right small blue dot
 * - Bottom-left blue 4-point sparkle
 */
export function EmptyIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 440 360"
      className={cn('block', className)}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {/* Circle backdrop */}
      <circle cx="220" cy="180" r="155" fill="#E8E6E0" />
      <circle cx="220" cy="180" r="135" fill="#EDECE7" />

      {/* Hand-drawn squiggle top-left */}
      <path
        d="M 75 110 C 95 95, 115 100, 110 122 C 108 132, 95 138, 90 130 C 86 124, 92 118, 100 122"
        stroke="#1A1A1C"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />

      {/* Top-right placeholder pill */}
      <rect x="320" y="100" width="62" height="22" rx="11" fill="#FFFFFF" stroke="#E0DFDA" strokeWidth="1" />
      <rect x="328" y="108" width="22" height="6" rx="3" fill="#D8D7D2" />

      {/* Document card */}
      <g>
        <rect
          x="160"
          y="95"
          width="125"
          height="155"
          rx="8"
          fill="#FFFFFF"
          stroke="#E5E4DE"
          strokeWidth="1.5"
        />
        {/* dark accent line on top */}
        <rect x="175" y="115" width="60" height="6" rx="3" fill="#1A1A1C" />
        {/* light gray lines */}
        <rect x="175" y="135" width="95" height="4" rx="2" fill="#D8D7D2" />
        <rect x="175" y="148" width="95" height="4" rx="2" fill="#D8D7D2" />
        <rect x="175" y="161" width="75" height="4" rx="2" fill="#D8D7D2" />
        <rect x="175" y="174" width="95" height="4" rx="2" fill="#D8D7D2" />
        <rect x="175" y="187" width="60" height="4" rx="2" fill="#D8D7D2" />
      </g>

      {/* Red X mark on document */}
      <g stroke="#E11D48" strokeWidth="9" strokeLinecap="round">
        <line x1="215" y1="170" x2="265" y2="220" />
        <line x1="265" y1="170" x2="215" y2="220" />
      </g>

      {/* Magnifier — lavender translucent lens with darker handle */}
      <g>
        {/* lens */}
        <circle cx="260" cy="215" r="44" fill="#9F92C7" fillOpacity="0.32" stroke="#6F62A3" strokeWidth="3" />
        {/* lens highlight */}
        <path d="M 235 195 Q 245 205, 255 200" stroke="#FFFFFF" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.7" />
        {/* handle */}
        <rect x="290" y="245" width="40" height="11" rx="5.5" transform="rotate(40 290 245)" fill="#3A3A3E" />
        <rect x="288" y="243" width="14" height="11" rx="5.5" transform="rotate(40 288 243)" fill="#6F62A3" />
      </g>

      {/* Blue dot mid-right */}
      <circle cx="365" cy="200" r="7" fill="#3E8CC4" />

      {/* Blue 4-point sparkle bottom-left */}
      <g fill="#3E8CC4">
        <path d="M 130 235 L 134 247 L 146 251 L 134 255 L 130 267 L 126 255 L 114 251 L 126 247 Z" />
      </g>
    </svg>
  );
}
