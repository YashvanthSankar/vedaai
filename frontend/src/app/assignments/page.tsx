'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Plus,
  Search,
  Filter as FilterIcon,
  MoreVertical,
  Loader2,
  Check,
  ArrowLeft,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  listAssignments,
  deleteAssignment as deleteApi,
} from '@/lib/api';
import type { AssignmentSummary, JobStatus } from '@/lib/types';
import { cn } from '@/lib/cn';
import { EmptyIllustration } from '@/components/EmptyIllustration';
import { Modal } from '@/components/Modal';

type StatusFilter = 'all' | JobStatus;

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'queued', label: 'Queued' },
  { value: 'processing', label: 'Generating' },
  { value: 'completed', label: 'Ready' },
  { value: 'failed', label: 'Failed' },
];

export default function AssignmentsPage() {
  const [items, setItems] = useState<AssignmentSummary[] | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AssignmentSummary | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await listAssignments({ search: search || undefined });
      setItems(r.items);
    } catch {
      setItems([]);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    const close = () => {
      setMenuOpenId(null);
      setFilterOpen(false);
    };
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteApi(pendingDelete._id);
      setPendingDelete(null);
      load();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  const isLoading = items === null;
  const filteredItems =
    items?.filter((a) => filter === 'all' || a.status === filter) ?? [];
  const hasAny = !isLoading && items.length > 0;
  // Only show the empty-state illustration once we *know* there are no items.
  // While loading, render the toolbar shell so the page doesn't flash the
  // "Create Your First Assignment" CTA before swapping to the filled state.
  const isEmpty = !isLoading && !hasAny && !search;

  return (
    <div className="w-full">
      {/* Figma's empty-state screen has no green-dot page header — keep canvas clean. */}
      {!isEmpty && <PageHeader hasAny={hasAny} />}

      {/* Empty state — full-page illustration scene */}
      {isEmpty && <EmptyState />}

      {/* Filled state — toolbar + grid + floating CTA */}
      {!isEmpty && (
        <div className="px-2 lg:px-0">
          <Toolbar
            search={search}
            onSearch={setSearch}
            filter={filter}
            onFilter={setFilter}
            filterOpen={filterOpen}
            onToggleFilter={(e) => {
              e.stopPropagation();
              setFilterOpen((v) => !v);
            }}
          />

          {isLoading ? (
            <div className="flex items-center justify-center py-24 text-ink-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Loading…
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center text-ink-500 py-24 text-[15px]">
              {search
                ? <>No assignments match &ldquo;{search}&rdquo;.</>
                : 'No assignments match this filter.'}
            </div>
          ) : (
            <div className="relative">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pb-32 grid-fade-mask">
                {filteredItems.map((a) => (
                  <AssignmentCard
                    key={a._id}
                    a={a}
                    menuOpen={menuOpenId === a._id}
                    onToggleMenu={(e) => {
                      e.stopPropagation();
                      setMenuOpenId(menuOpenId === a._id ? null : a._id);
                    }}
                    onDelete={() => {
                      setMenuOpenId(null);
                      setPendingDelete(a);
                    }}
                  />
                ))}
              </div>

              {/* Floating Create Assignment pill — sticky to bottom of viewport, centered
                  within the content area via flexbox (not fixed). Content area is the parent
                  div which already has the correct width thanks to pl-[330px] in AppShell. */}
              <div className="hidden lg:flex sticky bottom-8 justify-center w-full z-30 pointer-events-none -mt-16">
                <Link
                  href="/assignments/new"
                  className="pointer-events-auto inline-flex items-center gap-2.5 h-[60px] px-8 rounded-full bg-ink-900 text-white text-[16px] font-semibold btn-stroke-shadow-dark hover:bg-ink-800 active:scale-[0.99] transition-all"
                >
                  <Plus className="w-[20px] h-[20px]" strokeWidth={2.4} />
                  Create Assignment
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      <Modal
        open={pendingDelete !== null}
        onClose={() => (deleting ? null : setPendingDelete(null))}
        title="Delete assignment?"
        subtitle={
          pendingDelete
            ? `“${pendingDelete.title}” will be permanently removed. This can’t be undone.`
            : undefined
        }
        size="sm"
        footer={
          <>
            <button
              onClick={() => setPendingDelete(null)}
              disabled={deleting}
              className="inline-flex items-center justify-center h-11 px-5 rounded-full bg-white border border-ink-200 text-ink-950 text-[14px] font-semibold hover:bg-ink-50 active:scale-[0.99] transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              disabled={deleting}
              className="inline-flex items-center justify-center h-11 px-5 rounded-full bg-brand-500 text-white text-[14px] font-semibold hover:bg-brand-600 active:scale-[0.99] transition-all disabled:opacity-60"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Deleting…
                </>
              ) : (
                'Delete'
              )}
            </button>
          </>
        }
      >
        <div className="h-1" />
      </Modal>
    </div>
  );
}

function PageHeader({ hasAny: _hasAny }: { hasAny: boolean }) {
  const router = useRouter();
  return (
    <div className="flex items-center gap-5 px-1 mb-7">
      {/* Mobile-only 64px circular grey back button + heavy black title (Figma-exact). */}
      <button
        onClick={() => router.back()}
        className="lg:hidden shrink-0 w-16 h-16 rounded-full bg-ink-50 hover:bg-ink-100 active:scale-95 transition-all flex items-center justify-center text-ink-950"
        aria-label="Back"
      >
        <ArrowLeft className="w-[26px] h-[26px]" strokeWidth={2.4} />
      </button>
      <div className="w-3 h-3 rounded-full bg-accent-green shrink-0 hidden lg:block mt-2" />
      <div className="min-w-0">
        <h1 className="text-[22px] lg:text-[28px] font-bold tracking-tight text-ink-950 leading-tight">
          Assignments
        </h1>
        <p className="hidden lg:block text-[14px] lg:text-[15px] text-ink-500 mt-1">
          Manage and create assignments for your classes.
        </p>
      </div>
    </div>
  );
}

function Toolbar({
  search,
  onSearch,
  filter,
  onFilter,
  filterOpen,
  onToggleFilter,
}: {
  search: string;
  onSearch: (v: string) => void;
  filter: StatusFilter;
  onFilter: (v: StatusFilter) => void;
  filterOpen: boolean;
  onToggleFilter: (e: React.MouseEvent) => void;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-card px-4 sm:px-6 py-4 mb-5 flex items-center justify-between gap-3 sm:gap-4">
      <div className="relative shrink-0">
        <button
          onClick={onToggleFilter}
          className="flex items-center gap-2.5 h-12 px-3 -ml-1 text-ink-500 hover:text-ink-900 text-[15px] font-medium whitespace-nowrap"
        >
          <FilterIcon className="w-[18px] h-[18px]" strokeWidth={1.8} />
          Filter By
          {filter !== 'all' && (
            <span className="ml-1 px-2 py-0.5 rounded-full bg-ink-100 text-ink-900 text-xs font-semibold">
              {STATUS_OPTIONS.find((o) => o.value === filter)?.label}
            </span>
          )}
        </button>
        {filterOpen && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute top-full left-0 mt-2 w-56 bg-white rounded-xl shadow-popover border border-ink-100 py-1.5 z-40"
          >
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  onFilter(opt.value);
                  onToggleFilter({ stopPropagation: () => {} } as React.MouseEvent);
                }}
                className="w-full flex items-center justify-between px-4 py-2.5 text-[15px] text-ink-900 hover:bg-ink-50"
              >
                {opt.label}
                {filter === opt.value && <Check className="w-4 h-4 text-ink-900" strokeWidth={2} />}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="relative flex-1 min-w-0 sm:max-w-md sm:ml-auto">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-ink-400" strokeWidth={1.8} />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search Assignment"
          className="w-full h-12 pl-11 pr-4 rounded-full border border-ink-150 bg-white text-[15px] text-ink-900 placeholder:text-ink-400 outline-none focus:border-ink-300 transition-colors"
        />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center pt-2 lg:pt-8 pb-24">
      <EmptyIllustration className="w-[260px] lg:w-[440px] max-w-full h-auto" />
      <h2 className="mt-4 lg:mt-6 text-[20px] lg:text-[22px] font-bold text-ink-950">No assignments yet</h2>
      <p className="mt-3 text-[14px] lg:text-[15px] text-ink-500 max-w-[600px] text-center leading-relaxed px-6">
        Create your first assignment to start collecting and grading student
        submissions. You can set up rubrics, define marking criteria, and let
        AI assist with grading.
      </p>
      <Link
        href="/assignments/new"
        className="mt-5 lg:mt-7 inline-flex items-center gap-2.5 h-[60px] px-8 rounded-full bg-ink-900 text-white text-[16px] font-semibold btn-stroke-shadow-dark hover:bg-ink-800 active:scale-[0.99] transition-all"
      >
        <Plus className="w-[20px] h-[20px]" strokeWidth={2.4} />
        Create Your First Assignment
      </Link>
    </div>
  );
}

function AssignmentCard({
  a,
  menuOpen,
  onToggleMenu,
  onDelete,
}: {
  a: AssignmentSummary;
  menuOpen: boolean;
  onToggleMenu: (e: React.MouseEvent) => void;
  onDelete: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  return (
    <Link
      href={`/assignments/${a._id}`}
      className="block bg-white rounded-2xl shadow-card p-5 lg:p-7 min-h-[160px] lg:min-h-[180px] relative hover:shadow-floating transition-shadow"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-[18px] lg:text-[22px] font-extrabold text-ink-950 leading-snug underline decoration-[1.5px] underline-offset-[6px] decoration-ink-300 line-clamp-2 pr-1">
          {a.title}
        </h3>
        <div className="relative" ref={menuRef} onClick={(e) => e.stopPropagation()}>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleMenu(e);
            }}
            className="-mr-2 -mt-1 w-9 h-9 flex items-center justify-center rounded-full text-ink-400 hover:bg-ink-50 hover:text-ink-900 transition-colors"
            aria-label="More"
          >
            <MoreVertical className="w-5 h-5" strokeWidth={1.8} />
          </button>
          {menuOpen && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 top-10 w-52 bg-white rounded-xl shadow-popover border border-ink-100 py-1.5 z-20"
            >
              <Link
                href={`/assignments/${a._id}`}
                className="block px-5 py-2.5 text-[15px] text-ink-900 hover:bg-ink-50"
              >
                View Assignment
              </Link>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete();
                }}
                className="w-full text-left px-5 py-2.5 text-[15px] text-brand-600 hover:bg-brand-50 font-semibold"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom row: Assigned on (left) — Due (right). On mobile stack vertically if too tight. */}
      <div className="absolute left-5 right-5 lg:left-8 lg:right-8 bottom-5 lg:bottom-7 flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 sm:gap-0 text-[13px] lg:text-[15px] text-ink-950">
        <div>
          <span className="font-bold">Assigned on </span>
          <span className="text-ink-500">: {formatDate(a.createdAt)}</span>
        </div>
        <div>
          <span className="font-bold">Due </span>
          <span className="text-ink-500">: {formatDate(a.dueDate)}</span>
        </div>
      </div>
    </Link>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
}
