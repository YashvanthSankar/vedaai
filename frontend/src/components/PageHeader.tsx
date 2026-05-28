'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

/**
 * Shared page header used across every top-level route.
 *
 * Mobile layout (lg:hidden):
 *   [ ⟵  64px grey circle ] [ Bold title ]
 *
 * Desktop layout (lg:block):
 *   [ green dot ] [ Bold title + muted subtitle ]
 *
 * The mobile back button drops the user one history entry; pages that need
 * different back behaviour (e.g. multi-step wizards) can pass `onBack`.
 */
export function PageHeader({
  title,
  subtitle,
  onBack,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
}) {
  const router = useRouter();
  const handleBack = onBack ?? (() => router.back());
  return (
    <div className="flex items-center gap-4 px-1 mb-6">
      <button
        onClick={handleBack}
        className="lg:hidden shrink-0 w-14 h-14 rounded-full bg-ink-50 hover:bg-ink-100 active:scale-95 transition-all flex items-center justify-center text-ink-950"
        aria-label="Back"
      >
        <ArrowLeft className="w-[22px] h-[22px]" strokeWidth={2} />
      </button>
      <div className="w-3 h-3 rounded-full bg-accent-green shrink-0 hidden lg:block mt-2" />
      <div className="min-w-0">
        <h1 className="text-[22px] lg:text-[28px] font-bold tracking-tight text-ink-950 leading-tight">
          {title}
        </h1>
        {subtitle ? (
          <p className="hidden lg:block text-[14px] lg:text-[15px] text-ink-500 mt-1">
            {subtitle}
          </p>
        ) : null}
      </div>
    </div>
  );
}
