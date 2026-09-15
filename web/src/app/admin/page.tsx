import Link from 'next/link';
import { requireRole } from '@/features/auth/queries';
import { getDashboard } from '@/features/reports/queries';
import {
  getOpenRestockCount,
  getOpenRestockCounts,
} from '@/features/restock/queries';
import { SalesChart } from '@/features/reports/components/SalesChart';
import { Card } from '@/components/common/Card';
import { EmptyState } from '@/components/common/EmptyState';
import { IconTile } from '@/components/common/IconTile';
import {
  ArrowRightIcon,
  BoxIcon,
  ChartIcon,
  CupIcon,
  GearIcon,
  ReceiptIcon,
} from '@/components/common/icons';
import { StaffShell } from '@/components/layout/staff-shell';

const TILES = [
  {
    href: '/admin/reports',
    label: 'Orders',
    sub: 'Sales history',
    icon: <ReceiptIcon />,
  },
  {
    href: '/admin/inventory',
    label: 'Inventory',
    sub: 'Stock levels',
    icon: <BoxIcon />,
  },
  {
    href: '/admin/reports',
    label: 'Analytics',
    sub: 'Trends & top items',
    icon: <ChartIcon />,
  },
  {
    href: '/admin/menu',
    label: 'Menu',
    sub: 'Products & categories',
    icon: <CupIcon />,
  },
  {
    href: '/admin/settings',
    label: 'Settings',
    sub: 'Profile & preferences',
    icon: <GearIcon />,
  },
];

/** v2 admin home: welcome header, register tile, tile grid, dashboard. */
export default async function AdminPage() {
  const profile = await requireRole('admin');
  const [dashboard, openRestockCount, severityCounts] = await Promise.all([
    getDashboard(),
    getOpenRestockCount(),
    getOpenRestockCounts(),
  ]);
  const lowCount = dashboard.lowStock.length;
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
              {tile.label === 'Inventory' && lowCount > 0 ? (
                <span className="absolute top-3 right-3 rounded-full bg-danger px-2 py-0.5 text-xs font-bold text-surface">
                  {lowCount} low
                </span>
              ) : null}
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
            href="/admin/restock"
            className="card-hover action-focus rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold shadow-soft"
          >
            Restock
            {openRestockCount > 0 ? ` (${openRestockCount} open)` : null}
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Card className="rounded-card border-border shadow-soft">
            <div className="flex items-center gap-3">
              <IconTile tone="mint" className="text-base font-extrabold">
                ₱
              </IconTile>
              <p className="text-sm text-muted">
                Total revenue:{' '}
                <span className="block text-lg font-extrabold tracking-tight text-foreground">
                  ₱{dashboard.revenue.toFixed(2)}
                </span>
              </p>
            </div>
          </Card>
          <Card className="rounded-card border-border shadow-soft">
            <div className="flex items-center gap-3">
              <IconTile tone="sage" className="text-base font-extrabold">
                #
              </IconTile>
              <p className="text-sm text-muted">
                Total orders:{' '}
                <span className="block text-lg font-extrabold tracking-tight text-foreground">
                  {dashboard.orders}
                </span>
              </p>
            </div>
          </Card>
        </div>

        <Card
          title="Last 7 days"
          className="rounded-card border-border shadow-soft"
        >
          <div className="flex justify-center overflow-x-auto">
            <SalesChart data={dashboard.weekly} />
          </div>
        </Card>

        <Card
          title="Low stock"
          className="rounded-card border-border shadow-soft"
          actions={
            <Link href="/admin/restock" className="text-sm font-bold text-pine">
              View All
            </Link>
          }
        >
          {lowCount === 0 ? (
            <p className="text-sm text-muted">All stocked.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {dashboard.lowStock.map((row) => (
                <li
                  key={row.product_name}
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
                      Only {row.quantity} units left
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {openRestockCount > 0 ? (
            <p className="mt-3 text-sm text-muted">
              <Link href="/admin/restock" className="font-medium">
                Open restock requests: {openRestockCount} (
                {severityCounts.critical} critical, {severityCounts.low} low)
              </Link>
            </p>
          ) : null}
        </Card>

        <Card
          title="Top selling"
          className="rounded-card border-border shadow-soft"
        >
          {dashboard.topProducts.length === 0 ? (
            <EmptyState
              icon={<ChartIcon />}
              title="No sales yet"
              sub="Completed sales will show up here."
            />
          ) : (
            <ol className="flex flex-col gap-2">
              {dashboard.topProducts.map((row, index) => (
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
                    <p className="text-sm font-bold">{row.product_name}</p>
                    <p className="text-sm text-muted">
                      {row.quantity_sold} sold (₱{row.revenue.toFixed(2)})
                    </p>
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
