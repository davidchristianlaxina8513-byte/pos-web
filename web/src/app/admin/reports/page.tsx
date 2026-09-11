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

const PRESETS: { value: ReportPreset; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: 'all', label: 'All' },
];

function parsePreset(value: string | undefined): ReportPreset {
  return value === '7d' || value === '30d' || value === 'all'
    ? value
    : 'today';
}

/** Filtered sales + top products + inventory summary. */
export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; from?: string; to?: string }>;
}) {
  await requireRole('admin');
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
    <main className="bg-background text-foreground">
      <h1>Reports</h1>
      <p className="mt-1">
        <Link
          href="/admin"
          className="rounded border border-border bg-surface px-3 py-1 font-medium text-foreground"
        >
          Back to Admin
        </Link>
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {PRESETS.map((entry) => (
          <Link
            key={entry.value}
            href={query(entry.value)}
            aria-current={preset === entry.value ? 'page' : undefined}
            className={
              preset === entry.value
                ? 'rounded bg-primary px-3 py-1 font-medium text-surface'
                : 'rounded border border-border bg-surface px-3 py-1 font-medium text-foreground'
            }
          >
            {entry.label}
          </Link>
        ))}
      </div>
      <form method="get" action="/admin/reports" className="mt-3 flex gap-2">
        <input type="hidden" name="preset" value={preset} />
        <label>
          <span className="text-muted">From</span>
          <input
            type="date"
            name="from"
            defaultValue={params.from ?? ''}
            className="ml-1 rounded border border-border bg-surface px-2 py-1 text-foreground"
          />
        </label>
        <label>
          <span className="text-muted">To</span>
          <input
            type="date"
            name="to"
            defaultValue={params.to ?? ''}
            className="ml-1 rounded border border-border bg-surface px-2 py-1 text-foreground"
          />
        </label>
        <button
          type="submit"
          className="rounded bg-primary px-3 py-1 font-medium text-surface"
        >
          Apply
        </button>
      </form>
      <div className="mt-4 grid gap-4">
        <Card title="Sales summary">
          <p>Revenue: ₱{report.summary.revenue.toFixed(2)}</p>
          <p>Orders: {report.summary.orders}</p>
          <p>
            Average order: ₱{report.summary.averageOrderValue.toFixed(2)}
          </p>
          <ul className="mt-2">
            {report.summary.breakdown.map((row) => (
              <li key={row.mode}>
                {row.mode}: {row.orders} orders (₱{row.revenue.toFixed(2)})
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Daily">
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
        <Card title="Top products">
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
        <Card title="Inventory summary">
          <p>Items: {inventory.totalItems}</p>
          <p>Low: {inventory.lowStockCount}</p>
          <p>Out of stock: {inventory.outOfStockCount}</p>
          <p>Stock value: ₱{inventory.stockValue.toFixed(2)}</p>
        </Card>
      </div>
    </main>
  );
}
