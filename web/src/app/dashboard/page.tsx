import Link from 'next/link';
import { requireStaff } from '@/features/auth/queries';
import { getCashierTodaySales } from '@/features/dashboard/queries';
import { getTodayProductQuotas } from '@/features/quotas/queries';
import { QUOTA_STATUS_LABEL } from '@/features/quotas/status';
import { getCurrentShift } from '@/features/shifts/queries';
import {
  ArrowRightIcon,
  BanknotesIcon,
  CalendarDaysIcon,
  ClockIcon,
  DocumentTextIcon,
  ShoppingBagIcon,
  ShoppingCartIcon,
  Squares2X2Icon,
} from '@/components/common/hero-icons';
import { StaffShell } from '@/components/layout/staff-shell';
import { cn } from '@/lib/cn';

export default async function CashierDashboardPage() {
  const [profile, sales, products, shift] = await Promise.all([
    requireStaff(),
    getCashierTodaySales(),
    getTodayProductQuotas(),
    getCurrentShift(),
  ]);

  const activeSales = sales.filter(
    (sale) => sale.status !== 'voided' && sale.status !== 'cancelled',
  );
  const netSales = activeSales.reduce(
    (sum, sale) => sum + sale.total_amount,
    0,
  );
  const completed = sales.filter((sale) => sale.status === 'completed');
  const pendingOrders = sales.filter(
    (sale) =>
      sale.status === 'pending' ||
      sale.status === 'preparing' ||
      sale.status === 'ready',
  );
  const productsSold = products.reduce(
    (sum, product) => sum + product.sold_quantity,
    0,
  );
  const almostSoldOut = products.filter(
    (product) => product.status === 'almost_sold_out',
  ).length;
  const soldOut = products.filter(
    (product) => product.status === 'sold_out',
  ).length;

  const todayFormatted = new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }).format(new Date());

  const emailPrefix = profile.email ? profile.email.split('@')[0] : '';
  const rawName = emailPrefix || 'Cashier';
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
                    Cashier Station
                  </span>
                  <span className="text-xs font-medium text-muted">
                    {todayFormatted} · Cafe Elvira
                  </span>
                </div>
                <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
                  Welcome back, {displayName}!
                </h1>
                <p className="mt-0.5 text-xs sm:text-sm text-muted">
                  Here is your register overview and daily transaction briefing.
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

        {/* Compact Shift Banner */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/80 bg-surface p-4 shadow-soft">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-pine/10 text-pine">
              <ClockIcon className="h-5 w-5" />
            </div>
            <div>
              {shift?.status === 'open' ? (
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full bg-pine animate-pulse" />
                  <span className="text-sm font-bold text-foreground">
                    Shift Active
                  </span>
                  <span className="text-xs text-muted">
                    · Started at{' '}
                    {new Date(shift.started_at).toLocaleTimeString('en-PH', {
                      timeZone: 'Asia/Manila',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full bg-warning" />
                  <span className="text-sm font-bold text-foreground">
                    No active shift
                  </span>
                </div>
              )}
              <p className="text-xs text-muted">
                {shift?.status === 'open'
                  ? `Expected in drawer: ₱${shift.expected_cash.toFixed(2)} (Starting: ₱${shift.starting_cash.toFixed(2)})`
                  : 'Open a shift before accepting cash payments.'}
              </p>
            </div>
          </div>

          <Link
            href={
              shift?.status === 'open'
                ? '/cashier-operations#turnover'
                : '/cashier-operations#shift'
            }
            className="text-xs font-bold text-pine hover:underline"
          >
            {shift?.status === 'open'
              ? 'End shift / turnover →'
              : 'Open shift →'}
          </Link>
        </div>

        {/* Active Kitchen / Fulfilment Pulse */}
        {pendingOrders.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-pine/30 bg-pine/5 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-2.5 w-2.5 rounded-full bg-pine animate-pulse" />
              <div className="text-xs text-foreground">
                <span className="font-bold text-pine">
                  {pendingOrders.length} Order
                  {pendingOrders.length === 1 ? '' : 's'} Active in Kitchen:
                </span>{' '}
                {pendingOrders.filter((o) => o.status === 'pending').length >
                  0 && (
                  <span>
                    {pendingOrders.filter((o) => o.status === 'pending').length}{' '}
                    Pending ·{' '}
                  </span>
                )}
                {pendingOrders.filter((o) => o.status === 'preparing').length >
                  0 && (
                  <span>
                    {
                      pendingOrders.filter((o) => o.status === 'preparing')
                        .length
                    }{' '}
                    Preparing ·{' '}
                  </span>
                )}
                {pendingOrders.filter((o) => o.status === 'ready').length >
                  0 && (
                  <span className="font-semibold text-purple-700 dark:text-purple-400">
                    {pendingOrders.filter((o) => o.status === 'ready').length}{' '}
                    Ready for Pickup
                  </span>
                )}
              </div>
            </div>
            <Link
              href="/pos"
              className="text-xs font-bold text-pine hover:underline whitespace-nowrap"
            >
              Open Register &amp; Active Orders →
            </Link>
          </div>
        )}

        {/* 4 Essential Metrics */}
        <section aria-label="Cashier metrics">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {/* Today's Sales */}
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
                ₱{netSales.toFixed(2)}
              </p>
              <p className="mt-1 text-xs text-muted">
                {activeSales.length} order{activeSales.length === 1 ? '' : 's'}
                {pendingOrders.length > 0
                  ? ` · ${pendingOrders.length} in progress`
                  : ''}
              </p>
            </div>

            {/* Orders */}
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
                {activeSales.length}
              </p>
              <p className="mt-1 text-xs text-muted">
                {completed.length} served · {pendingOrders.length} in progress
              </p>
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
                {productsSold}
              </p>
              <p className="mt-1 text-xs text-muted">Units served today</p>
            </div>

            {/* Low / Sold Out Items */}
            <div className="rounded-2xl border border-border/80 bg-surface p-5 shadow-soft">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Low / Sold Out
                </span>
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                    soldOut > 0
                      ? 'bg-danger/10 text-danger'
                      : almostSoldOut > 0
                        ? 'bg-warning/15 text-warning'
                        : 'bg-pine/10 text-pine'
                  }`}
                >
                  <CalendarDaysIcon className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-3 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
                {soldOut + almostSoldOut}
              </p>
              <p className="mt-1 text-xs text-muted">
                {soldOut} sold out · {almostSoldOut} low
              </p>
            </div>
          </div>
        </section>

        {/* 2 Clean Focused Panels */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Panel: Recent Transactions */}
          <section
            aria-label="Recent transactions"
            className="rounded-2xl border border-border/80 bg-surface p-5 shadow-soft sm:p-6 lg:col-span-7"
          >
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <div>
                <h2 className="text-base font-bold text-foreground">
                  Recent Orders
                </h2>
                <p className="text-xs text-muted">Latest sales processed</p>
              </div>
              <Link
                href="/daily-sales"
                className="text-xs font-bold text-pine hover:underline"
              >
                All sales →
              </Link>
            </div>

            <div className="mt-4">
              {sales.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted">
                  No orders taken yet today.
                </p>
              ) : (
                <ul className="divide-y divide-border/60">
                  {sales.slice(0, 5).map((sale) => (
                    <li
                      key={sale.id}
                      className="flex items-center justify-between py-2.5 text-sm"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <time className="shrink-0 text-xs text-muted">
                          {new Date(sale.date).toLocaleTimeString('en-PH', {
                            timeZone: 'Asia/Manila',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </time>
                        <Link
                          href={`/pos/receipt/${sale.id}`}
                          className="truncate font-semibold text-pine hover:underline"
                        >
                          {sale.transaction_number}
                        </Link>
                        <span
                          className={cn(
                            'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                            sale.status === 'completed' &&
                              'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
                            sale.status === 'ready' &&
                              'bg-purple-500/10 text-purple-700 dark:text-purple-400',
                            sale.status === 'preparing' &&
                              'bg-blue-500/10 text-blue-700 dark:text-blue-400',
                            sale.status === 'pending' &&
                              'bg-amber-500/10 text-amber-700 dark:text-amber-400',
                            sale.status === 'voided' &&
                              'bg-danger/10 text-danger line-through',
                            sale.status === 'cancelled' && 'bg-mist text-muted',
                          )}
                        >
                          {sale.status}
                        </span>
                      </div>
                      <span className="font-bold text-foreground shrink-0 pl-2">
                        ₱{sale.total_amount.toFixed(2)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* Right Panel: Quota & Product Stock */}
          <section
            aria-label="Today stock quotas"
            className="rounded-2xl border border-border/80 bg-surface p-5 shadow-soft sm:p-6 lg:col-span-5"
          >
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <div>
                <h2 className="text-base font-bold text-foreground">
                  Product Availability
                </h2>
                <p className="text-xs text-muted">Limited quota items</p>
              </div>
              <Link
                href="/today-products"
                className="text-xs font-bold text-pine hover:underline"
              >
                View all →
              </Link>
            </div>

            <div className="mt-4">
              <ul className="divide-y divide-border/60">
                {products.slice(0, 6).map((item) => (
                  <li
                    key={item.product_id}
                    className="flex items-center justify-between py-2.5 text-sm"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="truncate font-semibold text-foreground">
                        {item.product_name}
                      </p>
                      <p className="text-xs text-muted">
                        {item.remaining_quantity === null
                          ? 'Unlimited'
                          : `${item.remaining_quantity} left`}
                      </p>
                    </div>
                    <span
                      className={cn(
                        'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold uppercase',
                        item.status === 'sold_out' && 'bg-danger text-white',
                        item.status === 'almost_sold_out' &&
                          'bg-amber-500/15 text-amber-800 dark:text-amber-300 font-bold',
                        item.status === 'good' && 'bg-pine/10 text-pine',
                        item.status === 'unlimited' &&
                          'bg-mist text-foreground',
                      )}
                    >
                      {QUOTA_STATUS_LABEL[item.status]}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>
      </div>
    </StaffShell>
  );
}
