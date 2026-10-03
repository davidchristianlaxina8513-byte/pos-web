import Link from 'next/link';
import { requireRole } from '@/features/auth/queries';
import { getAdminTodaySummary } from '@/features/dashboard/queries';
import { getDashboard } from '@/features/reports/queries';
import { getTodayProductQuotas } from '@/features/quotas/queries';
import { SalesChart } from '@/features/reports/components/SalesChart';
import { Card } from '@/components/common/Card';
import { EmptyState } from '@/components/common/EmptyState';
import { IconTile } from '@/components/common/IconTile';
import {
  ArrowRightIcon,
  ChartIcon,
  CupIcon,
  GearIcon,
  ReceiptIcon,
} from '@/components/common/icons';
import { StaffShell } from '@/components/layout/staff-shell';

const TILES = [
  {
    href: '/admin/reports',
    label: 'Reports',
    sub: 'Sales, transactions, and payments',
    icon: <ChartIcon />,
  },
  {
    href: '/admin/menu',
    label: 'Menu',
    sub: 'Products and categories',
    icon: <CupIcon />,
  },
  {
    href: '/admin/settings',
    label: 'Settings',
    sub: 'Profile and preferences',
    icon: <GearIcon />,
  },
];

export default async function AdminPage() {
  const profile = await requireRole('admin');
  const [dashboard, quotas, today] = await Promise.all([
    getDashboard(),
    getTodayProductQuotas(),
    getAdminTodaySummary(),
  ]);
  const soldOut = quotas.filter((item) => item.status === 'sold_out');
  const almostSoldOut = quotas.filter(
    (item) => item.status === 'almost_sold_out',
  );
  const attention = [
    soldOut.length
      ? `${soldOut.length} product${soldOut.length === 1 ? '' : 's'} sold out today`
      : null,
    almostSoldOut.length
      ? `${almostSoldOut.length} product${almostSoldOut.length === 1 ? '' : 's'} almost sold out`
      : null,
    today.pendingPayments
      ? `${today.pendingPayments} online payment${today.pendingPayments === 1 ? '' : 's'} pending verification`
      : null,
    today.pendingTurnovers
      ? `${today.pendingTurnovers} cash turnover${today.pendingTurnovers === 1 ? '' : 's'} pending verification`
      : null,
    today.discrepancyTurnovers
      ? `${today.discrepancyTurnovers} cash turnover${today.discrepancyTurnovers === 1 ? '' : 's'} with a discrepancy`
      : null,
  ].filter((item): item is string => Boolean(item));

  return (
    <StaffShell
      email={profile.email}
      role={profile.role}
      title="Welcome back"
      subtitle={`Signed in as ${profile.email} (${profile.role})`}
    >
      <nav aria-label="Admin sections" className="flex flex-col gap-3">
        <Link
          href="/pos"
          className="card-hover action-focus flex items-center gap-3 rounded-card bg-pine p-4 text-surface shadow-soft"
        >
          <IconTile tone="pine" className="border border-surface/30">
            <ReceiptIcon />
          </IconTile>
          <span className="flex-1">
            <span className="block text-lg font-extrabold tracking-tight">
              Register
            </span>
            <span className="block text-sm text-surface/80">
              Open point of sale
            </span>
          </span>
          <ArrowRightIcon className="h-6 w-6" />
        </Link>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {TILES.map((tile) => (
            <Link
              key={tile.label}
              href={tile.href}
              className="card-hover action-focus relative flex flex-col gap-2 rounded-card border border-border bg-surface p-4 shadow-soft"
            >
              <IconTile tone="sage">{tile.icon}</IconTile>
              <span>
                <span className="block text-[15px] font-extrabold tracking-tight">
                  {tile.label}
                </span>
                <span className="block text-xs text-muted">{tile.sub}</span>
              </span>
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/today-products"
            className="card-hover action-focus rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold shadow-soft"
          >
            Today&apos;s Products
          </Link>
          <Link
            href="/admin/cashier-operations"
            className="card-hover action-focus rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold shadow-soft"
          >
            Cashier Operations
          </Link>
          <Link
            href="/admin/users"
            className="card-hover action-focus rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold shadow-soft"
          >
            Users
          </Link>
        </div>
      </nav>

      <div className="mt-4 grid gap-3">
        <Card
          title="Today's Summary"
          className="rounded-card border-border shadow-soft"
        >
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
            <div>
              <dt className="text-muted">Total Sales</dt>
              <dd className="text-lg font-extrabold">
                ₱{today.totalSales.toFixed(2)}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Transactions</dt>
              <dd className="text-lg font-extrabold">{today.transactions}</dd>
            </div>
            <div>
              <dt className="text-muted">Products Sold</dt>
              <dd className="text-lg font-extrabold">{today.productsSold}</dd>
            </div>
            <div>
              <dt className="text-muted">Cash Sales</dt>
              <dd className="text-lg font-extrabold">
                ₱{today.cashSales.toFixed(2)}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Online Sales</dt>
              <dd className="text-lg font-extrabold">
                ₱{today.onlineSales.toFixed(2)}
              </dd>
            </div>
          </dl>
        </Card>

        {attention.length ? (
          <Card
            title="Needs Attention"
            className="rounded-card border-border shadow-soft"
          >
            <ul className="space-y-2 text-sm">
              {attention.map((item) => (
                <li
                  key={item}
                  className="flex gap-2 rounded-2xl bg-warning/10 p-3"
                >
                  <span
                    aria-hidden="true"
                    className="font-extrabold text-warning"
                  >
                    !
                  </span>
                  <span className="font-semibold">{item}</span>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}

        <Card
          title="Last 7 days"
          className="rounded-card border-border shadow-soft"
        >
          <div className="flex justify-center overflow-x-auto">
            <SalesChart data={dashboard.weekly} />
          </div>
        </Card>

        <Card
          title="Production Quota Status"
          className="rounded-card border-border shadow-soft"
          actions={
            <Link
              href="/today-products"
              className="text-sm font-bold text-pine"
            >
              View All
            </Link>
          }
        >
          {soldOut.length + almostSoldOut.length === 0 ? (
            <p className="text-sm text-muted">
              All limited products have healthy availability.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {[...soldOut, ...almostSoldOut].slice(0, 5).map((row) => (
                <li
                  key={row.product_id}
                  className="flex items-center gap-3 rounded-2xl bg-mist p-3"
                >
                  <span
                    aria-hidden="true"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-danger text-sm font-extrabold text-surface"
                  >
                    !
                  </span>
                  <div>
                    <p className="text-sm font-bold">{row.product_name}</p>
                    <p className="text-sm font-semibold text-danger">
                      {row.status === 'sold_out'
                        ? 'Sold out for today'
                        : `Only ${row.remaining_quantity} left today`}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title="Today's Top Selling"
          className="rounded-card border-border shadow-soft"
        >
          {today.topProducts.length === 0 ? (
            <EmptyState
              icon={<ChartIcon />}
              title="No sales yet"
              sub="Completed sales will show up here."
            />
          ) : (
            <ol className="flex flex-col gap-2">
              {today.topProducts.map((row, index) => (
                <li
                  key={row.product_id}
                  className="flex items-center gap-3 rounded-2xl bg-mist p-3"
                >
                  <span
                    aria-hidden="true"
                    className="w-5 shrink-0 text-center text-sm font-extrabold text-muted"
                  >
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-bold">{row.name}</p>
                    <p className="text-sm text-muted">{row.quantity} sold</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </StaffShell>
  );
}
