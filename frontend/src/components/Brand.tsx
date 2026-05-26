import Image from 'next/image';
import { cn } from '@/lib/cn';

/**
 * VedaAI logo tile — uses the extracted PNG asset from Figma for fidelity.
 * The asset is a vertical orange→deep-red gradient square with a white serif V.
 */
export function Logo({ size = 40, className }: { size?: number; className?: string }) {
  // Use the user-provided AVIF asset directly. Plain black tile with white V mark.
  // No gradient, no stroke — that styling belongs on the Create Assignment CTA.
  return (
    <div
      className={cn('relative shrink-0 block leading-none', className)}
      style={{ width: size, height: size }}
      aria-label="VedaAI"
    >
      <Image
        src="/brand/logo.avif"
        alt="VedaAI logo"
        width={size}
        height={size}
        priority
        unoptimized
        className="object-contain block"
        style={{ width: size, height: size }}
      />
    </div>
  );
}

/**
 * VedaAI wordmark. Use the `as` prop to size it; defaults to inheriting current font-size.
 * Pair with Logo via a flex row with `items-center` — the logo size should match the
 * wordmark's cap-height (≈ 0.72× of font-size). Recommended pairings:
 *   - 40px logo  ↔  text-[22px] wordmark
 *   - 32px logo  ↔  text-[18px] wordmark
 *   - 28px logo  ↔  text-[16px] wordmark
 */
export function Wordmark({ className }: { className?: string }) {
  // Bricolage Grotesque optical center of "VedaAI" (no descenders) sits at cap-mid.
  // The leading-[1] + a small negative bottom margin pulls the visual baseline up so
  // the wordmark's cap-mid lines up with the logo tile's geometric center.
  return (
    <span
      className={cn(
        'tracking-tight text-ink-950 font-extrabold inline-block',
        'leading-[0.85]',
        className?.includes('text-') ? '' : 'text-[24px]',
        className
      )}
      style={{ transform: 'translateY(-2px)' }}
    >
      VedaAI
    </span>
  );
}

/**
 * Sparkles icon used inside the dark CTA pill — filled 4-point stars.
 */
export function SparklesFilled({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M12 1.5l1.4 4.1L17.5 7l-4.1 1.4L12 12.5l-1.4-4.1L6.5 7l4.1-1.4z" />
      <path d="M5.5 12l.8 2.2L8.5 15l-2.2.8L5.5 18l-.8-2.2L2.5 15l2.2-.8z" />
    </svg>
  );
}
