import { cn } from '@/lib/cn';

/**
 * Cartoon portrait avatar — man with cap, glasses, earring, chain.
 * Stylized to match the Figma illustration character.
 * Sits on a peach circular background.
 */
export function PortraitAvatar({ size = 48, className }: { size?: number; className?: string }) {
  return (
    <div
      className={cn('relative shrink-0 overflow-hidden rounded-full', className)}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 64 64" width={size} height={size} xmlns="http://www.w3.org/2000/svg" aria-hidden>
        {/* peach circular bg */}
        <circle cx="32" cy="32" r="32" fill="#FBD9C7" />

        {/* shoulders / shirt — light gray */}
        <path d="M8 62 C 12 52, 22 48, 32 48 C 42 48, 52 52, 56 62 L 56 64 L 8 64 Z" fill="#C8C7C2" />

        {/* neck */}
        <rect x="27" y="42" width="10" height="8" rx="2" fill="#E8B791" />

        {/* gold chain */}
        <path d="M22 50 C 26 55, 38 55, 42 50" stroke="#D9A95E" strokeWidth="1.5" fill="none" />
        <circle cx="32" cy="55" r="2" fill="#E2B665" />

        {/* face */}
        <ellipse cx="32" cy="32" rx="13" ry="14.5" fill="#EFC2A0" />

        {/* hair below cap */}
        <path d="M19 30 C 19 26, 21 23, 24 22 L 40 22 C 43 23, 45 26, 45 30 L 45 34 C 43 31, 40 30, 38 30 L 26 30 C 24 30, 21 31, 19 34 Z" fill="#1F1A18" />

        {/* baseball cap */}
        <path d="M17 24 C 17 18, 22 14, 32 14 C 42 14, 47 18, 47 24 L 47 26 L 17 26 Z" fill="#C8C7C2" />
        <path d="M14 26 L 50 26 L 50 28 L 14 28 Z" fill="#9B9A95" />
        {/* cap accent stripe */}
        <rect x="30" y="16" width="4" height="9" fill="#1F1A18" />

        {/* glasses */}
        <circle cx="26.5" cy="34" r="3.6" fill="none" stroke="#1F1A18" strokeWidth="1.4" />
        <circle cx="37.5" cy="34" r="3.6" fill="none" stroke="#1F1A18" strokeWidth="1.4" />
        <path d="M30.1 34 L 33.9 34" stroke="#1F1A18" strokeWidth="1.4" />

        {/* nose */}
        <path d="M32 36 L 31 39 L 33 39" stroke="#B07C5B" strokeWidth="1" fill="none" strokeLinecap="round" />

        {/* beard */}
        <path d="M22 38 C 23 44, 27 47, 32 47 C 37 47, 41 44, 42 38 C 41 41, 37 42, 32 42 C 27 42, 23 41, 22 38 Z" fill="#1F1A18" />

        {/* mouth */}
        <path d="M29 43 Q 32 44.5 35 43" stroke="#5C3A28" strokeWidth="1" fill="none" strokeLinecap="round" />

        {/* earring (left) */}
        <circle cx="19.5" cy="35.5" r="1.6" fill="#E2B665" />
      </svg>
    </div>
  );
}

/**
 * School crest avatar — used on the school card on the output page (per Figma).
 * Simple green crest with a book emblem.
 */
export function SchoolCrest({ size = 48, className }: { size?: number; className?: string }) {
  return (
    <div
      className={cn('relative shrink-0 overflow-hidden rounded-full bg-[#E6F4EA]', className)}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 64 64" width={size} height={size} xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <circle cx="32" cy="32" r="32" fill="#E6F4EA" />
        {/* shield */}
        <path d="M32 12 L 48 18 L 48 34 C 48 44, 40 50, 32 54 C 24 50, 16 44, 16 34 L 16 18 Z" fill="#1F8A3E" />
        <path d="M32 16 L 44 21 L 44 33 C 44 41, 38 46, 32 49 C 26 46, 20 41, 20 33 L 20 21 Z" fill="#22A04A" />
        {/* book */}
        <rect x="24" y="28" width="16" height="11" rx="1" fill="#FFFFFF" />
        <path d="M32 28 L 32 39" stroke="#1F8A3E" strokeWidth="1" />
        <path d="M26 31 L 30 31 M 26 34 L 30 34 M 34 31 L 38 31 M 34 34 L 38 34" stroke="#1F8A3E" strokeWidth="0.8" />
        {/* sun rays at top */}
        <path d="M32 22 L 32 25 M 28 22 L 29 24 M 36 22 L 35 24" stroke="#F6D24A" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    </div>
  );
}
