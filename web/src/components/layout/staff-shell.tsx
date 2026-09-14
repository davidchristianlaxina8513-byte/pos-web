'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from '@/features/auth/actions';
import type { UserRole } from '@/features/auth/roles';
import { Avatar } from '@/components/common/Avatar';
import { cn } from '@/lib/cn';
import {
  BoxIcon,
  CartIcon,
  ChartIcon,
  CloseIcon,
  CupIcon,
  CycleIcon,
  GearIcon,
  LeafMark,
  MenuIcon,
  PersonIcon,
  ReceiptIcon,
  SignOutIcon,
} from '@/components/common/icons';

interface NavEntry {
  href: string;
  label: string;
  icon: ReactNode;
}

const ADMIN_NAV: NavEntry[] = [
  { href: '/admin', label: 'Dashboard', icon: <ChartIcon /> },
  { href: '/pos', label: 'Register', icon: <CartIcon /> },
  { href: '/admin/inventory', label: 'Inventory', icon: <BoxIcon /> },
  { href: '/admin/menu', label: 'Menu', icon: <CupIcon /> },
  { href: '/admin/restock', label: 'Restock', icon: <CycleIcon /> },
  { href: '/admin/reports', label: 'Reports', icon: <ReceiptIcon /> },
  { href: '/admin/users', label: 'Users', icon: <PersonIcon /> },
  { href: '/admin/settings', label: 'Settings', icon: <GearIcon /> },
];

const CASHIER_NAV: NavEntry[] = [
  { href: '/pos', label: 'Register', icon: <CartIcon /> },
];

export interface StaffShellProps {
  email: string;
  role: UserRole;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}

/**
 * Shared staff chrome: static sidebar on desktop (`lg:`), hamburger-driven
 * drawer on mobile. Pages pass title/actions; the sidebar owns global nav so
 * pages no longer need per-page "Back to …" pills. Role gating stays
 * server-side (`requireRole`/`requireStaff` per page) — the nav list here is
 * an affordance only and never grants access.
 */
export function StaffShell({
  email,
  role,
  title,
  subtitle,
  actions,
  children,
}: StaffShellProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const items = role === 'admin' ? ADMIN_NAV : CASHIER_NAV;
  // Admins own a full settings page (personal info + password); cashiers
  // get a lightweight profile view — never an admin route.
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
      {open ? (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-pine-deep/50 print:hidden lg:hidden"
        />
      ) : null}
      <aside
        id="staff-primary-nav"
        aria-label="Primary"
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-border bg-surface transition-transform print:hidden',
          open ? 'translate-x-0' : '-translate-x-full',
          'lg:static lg:z-auto lg:translate-x-0',
        )}
      >
        <div className="flex items-center gap-2 px-4 py-3">
          <span
            aria-hidden="true"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-pine text-surface"
          >
            <LeafMark />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-extrabold tracking-tight">
              Cafe Elvira
            </span>
            <span className="block text-xs text-muted capitalize">{role}</span>
          </span>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="flex h-11 w-11 items-center justify-center rounded-full text-pine-deep lg:hidden"
          >
            <CloseIcon />
          </button>
        </div>
        <nav
          aria-label="Staff sections"
          className="flex-1 overflow-y-auto px-2 pb-2"
        >
          <ul className="flex flex-col gap-1">
            {items.map((entry) => {
              const active = pathname === entry.href;
              return (
                <li key={entry.href}>
                  <Link
                    href={entry.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-3 rounded-2xl px-3 py-2 text-[15px] font-semibold',
                      active
                        ? 'bg-pine text-surface'
                        : 'text-foreground hover:bg-mist',
                    )}
                  >
                    <span aria-hidden="true">{entry.icon}</span>
                    {entry.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="border-t border-border p-3">
          <Link
            href={profileHref}
            aria-label="View profile"
            className="flex items-center gap-2 rounded-2xl px-1 py-1 hover:bg-mist"
          >
            <Avatar name={email} />
            <p className="min-w-0 flex-1 truncate text-xs text-muted">
              {email}
            </p>
          </Link>
          <form action={signOut} className="mt-2">
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold shadow-soft"
            >
              <SignOutIcon className="h-4 w-4" />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 border-b border-border bg-surface print:hidden lg:hidden">
          <div className="flex items-center gap-1 px-2 py-2">
            <button
              type="button"
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              aria-controls="staff-primary-nav"
              onClick={() => setOpen((value) => !value)}
              className="flex h-11 w-11 items-center justify-center rounded-full text-pine-deep"
            >
              {open ? <CloseIcon /> : <MenuIcon />}
            </button>
            <Link
              href={profileHref}
              aria-label="View profile"
              className="flex min-w-0 flex-1 items-center gap-1 rounded-full"
            >
              <Avatar name={email} />
              <p className="min-w-0 flex-1 truncate text-xs text-muted">
                {email}
              </p>
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                aria-label="Sign out"
                title="Sign out"
                className="flex h-11 w-11 items-center justify-center rounded-full text-pine-deep"
              >
                <SignOutIcon />
              </button>
            </form>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 pt-4 pb-8">
          <div className="mb-3 flex flex-wrap items-start gap-2 print:hidden">
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-xl font-extrabold tracking-tight">
                {title}
              </h1>
              {subtitle ? (
                <p className="truncate text-xs text-muted">{subtitle}</p>
              ) : null}
            </div>
            {actions}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
