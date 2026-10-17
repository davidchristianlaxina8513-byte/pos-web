'use client';

import { useMemo, useState } from 'react';
import {
  CartIcon,
  CloseIcon,
  GridIcon,
  ListIcon,
  SearchIcon,
  SlidersIcon,
  TrashIcon,
} from '@/components/common/icons';
import { EmptyState } from '@/components/error/EmptyState';
import { Button } from '@/components/form/Button';
import { QtyStepper } from '@/components/form/QtyStepper';
import { cn } from '@/lib/cn';
import {
  isSellable,
  type CartLine,
  type MenuCategory,
  type MenuItem,
} from '@/features/pos/types';

export interface MenuGridProps {
  categories: MenuCategory[];
  items: MenuItem[];
  lines: CartLine[];
  onAdd: (item: MenuItem) => void;
  onIncrement: (product_id: number) => void;
  onDecrement: (product_id: number) => void;
  quotaAlerts?: boolean;
}

export function stockHint(item: MenuItem, quotaAlerts = true): string | null {
  if (!item.is_available) return 'Unavailable';
  if (item.remaining_quantity === null) return 'Unlimited today';
  if (item.remaining_quantity <= 0) return 'Sold out for today';
  if (
    item.today_quota_limit !== null &&
    item.today_quota_limit > 0 &&
    item.remaining_quantity / item.today_quota_limit <= 0.25
  ) {
    return quotaAlerts
      ? `Only ${item.remaining_quantity} left`
      : `${item.remaining_quantity} remaining`;
  }
  return `${item.remaining_quantity} remaining`;
}

function StockBadge({
  item,
  quotaAlerts,
}: {
  item: MenuItem;
  quotaAlerts: boolean;
}) {
  const hint = stockHint(item, quotaAlerts);

  if (!hint) return null;

  if (!item.is_available || item.remaining_quantity === 0) {
    return (
      <span className="rounded-full bg-danger px-2 py-0.5 text-xs font-bold text-white shadow-xs">
        Sold out
      </span>
    );
  }

  if (
    quotaAlerts &&
    item.today_quota_limit !== null &&
    item.today_quota_limit > 0 &&
    (item.remaining_quantity ?? 0) / item.today_quota_limit <= 0.25
  ) {
    return (
      <span className="rounded-full bg-warning/90 px-2 py-0.5 text-xs font-bold text-foreground shadow-xs">
        {hint}
      </span>
    );
  }

  return (
    <span className="rounded-full border border-border/60 bg-surface/90 px-2 py-0.5 text-xs font-medium text-muted backdrop-blur-xs">
      {hint}
    </span>
  );
}

/** Modern POS menu grid: search bar, category tabs, and responsive card grid. */
export function MenuGrid({
  categories,
  items,
  lines,
  onAdd,
  onIncrement,
  onDecrement,
  quotaAlerts = true,
}: MenuGridProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const query = search.trim().toLowerCase();

  const visible = useMemo(
    () =>
      items.filter((item) => {
        if (activeCategory && item.category_id !== activeCategory) return false;
        if (query && !item.name.toLowerCase().includes(query)) return false;
        return true;
      }),
    [items, activeCategory, query],
  );

  const qtyById = useMemo(
    () => new Map(lines.map((line) => [line.product_id, line.qty])),
    [lines],
  );

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      counts.set(item.category_id, (counts.get(item.category_id) ?? 0) + 1);
    }
    return counts;
  }, [items]);

  const hasActiveFilters = activeCategory !== null || search !== '';

  const resetFilters = () => {
    setActiveCategory(null);
    setSearch('');
  };

  return (
    <div className="min-w-0 space-y-3.5">
      {/* Top Search & Control Bar */}
      <div className="flex items-center gap-2">
        <label className="relative flex-1">
          <span className="sr-only">Search menu items</span>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted"
          >
            <SearchIcon className="h-4.5 w-4.5" />
          </span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search menu items..."
            className="block h-10 w-full rounded-md border border-border bg-white pr-10 pl-10 text-sm text-foreground placeholder:text-muted focus:border-pine focus:outline-pine"
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Clear search"
              className="absolute top-1/2 right-3 -translate-y-1/2 rounded p-1 text-muted hover:bg-mist hover:text-foreground"
            >
              <CloseIcon className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </label>

        {/* View Toggle (Grid / List) */}
        <div className="flex h-10 items-center rounded-md border border-border bg-slate-50/70 p-1 shadow-xs">
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            aria-label="Grid view"
            title="Grid view"
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded transition-all',
              viewMode === 'grid'
                ? 'bg-pine text-surface shadow-xs'
                : 'text-muted hover:text-foreground',
            )}
          >
            <GridIcon className="h-4.5 w-4.5" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            aria-label="List view"
            title="List view"
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded transition-all',
              viewMode === 'list'
                ? 'bg-pine text-surface shadow-xs'
                : 'text-muted hover:text-foreground',
            )}
          >
            <ListIcon className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Reset Filter Button */}
        {hasActiveFilters ? (
          <button
            type="button"
            onClick={resetFilters}
            aria-label="Reset filters"
            title="Reset filters"
            className="flex h-10 items-center gap-1.5 rounded-md border border-leaf/40 bg-leaf/10 px-3 text-xs font-semibold text-leaf transition-all hover:bg-leaf/20"
          >
            <SlidersIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        ) : null}
      </div>

      {/* Category Filter Pills (flex-wrap for clean multi-row layout without scroll clipping) */}
      <div className="flex flex-wrap items-center gap-2 pt-0.5">
        <button
          type="button"
          onClick={() => setActiveCategory(null)}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all duration-150',
            activeCategory === null
              ? 'bg-pine text-surface shadow-xs font-semibold'
              : 'border border-border/80 bg-surface text-foreground/80 hover:bg-mist hover:text-foreground',
          )}
        >
          <span>All</span>
          <span
            className={cn(
              'rounded px-1.5 py-0.5 text-xs font-bold',
              activeCategory === null
                ? 'bg-white/20 text-surface'
                : 'bg-mist text-muted',
            )}
          >
            {items.length}
          </span>
        </button>

        {categories.map((category) => {
          const count = categoryCounts.get(category.category_id) ?? 0;
          const isSelected = activeCategory === category.category_id;
          return (
            <button
              key={category.category_id}
              type="button"
              onClick={() => setActiveCategory(category.category_id)}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all duration-150',
                isSelected
                  ? 'bg-pine text-surface shadow-xs font-semibold'
                  : 'border border-border/80 bg-surface text-foreground/80 hover:bg-mist hover:text-foreground',
              )}
            >
              <span>{category.name}</span>
              <span
                className={cn(
                  'rounded px-1.5 py-0.5 text-xs font-bold',
                  isSelected
                    ? 'bg-white/20 text-surface'
                    : 'bg-mist text-muted',
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Items Section */}
      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface p-8">
          <EmptyState
            icon={<SearchIcon />}
            title="No items found"
            sub="Try adjusting your search query or selected category."
          />
          {hasActiveFilters ? (
            <div className="mt-4 flex justify-center">
              <Button
                variant="secondary"
                size="sm"
                onClick={resetFilters}
                className="rounded-full"
              >
                Clear all filters
              </Button>
            </div>
          ) : null}
        </div>
      ) : viewMode === 'grid' ? (
        /* Card Grid View */
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {visible.map((item) => {
            const sellable = isSellable(item);
            const qty = qtyById.get(item.product_id) ?? 0;
            const inCart = qty > 0;

            return (
              <div
                key={item.product_id}
                className={cn(
                  'group relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-surface p-3 transition-all duration-200',
                  inCart
                    ? 'border-leaf bg-leaf/[0.02] shadow-sm ring-1 ring-leaf/40'
                    : 'border-border/80 hover:border-leaf/40 hover:shadow-soft',
                  !sellable && 'opacity-65',
                )}
              >
                {/* Top Image / Illustration */}
                <div className="relative mb-2.5 flex h-28 w-full items-center justify-center overflow-hidden rounded-xl bg-mist/60">
                  {item.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="text-3xl transition-transform duration-300 group-hover:scale-110"
                    >
                      ☕
                    </span>
                  )}

                  {/* Top-Right: Stock badge */}
                  <div className="absolute top-2 right-2">
                    <StockBadge item={item} quotaAlerts={quotaAlerts} />
                  </div>

                  {/* Top-Left: Active in cart count */}
                  {inCart ? (
                    <span className="absolute top-2 left-2 rounded-full bg-leaf px-2 py-0.5 text-xs font-bold text-white shadow-xs">
                      ✓ {qty}
                    </span>
                  ) : null}
                </div>

                {/* Item Details */}
                <div className="flex-1">
                  <p className="line-clamp-1 text-sm font-bold text-foreground group-hover:text-leaf">
                    {item.name}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {item.category_name}
                  </p>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-base font-extrabold text-leaf">
                      ₱{item.price.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Bottom Action */}
                <div className="mt-3">
                  {inCart ? (
                    <div className="flex items-center justify-between rounded-xl border border-leaf/30 bg-leaf/10 p-1">
                      <button
                        type="button"
                        onClick={() => onDecrement(item.product_id)}
                        className={cn(
                          'flex h-7 w-7 items-center justify-center rounded-lg bg-surface font-bold shadow-xs transition-colors',
                          qty === 1
                            ? 'text-danger hover:bg-danger-surface'
                            : 'text-pine-deep hover:bg-mist',
                        )}
                        aria-label={
                          qty === 1
                            ? `Remove ${item.name}`
                            : `Decrease ${item.name}`
                        }
                      >
                        {qty === 1 ? (
                          <TrashIcon className="h-3.5 w-3.5" />
                        ) : (
                          '−'
                        )}
                      </button>
                      <span className="text-xs font-bold text-foreground">
                        {qty}
                      </span>
                      <button
                        type="button"
                        disabled={
                          item.remaining_quantity !== null &&
                          qty >= item.remaining_quantity
                        }
                        onClick={() => onIncrement(item.product_id)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-pine font-bold text-surface shadow-xs transition-colors hover:bg-pine-deep disabled:opacity-40"
                        aria-label={`Increase ${item.name}`}
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={!sellable}
                      onClick={() => onAdd(item)}
                      aria-label={`Add ${item.name} to order`}
                      className={cn(
                        'flex h-9 w-full items-center justify-center gap-1.5 rounded-xl text-xs font-semibold transition-all duration-150 active:scale-95',
                        sellable
                          ? 'bg-mist text-pine-deep hover:bg-pine hover:text-surface'
                          : 'cursor-not-allowed bg-mist/50 text-muted/50',
                      )}
                    >
                      <CartIcon className="h-4 w-4" />
                      <span>{sellable ? 'Add' : 'Unavailable'}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Compact List View */
        <ul className="flex flex-col gap-2.5">
          {visible.map((item) => {
            const sellable = isSellable(item);
            const qty = qtyById.get(item.product_id) ?? 0;
            const inCart = qty > 0;

            return (
              <li
                key={item.product_id}
                className={cn(
                  'flex items-center gap-3 rounded-2xl border bg-surface p-3 transition-all duration-150',
                  inCart
                    ? 'border-leaf bg-leaf/[0.02] shadow-sm'
                    : 'border-border/80 hover:border-leaf/40 hover:shadow-soft',
                  !sellable && 'opacity-65',
                )}
              >
                {/* Thumbnail */}
                <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-mist/60">
                  {item.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span aria-hidden="true" className="text-xl">
                      ☕
                    </span>
                  )}
                </div>

                {/* Details */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-bold text-foreground">
                      {item.name}
                    </p>
                    <StockBadge item={item} quotaAlerts={quotaAlerts} />
                  </div>
                  <p className="text-xs text-muted">{item.category_name}</p>
                  <p className="text-sm font-extrabold text-leaf">
                    ₱{item.price.toFixed(2)}
                  </p>
                </div>

                {/* Action */}
                <div className="shrink-0">
                  {inCart ? (
                    <QtyStepper
                      value={qty}
                      itemName={item.name}
                      onIncrement={() => onIncrement(item.product_id)}
                      onDecrement={() => onDecrement(item.product_id)}
                    />
                  ) : (
                    <button
                      type="button"
                      disabled={!sellable}
                      onClick={() => onAdd(item)}
                      aria-label={`Add ${item.name} to order`}
                      className={cn(
                        'flex h-10 items-center gap-1.5 rounded-xl px-3.5 text-xs font-semibold transition-all active:scale-95',
                        sellable
                          ? 'bg-mist text-pine-deep hover:bg-pine hover:text-surface'
                          : 'cursor-not-allowed bg-mist/50 text-muted/50',
                      )}
                    >
                      <CartIcon className="h-4 w-4" />
                      <span>{sellable ? 'Add' : 'Unavailable'}</span>
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
