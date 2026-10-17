'use client';

import { useState } from 'react';
import type {
  DaySales,
  SalesSummary,
  TopProduct,
} from '@/features/reports/aggregate';
import {
  ChartBarSquareIcon,
  CreditCardIcon,
  ShoppingBagIcon,
} from '@/components/common/hero-icons';
import { EmptyState } from '@/components/error/EmptyState';
import { ChartIcon } from '@/components/common/icons';
import { cn } from '@/lib/cn';

interface ReportsChartsProps {
  daily: DaySales[];
  summary: SalesSummary;
  topProducts: TopProduct[];
  view?: 'all' | 'trends' | 'top_products';
}

const PAYMENT_INFO = {
  cash: { label: 'Cash', color: 'bg-emerald-500', barBg: 'bg-emerald-500/20' },
  gcash: { label: 'GCash', color: 'bg-blue-500', barBg: 'bg-blue-500/20' },
  maya: { label: 'Maya', color: 'bg-teal-500', barBg: 'bg-teal-500/20' },
} as const;

export function ReportsCharts({
  daily,
  summary,
  topProducts,
  view = 'all',
}: ReportsChartsProps) {
  const [activeDayIndex, setActiveDayIndex] = useState<number | null>(null);

  // Chart max calculation
  const maxRevenue = Math.max(1, ...daily.map((d) => d.revenue));
  const activeDay = activeDayIndex !== null ? daily[activeDayIndex] : null;

  // Payment totals
  const totalPaymentRevenue = summary.breakdown.reduce(
    (sum, b) => sum + b.revenue,
    0,
  );

  // Top products max calculation
  const maxTopQty = Math.max(1, ...topProducts.map((p) => p.quantity_sold));

  const showTrends = view === 'all' || view === 'trends';
  const showTopProducts = view === 'all' || view === 'top_products';

  const trendChart = (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-soft lg:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
            <ChartBarSquareIcon className="h-5 w-5 text-pine" />
            Daily Sales Trend
          </h2>
          <p className="text-xs text-muted">
            Revenue and orders performance across the selected date range
          </p>
        </div>
        {activeDay && (
          <div className="rounded-xl border border-pine/20 bg-pine/5 px-3 py-1 text-right">
            <div className="text-xs font-semibold text-pine">
              {activeDay.date} ({activeDay.label})
            </div>
            <div className="text-sm font-black text-pine">
              ₱{activeDay.revenue.toFixed(2)} · {activeDay.orders} orders
            </div>
          </div>
        )}
      </div>

      {daily.length === 0 ? (
        <div className="py-12">
          <EmptyState
            icon={<ChartIcon />}
            title="No daily data"
            sub="No sales recorded for the selected range."
          />
        </div>
      ) : (
        <div className="mt-6">
          {/* Custom Interactive SVG/HTML Bar Chart */}
          <div className="flex h-44 items-end gap-2 overflow-x-auto pb-6 pt-2">
            {daily.map((day, idx) => {
              const heightPercent =
                day.revenue === 0 ? 4 : (day.revenue / maxRevenue) * 100;
              const isHovered = activeDayIndex === idx;

              return (
                <div
                  key={day.date}
                  className="group relative flex min-w-10 flex-1 flex-col items-center justify-end"
                  onMouseEnter={() => setActiveDayIndex(idx)}
                  onMouseLeave={() => setActiveDayIndex(null)}
                >
                  {/* Tooltip on hover */}
                  <div
                    className={cn(
                      'pointer-events-none absolute -top-10 z-20 whitespace-nowrap rounded-lg bg-pine-deep px-2 py-1 text-[10px] font-bold text-surface shadow-md transition-opacity',
                      isHovered
                        ? 'opacity-100'
                        : 'opacity-0 group-hover:opacity-100',
                    )}
                  >
                    ₱{day.revenue.toFixed(0)} ({day.orders})
                  </div>

                  {/* Bar */}
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className={cn(
                      'w-full max-w-10 rounded-t-lg transition-all duration-200',
                      isHovered
                        ? 'bg-pine-deep ring-2 ring-pine/30'
                        : 'bg-pine hover:bg-pine/90',
                      day.revenue === 0 && 'bg-mist',
                    )}
                  />

                  {/* X-axis Label */}
                  <div className="absolute -bottom-5 text-center">
                    <span className="block text-[11px] font-semibold text-muted truncate max-w-10">
                      {day.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-2 text-[11px] text-muted">
            <span>Low: ₱0.00</span>
            <span>
              High: ₱
              {maxRevenue.toLocaleString('en-US', {
                minimumFractionDigits: 2,
              })}
            </span>
          </div>
        </div>
      )}
    </div>
  );

  const paymentMethodsCard = (
    <div className="flex flex-col justify-between rounded-2xl border border-border bg-surface p-5 shadow-soft">
      <div>
        <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
          <CreditCardIcon className="h-5 w-5 text-pine" />
          Payment Methods
        </h2>
        <p className="text-xs text-muted">
          Share of revenue per payment channel
        </p>

        <div className="mt-5 space-y-4">
          {summary.breakdown.map((row) => {
            const info = PAYMENT_INFO[row.mode];
            const percent =
              totalPaymentRevenue > 0
                ? (row.revenue / totalPaymentRevenue) * 100
                : 0;

            return (
              <div key={row.mode} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 font-bold text-foreground">
                    <span
                      className={cn('h-2.5 w-2.5 rounded-full', info.color)}
                    />
                    {info.label}
                  </span>
                  <span className="font-bold text-foreground">
                    ₱{row.revenue.toFixed(2)}{' '}
                    <span className="text-[11px] font-normal text-muted">
                      ({percent.toFixed(1)}%)
                    </span>
                  </span>
                </div>

                <div className="h-2 w-full overflow-hidden rounded-full bg-mist">
                  <div
                    style={{ width: `${percent}%` }}
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      info.color,
                    )}
                  />
                </div>

                <div className="text-right text-[10px] text-muted">
                  {row.orders} {row.orders === 1 ? 'order' : 'orders'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-border/60 bg-mist/50 p-3 text-xs text-muted">
        <div className="flex justify-between font-semibold text-foreground">
          <span>Total Sales</span>
          <span>₱{totalPaymentRevenue.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );

  const topProductsCard = (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
            <ShoppingBagIcon className="h-5 w-5 text-pine" />
            Top Selling Products
          </h2>
          <p className="text-xs text-muted">
            Most popular items ordered in the selected time range
          </p>
        </div>
        <span className="rounded-full bg-mist px-3 py-1 text-xs font-semibold text-muted">
          {topProducts.length} Ranked
        </span>
      </div>

      {topProducts.length === 0 ? (
        <div className="py-8">
          <EmptyState
            icon={<ChartIcon />}
            title="No items sold"
            sub="Items sold during this period will appear on this leaderboard."
          />
        </div>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {topProducts.map((prod, index) => {
            const qtyPercent = (prod.quantity_sold / maxTopQty) * 100;
            const isTopThree = index < 3;

            return (
              <div
                key={prod.product_id}
                className="relative flex items-center gap-3.5 rounded-xl border border-border/80 bg-mist/30 p-3.5 transition-all hover:bg-mist/70"
              >
                {/* Rank badge */}
                <span
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-black shadow-xs',
                    index === 0
                      ? 'bg-amber-400 text-amber-950 ring-2 ring-amber-300'
                      : index === 1
                        ? 'bg-slate-300 text-slate-800'
                        : index === 2
                          ? 'bg-amber-700/80 text-surface'
                          : 'bg-surface text-muted border border-border',
                  )}
                >
                  #{index + 1}
                </span>

                {/* Details */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-bold text-foreground">
                      {prod.product_name}
                    </span>
                    <span className="shrink-0 text-xs font-extrabold text-pine">
                      ₱{prod.revenue.toFixed(2)}
                    </span>
                  </div>

                  <div className="mt-1 flex items-center justify-between text-[11px] text-muted">
                    <span>{prod.quantity_sold} sold</span>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-mist">
                    <div
                      style={{ width: `${qtyPercent}%` }}
                      className={cn(
                        'h-full rounded-full transition-all duration-300',
                        isTopThree ? 'bg-pine' : 'bg-muted/60',
                      )}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  if (showTopProducts && !showTrends) {
    return <div className="w-full">{topProductsCard}</div>;
  }

  if (showTrends && !showTopProducts) {
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {trendChart}
        {paymentMethodsCard}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {trendChart}
      {paymentMethodsCard}
      <div className="lg:col-span-3">{topProductsCard}</div>
    </div>
  );
}
