'use client';

import { useState } from 'react';
import type {
  DaySales,
  SalesSummary,
  TopProduct,
  ReceiptRecord,
  SoldLine,
} from '@/features/reports/aggregate';
import {
  ChartBarSquareIcon,
  DocumentTextIcon,
  ShoppingBagIcon,
  Squares2X2Icon,
} from '@/components/common/hero-icons';
import { cn } from '@/lib/cn';
import { ReportsCharts } from './ReportsCharts';
import { TransactionReviewTable } from './TransactionReviewTable';

export type ReportsTab = 'trends' | 'top_products' | 'ledger' | 'all';

interface ReportsViewManagerProps {
  daily: DaySales[];
  summary: SalesSummary;
  topProducts: TopProduct[];
  receipts: ReceiptRecord[];
  lines: SoldLine[];
  receiptsTruncated: boolean;
  linesTruncated: boolean;
  defaultTab?: ReportsTab;
}

export function ReportsViewManager({
  daily,
  summary,
  topProducts,
  receipts,
  lines,
  receiptsTruncated,
  linesTruncated,
  defaultTab = 'all',
}: ReportsViewManagerProps) {
  const [activeTab, setActiveTab] = useState<ReportsTab>(defaultTab);

  return (
    <div className="space-y-6">
      {/* Tab Navigation Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-4">
        <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-slate-50/70 p-1">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={cn(
              'action-focus flex items-center gap-2 rounded-md px-3.5 py-2 text-xs sm:text-sm font-semibold transition-all cursor-pointer',
              activeTab === 'all'
                ? 'bg-surface text-foreground shadow-xs font-bold'
                : 'text-muted hover:text-foreground',
            )}
          >
            <Squares2X2Icon className="h-4 w-4 text-pine" />
            <span>View All</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('trends')}
            className={cn(
              'action-focus flex items-center gap-2 rounded-md px-3.5 py-2 text-xs sm:text-sm font-semibold transition-all cursor-pointer',
              activeTab === 'trends'
                ? 'bg-surface text-foreground shadow-xs font-bold'
                : 'text-muted hover:text-foreground',
            )}
          >
            <ChartBarSquareIcon className="h-4 w-4 text-pine" />
            <span>Daily Sales Trend</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('top_products')}
            className={cn(
              'action-focus flex items-center gap-2 rounded-md px-3.5 py-2 text-xs sm:text-sm font-semibold transition-all cursor-pointer',
              activeTab === 'top_products'
                ? 'bg-surface text-foreground shadow-xs font-bold'
                : 'text-muted hover:text-foreground',
            )}
          >
            <ShoppingBagIcon className="h-4 w-4 text-pine" />
            <span>Top Selling Products</span>
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[11px] font-semibold transition-colors',
                activeTab === 'top_products'
                  ? 'bg-pine/10 text-pine'
                  : 'bg-mist text-muted',
              )}
            >
              {topProducts.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ledger')}
            className={cn(
              'action-focus flex items-center gap-2 rounded-md px-3.5 py-2 text-xs sm:text-sm font-semibold transition-all cursor-pointer',
              activeTab === 'ledger'
                ? 'bg-surface text-foreground shadow-xs font-bold'
                : 'text-muted hover:text-foreground',
            )}
          >
            <DocumentTextIcon className="h-4 w-4 text-pine" />
            <span>Receipts Ledger</span>
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[11px] font-semibold transition-colors',
                activeTab === 'ledger'
                  ? 'bg-pine/10 text-pine'
                  : 'bg-mist text-muted',
              )}
            >
              {receipts.length}
            </span>
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      {activeTab === 'trends' && (
        <ReportsCharts
          daily={daily}
          summary={summary}
          topProducts={topProducts}
          view="trends"
        />
      )}

      {activeTab === 'top_products' && (
        <ReportsCharts
          daily={daily}
          summary={summary}
          topProducts={topProducts}
          view="top_products"
        />
      )}

      {activeTab === 'ledger' && (
        <TransactionReviewTable
          receipts={receipts}
          lines={lines}
          receiptsTruncated={receiptsTruncated}
          linesTruncated={linesTruncated}
        />
      )}

      {activeTab === 'all' && (
        <div className="space-y-6">
          <ReportsCharts
            daily={daily}
            summary={summary}
            topProducts={topProducts}
            view="all"
          />
          <TransactionReviewTable
            receipts={receipts}
            lines={lines}
            receiptsTruncated={receiptsTruncated}
            linesTruncated={linesTruncated}
          />
        </div>
      )}
    </div>
  );
}
