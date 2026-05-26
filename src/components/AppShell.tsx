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
        {/* Sidebar — floating white card pinned to full viewport height */}
        <aside className="w-[290px] shrink-0 sticky top-5 h-[calc(100vh-40px)] floating-card rounded-3xl flex flex-col overflow-hidden">
          <div className="px-6 pt-7 pb-5 flex items-center gap-2.5">
            <Logo size={36} />
            <Wordmark className="text-[20px]" />
          </div>

          {/* Dynamic CTA — dark pill with 2px orange outline ring + ~3px gap */}
          <div className="px-5 pb-2">
            <Link
              href={cta.href}
              className="flex items-center justify-center gap-2 w-full h-[50px] rounded-full bg-ink-950 text-white text-[15px] font-medium ring-2 ring-brand-500 ring-offset-[3px] ring-offset-white hover:bg-ink-900 transition-colors"
              aria-label={cta.label}
            >
              <SparklesFilled size={16} className="text-white" />
              {cta.label}
            </Link>
          </div>

          {/* Main nav — sits in the top half of the sidebar */}
          <nav className="px-3 mt-7 flex flex-col gap-1">
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
                    'flex items-center gap-3 px-4 h-12 rounded-xl text-[15px] font-medium transition-colors',
                    active
                      ? 'bg-ink-100 text-ink-950'
                      : 'text-ink-500 hover:bg-ink-50'
                  )}
                >
                  <Icon
                    className={cn('w-[20px] h-[20px] shrink-0', active ? 'text-ink-950' : 'text-ink-400')}
                    strokeWidth={1.6}
                  />
                  <span className="flex-1">{item.label}</span>
                  {count !== undefined && count > 0 ? (
                    <span className="px-2 py-0.5 rounded-full bg-brand-500 text-white text-xs font-bold leading-none min-w-[24px] text-center">
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
                'flex items-center gap-3 px-4 h-12 rounded-xl text-[15px] font-medium transition-colors',
                pathname.startsWith('/settings')
                  ? 'bg-ink-100 text-ink-950'
                  : 'text-ink-500 hover:bg-ink-50'
              )}
            >
              <SettingsIcon className="w-[20px] h-[20px] text-ink-400" strokeWidth={1.6} />
              Settings
            </Link>
          </div>

          {/* School card */}
          <div className="px-4 pb-5">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-ink-50">
              <PortraitAvatar size={48} />
              <div className="leading-tight">
                <div className="text-[15px] font-bold text-ink-950">Delhi Public School</div>
                <div className="text-[13px] text-ink-500 mt-0.5">Bokaro Steel City</div>
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
              <span className="text-[15px] font-semibold text-ink-950">John Doe</span>
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
  // Floating dark pill matching Figma exactly:
  // — Wide pill with substantial vertical padding
  // — Each item: large icon + label below
  // — Active: icon gets a subtle lighter circular highlight, label below in bold white
  // — Inactive: icon in muted white, label in muted white
  // — Subtle top inner highlight on the pill itself
  const items = [
    { href: '/home', label: 'Home', icon: LayoutGrid },
    { href: '/assignments', label: 'Assignments', icon: FileText },
    { href: '/library', label: 'Library', icon: PieChart },
    { href: '/toolkit', label: 'Toolkit', icon: BookOpen },
  ];
  return (
    <nav
      className="fixed bottom-5 left-4 right-4 z-40 mx-auto max-w-[460px] bg-ink-900 rounded-[34px] px-5 py-5 flex items-center justify-around shadow-floating"
      style={{
        backgroundImage:
          'linear-gradient(to bottom, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 30%)',
      }}
    >
      {items.map((item) => {
        const Icon = item.icon;
        const active =
          item.href === '/home'
            ? pathname === '/home' || pathname === '/'
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-col items-center justify-center gap-1.5 min-w-[64px]',
              active ? 'text-white' : 'text-white/60 hover:text-white/85'
            )}
            aria-label={item.label}
          >
            <span
              className={cn(
                'w-12 h-12 flex items-center justify-center rounded-2xl transition-colors',
                active && 'bg-white/10'
              )}
            >
              <Icon className="w-[26px] h-[26px]" strokeWidth={1.8} />
            </span>
            <span
              className={cn(
                'text-[12px] leading-none whitespace-nowrap',
                active ? 'font-bold' : 'font-medium'
              )}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
