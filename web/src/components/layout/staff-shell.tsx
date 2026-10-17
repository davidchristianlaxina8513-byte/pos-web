'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from '@/features/auth/actions';
import type { UserRole } from '@/features/auth/roles';
import { Avatar } from '@/components/common/Avatar';
import {
  ArrowRightOnRectangleIcon,
  BanknotesIcon,
  Bars3Icon,
  BookOpenIcon,
  CalendarDaysIcon,
  ChartBarSquareIcon,
  ChevronDownIcon,
  ClipboardDocumentCheckIcon,
  Cog6ToothIcon,
  ShoppingCartIcon,
  Squares2X2Icon,
  UsersIcon,
  XMarkIcon,
} from '@/components/common/hero-icons';
import { LeafMark } from '@/components/common/icons';
import {
  Breadcrumbs,
  type BreadcrumbItem,
} from '@/components/common/Breadcrumbs';
import { PreferencesProvider } from '@/components/modules/settings/PreferencesProvider';
import { cn } from '@/lib/cn';

interface NavEntry {
  href: string;
  label: string;
  icon: ReactNode;
}

const ADMIN_NAV: NavEntry[] = [
  { href: '/admin', label: 'Dashboard', icon: <Squares2X2Icon /> },
  { href: '/pos', label: 'Point of Sale', icon: <ShoppingCartIcon /> },
  { href: '/admin/menu', label: 'Menu Management', icon: <BookOpenIcon /> },
  {
    href: '/today-products',
    label: "Today's Products",
    icon: <CalendarDaysIcon />,
  },
  { href: '/admin/reports', label: 'Reports', icon: <ChartBarSquareIcon /> },
  {
    href: '/admin/cashier-operations',
    label: 'Cashier Operations',
    icon: <BanknotesIcon />,
  },
  { href: '/admin/users', label: 'Users', icon: <UsersIcon /> },
  {
    href: '/admin/audit',
    label: 'Audit Log',
    icon: <ClipboardDocumentCheckIcon />,
  },
  { href: '/admin/settings', label: 'Settings', icon: <Cog6ToothIcon /> },
];

const CASHIER_NAV: NavEntry[] = [
  { href: '/dashboard', label: 'Dashboard', icon: <Squares2X2Icon /> },
  { href: '/pos', label: 'Point of Sale', icon: <ShoppingCartIcon /> },
  { href: '/menu', label: 'Menu', icon: <BookOpenIcon /> },
  {
    href: '/today-products',
    label: "Today's Products",
    icon: <CalendarDaysIcon />,
  },
  { href: '/daily-sales', label: 'Daily Sales', icon: <ChartBarSquareIcon /> },
  {
    href: '/cashier-operations',
    label: 'Cashier Operations',
    icon: <BanknotesIcon />,
  },
  { href: '/profile', label: 'Profile', icon: <Cog6ToothIcon /> },
];

export interface StaffShellProps {
  email: string;
  role: UserRole;
  title?: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: ReactNode;
  fullWidth?: boolean;
  children: ReactNode;
}

/**
 * DCASIS-style user menu dropdown.
 * Clicking the user account pill opens a menu displaying Settings and Sign out.
 */
function UserMenu({
  email,
  role,
  profileHref,
}: {
  email: string;
  role: UserRole;
  profileHref: string;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="User account menu"
        className="-m-1.5 flex items-center p-1.5 rounded-2xl hover:bg-mist/80 transition-colors focus:outline-none cursor-pointer"
      >
        <Avatar name={email} />
        <span className="flex items-center">
          <span className="ml-3 hidden sm:block text-left">
            <span className="block text-sm font-semibold leading-5 text-foreground">
              {email}
            </span>
            <span className="block text-[11px] font-medium text-muted capitalize leading-none mt-0.5">
              {role} Account
            </span>
          </span>
          <ChevronDownIcon
            className={cn(
              'ml-2 h-4 w-4 text-muted transition-transform duration-150',
              open && 'rotate-180',
            )}
            aria-hidden="true"
          />
        </span>
      </button>

      {open && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 z-50 mt-2.5 w-48 origin-top-right rounded-xl border border-border/80 bg-surface py-1.5 shadow-lg ring-1 ring-black/5 focus:outline-none"
        >
          <div className="border-b border-border/70 px-3 py-2 sm:hidden">
            <p className="truncate text-xs font-bold text-foreground">
              {email}
            </p>
            <p className="text-[11px] text-muted capitalize">{role} Account</p>
          </div>

          <Link
            href={profileHref}
            onClick={() => setOpen(false)}
            role="menuitem"
            className="flex items-center gap-x-2.5 px-3 py-2.5 text-sm font-medium text-foreground hover:bg-mist transition-colors cursor-pointer"
          >
            <Cog6ToothIcon className="h-4 w-4 text-muted" aria-hidden="true" />
            <span>Settings</span>
          </Link>

          <form action={signOut}>
            <button
              type="submit"
              role="menuitem"
              className="flex w-full items-center gap-x-2.5 px-3 py-2.5 text-sm font-medium text-danger hover:bg-danger-surface transition-colors cursor-pointer"
            >
              <ArrowRightOnRectangleIcon
                className="h-4 w-4 text-danger"
                aria-hidden="true"
              />
              <span>Sign out</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

/**
 * Modern Tailwind CSS Dashboard Shell with Heroicons.
 * Features a fixed-width dashboard sidebar on desktop, responsive slide-out drawer on mobile.
 */
function StaffShellContent({
  email,
  role,
  title,
  subtitle,
  breadcrumbs,
  actions,
  fullWidth,
  children,
}: StaffShellProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const items = role === 'admin' ? ADMIN_NAV : CASHIER_NAV;
  const profileHref = role === 'admin' ? '/admin/settings' : '/profile';

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className="min-h-screen bg-mist text-foreground lg:flex">
      {/* Mobile Backdrop */}
      {open ? (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm print:hidden lg:hidden"
        />
      ) : null}

      {/* Tailwind Dashboard Sidebar */}
      <aside
        id="staff-primary-nav"
        aria-label="Primary"
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 max-w-[85vw] flex-col border-r border-border/80 bg-surface transition-transform duration-200 ease-in-out print:hidden',
          open ? 'translate-x-0 shadow-2xl' : '-translate-x-full',
          'lg:static lg:z-auto lg:translate-x-0 lg:shadow-none',
        )}
      >
        {/* Brand Header: Logo on Top, Title on Bottom */}
        <div className="relative flex shrink-0 flex-col items-center border-b border-border/70 px-4 py-5 text-center">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-mist hover:text-foreground lg:hidden"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>

          {/* Logo on Top */}
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-pine text-surface shadow-soft">
            <LeafMark className="h-7 w-7" />
          </div>

          {/* Title on Bottom */}
          <div className="mt-3 w-full">
            <h2 className="px-1 text-sm font-extrabold leading-snug tracking-tight text-foreground sm:text-base">
              Integrated POS and stock monitoring system
            </h2>
          </div>
        </div>

        {/* Navigation List */}
        <nav
          aria-label="Staff sections"
          className="flex-1 overflow-y-auto px-3 py-4"
        >
          <div className="mb-2 px-3 text-xs font-semibold text-muted/70 uppercase tracking-wider">
            Menu
          </div>
          <ul className="flex flex-col gap-1">
            {items.map((entry) => {
              const active = pathname === entry.href;
              return (
                <li key={entry.href}>
                  <Link
                    href={entry.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-150',
                      active
                        ? 'bg-pine text-surface shadow-xs'
                        : 'text-foreground/80 hover:bg-mist hover:text-foreground',
                    )}
                  >
                    <span
                      className={cn(
                        'transition-colors',
                        active
                          ? 'text-surface'
                          : 'text-muted group-hover:text-foreground',
                      )}
                    >
                      {entry.icon}
                    </span>
                    <span className="truncate">{entry.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="min-w-0 flex-1 flex flex-col">
        {/* Top Header Bar (Desktop & Mobile) */}
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between border-b border-border/70 bg-surface px-4 sm:px-6 lg:px-8 print:hidden">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              aria-controls="staff-primary-nav"
              onClick={() => setOpen((value) => !value)}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-foreground hover:bg-mist lg:hidden"
            >
              {open ? (
                <XMarkIcon className="h-5 w-5" />
              ) : (
                <Bars3Icon className="h-5 w-5" />
              )}
            </button>
          </div>

          {/* User Profile Dropdown at Top Right (DCASIS Style) */}
          <div className="flex items-center ml-auto">
            <UserMenu email={email} role={role} profileHref={profileHref} />
          </div>
        </header>

        {/* Page Container */}
        <main
          className={cn(
            'animate-page-enter w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-10',
            fullWidth ? 'max-w-none' : 'mx-auto max-w-7xl',
          )}
        >
          {title || actions ? (
            <div className="mb-6 print:hidden">
              <Breadcrumbs
                pages={
                  breadcrumbs ?? [
                    {
                      name: title ?? 'Dashboard',
                      current: true,
                    },
                  ]
                }
                homeHref={role === 'admin' ? '/admin' : '/dashboard'}
              />

              <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  {title ? (
                    <h1 className="text-3xl font-bold tracking-tight text-pine">
                      {title}
                    </h1>
                  ) : null}
                  {subtitle ? (
                    <p className="mt-1 text-sm text-slate-500 leading-relaxed">
                      {subtitle}
                    </p>
                  ) : null}
                </div>
                {actions ? (
                  <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                    {actions}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
          {children}
        </main>
      </div>
    </div>
  );
}

/** Loads account-scoped display preferences around every staff screen. */
export function StaffShell(props: StaffShellProps) {
  return (
    <PreferencesProvider identity={props.email}>
      <StaffShellContent {...props} />
    </PreferencesProvider>
  );
}
