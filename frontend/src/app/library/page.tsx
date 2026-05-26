'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { FileDown, Eye, FileText, Plus } from 'lucide-react';
import { listAssignments, pdfUrl } from '@/lib/api';
import type { AssignmentSummary } from '@/lib/types';

export default function LibraryPage() {
  const [items, setItems] = useState<AssignmentSummary[] | null>(null);

  useEffect(() => {
    listAssignments({ limit: 100 })
      .then((r) => setItems(r.items.filter((a) => a.status === 'completed')))
      .catch(() => setItems([]));
  }, []);

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-start gap-3 mb-6 px-1">
        <div className="w-3 h-3 mt-2 rounded-full bg-accent-green shrink-0" />
        <div>
          <h1 className="text-[22px] lg:text-[28px] font-bold tracking-tight text-ink-950 leading-tight">
            My Library
          </h1>
          <p className="text-[14px] lg:text-[15px] text-ink-500 mt-1">
            Every paper you&apos;ve generated, ready to download or revisit.
          </p>
        </div>
      </div>

      {items === null ? (
        <div className="py-24 text-center text-ink-400 text-[14px]">Loading…</div>
      ) : items.length === 0 ? (
        <EmptyLibrary />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((a) => (
            <LibraryCard key={a._id} a={a} />
          ))}
        </div>
      )}
    </div>
  );
}

function LibraryCard({ a }: { a: AssignmentSummary }) {
  return (
    <div className="bg-white rounded-2xl shadow-card p-5 flex flex-col">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-ink-100 flex items-center justify-center text-ink-700">
          <FileText className="w-5 h-5" strokeWidth={1.8} />
        </div>
        <div className="text-[11px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
          READY
        </div>
      </div>
      <div className="text-[16px] font-bold text-ink-950 leading-tight line-clamp-2 min-h-[2.6em]">
        {a.title}
      </div>
      <div className="text-[12px] text-ink-500 mt-1.5">
        Created {formatDate(a.createdAt)}
      </div>
      <div className="mt-4 flex items-center gap-2">
        <Link
          href={`/assignments/${a._id}`}
          className="flex-1 inline-flex items-center justify-center gap-2 h-10 px-4 rounded-full bg-white border border-ink-200 text-ink-950 text-[13px] font-semibold hover:bg-ink-50 active:scale-[0.99] transition-all"
        >
          <Eye className="w-4 h-4" strokeWidth={1.8} />
          View
        </Link>
        <a
          href={pdfUrl(a._id)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 inline-flex items-center justify-center gap-2 h-10 px-4 rounded-full bg-ink-900 text-white text-[13px] font-semibold hover:bg-ink-800 active:scale-[0.99] transition-all"
        >
          <FileDown className="w-4 h-4" strokeWidth={1.8} />
          PDF
        </a>
      </div>
    </div>
  );
}

function EmptyLibrary() {
  return (
    <div className="bg-white rounded-3xl shadow-card py-16 lg:py-24 px-6 flex flex-col items-center text-center">
      <div className="w-20 h-20 rounded-full bg-ink-50 flex items-center justify-center mb-5">
        <FileText className="w-9 h-9 text-ink-400" strokeWidth={1.5} />
      </div>
      <h2 className="text-[18px] lg:text-[20px] font-bold text-ink-950">
        Your library is empty
      </h2>
      <p className="mt-2 text-[14px] text-ink-500 max-w-md">
        Generated papers appear here once they&apos;re ready. Create one and it&apos;ll show up automatically.
      </p>
      <Link
        href="/assignments/new"
        className="mt-6 inline-flex items-center gap-2 h-12 px-6 rounded-full bg-ink-900 text-white text-[15px] font-semibold hover:bg-ink-800 active:scale-[0.99] transition-all"
      >
        <Plus className="w-[18px] h-[18px]" strokeWidth={2.2} />
        Create Assignment
      </Link>
    </div>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
}
