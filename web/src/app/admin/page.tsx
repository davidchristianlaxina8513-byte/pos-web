import Link from 'next/link';
import { requireRole } from '@/features/auth/queries';
import { getAdminTodaySummary } from '@/features/dashboard/queries';
import { getDashboard } from '@/features/reports/queries';
import { getTodayProductQuotas } from '@/features/quotas/queries';
import { getAllShifts } from '@/features/shifts/queries';
import { SalesChart } from '@/components/modules/reports/SalesChart';
import {
  ArrowRightIcon,
  BanknotesIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  ShoppingBagIcon,
  ShoppingCartIcon,
  Squares2X2Icon,
  UsersIcon,
} from '@/components/common/hero-icons';
import { StaffShell } from '@/components/layout/staff-shell';
import { cn } from '@/lib/cn';

export default async function AdminPage() {
  const [profile, dashboard, quotas, today, shifts] = await Promise.all([
    requireRole('admin'),
    getDashboard(),
    getTodayProductQuotas(),
    getAdminTodaySummary(),
    getAllShifts(),
  ]);

  const soldOut = quotas.filter((item) => item.status === 'sold_out');
  const almostSoldOut = quotas.filter(
    (item) => item.status === 'almost_sold_out',
  );
  const openShifts = shifts.filter((s) => s.status === 'open');

  const attention: {
    id: string;
    label: string;
    href: string;
    tone: 'warning' | 'danger';
  }[] = [];

  if (soldOut.length) {
    attention.push({
      id: 'sold-out',
      label: `${soldOut.length} Product${soldOut.length === 1 ? '' : 's'} Sold Out`,
      href: '/today-products',
      tone: 'danger',
    });
  }
  if (almostSoldOut.length) {
    attention.push({
      id: 'almost-sold-out',
      label: `${almostSoldOut.length} Low Stock`,
      href: '/today-products',
      tone: 'warning',
    });
  }
  if (today.discrepancyTurnovers) {
    attention.push({
      id: 'discrepancies',
      label: `${today.discrepancyTurnovers} Cash Discrepanc${today.discrepancyTurnovers === 1 ? 'y' : 'ies'}`,
      href: '/admin/cashier-operations',
      tone: 'danger',
    });
  }
  if (today.pendingTurnovers) {
    attention.push({
      id: 'turnovers',
      label: `${today.pendingTurnovers} Turnover${today.pendingTurnovers === 1 ? '' : 's'} Pending`,
      href: '/admin/cashier-operations',
      tone: 'warning',
    });
  }
  if (today.pendingPayments) {
    attention.push({
      id: 'pending-payments',
      label: `${today.pendingPayments} Payment${today.pendingPayments === 1 ? '' : 's'} Pending`,
      href: '/admin/cashier-operations',
      tone: 'warning',
    });
  }

  const todayFormatted = new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }).format(new Date());

  const emailPrefix = profile.email ? profile.email.split('@')[0] : '';
  const rawName = emailPrefix || 'Admin';
  const displayName = rawName.charAt(0).toUpperCase() + rawName.slice(1);

  return (
    <StaffShell email={profile.email} role={profile.role} fullWidth={true}>
      <div className="space-y-6">
        {/* Welcome Card with Border Accent (DCAPC Dashboard Style) */}
        <section
          aria-label="Welcome banner"
          className="relative overflow-hidden rounded-2xl border border-border/80 border-l-4 border-l-pine bg-surface p-5 sm:p-6 shadow-soft"
        >
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-pine/10 text-pine border border-pine/20">
                <Squares2X2Icon className="h-6 w-6" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-pine/10 px-2.5 py-0.5 text-xs font-bold text-pine">
                    <span className="h-1.5 w-1.5 rounded-full bg-pine animate-pulse" />
                    Administrator
                  </span>
                  <span className="text-xs font-medium text-muted">
                    {todayFormatted} · Cafe Elvira
                  </span>
                </div>
                <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
                  Welcome back, {displayName}!
                </h1>
                <p className="mt-0.5 text-xs sm:text-sm text-muted">
                  Here is your store summary and register operations overview
                  for today.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <Link
                href="/pos"
                className="action-focus inline-flex h-10 items-center justify-center gap-2 rounded-md bg-pine px-4 text-sm font-semibold text-white shadow-xs transition hover:bg-pine-deep"
              >
                <ShoppingCartIcon className="h-4 w-4" />
                <span>Open Register</span>
                <ArrowRightIcon className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </section>

        {/* Needs Attention Action Chips (Discrete 1-click links) */}
        {attention.length > 0 && (
          <div className="flex flex-wrap items-center gap-2.5 rounded-xl border border-warning/30 bg-warning/5 p-3.5">
            <div className="flex items-center gap-2 mr-1">
              <ExclamationTriangleIcon className="h-5 w-5 shrink-0 text-warning" />
              <span className="text-xs font-bold uppercase tracking-wider text-warning">
                Needs Attention:
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {attention.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-2xs transition hover:shadow-xs',
                    item.tone === 'danger'
                      ? 'border-danger/30 bg-surface text-danger hover:border-danger hover:bg-danger/5'
                      : 'border-warning/30 bg-surface text-foreground hover:border-warning hover:bg-warning/5',
                  )}
                >
                  <span>{item.label}</span>
                  <span className="font-bold text-pine">→</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Live Register Operations Widget */}
        <section
          aria-label="Live register operations"
          className="rounded-2xl border border-border/80 bg-surface p-5 shadow-soft sm:p-6"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/70 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-pine/10 text-pine">
                <UsersIcon className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-foreground">
                    Live Register Operations
                  </h2>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold',
                      openShifts.length > 0
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                        : 'bg-mist text-muted',
                    )}
                  >
                    {openShifts.length > 0 && (
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    )}
                    {openShifts.length === 0
                      ? 'No active shifts'
                      : `${openShifts.length} On Duty`}
                  </span>
                </div>
                <p className="text-xs text-muted">
                  Active cashiers, drawer opening balances, and shift monitor
                </p>
              </div>
            </div>

            <Link
              href="/admin/cashier-operations"
              className="text-xs font-bold text-pine hover:underline shrink-0"
            >
              Cashier &amp; Drawer Operations →
            </Link>
          </div>

          <div className="mt-4">
            {openShifts.length === 0 ? (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl bg-mist/50 p-4 text-xs text-muted border border-border/60">
                <div className="flex items-center gap-2.5">
                  <ClockIcon className="h-4 w-4 text-muted shrink-0" />
                  <span>
                    No cashier shifts are currently open. Shifts automatically
                    appear here as soon as cashiers start them at the register.
                  </span>
                </div>
                <Link
                  href="/admin/cashier-operations"
                  className="font-bold text-pine hover:underline whitespace-nowrap"
                >
                  View Shift History →
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {openShifts.map((shift) => (
                  <div
                    key={shift.shift_id}
                    className="flex items-center justify-between rounded-xl border border-border/80 bg-surface p-3.5 shadow-2xs hover:border-pine/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-pine/10 text-xs font-extrabold text-pine">
                        {shift.cashier_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-foreground text-sm">
                          {shift.cashier_name}
                        </p>
                        <p className="text-[11px] text-muted flex items-center gap-1">
                          <ClockIcon className="h-3 w-3" />
                          Started{' '}
                          {new Date(shift.started_at).toLocaleTimeString(
                            'en-US',
                            {
                              hour: 'numeric',
                              minute: '2-digit',
                            },
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-semibold uppercase text-muted block">
                        Opening Cash
                      </span>
                      <span className="text-sm font-extrabold text-foreground">
                        ₱{shift.starting_cash.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* 4 Essential KPI Cards */}
        <section aria-label="Essential metrics">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {/* Total Sales */}
            <div className="rounded-2xl border border-border/80 bg-surface p-5 shadow-soft">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Today&apos;s Sales
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-pine/10 text-pine">
                  <BanknotesIcon className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-3 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
                ₱{today.totalSales.toFixed(2)}
              </p>
              <p className="mt-1 text-xs text-muted">
                ₱{today.cashSales.toFixed(0)} cash · ₱
                {today.onlineSales.toFixed(0)} online
              </p>
            </div>

            {/* Transactions */}
            <div className="rounded-2xl border border-border/80 bg-surface p-5 shadow-soft">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Orders
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-pine/10 text-pine">
                  <DocumentTextIcon className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-3 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
                {today.transactions}
              </p>
              <p className="mt-1 text-xs text-muted">Completed today</p>
            </div>

            {/* Products Sold */}
            <div className="rounded-2xl border border-border/80 bg-surface p-5 shadow-soft">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Products Sold
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-pine/10 text-pine">
                  <ShoppingBagIcon className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-3 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
                {today.productsSold}
              </p>
              <p className="mt-1 text-xs text-muted">Units served</p>
            </div>

            {/* Limited Stock Alerts */}
            <div className="rounded-2xl border border-border/80 bg-surface p-5 shadow-soft">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Low / Sold Out
                </span>
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                    soldOut.length > 0
                      ? 'bg-danger/10 text-danger'
                      : almostSoldOut.length > 0
                        ? 'bg-warning/15 text-warning'
                        : 'bg-pine/10 text-pine'
                  }`}
                >
                  <CalendarDaysIcon className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-3 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
                {soldOut.length + almostSoldOut.length}
              </p>
              <p className="mt-1 text-xs text-muted">
                {soldOut.length} sold out · {almostSoldOut.length} low
              </p>
            </div>
          </div>
        </section>

        {/* 2 Clean Focused Panels */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Panel: 7-Day Sales Trend */}
          <section
            aria-label="Weekly sales chart"
            className="rounded-2xl border border-border/80 bg-surface p-5 shadow-soft sm:p-6 lg:col-span-7"
          >
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <div>
                <h2 className="text-base font-bold text-foreground">
                  Last 7 Days Sales
                </h2>
                <p className="text-xs text-muted">Daily gross revenue</p>
              </div>
              <Link
                href="/admin/reports"
                className="text-xs font-bold text-pine hover:underline"
              >
                Full reports →
              </Link>
            </div>
            <div className="mt-4 flex justify-center overflow-x-auto py-2">
              <SalesChart data={dashboard.weekly} />
            </div>
          </section>

          {/* Right Panel: Limited Stock & Quotas */}
          <section
            aria-label="Stock status"
            className="rounded-2xl border border-border/80 bg-surface p-5 shadow-soft sm:p-6 lg:col-span-5"
          >
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <div>
                <h2 className="text-base font-bold text-foreground">
                  Product Stock Status
                </h2>
                <p className="text-xs text-muted">Today&apos;s quota limits</p>
              </div>
              <Link
                href="/today-products"
                className="text-xs font-bold text-pine hover:underline"
              >
                Manage →
              </Link>
            </div>

            <div className="mt-4">
              {soldOut.length + almostSoldOut.length === 0 ? (
                <div className="flex items-center gap-3 rounded-xl bg-mist/60 p-4 text-sm">
                  <CheckCircleIcon className="h-5 w-5 shrink-0 text-pine" />
                  <div>
                    <p className="font-bold text-foreground">
                      All products in stock
                    </p>
                    <p className="text-xs text-muted">
                      No items are currently sold out or low.
                    </p>
                  </div>
                </div>
              ) : (
                <ul className="divide-y divide-border/60">
                  {[...soldOut, ...almostSoldOut].slice(0, 5).map((row) => (
                    <li
                      key={row.product_id}
                      className="flex items-center justify-between py-2.5 text-sm"
                    >
                      <span className="font-semibold text-foreground truncate pr-2">
                        {row.product_name}
                      </span>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          row.status === 'sold_out'
                            ? 'bg-danger text-white'
                            : 'bg-warning/20 text-warning'
                        }`}
                      >
                        {row.status === 'sold_out'
                          ? 'Sold Out'
                          : `${row.remaining_quantity} left`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      </div>
    </StaffShell>
  );
}
