import Link from 'next/link';
import { requireRole } from '@/features/auth/queries';
import {
  getReceiptRecords,
  getSalesReport,
  getTopProducts,
} from '@/features/reports/queries';
import { resolveRange } from '@/features/reports/aggregate';
import type { ReportPreset } from '@/features/reports/aggregate';
import { SalesChart } from '@/features/reports/components/SalesChart';
import { VoidButton } from '@/features/reports/components/VoidButton';
import { Card } from '@/components/common/Card';
import { EmptyState } from '@/components/common/EmptyState';
import { IconTile } from '@/components/common/IconTile';
import { ChartIcon, ReceiptIcon } from '@/components/common/icons';
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

const PAYMENT_LABELS = {
  cash: 'Cash',
  gcash: 'GCash',
  maya: 'Maya',
} as const;

const PAYMENT_STATUS_LABELS = {
  paid: 'Paid',
  pending_verification: 'Pending Verification',
  verified: 'Verified',
  rejected: 'Rejected',
} as const;

/** Filtered sales, searchable transactions, and top-product summary. */
export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{
    preset?: string;
    from?: string;
    to?: string;
    search?: string;
    cashier?: string;
    paymentMode?: string;
    paymentStatus?: string;
  }>;
}) {
  const profile = await requireRole('admin');
  const params = await searchParams;
  const preset = parsePreset(params.preset);
  const range = resolveRange(preset, params.from ?? null, params.to ?? null);
  const [report, top, ledger] = await Promise.all([
    getSalesReport(range),
    getTopProducts(range),
    getReceiptRecords(range, {
      search: params.search,
      cashier: params.cashier,
      paymentMode: params.paymentMode,
      paymentStatus: params.paymentStatus,
    }),
  ]);
  const query = (value: ReportPreset) => `/admin/reports?preset=${value}`;
  const cashSummary = report.summary.breakdown.find(
    (row) => row.mode === 'cash',
  );
  const onlineSummary = report.summary.breakdown
    .filter((row) => row.mode !== 'cash')
    .reduce(
      (total, row) => ({
        revenue: total.revenue + row.revenue,
        orders: total.orders + row.orders,
      }),
      { revenue: 0, orders: 0 },
    );
  return (
    <StaffShell email={profile.email} role={profile.role} title="Reports">
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {PRESETS.map((entry) => (
          <Link
            key={entry.value}
            href={query(entry.value)}
            aria-current={preset === entry.value ? 'page' : undefined}
            className={cn(
              'action-focus shrink-0 rounded-full px-4 py-2 text-sm font-semibold',
              preset === entry.value
                ? 'bg-pine text-surface'
                : 'border border-border bg-surface text-foreground hover:bg-mist',
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
        <label className="block min-w-56 flex-1">
          <span className="text-sm text-muted">Search transaction</span>
          <input
            type="search"
            name="search"
            defaultValue={params.search ?? ''}
            placeholder="TXN-20261002-00124"
            className="mt-1 block h-[52px] w-full rounded-2xl border border-border bg-mist px-3.5 text-foreground"
          />
        </label>
        <label className="block min-w-40">
          <span className="text-sm text-muted">Cashier</span>
          <input
            type="search"
            name="cashier"
            defaultValue={params.cashier ?? ''}
            placeholder="Cashier name"
            className="mt-1 block h-[52px] w-full rounded-2xl border border-border bg-mist px-3.5 text-foreground"
          />
        </label>
        <label className="block">
          <span className="text-sm text-muted">Payment method</span>
          <select
            name="paymentMode"
            defaultValue={params.paymentMode ?? ''}
            className="mt-1 block h-[52px] rounded-2xl border border-border bg-mist px-3.5 text-foreground"
          >
            <option value="">All methods</option>
            <option value="cash">Cash</option>
            <option value="gcash">GCash</option>
            <option value="maya">Maya</option>
          </select>
        </label>
        <label className="block">
          <span className="text-sm text-muted">Payment status</span>
          <select
            name="paymentStatus"
            defaultValue={params.paymentStatus ?? ''}
            className="mt-1 block h-[52px] rounded-2xl border border-border bg-mist px-3.5 text-foreground"
          >
            <option value="">All statuses</option>
            <option value="paid">Paid</option>
            <option value="pending_verification">Pending Verification</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
          </select>
        </label>
        <button
          type="submit"
          className="action-focus flex h-11 items-center rounded-full bg-pine px-4 text-sm font-semibold text-surface"
        >
          Apply
        </button>
      </form>
      <div className="mt-4 grid gap-3">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Card className="rounded-card border-border shadow-soft">
            <div className="flex items-center gap-3">
              <IconTile tone="mint" className="text-base font-extrabold">
                ₱
              </IconTile>
              <p className="text-[15px] font-bold text-foreground">
                Gross: ₱{report.grossRevenue.toFixed(2)}
              </p>
            </div>
          </Card>
          <Card className="rounded-card border-border shadow-soft">
            <p className="text-[15px] font-bold text-foreground">
              Voided: ₱{report.voidedRevenue.toFixed(2)}
            </p>
          </Card>
          <Card className="rounded-card border-border shadow-soft">
            <p className="text-[15px] font-bold text-foreground">
              Net: ₱{report.netRevenue.toFixed(2)}
            </p>
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
          <dl className="grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-muted">Cash sales</dt>
              <dd className="font-bold">
                ₱{(cashSummary?.revenue ?? 0).toFixed(2)} (
                {cashSummary?.orders ?? 0} orders)
              </dd>
            </div>
            <div>
              <dt className="text-muted">Online sales</dt>
              <dd className="font-bold">
                ₱{onlineSummary.revenue.toFixed(2)} ({onlineSummary.orders}{' '}
                orders)
              </dd>
            </div>
            <div>
              <dt className="text-muted">Average order</dt>
              <dd className="font-bold">
                ₱{report.summary.averageOrderValue.toFixed(2)}
              </dd>
            </div>
          </dl>
          <ul className="mt-2">
            {report.summary.breakdown.map((row) => (
              <li key={row.mode}>
                {row.mode}: {row.orders} orders (₱{row.revenue.toFixed(2)})
              </li>
            ))}
          </ul>
        </Card>
        <Card
          title="Daily"
          className="min-w-0 rounded-card border-border shadow-soft"
        >
          <div className="overflow-x-auto">
            <SalesChart data={report.daily} />
          </div>
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
            <EmptyState
              icon={<ChartIcon />}
              title="No sales in range"
              sub="Try a wider date range."
            />
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
          title="Transaction / Sales Review"
          className="min-w-0 rounded-card border-border shadow-soft"
        >
          {ledger.receipts.length === 0 ? (
            <EmptyState
              icon={<ReceiptIcon />}
              title="No receipts in range"
              sub="Completed sales will show up here."
            />
          ) : (
            <ul className="flex flex-col gap-2">
              {ledger.receipts.map((receipt) => (
                <li
                  key={receipt.transaction_id}
                  className="flex items-start gap-2"
                >
                  <Link
                    href={`/pos/receipt/${receipt.transaction_id}`}
                    aria-label={`View receipt ${receipt.transaction_number}`}
                    className="action-focus flex min-w-0 flex-1 items-center gap-3 rounded-2xl bg-mist p-3"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold">
                        {receipt.transaction_number}
                      </span>
                      <span className="block text-xs text-muted">
                        {new Date(receipt.date).toLocaleString()} ·{' '}
                        {receipt.cashier_name} ·{' '}
                        {PAYMENT_LABELS[receipt.payment_mode]} ·{' '}
                        {PAYMENT_STATUS_LABELS[receipt.payment_status]}
                        {receipt.status === 'voided' ? ' · Voided' : ''}
                      </span>
                      <span className="mt-1 block text-xs text-muted">
                        {receipt.items.length
                          ? receipt.items
                              .map(
                                (item) =>
                                  `${item.quantity}× ${item.product_name}`,
                              )
                              .join(', ')
                          : 'No item details'}
                      </span>
                      {receipt.payment_reference ? (
                        <span className="mt-1 block break-all text-xs text-muted">
                          Reference: {receipt.payment_reference}
                          {receipt.has_payment_evidence
                            ? ' · Evidence available'
                            : ''}
                        </span>
                      ) : null}
                    </span>
                    <span className="shrink-0 text-sm font-extrabold">
                      ₱{receipt.total_amount.toFixed(2)}
                    </span>
                  </Link>
                  {receipt.status !== 'voided' ? (
                    <VoidButton transactionId={receipt.transaction_id} />
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          {ledger.receiptsTruncated ? (
            <p className="mt-2 text-xs text-muted">
              Showing the latest 50 receipts.
            </p>
          ) : null}
        </Card>
        <Card
          title="Items sold"
          className="min-w-0 rounded-card border-border shadow-soft"
        >
          {ledger.lines.length === 0 ? (
            <EmptyState
              icon={<ChartIcon />}
              title="No items sold in range"
              sub="Completed sales will show up here."
            />
          ) : (
            <ul className="flex flex-col gap-2">
              {ledger.lines.map((line, index) => (
                <li
                  key={`${line.transaction_id}-${line.product_name}-${index}`}
                  className="flex items-center gap-3 rounded-2xl bg-mist p-3"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">
                      {line.product_name}
                    </span>
                    <span className="block truncate text-xs text-muted">
                      {line.quantity} × ₱{line.unit_price.toFixed(2)}
                      {line.order_number !== null
                        ? ` · Order #${line.order_number}`
                        : null}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-extrabold">
                    ₱{line.subtotal.toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {ledger.linesTruncated ? (
            <p className="mt-2 text-xs text-muted">
              Showing the latest 100 sold lines.
            </p>
          ) : null}
        </Card>
      </div>
    </StaffShell>
  );
}
