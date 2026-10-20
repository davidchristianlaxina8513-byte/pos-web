'use client';

import {
  BanknotesIcon,
  ShoppingCartIcon,
  ArrowTrendingUpIcon,
  NoSymbolIcon,
} from '@/components/common/hero-icons';
import type { SalesSummary } from '@/features/reports/aggregate';

interface ReportsKPIsProps {
  grossRevenue: number;
  voidedRevenue: number;
  netRevenue: number;
  summary: SalesSummary;
}

export function ReportsKPIs({
  grossRevenue,
  voidedRevenue,
  netRevenue,
  summary,
}: ReportsKPIsProps) {
  const cashSummary = summary.breakdown.find((row) => row.mode === 'cash');
  const onlineRevenue = summary.breakdown
    .filter((row) => row.mode !== 'cash')
    .reduce((sum, r) => sum + r.revenue, 0);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {/* Net Revenue */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-surface p-4 shadow-soft">
        <div className="absolute right-3 top-3 rounded-xl bg-mist p-2 text-foreground">
          <ArrowTrendingUpIcon className="h-5 w-5" />
        </div>
        <span className="text-xs font-semibold uppercase tracking-wider text-muted">
          Net Sales Revenue
        </span>
        <div className="mt-2 text-2xl font-black text-foreground">
          ₱{netRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </div>
        <p className="mt-1 text-xs text-muted">
          Realized revenue after voids and refunds
        </p>
      </div>

      {/* Gross Revenue */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-surface p-4 shadow-soft">
        <div className="absolute right-3 top-3 rounded-xl bg-mist p-2 text-foreground">
          <BanknotesIcon className="h-5 w-5" />
        </div>
        <span className="text-xs font-semibold uppercase tracking-wider text-muted">
          Gross Sales
        </span>
        <div className="mt-2 text-2xl font-black text-foreground">
          ₱{grossRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </div>
        <div className="mt-1 flex items-center gap-2 text-xs text-muted">
          <span>Cash: ₱{(cashSummary?.revenue ?? 0).toFixed(2)}</span>
          <span>·</span>
          <span>Online: ₱{onlineRevenue.toFixed(2)}</span>
        </div>
      </div>

      {/* Completed Orders & AOV */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-surface p-4 shadow-soft">
        <div className="absolute right-3 top-3 rounded-xl bg-mist p-2 text-foreground">
          <ShoppingCartIcon className="h-5 w-5" />
        </div>
        <span className="text-xs font-semibold uppercase tracking-wider text-muted">
          Completed Orders
        </span>
        <div className="mt-2 text-2xl font-black text-foreground">
          {summary.orders}
        </div>
        <p className="mt-1 text-xs text-muted">
          Avg order value: ₱
          {summary.averageOrderValue.toLocaleString('en-US', {
            minimumFractionDigits: 2,
          })}
        </p>
      </div>

      {/* Refunded Revenue */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-surface p-4 shadow-soft">
        <div className="absolute right-3 top-3 rounded-xl bg-danger/10 p-2 text-danger">
          <NoSymbolIcon className="h-5 w-5" />
        </div>
        <span className="text-xs font-semibold uppercase tracking-wider text-muted">
          Customer Refunds &amp; Returns
        </span>
        <div className="mt-2 text-2xl font-black text-danger">
          -₱
          {voidedRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </div>
        <p className="mt-1 text-xs text-muted">
          {voidedRevenue > 0
            ? 'Customer refunds deducted from gross revenue'
            : 'Zero customer refunds in this period'}
        </p>
      </div>
    </div>
  );
}
