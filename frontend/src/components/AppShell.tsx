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
  Info,
  Menu,
  X as XIcon,
  Pencil,
  Calendar,
  FilePlus2,
  Sparkles,
  Plus,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/cn';
import { Logo, Wordmark, SparklesFilled } from '@/components/Brand';
import { PortraitAvatar, SchoolCrest } from '@/components/Avatars';
import { ProfileEditModal, SchoolEditModal } from '@/components/EditModals';
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
  { href: '/assignments', label: 'Assignments', icon: Calendar, countKey: 'assignments' },
  { href: '/toolkit', label: "AI Teacher's Toolkit", icon: Sparkles },
  { href: '/library', label: 'My Library', icon: FilePlus2, countKey: 'library' },
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

  // Topbar breadcrumb — Figma keeps "Assignment" across all /assignments/* routes.
  type BreadcrumbIcon = 'grid' | 'sparkles';
  const breadcrumb: { icon: BreadcrumbIcon; label: string } = (() => {
    if (pathname.startsWith('/assignments')) return { icon: 'grid', label: 'Assignment' };
    if (pathname.startsWith('/toolkit')) return { icon: 'sparkles', label: "Teacher's Toolkit" };
    if (pathname.startsWith('/library')) return { icon: 'grid', label: 'Library' };
    if (pathname.startsWith('/groups')) return { icon: 'grid', label: 'Groups' };
    return { icon: 'grid', label: 'Home' };
  })();

  return { cta, breadcrumb };
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/';
  const router = useRouter();
  const { cta, breadcrumb } = deriveShellState(pathname);
  const profile = useProfile();

  const [counts, setCounts] = useState<{ assignments?: number; library?: number }>({});
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [schoolModalOpen, setSchoolModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    let active = true;
    api
      .listAssignments({ limit: 200 })
      .then((r) => {
        if (!active) return;
        const libraryCount = r.items.filter((a) => a.status === 'completed').length;
        setCounts({ assignments: r.total, library: libraryCount });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [pathname]);

  return (
    <div className="min-h-screen bg-canvas">
      {/* Desktop layout: fixed sidebar + main column offset to its right.
          Sidebar is position: fixed so it stays put across every page regardless of content height. */}
      <div className="hidden lg:block min-h-screen">
        {/* Sidebar — fixed white card, viewport-tall, pinned to top-left with gutter */}
        <aside className="fixed left-5 top-5 z-30 w-[290px] h-[calc(100vh-40px)] floating-card rounded-[32px] flex flex-col overflow-hidden">
          {/* Logo + Wordmark — entire row links to /home. */}
          <Link
            href="/home"
            className="block px-6 pt-7 pb-6 hover:opacity-90 transition-opacity"
            aria-label="VedaAI Home"
          >
            <div className="flex items-center gap-3">
              <Logo size={56} />
              <Wordmark className="text-[32px]" />
            </div>
          </Link>

          {/* Dynamic CTA — black pill with ORANGE GRADIENT stroke. Interactive:
              - Hover: gradient ring brightens, soft glow under the pill, sparkles wiggle
              - Active: subtle press-down scale
              - Sparkles animate continuously on hover via group-hover. */}
          <div className="px-5 pb-2">
            <Link
              href={cta.href}
              className="group block w-full rounded-full transition-all duration-200 btn-shadow-dark hover:scale-[1.015] active:scale-[0.98] hover:shadow-[0_10px_30px_-6px_rgba(196,70,31,0.45)]"
              style={{
                padding: '3px',
                backgroundImage:
                  'linear-gradient(180deg, #FFB37A 0%, #F47A30 60%, #C7461F 100%)',
              }}
              aria-label={cta.label}
            >
              <span
                className="flex items-center justify-center gap-3 w-full h-[58px] rounded-full text-white text-[17px] font-extrabold transition-colors group-hover:bg-[#222]"
                style={{
                  backgroundColor: '#181818',
                  boxShadow: 'inset 0 0 0 3px #FFFFFF',
                }}
              >
                <span
                  className="flex items-center justify-center gap-3 w-full h-full rounded-full"
                  style={{ backgroundColor: 'inherit' }}
                >
                  <span className="inline-block group-hover:animate-cta-sparkle">
                    <SparklesFilled size={20} className="text-white" />
                  </span>
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
                    'flex items-center gap-3 px-4 h-[52px] rounded-[14px] text-[15px] transition-colors',
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

          {/* Settings — Figma keeps Credits out of the sidebar */}
          <div className="px-3 pb-2">
            <Link
              href="/settings"
              className={cn(
                'flex items-center gap-3 px-4 h-[52px] rounded-[14px] text-[15px] transition-colors',
                pathname.startsWith('/settings')
                  ? 'bg-ink-100 text-ink-950 font-bold'
                  : 'text-ink-500 hover:bg-ink-50 font-semibold'
              )}
            >
              <SettingsIcon className="w-[20px] h-[20px] text-ink-400" strokeWidth={1.6} />
              Settings
            </Link>
          </div>

          {/* School card — live from profile. Click opens SchoolEditModal. */}
          <div className="px-4 pb-5">
            <button
              onClick={() => setSchoolModalOpen(true)}
              className="w-full flex items-center gap-3 p-3 rounded-[20px] bg-ink-50 hover:bg-ink-100 transition-colors text-left"
              aria-label="Edit school"
            >
              <SchoolCrest size={48} />
              <div className="leading-tight min-w-0">
                <div className="text-[15px] font-bold text-ink-950 truncate">
                  {shortSchoolName(profile?.schoolName) ?? 'Delhi Public School'}
                </div>
                <div className="text-[13px] text-ink-500 mt-0.5 truncate">
                  {profile?.schoolLocation ?? 'Bokaro Steel City'}
                </div>
              </div>
            </button>
          </div>
        </aside>

        {/* Main column — offset to the right of the fixed sidebar (290px + 20px left + 20px gap = 330px) */}
        <div className="flex flex-col min-w-0 gap-5 pl-[330px] pr-5 pt-5 pb-5 min-h-screen">
          {/* Floating topbar card */}
          <header className="sticky top-5 z-20 floating-card rounded-[28px] h-[88px] px-6 flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="w-12 h-12 rounded-full bg-white border border-ink-100 shadow-card flex items-center justify-center text-ink-950 hover:bg-ink-50 transition-colors"
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
              <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-brand-500 border-2 border-white animate-pulse-dot" />
            </button>
            <button
              onClick={() => setProfileModalOpen(true)}
              className="flex items-center gap-2.5 pl-2 pr-3 h-12 rounded-full bg-white border border-ink-100 shadow-card hover:bg-ink-50 transition-colors"
              aria-label="Edit profile"
            >
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

      {/* Shared bottom fade-blur band — works for both desktop and mobile.
          Two stacked layers create a progressively-stronger blur near the
          bottom: a faint outer layer covers the top of the band with light
          blur, an inner layer near the bottom adds heavier blur. Both
          layers are masked so the effect smoothly fades from transparent
          (top edge) to opaque (bottom edge) and the page canvas color is
          tinted in via a soft gradient. */}
      <div className="fixed bottom-0 left-0 right-0 z-10 pointer-events-none" aria-hidden>
        {/* Outer light blur — covers a tall band so distant content softens early */}
        <div
          className="absolute bottom-0 left-0 right-0 h-[180px]"
          style={{
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            maskImage: 'linear-gradient(to bottom, transparent 0%, black 70%)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 70%)',
          }}
        />
        {/* Inner stronger blur — concentrated near the bottom edge */}
        <div
          className="absolute bottom-0 left-0 right-0 h-[120px]"
          style={{
            backdropFilter: 'blur(20px) saturate(160%)',
            WebkitBackdropFilter: 'blur(20px) saturate(160%)',
            maskImage: 'linear-gradient(to bottom, transparent 0%, black 55%)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 55%)',
          }}
        />
        {/* Color tint — fades the page canvas in so the content visually
            dissolves into the background rather than ending sharply. */}
        <div
          className="absolute bottom-0 left-0 right-0 h-[160px]"
          style={{
            background:
              'linear-gradient(to top, var(--canvas) 0%, color-mix(in srgb, var(--canvas) 60%, transparent) 50%, transparent 100%)',
          }}
        />
      </div>

      {/* Mobile layout: bottom tab bar.
          pb-24 (96px) reserves room for the bar (h-72 + 20px gutter = 92px) but
          lets content extend INTO the bottom fade-blur band so the band has
          something to actually blur. */}
      <div className="lg:hidden flex flex-col min-h-screen pb-24">
        {/* Mobile topbar — Figma reference:
            - Floating white card, generous rounded corners (~28px)
            - Logo + wordmark on the left
            - Bell sits on a light-grey circular background with the orange dot badge
            - Avatar circle, hamburger as a plain icon
            - Generous internal padding */}
        <header className="sticky top-4 z-20 floating-card rounded-[22px] mx-4 mt-4 h-[68px] pl-4 pr-3 flex items-center gap-3">
          <Link href="/home" className="flex items-center gap-2.5" aria-label="VedaAI Home">
            <Logo size={34} />
            <Wordmark className="text-[20px]" />
          </Link>
          <div className="flex-1" />
          <button
            className="relative w-11 h-11 rounded-full bg-ink-50 flex items-center justify-center text-ink-900 active:scale-95 transition-transform"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" strokeWidth={1.8} />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-brand-500 ring-2 ring-white" />
          </button>
          <button
            onClick={() => setProfileModalOpen(true)}
            className="w-11 h-11 rounded-full overflow-hidden active:scale-95 transition-transform"
            aria-label="Edit profile"
          >
            <PortraitAvatar size={44} />
          </button>
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="w-10 h-10 flex items-center justify-center text-ink-950 active:scale-95 transition-transform"
            aria-label="Menu"
          >
            <Menu className="w-[26px] h-[26px]" strokeWidth={2} />
          </button>
        </header>
        <main className="flex-1 px-4 pt-6">{children}</main>
        <MobileTabBar pathname={pathname} />
      </div>

      {/* Mobile menu sheet */}
      {mobileMenuOpen && (
        <MobileMenuSheet
          onClose={() => setMobileMenuOpen(false)}
          onEditProfile={() => {
            setMobileMenuOpen(false);
            setProfileModalOpen(true);
          }}
          onEditSchool={() => {
            setMobileMenuOpen(false);
            setSchoolModalOpen(true);
          }}
          profileName={profile?.teacherName ?? 'John Doe'}
          schoolName={shortSchoolName(profile?.schoolName) ?? 'Delhi Public School'}
          schoolLocation={profile?.schoolLocation ?? 'Bokaro Steel City'}
        />
      )}

      {/* Edit modals — global, shared across desktop + mobile */}
      <ProfileEditModal open={profileModalOpen} onClose={() => setProfileModalOpen(false)} />
      <SchoolEditModal open={schoolModalOpen} onClose={() => setSchoolModalOpen(false)} />
    </div>
  );
}

function MobileTabBar({ pathname }: { pathname: string }) {
  // Pixel-perfect Figma mobile bar:
  // — Wide dark pill with subtle top highlight gradient
  // — Active: icon is FILLED (not outline) + larger + bold label
  // — Inactive: icon outline, muted text
  // — Floating "+" FAB to the right, partially overlapping the bar
  const items: { href: string; label: string; icon: typeof LayoutGrid }[] = [
    { href: '/home', label: 'Home', icon: LayoutGrid },
    { href: '/assignments', label: 'Assignments', icon: Calendar },
    { href: '/library', label: 'Library', icon: FilePlus2 },
    { href: '/toolkit', label: 'AI Toolkit', icon: Sparkles },
  ];
  return (
    <>
      {/* Mobile bottom bar — Figma exact:
          Wide dark pill with softly rounded corners (~22px), h-72.
          Active item shows a filled icon + bold white label; inactive items
          fade to muted white. Flat dark pill with a soft drop shadow underneath. */}
      <nav
        className="fixed bottom-5 left-4 right-4 z-40 h-[72px] bg-ink-900 rounded-[22px] flex items-center justify-around px-3"
        style={{
          boxShadow: '0 12px 28px rgba(20, 20, 30, 0.22), 0 4px 8px rgba(20, 20, 30, 0.10)',
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
                'flex flex-col items-center justify-center gap-1 px-2 py-1 min-w-[64px]',
                active ? 'text-white' : 'text-white/50 hover:text-white/80'
              )}
              aria-label={item.label}
            >
              <Icon
                className={cn(active ? 'w-[26px] h-[26px]' : 'w-[22px] h-[22px]')}
                strokeWidth={active ? 2.2 : 1.8}
                fill={active ? 'currentColor' : 'none'}
              />
              <span
                className={cn(
                  'leading-none whitespace-nowrap',
                  active ? 'text-[12px] font-bold' : 'text-[11px] font-medium'
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
      {/* Floating "+" FAB — Figma reference:
          - White circle, sits directly above the bottom bar, horizontally centered-right
          - Bright orange "+" inside (brand-500), medium weight
          - Strong backdrop-blur halo behind so the content it overlaps blurs through
          - Hidden only on /assignments/new (already on the create page). */}
      {!pathname.startsWith('/assignments/new') && (
        <Link
          href="/assignments/new"
          className="fixed right-5 z-50 active:scale-95 transition-transform w-14 h-14 rounded-full bg-white flex items-center justify-center"
          style={{
            bottom: '108px',
            boxShadow: '0 10px 24px rgba(20, 20, 30, 0.18), 0 2px 6px rgba(20, 20, 30, 0.10)',
          }}
          aria-label="Create Assignment"
        >
          <Plus className="w-[28px] h-[28px] text-brand-500" strokeWidth={2.2} />
        </Link>
      )}
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

/**
 * Mobile menu sheet — slides down from the top, holding Settings / Credits /
 * Edit Profile / Edit School entries. Triggered by the hamburger button on
 * the mobile topbar; closes on overlay tap or route change.
 */
function MobileMenuSheet({
  onClose,
  onEditProfile,
  onEditSchool,
  profileName,
  schoolName,
  schoolLocation,
}: {
  onClose: () => void;
  onEditProfile: () => void;
  onEditSchool: () => void;
  profileName: string;
  schoolName: string;
  schoolLocation: string;
}) {
  // Lock body scroll while sheet is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div
      className="lg:hidden fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute top-0 left-0 right-0 bg-white rounded-b-3xl shadow-floating p-5 pb-6 animate-sheet-down"
      >
        {/* Header row */}
        <div className="flex items-center justify-between mb-5">
          <div className="text-[18px] font-bold text-ink-950">Menu</div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full hover:bg-ink-50 flex items-center justify-center text-ink-700"
            aria-label="Close menu"
          >
            <XIcon className="w-5 h-5" strokeWidth={2} />
          </button>
        </div>

        {/* Profile + School edit shortcuts */}
        <button
          onClick={onEditProfile}
          className="w-full flex items-center gap-3 p-3 rounded-2xl bg-ink-50 hover:bg-ink-100 transition-colors mb-3 text-left"
        >
          <PortraitAvatar size={44} />
          <div className="flex-1 min-w-0">
            <div className="text-[14px] font-bold text-ink-950 truncate">{profileName}</div>
            <div className="text-[12px] text-ink-500">Tap to edit profile</div>
          </div>
          <Pencil className="w-4 h-4 text-ink-400" strokeWidth={1.8} />
        </button>

        <button
          onClick={onEditSchool}
          className="w-full flex items-center gap-3 p-3 rounded-2xl bg-ink-50 hover:bg-ink-100 transition-colors mb-5 text-left"
        >
          <SchoolCrest size={44} />
          <div className="flex-1 min-w-0">
            <div className="text-[14px] font-bold text-ink-950 truncate">{schoolName}</div>
            <div className="text-[12px] text-ink-500 truncate">{schoolLocation}</div>
          </div>
          <Pencil className="w-4 h-4 text-ink-400" strokeWidth={1.8} />
        </button>

        {/* Nav links */}
        <div className="space-y-1">
          <Link
            href="/settings"
            className="flex items-center gap-3 px-4 h-12 rounded-xl text-[15px] font-semibold text-ink-950 hover:bg-ink-50"
          >
            <SettingsIcon className="w-[20px] h-[20px] text-ink-500" strokeWidth={1.8} />
            Settings
          </Link>
          <Link
            href="/credits"
            className="flex items-center gap-3 px-4 h-12 rounded-xl text-[15px] font-semibold text-ink-950 hover:bg-ink-50"
          >
            <Info className="w-[20px] h-[20px] text-ink-500" strokeWidth={1.8} />
            Credits
          </Link>
        </div>
      </div>
    </div>
  );
}
