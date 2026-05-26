import { cn } from '@/lib/cn';

/**
 * Topbar user avatar — clean illustrated portrait on peach circle.
 * Refreshed to look more polished than the prior cartoon: subtler features,
 * stronger silhouette, no busy chain/glasses lines that previously read as noise.
 */
export function PortraitAvatar({ size = 48, className }: { size?: number; className?: string }) {
  return (
    <div
      className={cn('relative shrink-0 overflow-hidden rounded-full', className)}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 64 64" width={size} height={size} xmlns="http://www.w3.org/2000/svg" aria-hidden>
        {/* peach gradient bg */}
        <defs>
          <linearGradient id="pa-bg" x1="32" y1="0" x2="32" y2="64" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#FFE0CC" />
            <stop offset="1" stopColor="#FBC8A6" />
          </linearGradient>
          <linearGradient id="pa-shirt" x1="32" y1="50" x2="32" y2="64" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#2D2D33" />
            <stop offset="1" stopColor="#1A1A1C" />
          </linearGradient>
        </defs>

        <circle cx="32" cy="32" r="32" fill="url(#pa-bg)" />

        {/* shoulders / shirt */}
        <path d="M10 64 C 14 54, 22 50, 32 50 C 42 50, 50 54, 54 64 Z" fill="url(#pa-shirt)" />

        {/* neck */}
        <rect x="28.5" y="44" width="7" height="8" rx="2" fill="#E6B190" />

        {/* face */}
        <ellipse cx="32" cy="30" rx="12" ry="13.5" fill="#EFC2A0" />

        {/* hair top */}
        <path d="M20 28 C 20 22, 24 18, 32 18 C 40 18, 44 22, 44 28 L 44 31 C 41 28, 38 27, 32 27 C 26 27, 23 28, 20 31 Z" fill="#1F1A18" />

        {/* eyes — subtle dots */}
        <circle cx="27" cy="32" r="1.2" fill="#1F1A18" />
        <circle cx="37" cy="32" r="1.2" fill="#1F1A18" />

        {/* nose hint */}
        <path d="M32 34 L 31.2 37 L 33 37" stroke="#B07C5B" strokeWidth="0.9" fill="none" strokeLinecap="round" />

        {/* mouth — gentle smile */}
        <path d="M29 41 Q 32 42.5 35 41" stroke="#5C3A28" strokeWidth="1.1" fill="none" strokeLinecap="round" />
      </svg>
    </div>
  );
}

/**
 * School card avatar (sidebar) — clean institutional crest in green/white.
 * Used wherever the active school logo is shown.
 */
export function SchoolCrest({ size = 48, className }: { size?: number; className?: string }) {
  return (
    <div
      className={cn('relative shrink-0 overflow-hidden rounded-full', className)}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 64 64" width={size} height={size} xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <defs>
          <linearGradient id="sc-bg" x1="32" y1="0" x2="32" y2="64" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#E8F5EC" />
            <stop offset="1" stopColor="#C8E6D0" />
          </linearGradient>
          <linearGradient id="sc-shield" x1="32" y1="10" x2="32" y2="56" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#2BAE56" />
            <stop offset="1" stopColor="#168A3B" />
          </linearGradient>
        </defs>
        <circle cx="32" cy="32" r="32" fill="url(#sc-bg)" />
        {/* shield */}
        <path d="M32 12 L 48 18 L 48 34 C 48 44, 40 50, 32 54 C 24 50, 16 44, 16 34 L 16 18 Z" fill="url(#sc-shield)" />
        {/* inner highlight */}
        <path d="M32 16 L 44 21 L 44 33 C 44 41, 38 46, 32 49 C 26 46, 20 41, 20 33 L 20 21 Z" fill="none" stroke="#FFFFFF" strokeOpacity="0.2" strokeWidth="0.8" />
        {/* book emblem */}
        <rect x="24" y="28" width="16" height="11" rx="1.5" fill="#FFFFFF" />
        <path d="M32 28 L 32 39" stroke="#168A3B" strokeWidth="1.1" />
        <path d="M26 31 L 30 31 M 26 34 L 30 34 M 34 31 L 38 31 M 34 34 L 38 34" stroke="#168A3B" strokeWidth="0.8" />
        {/* tiny rays */}
        <path d="M32 22 L 32 25 M 28 23 L 29 25 M 36 23 L 35 25" stroke="#F6D24A" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    </div>
  );
}
