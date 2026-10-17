'use client';

import { useMemo, useState } from 'react';
import type { QuotaChange } from '@/features/quotas/queries';
import {
  ClockIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from '@/components/common/hero-icons';
import { cn } from '@/lib/cn';

function formatQuotaChangeDetails(entry: QuotaChange) {
  const prev = entry.previous_quota;
  const next = entry.new_quota;

  if (prev === null && next !== null) {
    return {
      label: `Capped at ${next}`,
      badge: 'bg-peri text-foreground border-border/80',
      type: 'limit-added',
    };
  }

  if (prev !== null && next === null) {
    return {
      label: 'Changed to Unlimited',
      badge: 'bg-peri text-foreground border-border/80',
      type: 'unlimited',
    };
  }

  if (prev !== null && next !== null) {
    const diff = next - prev;
    if (next === 0) {
      return {
        label: 'Marked Sold Out (0)',
        badge: 'bg-danger/10 text-danger border-danger/30',
        type: 'sold-out',
      };
    }
    if (diff > 0) {
      return {
        label: `+${diff} Stock Added`,
        badge: 'bg-pine/10 text-pine border-pine/30',
        type: 'increase',
      };
    }
    if (diff < 0) {
      return {
        label: `${diff} Quota Reduced`,
        badge: 'bg-warning/15 text-warning border-warning/30',
        type: 'decrease',
      };
    }
    return {
      label: 'No Quantity Change',
      badge: 'bg-mist text-muted border-border/70',
      type: 'same',
    };
  }

  return {
    label: 'Quota Adjusted',
    badge: 'bg-mist text-muted border-border/70',
    type: 'neutral',
  };
}

export function QuotaHistoryTable({ history }: { history: QuotaChange[] }) {
  const [search, setSearch] = useState('');

  const filteredHistory = useMemo(() => {
    if (!search.trim()) return history;
    const q = search.toLowerCase();
    return history.filter(
      (entry) =>
        entry.product_name.toLowerCase().includes(q) ||
        (entry.reason && entry.reason.toLowerCase().includes(q)) ||
        entry.changed_by_role.toLowerCase().includes(q),
    );
  }, [history, search]);

  return (
    <section
      aria-label="Recent quota changes log"
      className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm"
    >
      <div className="flex flex-col justify-between gap-3 border-b border-border/70 p-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-pine/10 text-pine">
            <ClockIcon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold tracking-tight text-foreground">
              Recent Quota Adjustments History
            </h2>
            <p className="text-xs text-muted">
              Clear audit log showing what items were changed, by how much, and
              why
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {history.length > 0 && (
            <div className="relative min-w-44 flex-1 sm:w-60">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter adjustments..."
                className="h-10 w-full rounded-md border border-border bg-white pl-9 pr-9 text-xs sm:text-sm font-medium text-foreground placeholder:text-muted focus:border-pine focus:outline-pine"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                  aria-label="Clear filter"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          )}

          <span className="self-start rounded-full bg-mist px-3 py-1 text-xs font-semibold text-muted sm:self-auto">
            {history.length} {history.length === 1 ? 'change' : 'changes'}{' '}
            recorded
          </span>
        </div>
      </div>

      {history.length === 0 ? (
        <div className="p-8 text-center text-sm text-muted">
          No quota changes recorded yet today.
        </div>
      ) : filteredHistory.length === 0 ? (
        <div className="p-8 text-center text-sm text-muted">
          No quota adjustments match &ldquo;{search}&rdquo;.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="border-b border-border/80 bg-mist/60 text-xs font-bold uppercase tracking-wider text-muted">
              <tr>
                <th scope="col" className="px-5 py-3.5">
                  Product Name
                </th>
                <th scope="col" className="px-5 py-3.5 text-center">
                  Previous Limit
                </th>
                <th scope="col" className="px-5 py-3.5 text-center">
                  New Limit
                </th>
                <th scope="col" className="px-5 py-3.5">
                  Net Adjustment
                </th>
                <th scope="col" className="px-5 py-3.5">
                  Reason / Note
                </th>
                <th scope="col" className="px-5 py-3.5 text-center">
                  Changed By
                </th>
                <th scope="col" className="px-5 py-3.5 text-right">
                  Time
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredHistory.map((entry) => {
                const changeMeta = formatQuotaChangeDetails(entry);
                const timeStr = new Date(entry.changed_at).toLocaleTimeString(
                  'en-PH',
                  {
                    timeZone: 'Asia/Manila',
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  },
                );
                const dateStr = new Date(entry.changed_at).toLocaleDateString(
                  'en-PH',
                  {
                    timeZone: 'Asia/Manila',
                    month: 'short',
                    day: 'numeric',
                  },
                );

                return (
                  <tr
                    key={entry.quota_change_id}
                    className="transition-colors hover:bg-mist/30"
                  >
                    {/* Product Name */}
                    <td className="px-5 py-3.5 font-bold text-foreground">
                      {entry.product_name}
                    </td>

                    {/* Previous Limit */}
                    <td className="px-5 py-3.5 whitespace-nowrap text-center text-muted font-medium">
                      {entry.previous_quota === null
                        ? 'Unlimited'
                        : `${entry.previous_quota} units`}
                    </td>

                    {/* New Limit */}
                    <td className="px-5 py-3.5 whitespace-nowrap text-center font-bold text-foreground">
                      {entry.new_quota === null
                        ? 'Unlimited'
                        : `${entry.new_quota} units`}
                    </td>

                    {/* Net Adjustment Badge */}
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold',
                          changeMeta.badge,
                        )}
                      >
                        {changeMeta.label}
                      </span>
                    </td>

                    {/* Reason */}
                    <td className="px-5 py-3.5 text-xs text-foreground/80 max-w-xs">
                      {entry.reason ? (
                        <span className="rounded-lg bg-mist/70 px-2.5 py-1 font-medium">
                          {entry.reason}
                        </span>
                      ) : (
                        <span className="text-muted/60 italic">
                          Routine adjustment
                        </span>
                      )}
                    </td>

                    {/* Changed By Role */}
                    <td className="px-5 py-3.5 whitespace-nowrap text-center">
                      <span
                        className={cn(
                          'inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider',
                          entry.changed_by_role === 'admin'
                            ? 'bg-pine/10 text-pine'
                            : 'bg-mist text-foreground/80',
                        )}
                      >
                        {entry.changed_by_role}
                      </span>
                    </td>

                    {/* Date and Time */}
                    <td className="px-5 py-3.5 whitespace-nowrap text-right text-xs">
                      <p className="font-semibold text-foreground">{timeStr}</p>
                      <p className="text-[11px] text-muted">{dateStr}</p>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
