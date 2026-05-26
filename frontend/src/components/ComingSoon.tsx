import { Construction } from 'lucide-react';

export function ComingSoon({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="w-full">
      <div className="flex items-start gap-3 mb-6">
        <div className="w-3 h-3 mt-2 rounded-full bg-accent-green shrink-0" />
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-ink-950 leading-tight">
            {title}
          </h1>
          {subtitle && <p className="text-[15px] text-ink-500 mt-1">{subtitle}</p>}
        </div>
      </div>
      <div className="rounded-3xl bg-white shadow-card py-24 flex flex-col items-center justify-center">
        <div className="w-20 h-20 rounded-full bg-ink-50 flex items-center justify-center mb-5">
          <Construction className="w-9 h-9 text-ink-400" strokeWidth={1.5} />
        </div>
        <h2 className="text-[20px] font-bold text-ink-950">Coming soon</h2>
        <p className="mt-2 text-[14px] text-ink-500 max-w-md text-center px-6">
          This area isn&apos;t available in the current build. Check back later.
        </p>
      </div>
    </div>
  );
}
