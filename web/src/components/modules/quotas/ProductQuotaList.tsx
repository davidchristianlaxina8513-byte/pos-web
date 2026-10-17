'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AdjustmentsHorizontalIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  Squares2X2Icon,
  TableCellsIcon,
  XMarkIcon,
} from '@/components/common/hero-icons';
import { Modal } from '@/components/modal/Modal';
import { Button } from '@/components/form/Button';
import { cn } from '@/lib/cn';
import type { UserRole } from '@/features/auth/roles';
import {
  changeDefaultQuota,
  changeTodayQuota,
} from '@/features/quotas/actions';
import type { ProductQuota, QuotaChange } from '@/features/quotas/queries';
import { useAlert } from '@/components/toast';
import { QuotaHistoryTable } from './QuotaHistoryTable';

const STATUS_CONFIG = {
  unlimited: {
    label: 'Unlimited',
    chip: 'bg-mist text-muted border-border/80',
    bar: 'bg-muted/40',
  },
  good: {
    label: 'In Stock',
    chip: 'bg-pine/10 text-pine border-pine/20',
    bar: 'bg-pine',
  },
  almost_sold_out: {
    label: 'Low Stock',
    chip: 'bg-warning/15 text-warning border-warning/30',
    bar: 'bg-warning',
  },
  sold_out: {
    label: 'Sold Out',
    chip: 'bg-danger/15 text-danger border-danger/30',
    bar: 'bg-danger',
  },
};

type StatusFilter =
  | 'all'
  | 'good'
  | 'almost_sold_out'
  | 'sold_out'
  | 'unlimited';

export type TodayProductsTab = 'all' | 'products' | 'history';

function formatQuota(val: number | null): string {
  return val === null ? 'Unlimited' : String(val);
}

interface ProductQuotaListProps {
  products: ProductQuota[];
  role: UserRole;
  history?: QuotaChange[];
  defaultTab?: TodayProductsTab;
}

export function ProductQuotaList({
  products,
  role,
  history = [],
  defaultTab = 'all',
}: ProductQuotaListProps) {
  const router = useRouter();
  const { successAlert, errorAlert } = useAlert();

  // Active section tab: 'all' | 'products' | 'history'
  const [activeTab, setActiveTab] = useState<TodayProductsTab>(defaultTab);

  // View Mode: Table (default) vs Grid
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Search and Filter state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Quick button busy state & feedback
  const [busyId, setBusyId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Modal dialog state
  const [modalItem, setModalItem] = useState<ProductQuota | null>(null);
  const [modalMode, setModalMode] = useState<'today' | 'default'>('today');
  const [quotaInput, setQuotaInput] = useState<string>('');
  const [isUnlimitedInput, setIsUnlimitedInput] = useState<boolean>(false);
  const [reasonInput, setReasonInput] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Open modal
  const openEditModal = (
    item: ProductQuota,
    mode: 'today' | 'default' = 'today',
  ) => {
    setModalItem(item);
    setModalMode(mode);
    setModalError(null);
    setReasonInput('');
    const currentLimit =
      mode === 'today' ? item.today_quota_limit : item.default_quota_limit;
    if (currentLimit === null) {
      setIsUnlimitedInput(true);
      setQuotaInput('');
    } else {
      setIsUnlimitedInput(false);
      setQuotaInput(String(currentLimit));
    }
  };

  // Close modal
  const closeModal = () => {
    if (isSubmitting) return;
    setModalItem(null);
  };

  // Submit modal quota update
  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalItem) return;

    let targetValue: number | null = null;
    if (!isUnlimitedInput) {
      const parsed = parseInt(quotaInput.trim(), 10);
      if (isNaN(parsed) || parsed < 0) {
        setModalError(
          'Please enter a valid positive number or choose Unlimited.',
        );
        return;
      }
      if (modalMode === 'today' && parsed < modalItem.sold_quantity) {
        setModalError(
          `Cannot set quota to ${parsed} because ${modalItem.sold_quantity} units have already been sold today.`,
        );
        return;
      }
      targetValue = parsed;
    }

    setIsSubmitting(true);
    setModalError(null);

    const result =
      modalMode === 'today'
        ? await changeTodayQuota(modalItem.product_id, targetValue, reasonInput)
        : await changeDefaultQuota(
            modalItem.product_id,
            targetValue,
            reasonInput,
          );

    setIsSubmitting(false);

    if (!result.ok) {
      setModalError(result.error);
      errorAlert('Update Failed', result.error);
      return;
    }

    setModalItem(null);
    successAlert(
      modalMode === 'today' ? "Today's Quota Saved" : 'Default Quota Saved',
      `${modalItem.product_name} limit set to ${targetValue === null ? 'Unlimited' : targetValue + ' units'}.`,
    );
    router.refresh();
  };

  // Quick incremental step (+1, -1, +5)
  const handleQuickStep = async (item: ProductQuota, delta: number) => {
    if (item.today_quota_limit === null) return;
    const nextVal = item.today_quota_limit + delta;
    if (nextVal < item.sold_quantity) return;

    setBusyId(item.product_id);
    setActionError(null);

    const reason =
      delta > 0
        ? `Quick adjustment (+${delta})`
        : `Quick adjustment (${delta})`;
    const result = await changeTodayQuota(item.product_id, nextVal, reason);

    setBusyId(null);
    if (!result.ok) {
      setActionError(result.error);
      errorAlert('Adjustment Failed', result.error);
      return;
    }
    successAlert(
      'Stock Quota Updated',
      `${item.product_name} daily quota adjusted to ${nextVal} units (${delta > 0 ? `+${delta}` : delta}).`,
    );
    router.refresh();
  };

  // Counts for KPI & filter chips
  const counts = useMemo(() => {
    let good = 0;
    let almost = 0;
    let soldOut = 0;
    let unlimited = 0;

    for (const p of products) {
      if (p.status === 'good') good++;
      else if (p.status === 'almost_sold_out') almost++;
      else if (p.status === 'sold_out') soldOut++;
      else if (p.status === 'unlimited') unlimited++;
    }

    return { total: products.length, good, almost, soldOut, unlimited };
  }, [products]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      const matchesSearch = !q || p.product_name.toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [products, search, statusFilter]);

  return (
    <div className="space-y-6">
      {/* 4 Summary KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <div className="rounded-2xl border border-border/80 bg-surface p-4 shadow-soft">
          <p className="text-xs font-semibold text-muted">Total Monitored</p>
          <p className="mt-1 text-2xl font-black tracking-tight text-foreground sm:text-3xl">
            {counts.total}
          </p>
          <p className="mt-0.5 text-xs text-muted">Active menu items</p>
        </div>

        <div className="rounded-2xl border border-border/80 bg-surface p-4 shadow-soft">
          <p className="text-xs font-semibold text-pine">Healthy Stock</p>
          <p className="mt-1 text-2xl font-black tracking-tight text-pine sm:text-3xl">
            {counts.good}
          </p>
          <p className="mt-0.5 text-xs text-muted">&gt;25% remaining</p>
        </div>

        <div className="rounded-2xl border border-border/80 bg-surface p-4 shadow-soft">
          <p className="text-xs font-semibold text-warning">Almost Sold Out</p>
          <p className="mt-1 text-2xl font-black tracking-tight text-warning sm:text-3xl">
            {counts.almost}
          </p>
          <p className="mt-0.5 text-xs text-muted">≤25% quota left</p>
        </div>

        <div className="rounded-2xl border border-border/80 bg-surface p-4 shadow-soft">
          <p className="text-xs font-semibold text-danger">Sold Out Today</p>
          <p className="mt-1 text-2xl font-black tracking-tight text-danger sm:text-3xl">
            {counts.soldOut}
          </p>
          <p className="mt-0.5 text-xs text-muted">0 remaining units</p>
        </div>
      </div>

      {/* Global Action Error Alert */}
      {actionError ? (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-2xl border border-danger/30 bg-danger-surface p-3.5 text-sm text-danger"
        >
          <div className="flex items-center gap-2">
            <ExclamationTriangleIcon className="h-5 w-5 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="rounded-lg p-1 hover:bg-danger/10"
            aria-label="Dismiss alert"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {/* Tab Navigation Controls (Visible when user is admin) */}
      {role === 'admin' && (
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
              onClick={() => setActiveTab('products')}
              className={cn(
                'action-focus flex items-center gap-2 rounded-md px-3.5 py-2 text-xs sm:text-sm font-semibold transition-all cursor-pointer',
                activeTab === 'products'
                  ? 'bg-surface text-foreground shadow-xs font-bold'
                  : 'text-muted hover:text-foreground',
              )}
            >
              <TableCellsIcon className="h-4 w-4 text-pine" />
              <span>Today&apos;s Products</span>
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-[11px] font-semibold transition-colors',
                  activeTab === 'products'
                    ? 'bg-pine/10 text-pine'
                    : 'bg-mist text-muted',
                )}
              >
                {products.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={cn(
                'action-focus flex items-center gap-2 rounded-md px-3.5 py-2 text-xs sm:text-sm font-semibold transition-all cursor-pointer',
                activeTab === 'history'
                  ? 'bg-surface text-foreground shadow-xs font-bold'
                  : 'text-muted hover:text-foreground',
              )}
            >
              <ClockIcon className="h-4 w-4 text-pine" />
              <span>Recent Quota Adjustments History</span>
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-[11px] font-semibold transition-colors',
                  activeTab === 'history'
                    ? 'bg-pine/10 text-pine'
                    : 'bg-mist text-muted',
                )}
              >
                {history.length}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Today's Products Section: Search, Filter & Products Display */}
      {(activeTab === 'all' || activeTab === 'products') && (
        <div className="space-y-6">
          {/* Search, Filter & View Controls */}
          <div className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-surface p-4 shadow-soft">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              {/* Search Input */}
              <div className="relative flex-1 max-w-md">
                <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search products by name..."
                  className="h-10 w-full rounded-md border border-border bg-white pl-9 pr-9 text-sm font-medium text-foreground placeholder:text-muted focus:border-pine focus:outline-pine"
                />
                {search ? (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                    aria-label="Clear search"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                ) : null}
              </div>

              {/* View Mode Toggle (Table vs Grid) */}
              <div className="flex items-center gap-1 rounded-md border border-border/80 bg-slate-50/70 p-1 self-start md:self-auto">
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  aria-label="Table view"
                  title="Table view"
                  className={cn(
                    'flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-semibold transition-all',
                    viewMode === 'table'
                      ? 'bg-surface text-foreground shadow-xs'
                      : 'text-muted hover:text-foreground',
                  )}
                >
                  <TableCellsIcon className="h-4 w-4" />
                  <span>Table</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  aria-label="Grid view"
                  title="Grid view"
                  className={cn(
                    'flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-semibold transition-all',
                    viewMode === 'grid'
                      ? 'bg-surface text-foreground shadow-xs'
                      : 'text-muted hover:text-foreground',
                  )}
                >
                  <Squares2X2Icon className="h-4 w-4" />
                  <span>Cards</span>
                </button>
              </div>
            </div>

            {/* Filter Chips */}
            <div
              className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-3"
              role="group"
              aria-label="Quick filters"
            >
              {(
                [
                  { key: 'all', label: 'All Products', count: counts.total },
                  { key: 'good', label: 'In Stock', count: counts.good },
                  {
                    key: 'almost_sold_out',
                    label: 'Low Stock',
                    count: counts.almost,
                  },
                  { key: 'sold_out', label: 'Sold Out', count: counts.soldOut },
                  {
                    key: 'unlimited',
                    label: 'Unlimited',
                    count: counts.unlimited,
                  },
                ] as const
              ).map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={() => setStatusFilter(chip.key)}
                  aria-pressed={statusFilter === chip.key}
                  className={cn(
                    'action-focus inline-flex items-center gap-2 rounded-md border px-3.5 py-1.5 text-xs sm:text-sm font-semibold transition-colors cursor-pointer',
                    statusFilter === chip.key
                      ? 'border-pine bg-pine text-surface shadow-xs'
                      : 'border-border/80 bg-white text-foreground hover:bg-mist',
                  )}
                >
                  <span>{chip.label}</span>
                  <span
                    className={cn(
                      'rounded px-1.5 py-0.5 text-xs font-semibold',
                      statusFilter === chip.key
                        ? 'bg-white/20 text-surface'
                        : 'bg-mist text-muted',
                    )}
                  >
                    {chip.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Main Content: Empty State OR (Table View / Grid View) */}
          {filteredProducts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/80 bg-surface p-12 text-center shadow-soft">
              <AdjustmentsHorizontalIcon className="mx-auto h-10 w-10 text-muted/50" />
              <h3 className="mt-3 text-base font-bold text-foreground">
                No matching products found
              </h3>
              <p className="mt-1 text-xs text-muted">
                Try adjusting your search keyword or clearing the status
                filters.
              </p>
              {(search || statusFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setStatusFilter('all');
                  }}
                  className="action-focus mt-4 inline-flex h-8 items-center gap-1.5 rounded-md bg-pine/10 px-3 text-xs font-semibold text-pine hover:bg-pine/20"
                >
                  Reset Filters
                </button>
              )}
            </div>
          ) : viewMode === 'table' ? (
            /* Redesigned Easy-to-Understand Stock Table */
            <div className="overflow-hidden rounded-2xl border border-border/80 bg-surface shadow-soft">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-border/80 bg-mist/60 text-xs font-bold uppercase tracking-wider text-muted">
                    <tr>
                      <th scope="col" className="px-4 py-3.5">
                        Product Name
                      </th>
                      <th scope="col" className="px-4 py-3.5">
                        Status
                      </th>
                      <th scope="col" className="px-4 py-3.5 text-center">
                        Served Today
                      </th>
                      <th scope="col" className="px-4 py-3.5 text-center">
                        Today&apos;s Quota
                      </th>
                      <th scope="col" className="px-4 py-3.5">
                        Stock Availability
                      </th>
                      <th scope="col" className="px-4 py-3.5 text-center">
                        Quick Adjust
                      </th>
                      <th scope="col" className="px-4 py-3.5 text-right">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredProducts.map((item) => {
                      const isUnlimited = item.today_quota_limit === null;
                      const sold = item.sold_quantity;
                      const quota = item.today_quota_limit ?? 0;
                      const remaining = item.remaining_quantity;
                      const config = STATUS_CONFIG[item.status];
                      const isBusy = busyId === item.product_id;

                      const progressPercent = isUnlimited
                        ? 0
                        : quota > 0
                          ? Math.min(100, Math.round((sold / quota) * 100))
                          : 100;

                      const canDecrement =
                        !isBusy && !isUnlimited && quota > sold;

                      return (
                        <tr
                          key={item.product_id}
                          className={cn(
                            'transition-colors hover:bg-mist/30',
                            item.status === 'sold_out' &&
                              'bg-danger-surface/[0.03]',
                          )}
                        >
                          {/* Product Name & Default Quota Info */}
                          <td className="px-4 py-3.5">
                            <div className="min-w-0">
                              <p className="font-extrabold text-foreground">
                                {item.product_name}
                              </p>
                              {role === 'admin' && (
                                <p className="text-xs text-muted">
                                  Default quota:{' '}
                                  <strong className="text-foreground">
                                    {formatQuota(item.default_quota_limit)}
                                  </strong>
                                  <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() =>
                                      openEditModal(item, 'default')
                                    }
                                    className="ml-2 font-bold text-leaf hover:underline"
                                  >
                                    Edit default
                                  </button>
                                </p>
                              )}
                            </div>
                          </td>

                          {/* Status Badge */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span
                              className={cn(
                                'inline-block rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider',
                                config.chip,
                              )}
                            >
                              {config.label}
                            </span>
                          </td>

                          {/* Served Today */}
                          <td className="px-4 py-3.5 whitespace-nowrap text-center font-bold text-foreground">
                            {sold}{' '}
                            <span className="text-xs font-normal text-muted">
                              served
                            </span>
                          </td>

                          {/* Today's Target Quota */}
                          <td className="px-4 py-3.5 whitespace-nowrap text-center font-bold text-foreground">
                            {formatQuota(item.today_quota_limit)}
                          </td>

                          {/* Stock Availability with Visual Progress Bar */}
                          <td className="px-4 py-3.5 min-w-[180px]">
                            <div className="flex items-center justify-between text-xs font-bold">
                              <span
                                className={cn(
                                  item.status === 'sold_out'
                                    ? 'text-danger'
                                    : 'text-foreground',
                                )}
                              >
                                {isUnlimited
                                  ? '∞ Unlimited'
                                  : `${remaining} units left`}
                              </span>
                              {!isUnlimited && (
                                <span className="text-[11px] font-medium text-muted">
                                  {progressPercent}% sold
                                </span>
                              )}
                            </div>
                            {!isUnlimited && (
                              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-mist">
                                <div
                                  className={cn(
                                    'h-full transition-all duration-300',
                                    config.bar,
                                  )}
                                  style={{ width: `${progressPercent}%` }}
                                />
                              </div>
                            )}
                          </td>

                          {/* Quick Adjust Buttons */}
                          <td className="px-4 py-3.5 whitespace-nowrap text-center">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                disabled={!canDecrement}
                                onClick={() => handleQuickStep(item, -1)}
                                className="flex h-8 w-8 items-center justify-center rounded-md border border-border/80 bg-surface text-xs font-bold text-foreground transition-all hover:bg-mist hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                                title={
                                  canDecrement
                                    ? 'Decrease today quota by 1'
                                    : 'Cannot decrease below sold count'
                                }
                                aria-label={`Decrease today quota of ${item.product_name} by 1`}
                              >
                                −1
                              </button>
                              <button
                                type="button"
                                disabled={isBusy || isUnlimited}
                                onClick={() => handleQuickStep(item, 1)}
                                className="flex h-8 w-8 items-center justify-center rounded-md bg-pine text-xs font-bold text-surface shadow-xs transition-all hover:bg-pine-deep disabled:cursor-not-allowed disabled:opacity-40"
                                title="Increase today quota by 1"
                                aria-label={`Increase today quota of ${item.product_name} by 1`}
                              >
                                +1
                              </button>
                              <button
                                type="button"
                                disabled={isBusy || isUnlimited}
                                onClick={() => handleQuickStep(item, 5)}
                                className="flex h-8 px-2.5 items-center justify-center rounded-md border border-border/80 bg-mist/60 text-xs font-bold text-foreground transition-all hover:bg-mist disabled:cursor-not-allowed disabled:opacity-40"
                                title="Add 5 to today quota"
                                aria-label={`Add 5 to today quota of ${item.product_name}`}
                              >
                                +5
                              </button>
                            </div>
                          </td>

                          {/* Actions: Set Custom Quota */}
                          <td className="px-4 py-3.5 whitespace-nowrap text-right">
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => openEditModal(item, 'today')}
                              className="action-focus inline-flex h-8 items-center gap-1.5 rounded-md border border-pine/30 bg-pine/10 px-3 text-xs font-semibold text-pine transition-all hover:bg-pine hover:text-surface disabled:opacity-40"
                              aria-label={`Set custom quota for ${item.product_name}`}
                            >
                              <PencilSquareIcon className="h-3.5 w-3.5" />
                              <span>Set Quota</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Card Grid View */
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredProducts.map((item) => {
                const isUnlimited = item.today_quota_limit === null;
                const sold = item.sold_quantity;
                const quota = item.today_quota_limit ?? 0;
                const remaining = item.remaining_quantity;
                const config = STATUS_CONFIG[item.status];
                const isBusy = busyId === item.product_id;

                const progressPercent = isUnlimited
                  ? 0
                  : quota > 0
                    ? Math.min(100, Math.round((sold / quota) * 100))
                    : 100;

                const canDecrement = !isBusy && !isUnlimited && quota > sold;

                return (
                  <div
                    key={item.product_id}
                    className={cn(
                      'group flex flex-col justify-between rounded-2xl border bg-surface p-4 shadow-soft transition-all duration-150 hover:border-pine/30 hover:shadow-hover',
                      item.status === 'sold_out'
                        ? 'border-danger/30 bg-danger-surface/[0.04]'
                        : item.status === 'almost_sold_out'
                          ? 'border-warning/30 bg-warning/[0.02]'
                          : 'border-border/80',
                    )}
                  >
                    {/* Header: Title and Status Badge */}
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="line-clamp-2 text-sm font-extrabold text-foreground group-hover:text-pine">
                          {item.product_name}
                        </h3>
                        <span
                          className={cn(
                            'shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider',
                            config.chip,
                          )}
                        >
                          {config.label}
                        </span>
                      </div>

                      {/* Large Remaining Units Counter */}
                      <div className="mt-3 flex items-baseline justify-between">
                        <div>
                          <p className="text-2xl font-black tracking-tight text-foreground">
                            {isUnlimited ? '∞' : remaining}
                            <span className="ml-1 text-xs font-semibold text-muted">
                              {isUnlimited ? 'Unlimited' : 'left today'}
                            </span>
                          </p>
                        </div>
                        <span className="text-xs font-semibold text-muted">
                          {sold} served
                        </span>
                      </div>

                      {/* Visual Progress Bar (Sold vs Quota) */}
                      <div className="mt-2.5">
                        <div className="flex items-center justify-between text-[11px] font-medium text-muted">
                          <span>
                            Target: {formatQuota(item.today_quota_limit)}
                          </span>
                          {!isUnlimited && (
                            <span>{progressPercent}% consumed</span>
                          )}
                        </div>
                        {!isUnlimited && (
                          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-mist">
                            <div
                              className={cn(
                                'h-full transition-all duration-300',
                                config.bar,
                              )}
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Controls */}
                    <div className="mt-4 border-t border-border/60 pt-3">
                      <div className="flex items-center justify-between gap-2">
                        {/* Quick Step Buttons */}
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={!canDecrement}
                            onClick={() => handleQuickStep(item, -1)}
                            className="flex h-8 w-8 items-center justify-center rounded-md border border-border/80 bg-surface text-xs font-bold text-foreground transition-all hover:bg-mist hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                            title={
                              canDecrement
                                ? 'Decrease today quota by 1'
                                : 'Cannot decrease below sold count'
                            }
                            aria-label={`Decrease today quota of ${item.product_name} by 1`}
                          >
                            −1
                          </button>
                          <button
                            type="button"
                            disabled={isBusy || isUnlimited}
                            onClick={() => handleQuickStep(item, 1)}
                            className="flex h-8 w-8 items-center justify-center rounded-md bg-pine text-xs font-bold text-surface shadow-xs transition-all hover:bg-pine-deep disabled:cursor-not-allowed disabled:opacity-40"
                            title="Increase today quota by 1"
                            aria-label={`Increase today quota of ${item.product_name} by 1`}
                          >
                            +1
                          </button>
                          <button
                            type="button"
                            disabled={isBusy || isUnlimited}
                            onClick={() => handleQuickStep(item, 5)}
                            className="flex h-8 px-2.5 items-center justify-center rounded-md border border-border/80 bg-mist/60 text-xs font-bold text-foreground transition-all hover:bg-mist disabled:cursor-not-allowed disabled:opacity-40"
                            title="Add 5 to today quota"
                            aria-label={`Add 5 to today quota of ${item.product_name}`}
                          >
                            +5
                          </button>
                        </div>

                        {/* Set Custom Quota Button */}
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => openEditModal(item, 'today')}
                          className="action-focus inline-flex h-8 items-center gap-1 rounded-md border border-pine/30 bg-pine/10 px-2.5 text-xs font-semibold text-pine transition-all hover:bg-pine hover:text-surface disabled:opacity-40"
                          aria-label={`Set custom quota for ${item.product_name}`}
                        >
                          <PencilSquareIcon className="h-3.5 w-3.5" />
                          <span>Set</span>
                        </button>
                      </div>

                      {/* Admin: Default daily quota info & edit */}
                      {role === 'admin' ? (
                        <div className="mt-2 flex items-center justify-between border-t border-dashed border-border/60 pt-2 text-xs">
                          <span className="text-muted">
                            Default:{' '}
                            <strong className="text-foreground">
                              {formatQuota(item.default_quota_limit)}
                            </strong>
                          </span>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => openEditModal(item, 'default')}
                            className="font-bold text-leaf hover:underline"
                          >
                            Edit default
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Recent Quota Adjustments History Table */}
      {(activeTab === 'all' || activeTab === 'history') && role === 'admin' && (
        <QuotaHistoryTable history={history} />
      )}

      {/* Interactive Quota Modal */}
      {modalItem ? (
        <Modal
          title={
            modalMode === 'today'
              ? `Set Today's Quota`
              : 'Set Default Daily Quota'
          }
          isOpen={true}
          onOpenChange={(open) => {
            if (!open) closeModal();
          }}
          isDismissDisabled={isSubmitting}
        >
          <form onSubmit={handleModalSubmit} className="space-y-4">
            {/* Target Item Brief */}
            <div className="rounded-xl border border-border/80 bg-mist/30 p-3">
              <p className="text-xs font-semibold text-muted">Selected Item</p>
              <p className="text-sm font-extrabold text-foreground">
                {modalItem.product_name}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-muted">
                <span>
                  Sold today:{' '}
                  <strong className="text-foreground">
                    {modalItem.sold_quantity}
                  </strong>
                </span>
                <span>
                  Current today quota:{' '}
                  <strong className="text-foreground">
                    {formatQuota(modalItem.today_quota_limit)}
                  </strong>
                </span>
                {role === 'admin' && (
                  <span>
                    Default quota:{' '}
                    <strong className="text-foreground">
                      {formatQuota(modalItem.default_quota_limit)}
                    </strong>
                  </span>
                )}
              </div>
            </div>

            {/* Admin Switcher: Today vs Default */}
            {role === 'admin' && (
              <div className="flex rounded-xl bg-mist p-1 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setModalMode('today');
                    const cur = modalItem.today_quota_limit;
                    setIsUnlimitedInput(cur === null);
                    setQuotaInput(cur === null ? '' : String(cur));
                  }}
                  className={cn(
                    'flex-1 rounded-lg py-1.5 transition-all',
                    modalMode === 'today'
                      ? 'bg-surface text-foreground shadow-xs'
                      : 'text-muted hover:text-foreground',
                  )}
                >
                  Today&apos;s Quota
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setModalMode('default');
                    const cur = modalItem.default_quota_limit;
                    setIsUnlimitedInput(cur === null);
                    setQuotaInput(cur === null ? '' : String(cur));
                  }}
                  className={cn(
                    'flex-1 rounded-lg py-1.5 transition-all',
                    modalMode === 'default'
                      ? 'bg-surface text-foreground shadow-xs'
                      : 'text-muted hover:text-foreground',
                  )}
                >
                  Default Daily Quota
                </button>
              </div>
            )}

            {/* Error in Modal */}
            {modalError && (
              <div
                role="alert"
                className="flex items-center gap-2 rounded-xl border border-danger/30 bg-danger-surface p-3 text-xs text-danger"
              >
                <ExclamationTriangleIcon className="h-4 w-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            {/* Quota Type Selection */}
            <div>
              <label className="block text-xs font-bold text-foreground">
                Target Quota Limit
              </label>

              {/* Toggle: Number vs Unlimited */}
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsUnlimitedInput(false)}
                  className={cn(
                    'flex-1 h-10 rounded-md border px-3 text-sm font-semibold transition-all',
                    !isUnlimitedInput
                      ? 'border-pine bg-pine/10 text-pine ring-1 ring-pine'
                      : 'border-border/80 bg-white text-muted hover:bg-mist hover:text-foreground',
                  )}
                >
                  Specific Amount
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsUnlimitedInput(true);
                    setQuotaInput('');
                  }}
                  className={cn(
                    'flex-1 h-10 rounded-md border px-3 text-sm font-semibold transition-all',
                    isUnlimitedInput
                      ? 'border-pine bg-pine/10 text-pine ring-1 ring-pine'
                      : 'border-border/80 bg-white text-muted hover:bg-mist hover:text-foreground',
                  )}
                >
                  Unlimited (No Cap)
                </button>
              </div>

              {!isUnlimitedInput && (
                <div className="mt-3 space-y-2">
                  <input
                    type="number"
                    min={modalMode === 'today' ? modalItem.sold_quantity : 0}
                    step="1"
                    value={quotaInput}
                    onChange={(e) => setQuotaInput(e.target.value)}
                    placeholder="Enter whole number limit..."
                    autoFocus
                    required
                    className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm font-semibold text-foreground focus:border-pine focus:outline-pine"
                  />

                  {/* Preset Quick Chips */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] font-semibold text-muted">
                      Presets:
                    </span>
                    {[
                      { label: '+5', add: 5 },
                      { label: '+10', add: 10 },
                      { label: '+20', add: 20 },
                    ].map((chip) => (
                      <button
                        key={chip.label}
                        type="button"
                        onClick={() => {
                          const base =
                            parseInt(quotaInput.trim(), 10) ||
                            (modalMode === 'today'
                              ? (modalItem.today_quota_limit ??
                                modalItem.sold_quantity)
                              : (modalItem.default_quota_limit ?? 0));
                          setQuotaInput(String(base + chip.add));
                        }}
                        className="rounded-md border border-border/80 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-mist shadow-xs"
                      >
                        {chip.label}
                      </button>
                    ))}

                    {modalMode === 'today' && (
                      <button
                        type="button"
                        onClick={() =>
                          setQuotaInput(String(modalItem.sold_quantity))
                        }
                        className="rounded-md border border-danger/30 bg-danger-surface px-2.5 py-1 text-xs font-semibold text-danger hover:bg-danger/10 shadow-xs"
                        title="Set quota equal to sold quantity so it immediately marks as Sold Out"
                      >
                        Mark Sold Out ({modalItem.sold_quantity})
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Optional Reason */}
            <div>
              <label className="block text-xs font-semibold text-foreground">
                Reason for change{' '}
                <span className="font-normal text-muted">(Optional)</span>
              </label>
              <input
                type="text"
                value={reasonInput}
                onChange={(e) => setReasonInput(e.target.value)}
                placeholder="e.g. Afternoon restock, Morning preparation, Ingredient delivery"
                className="mt-1.5 h-10 w-full rounded-md border border-border bg-white px-3 text-sm font-medium text-foreground placeholder:text-muted focus:border-pine focus:outline-pine"
              />
            </div>

            {/* Action Buttons */}
            <div className="mt-5 flex items-center justify-end gap-2.5 pt-2">
              <Button
                type="button"
                variant="secondary"
                disabled={isSubmitting}
                onClick={closeModal}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-pine text-surface hover:bg-pine-deep"
              >
                {isSubmitting ? 'Saving...' : 'Save Quota'}
              </Button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
