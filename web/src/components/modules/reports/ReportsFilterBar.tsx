'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import type { ReportPreset } from '@/features/reports/aggregate';
import {
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  ArrowPathIcon,
} from '@/components/common/hero-icons';
import { cn } from '@/lib/cn';

const PRESETS: { value: ReportPreset; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: 'all', label: 'All Time' },
];

interface ReportsFilterBarProps {
  preset: ReportPreset;
  params: {
    from?: string;
    to?: string;
    search?: string;
    cashier?: string;
    paymentMode?: string;
    paymentStatus?: string;
  };
}

export function ReportsFilterBar({ preset, params }: ReportsFilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showAdvanced, setShowAdvanced] = useState(
    Boolean(
      params.from ||
        params.to ||
        params.search ||
        params.cashier ||
        params.paymentMode ||
        params.paymentStatus,
    ),
  );

  const query = (value: ReportPreset) => {
    const next = new URLSearchParams(searchParams?.toString() ?? '');
    next.set('preset', value);
    // keep search/filters if they exist or clean them for preset switches
    return `/admin/reports?preset=${value}`;
  };

  const handleReset = () => {
    router.push(`/admin/reports?preset=${preset}`);
  };

  return (
    <div className="space-y-3">
      {/* Date Presets Pills */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-md border border-border bg-slate-50/70 p-1 shadow-xs">
          {PRESETS.map((entry) => (
            <Link
              key={entry.value}
              href={query(entry.value)}
              aria-current={preset === entry.value ? 'page' : undefined}
              className={cn(
                'action-focus rounded px-3 py-1.5 text-xs font-semibold transition-all sm:text-sm',
                preset === entry.value
                  ? 'bg-pine text-surface shadow-xs'
                  : 'text-muted hover:text-foreground hover:bg-mist/80',
              )}
            >
              {entry.label}
            </Link>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={cn(
            'action-focus inline-flex h-10 items-center gap-2 rounded-md border px-3.5 text-sm font-semibold shadow-xs transition-colors',
            showAdvanced
              ? 'border-pine/30 bg-pine/5 text-pine'
              : 'border-border bg-surface text-foreground hover:bg-mist',
          )}
        >
          <AdjustmentsHorizontalIcon className="h-4 w-4" />
          <span>{showAdvanced ? 'Hide Filters' : 'More Filters'}</span>
          {(params.from ||
            params.to ||
            params.search ||
            params.cashier ||
            params.paymentMode ||
            params.paymentStatus) && (
            <span className="ml-1 inline-flex h-2 w-2 rounded-full bg-pine" />
          )}
        </button>
      </div>

      {/* Advanced Filter Form */}
      {showAdvanced && (
        <form
          method="get"
          action="/admin/reports"
          className="rounded-xl border border-border bg-white p-4 sm:p-5 shadow-sm transition-all"
        >
          <input type="hidden" name="preset" value={preset} />

          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            <div>
              <label
                htmlFor="filter-from"
                className="block text-xs font-semibold text-foreground mb-1"
              >
                From Date
              </label>
              <input
                id="filter-from"
                type="date"
                name="from"
                defaultValue={params.from ?? ''}
                className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm text-foreground focus:border-pine focus:outline-pine"
              />
            </div>

            <div>
              <label
                htmlFor="filter-to"
                className="block text-xs font-semibold text-foreground mb-1"
              >
                To Date
              </label>
              <input
                id="filter-to"
                type="date"
                name="to"
                defaultValue={params.to ?? ''}
                className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm text-foreground focus:border-pine focus:outline-pine"
              />
            </div>

            <div>
              <label
                htmlFor="filter-search"
                className="block text-xs font-semibold text-foreground mb-1"
              >
                Search Transaction
              </label>
              <div className="relative">
                <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted" />
                <input
                  id="filter-search"
                  type="search"
                  name="search"
                  defaultValue={params.search ?? ''}
                  placeholder="TXN # or ref"
                  className="h-10 w-full rounded-md border border-border bg-white pl-9 pr-3 text-sm text-foreground placeholder:text-muted/60 focus:border-pine focus:outline-pine"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="filter-cashier"
                className="block text-xs font-semibold text-foreground mb-1"
              >
                Cashier
              </label>
              <input
                id="filter-cashier"
                type="search"
                name="cashier"
                defaultValue={params.cashier ?? ''}
                placeholder="Staff name"
                className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm text-foreground placeholder:text-muted/60 focus:border-pine focus:outline-pine"
              />
            </div>

            <div>
              <label
                htmlFor="filter-payment-mode"
                className="block text-xs font-semibold text-foreground mb-1"
              >
                Payment Method
              </label>
              <select
                id="filter-payment-mode"
                name="paymentMode"
                defaultValue={params.paymentMode ?? ''}
                className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm text-foreground focus:border-pine focus:outline-pine"
              >
                <option value="">All Methods</option>
                <option value="cash">Cash</option>
                <option value="gcash">GCash</option>
                <option value="maya">Maya</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="filter-payment-status"
                className="block text-xs font-semibold text-foreground mb-1"
              >
                Payment Status
              </label>
              <select
                id="filter-payment-status"
                name="paymentStatus"
                defaultValue={params.paymentStatus ?? ''}
                className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm text-foreground focus:border-pine focus:outline-pine"
              >
                <option value="">All Statuses</option>
                <option value="paid">Paid</option>
                <option value="pending_verification">Pending</option>
                <option value="verified">Verified</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-end gap-2 border-t border-border/50 pt-3">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex h-10 items-center gap-1.5 rounded-md border border-border bg-white px-3.5 text-sm font-semibold text-foreground hover:bg-mist"
            >
              <ArrowPathIcon className="h-4 w-4" />
              Reset
            </button>
            <button
              type="submit"
              className="action-focus inline-flex h-10 items-center rounded-md bg-pine px-4 text-sm font-semibold text-surface shadow-xs hover:bg-pine-deep"
            >
              Apply Filters
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
