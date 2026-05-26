'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bell,
  ChevronDown,
  ArrowLeft,
  LayoutGrid,
  IdCard,
  FileText,
  BookOpen,
  PieChart,
  Settings as SettingsIcon,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/cn';
import { Logo, Wordmark, SparklesFilled } from '@/components/Brand';
import { PortraitAvatar } from '@/components/Avatars';
import { api } from '@/lib/api';
import { useProfile } from '@/lib/profile';

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutGrid;
  countKey?: 'assignments' | 'library';
};

const NAV: NavItem[] = [
  { href: '/home', label: 'Home', icon: LayoutGrid },
  { href: '/groups', label: 'My Groups', icon: IdCard },
  { href: '/assignments', label: 'Assignments', icon: FileText, countKey: 'assignments' },
  { href: '/toolkit', label: "AI Teacher's Toolkit", icon: BookOpen },
  { href: '/library', label: 'My Library', icon: PieChart, countKey: 'library' },
];

/** Resolve the primary CTA + breadcrumb based on current path. */
function deriveShellState(pathname: string) {
  // Sidebar CTA — label + href change per page context
  const cta = (() => {
    if (pathname.startsWith('/assignments')) return { label: 'Create Assignment', href: '/assignments/new' };
    if (pathname.startsWith('/toolkit')) return { label: "AI Teacher's Toolkit", href: '/toolkit' };
    if (pathname.startsWith('/library')) return { label: 'My Library', href: '/library' };
    if (pathname.startsWith('/groups')) return { label: 'My Groups', href: '/groups' };
    if (pathname.startsWith('/home') || pathname === '/') return { label: 'Create Assignment', href: '/assignments/new' };
    return { label: 'Create Assignment', href: '/assignments/new' };
  })();

  // Topbar breadcrumb
  const breadcrumb = (() => {
    if (pathname.startsWith('/assignments/new') || pathname.match(/^\/assignments\/[^/]+$/)) {
      return { icon: 'sparkles' as const, label: 'Create New' };
    }
    if (pathname.startsWith('/assignments')) return { icon: 'grid' as const, label: 'Assignment' };
    if (pathname.startsWith('/toolkit')) return { icon: 'grid' as const, label: "Teacher's Toolkit" };
    if (pathname.startsWith('/library')) return { icon: 'grid' as const, label: 'Library' };
    if (pathname.startsWith('/groups')) return { icon: 'grid' as const, label: 'Groups' };
    return { icon: 'grid' as const, label: 'Home' };
  })();

  return { cta, breadcrumb };
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/';
  const router = useRouter();
  const { cta, breadcrumb } = deriveShellState(pathname);
  const profile = useProfile();

  const [counts, setCounts] = useState<{ assignments?: number; library?: number }>({});

  useEffect(() => {
    let active = true;
    api
      .listAssignments()
      .then((r) => active && setCounts((c) => ({ ...c, assignments: r.total })))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [pathname]);

  return (
    <div className="min-h-screen bg-canvas">
      {/* Desktop layout: gutter padding around the floating sidebar + main column */}
      <div className="hidden lg:flex gap-5 p-5 min-h-screen">
        {/* Sidebar — floating white card pinned to full viewport height. Radius matches Figma 24px. */}
        <aside className="w-[290px] shrink-0 sticky top-5 h-[calc(100vh-40px)] floating-card rounded-[24px] flex flex-col overflow-hidden">
          {/* Logo + Wordmark — matches Figma desktop side-by-side:
              Logo tile 56px, Wordmark 32px ExtraBold (800), gap 12px, vertically centered. */}
          <div className="px-6 pt-7 pb-6">
            <div className="flex items-center gap-3">
              <Logo size={56} />
              <Wordmark className="text-[32px]" />
            </div>
          </div>

          {/* Dynamic CTA — black pill with ORANGE GRADIENT stroke (same gradient as the Figma logo).
              Outer wrapper holds the gradient; a 3px transparent inset creates the dark pill inside. */}
          <div className="px-5 pb-2">
            <Link
              href={cta.href}
              className="block w-full rounded-full active:scale-[0.99] transition-all btn-shadow-dark"
              style={{
                padding: '4px',
                backgroundImage:
                  'linear-gradient(180deg, #FFA259 0%, #F26B1A 50%, #9E2A12 100%)',
              }}
              aria-label={cta.label}
            >
              <span
                className="flex items-center justify-center gap-3 w-full h-[52px] rounded-full text-white text-[17px] font-extrabold"
                style={{
                  backgroundColor: '#181818',
                  // 3px white halo between the gradient ring and the dark pill
                  boxShadow: 'inset 0 0 0 3px #FFFFFF',
                }}
              >
                <span
                  className="flex items-center justify-center gap-3 w-full h-full rounded-full"
                  style={{ backgroundColor: '#181818' }}
                >
                  <SparklesFilled size={20} className="text-white" />
                  {cta.label}
                </span>
              </span>
            </Link>
          </div>

          {/* Main nav — bolder Bricolage 600/700 for stronger Figma match */}
          <nav className="px-3 mt-8 flex flex-col gap-1">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active =
                item.href === '/home'
                  ? pathname === '/home' || pathname === '/'
                  : pathname.startsWith(item.href);
              const count = item.countKey ? counts[item.countKey] : undefined;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-4 h-12 rounded-xl text-[15px] transition-colors',
                    active
                      ? 'bg-ink-100 text-ink-950 font-bold'
                      : 'text-ink-500 hover:bg-ink-50 font-semibold'
                  )}
                >
                  <Icon
                    className={cn('w-[20px] h-[20px] shrink-0', active ? 'text-ink-950' : 'text-ink-400')}
                    strokeWidth={active ? 2 : 1.6}
                  />
                  <span className="flex-1">{item.label}</span>
                  {count !== undefined && count > 0 ? (
                    <span className="px-2 py-0.5 rounded-full bg-brand-500 text-white text-[11px] font-bold leading-none min-w-[26px] text-center">
                      {count}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>

          {/* Flexible spacer so Settings + school card pin to the bottom */}
          <div className="flex-1" />

          {/* Settings */}
          <div className="px-3 pb-2">
            <Link
              href="/settings"
              className={cn(
                'flex items-center gap-3 px-4 h-12 rounded-xl text-[15px] transition-colors',
                pathname.startsWith('/settings')
                  ? 'bg-ink-100 text-ink-950 font-bold'
                  : 'text-ink-500 hover:bg-ink-50 font-semibold'
              )}
            >
              <SettingsIcon className="w-[20px] h-[20px] text-ink-400" strokeWidth={1.6} />
              Settings
            </Link>
          </div>

          {/* School card — live from profile */}
          <div className="px-4 pb-5">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-ink-50">
              <PortraitAvatar size={48} />
              <div className="leading-tight min-w-0">
                <div className="text-[15px] font-bold text-ink-950 truncate">
                  {shortSchoolName(profile?.schoolName) ?? 'Delhi Public School'}
                </div>
                <div className="text-[13px] text-ink-500 mt-0.5 truncate">
                  {profile?.schoolLocation ?? 'Bokaro Steel City'}
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main column */}
        <div className="flex-1 flex flex-col min-w-0 gap-5">
          {/* Floating topbar card */}
          <header className="floating-card rounded-3xl h-[88px] px-6 flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="w-11 h-11 rounded-full bg-white border border-ink-100 shadow-card flex items-center justify-center text-ink-950 hover:bg-ink-50 transition-colors"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5" strokeWidth={1.8} />
            </button>
            <div className="flex items-center gap-3 text-ink-500">
              {breadcrumb.icon === 'sparkles' ? (
                <SparklesFilled size={20} className="text-ink-400" />
              ) : (
                <LayoutGrid className="w-5 h-5 text-ink-400" strokeWidth={1.6} />
              )}
              <span className="text-[17px] font-medium">{breadcrumb.label}</span>
            </div>
            <div className="flex-1" />
            <button
              className="relative w-11 h-11 rounded-full flex items-center justify-center text-ink-900 hover:bg-ink-50 transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-[22px] h-[22px]" strokeWidth={1.8} />
              <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-brand-500 border-2 border-white" />
            </button>
            <button className="flex items-center gap-2.5 pl-2 pr-3 h-12 rounded-full bg-white border border-ink-100 shadow-card hover:bg-ink-50 transition-colors">
              <PortraitAvatar size={36} />
              <span className="text-[15px] font-semibold text-ink-950 max-w-[140px] truncate">
                {profile?.teacherName ?? 'John Doe'}
              </span>
              <ChevronDown className="w-4 h-4 text-ink-400" strokeWidth={2} />
            </button>
          </header>

          {/* Page content */}
          <main className="flex-1 min-h-0">{children}</main>
        </div>
      </div>

      {/* Mobile layout: bottom tab bar */}
      <div className="lg:hidden flex flex-col min-h-screen pb-[140px]">
        <header className="floating-card rounded-2xl mx-4 mt-4 h-16 px-4 flex items-center gap-2.5">
          <Logo size={32} />
          <Wordmark className="text-[18px]" />
          <div className="flex-1" />
          <button className="relative w-10 h-10 rounded-full flex items-center justify-center text-ink-900" aria-label="Notifications">
            <Bell className="w-5 h-5" strokeWidth={1.8} />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-brand-500 border border-white" />
          </button>
          <PortraitAvatar size={36} />
        </header>
        <main className="flex-1 p-4">{children}</main>
        <MobileTabBar pathname={pathname} />
      </div>
    </div>
  );
}

function MobileTabBar({ pathname }: { pathname: string }) {
  // Pixel-perfect Figma mobile bar:
  // — Wide dark pill with subtle top highlight gradient
  // — Active: icon is FILLED (not outline) + larger + bold label
  // — Inactive: icon outline, muted text
  // — Floating "+" FAB to the right, partially overlapping the bar
  const items: { href: string; label: string; outline: typeof LayoutGrid; filled: typeof LayoutGrid }[] = [
    { href: '/home', label: 'Home', outline: LayoutGrid, filled: LayoutGrid },
    { href: '/assignments', label: 'Assignments', outline: FileText, filled: FileText },
    { href: '/library', label: 'Library', outline: PieChart, filled: PieChart },
    { href: '/toolkit', label: 'AI Toolkit', outline: BookOpen, filled: BookOpen },
  ];
  return (
    <>
      {/* Mobile bottom bar — Figma exact:
          Full-width minus gutter, h-72, radius 24px, items distributed evenly.
          No top highlight gradient; just a flat dark pill with a soft drop shadow underneath. */}
      <nav
        className="fixed bottom-5 left-4 right-4 z-40 h-[72px] bg-ink-900 rounded-[24px] flex items-center justify-around px-4"
        style={{
          boxShadow: '0 12px 28px rgba(20, 20, 30, 0.22), 0 4px 8px rgba(20, 20, 30, 0.10)',
        }}
      >
        {items.map((item) => {
          const Icon = item.outline;
          const active =
            item.href === '/home'
              ? pathname === '/home' || pathname === '/'
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 px-2 py-1 min-w-[64px]',
                active ? 'text-white' : 'text-white/55 hover:text-white/85'
              )}
              aria-label={item.label}
            >
              <Icon
                className={cn(active ? 'w-[30px] h-[30px]' : 'w-[24px] h-[24px]')}
                strokeWidth={active ? 2.4 : 1.8}
                fill={active ? 'currentColor' : 'none'}
              />
              <span
                className={cn(
                  'leading-none whitespace-nowrap',
                  active ? 'text-[13px] font-bold' : 'text-[12px] font-medium'
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
      {/* Floating "+" FAB — Figma exact: positioned ABOVE the bar with clear separation,
          not overlapping. Bar is at bottom-5 with h-72, so FAB sits at bottom-[112px] = above bar. */}
      <Link
        href="/assignments/new"
        className="fixed right-4 z-50 w-16 h-16 rounded-full bg-white flex items-center justify-center active:scale-95 transition-transform"
        style={{
          bottom: '108px',
          boxShadow: '0 8px 20px rgba(20, 20, 30, 0.18), 0 2px 4px rgba(20, 20, 30, 0.10)',
        }}
        aria-label="Create Assignment"
      >
        <span className="text-brand-500 text-[40px] leading-none font-light" style={{ marginTop: '-4px' }}>+</span>
      </Link>
    </>
  );
}

/**
 * Trims "Delhi Public School, Sector-4, Bokaro" → "Delhi Public School"
 * so the school name fits inside the sidebar card without truncation.
 */
function shortSchoolName(full?: string): string | undefined {
  if (!full) return undefined;
  return full.split(',')[0].trim();
}
