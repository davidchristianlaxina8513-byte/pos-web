import Link from 'next/link';
import { requireRole } from '@/features/auth/queries';
import {
  getInventoryReport,
  getSalesReport,
  getTopProducts,
} from '@/features/reports/queries';
import { resolveRange } from '@/features/reports/aggregate';
import type { ReportPreset } from '@/features/reports/aggregate';
import { SalesChart } from '@/features/reports/components/SalesChart';
import { Card } from '@/components/common/Card';
import { IconTile } from '@/components/common/IconTile';
import { StaffShell } from '@/components/layout/staff-shell';
import { cn } from '@/lib/cn';

const PRESETS: { value: ReportPreset; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: 'all', label: 'All' },
];

function parsePreset(value: string | undefined): ReportPreset {
  return value === '7d' || value === '30d' || value === 'all' ? value : 'today';
}

/** Filtered sales + top products + inventory summary. */
export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; from?: string; to?: string }>;
}) {
  const profile = await requireRole('admin');
  const params = await searchParams;
  const preset = parsePreset(params.preset);
  const range = resolveRange(preset, params.from ?? null, params.to ?? null);
  const [report, top, inventory] = await Promise.all([
    getSalesReport(range),
    getTopProducts(range),
    getInventoryReport(),
  ]);
  const query = (value: ReportPreset) => `/admin/reports?preset=${value}`;
  return (
    <StaffShell email={profile.email} role={profile.role} title="Reports">
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {PRESETS.map((entry) => (
          <Link
            key={entry.value}
            href={query(entry.value)}
            aria-current={preset === entry.value ? 'page' : undefined}
            className={cn(
              'shrink-0 rounded-full px-4 py-2 text-sm font-semibold',
              preset === entry.value
                ? 'bg-pine text-surface'
                : 'border border-border bg-surface text-foreground',
            )}
          >
            {entry.label}
          </Link>
        ))}
      </div>
      <form
        method="get"
        action="/admin/reports"
        className="mt-3 flex flex-wrap items-end gap-2"
      >
        <input type="hidden" name="preset" value={preset} />
        <label className="block">
          <span className="text-sm text-muted">From</span>
          <input
            type="date"
            name="from"
            defaultValue={params.from ?? ''}
            className="mt-1 block h-[52px] rounded-2xl border border-border bg-mist px-3.5 text-foreground"
          />
        </label>
        <label className="block">
          <span className="text-sm text-muted">To</span>
          <input
            type="date"
            name="to"
            defaultValue={params.to ?? ''}
            className="mt-1 block h-[52px] rounded-2xl border border-border bg-mist px-3.5 text-foreground"
          />
        </label>
        <button
          type="submit"
          className="flex h-11 items-center rounded-full bg-pine px-4 text-sm font-semibold text-surface"
        >
          Apply
        </button>
      </form>
      <div className="mt-4 grid gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Card className="rounded-card border-border shadow-soft">
            <div className="flex items-center gap-3">
              <IconTile tone="mint" className="text-base font-extrabold">
                ₱
              </IconTile>
              <p className="text-[15px] font-bold text-foreground">
                Revenue: ₱{report.summary.revenue.toFixed(2)}
              </p>
            </div>
          </Card>
          <Card className="rounded-card border-border shadow-soft">
            <div className="flex items-center gap-3">
              <IconTile tone="sage" className="text-base font-extrabold">
                #
              </IconTile>
              <p className="text-[15px] font-bold text-foreground">
                Orders: {report.summary.orders}
              </p>
            </div>
          </Card>
        </div>
        <Card
          title="Sales summary"
          className="rounded-card border-border shadow-soft"
        >
          <p>Average order: ₱{report.summary.averageOrderValue.toFixed(2)}</p>
          <ul className="mt-2">
            {report.summary.breakdown.map((row) => (
              <li key={row.mode}>
                {row.mode}: {row.orders} orders (₱{row.revenue.toFixed(2)})
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Daily" className="rounded-card border-border shadow-soft">
          <SalesChart data={report.daily} />
          <ul className="mt-2">
            {report.daily.map((day) => (
              <li key={day.date}>
                {day.date} ({day.label}): {day.orders} orders — ₱
                {day.revenue.toFixed(2)}
              </li>
            ))}
          </ul>
        </Card>
        <Card
          title="Top products"
          className="rounded-card border-border shadow-soft"
        >
          {top.length === 0 ? (
            <p className="text-muted">No sales in range.</p>
          ) : (
            <ol>
              {top.map((row) => (
                <li key={row.product_id}>
                  {row.product_name} — {row.quantity_sold} sold (₱
                  {row.revenue.toFixed(2)})
                </li>
              ))}
            </ol>
          )}
        </Card>
        <Card
          title="Inventory summary"
          className="rounded-card border-border shadow-soft"
        >
          <p>Items: {inventory.totalItems}</p>
          <p>Low: {inventory.lowStockCount}</p>
          <p>Out of stock: {inventory.outOfStockCount}</p>
          <p>Stock value: ₱{inventory.stockValue.toFixed(2)}</p>
        </Card>
      </div>
    </StaffShell>
  );
}
