'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { listAssignments } from '@/lib/api';
import { useProfile } from '@/lib/profile';
import type { AssignmentSummary } from '@/lib/types';

export default function HomePage() {
  const profile = useProfile();
  const [items, setItems] = useState<AssignmentSummary[] | null>(null);

  useEffect(() => {
    listAssignments({ limit: 50 })
      .then((r) => setItems(r.items))
      .catch(() => setItems([]));
  }, []);

  const stats = computeStats(items ?? []);
  const recent = (items ?? []).slice(0, 4);

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-start gap-3 mb-6 px-1">
        <div className="w-3 h-3 mt-2 rounded-full bg-accent-green shrink-0" />
        <div className="min-w-0">
          <h1 className="text-[22px] lg:text-[28px] font-bold tracking-tight text-ink-950 leading-tight">
            Welcome back{profile?.teacherName ? `, ${profile.teacherName}` : ''}
          </h1>
          <p className="text-[14px] lg:text-[15px] text-ink-500 mt-1">
            Here&apos;s what&apos;s happening with your classes today.
          </p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-5 lg:mb-6">
        <StatCard
          label="Total Assignments"
          value={stats.total}
          icon={<FileText className="w-5 h-5" strokeWidth={1.8} />}
          accent="ink"
        />
        <StatCard
          label="Ready"
          value={stats.completed}
          icon={<CheckCircle2 className="w-5 h-5" strokeWidth={1.8} />}
          accent="green"
        />
        <StatCard
          label="In Progress"
          value={stats.processing + stats.queued}
          icon={<Clock className="w-5 h-5" strokeWidth={1.8} />}
          accent="orange"
        />
        <StatCard
          label="Failed"
          value={stats.failed}
          icon={<AlertCircle className="w-5 h-5" strokeWidth={1.8} />}
          accent="red"
        />
      </div>

      {/* Primary CTA card */}
      <div className="bg-ink-900 rounded-2xl p-5 lg:p-7 mb-5 lg:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-white">
        <div className="flex items-start sm:items-center gap-3">
          <span className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" strokeWidth={1.8} />
          </span>
          <div>
            <div className="text-[16px] lg:text-[18px] font-bold">Generate a new paper</div>
            <div className="text-[13px] lg:text-[14px] text-white/70 mt-0.5">
              Upload material, pick question types, let AI draft it for you.
            </div>
          </div>
        </div>
        <Link
          href="/assignments/new"
          className="inline-flex items-center gap-2 h-11 px-6 rounded-full bg-white text-ink-950 text-[14px] font-semibold hover:bg-ink-50 active:scale-[0.99] transition-all shrink-0"
        >
          <Plus className="w-4 h-4" strokeWidth={2.4} />
          Create Assignment
        </Link>
      </div>

      {/* Recent assignments */}
      <div className="bg-white rounded-2xl shadow-card p-5 lg:p-7">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[16px] lg:text-[18px] font-bold text-ink-950">Recent Assignments</h2>
          <Link
            href="/assignments"
            className="inline-flex items-center gap-1 text-[13px] lg:text-[14px] font-semibold text-ink-700 hover:text-ink-950"
          >
            View all
            <ArrowRight className="w-4 h-4" strokeWidth={2} />
          </Link>
        </div>
        {items === null ? (
          <div className="py-8 text-center text-[14px] text-ink-400">Loading…</div>
        ) : recent.length === 0 ? (
          <div className="py-8 text-center text-[14px] text-ink-500">
            No assignments yet.{' '}
            <Link href="/assignments/new" className="font-semibold text-ink-900 underline underline-offset-2">
              Create your first one.
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-ink-100">
            {recent.map((a) => (
              <li key={a._id}>
                <Link
                  href={`/assignments/${a._id}`}
                  className="flex items-center justify-between gap-3 py-3 hover:bg-ink-50 -mx-2 px-2 rounded-lg transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-[15px] font-semibold text-ink-950 truncate">
                      {a.title}
                    </div>
                    <div className="text-[12px] text-ink-500 mt-0.5">
                      Due {formatDate(a.dueDate)}
                    </div>
                  </div>
                  <StatusBadge status={a.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent: 'ink' | 'green' | 'orange' | 'red';
}) {
  const accentColors = {
    ink: 'bg-ink-100 text-ink-950',
    green: 'bg-green-50 text-green-700',
    orange: 'bg-brand-50 text-brand-600',
    red: 'bg-red-50 text-red-600',
  };
  return (
    <div className="bg-white rounded-2xl shadow-card p-4 lg:p-5">
      <div className={`w-9 h-9 rounded-full flex items-center justify-center ${accentColors[accent]}`}>
        {icon}
      </div>
      <div className="mt-3 text-[24px] lg:text-[28px] font-extrabold text-ink-950 leading-none">
        {value}
      </div>
      <div className="mt-1 text-[12px] lg:text-[13px] text-ink-500 font-medium">{label}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: AssignmentSummary['status'] }) {
  const map = {
    queued: { label: 'Queued', cls: 'bg-ink-100 text-ink-700' },
    processing: { label: 'Generating', cls: 'bg-brand-50 text-brand-600' },
    completed: { label: 'Ready', cls: 'bg-green-50 text-green-700' },
    failed: { label: 'Failed', cls: 'bg-red-50 text-red-600' },
  } as const;
  const m = map[status];
  return (
    <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${m.cls} shrink-0`}>
      {m.label}
    </span>
  );
}

function computeStats(items: AssignmentSummary[]) {
  return items.reduce(
    (acc, a) => {
      acc.total += 1;
      acc[a.status] += 1;
      return acc;
    },
    { total: 0, queued: 0, processing: 0, completed: 0, failed: 0 }
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
}
