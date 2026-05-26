'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}) {
  // ESC closes, body scroll locks while open
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const sizeClass = {
    sm: 'max-w-[420px]',
    md: 'max-w-[520px]',
    lg: 'max-w-[680px]',
  }[size];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'w-full bg-white rounded-3xl shadow-floating overflow-hidden flex flex-col',
          'max-h-[calc(100vh-32px)]',
          sizeClass
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4">
          <div className="min-w-0">
            <h2 className="text-[20px] font-bold text-ink-950 leading-tight">{title}</h2>
            {subtitle && (
              <p className="text-[14px] text-ink-500 mt-1 leading-snug">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full hover:bg-ink-50 flex items-center justify-center text-ink-500 shrink-0 -mr-1"
            aria-label="Close"
          >
            <X className="w-5 h-5" strokeWidth={2} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-2 overflow-y-auto">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="px-6 pt-4 pb-6 flex items-center justify-end gap-3 border-t border-ink-100 mt-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
