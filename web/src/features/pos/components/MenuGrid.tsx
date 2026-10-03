'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/common/Button';
import { QtyStepper } from '@/components/common/QtyStepper';
import { EmptyState } from '@/components/common/EmptyState';
import { CartIcon, SearchIcon, SlidersIcon } from '@/components/common/icons';
import { cn } from '@/lib/cn';
import {
  isSellable,
  type CartLine,
  type MenuCategory,
  type MenuItem,
} from '../types';

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
      ? `Only ${item.remaining_quantity} left today`
      : `${item.remaining_quantity} remaining today`;
  }
  return `${item.remaining_quantity} remaining today`;
}

function Thumb({ item }: { item: MenuItem }) {
  if (item.image_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={item.image_url}
        alt=""
        width={64}
        height={64}
        className="h-16 w-16 shrink-0 rounded-2xl object-cover"
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-sage-100 text-2xl"
    >
      ☕
    </span>
  );
}

/** v2 menu: pill search + scrollable category pills + thumbnail cards. */
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
  const resetFilters = () => {
    setActiveCategory(null);
    setSearch('');
  };
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        <label className="relative block flex-1">
          <span className="sr-only">Search menu</span>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted"
          >
            <SearchIcon />
          </span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search menu"
            className="block h-[52px] w-full rounded-full border border-border bg-surface pr-4 pl-11 text-foreground shadow-soft placeholder:text-muted"
          />
        </label>
        <button
          type="button"
          onClick={resetFilters}
          aria-label="Reset filters"
          title="Reset filters"
          className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl border border-border bg-surface text-pine-deep shadow-soft"
        >
          <SlidersIcon />
        </button>
      </div>
      <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <Button
          variant={activeCategory === null ? 'primary' : 'secondary'}
          size="sm"
          className={cn(
            'shrink-0 rounded-full px-4 py-2',
            activeCategory === null
              ? 'border-transparent bg-pine text-surface'
              : 'border-border hover:bg-mist',
          )}
          onClick={() => setActiveCategory(null)}
        >
          All
        </Button>
        {categories.map((category) => (
          <Button
            key={category.category_id}
            variant={
              activeCategory === category.category_id ? 'primary' : 'secondary'
            }
            size="sm"
            className={cn(
              'shrink-0 rounded-full px-4 py-2',
              activeCategory === category.category_id
                ? 'border-transparent bg-pine text-surface'
                : 'border-border hover:bg-mist',
            )}
            onClick={() => setActiveCategory(category.category_id)}
          >
            {category.name}
          </Button>
        ))}
      </div>
      {visible.length === 0 ? (
        <EmptyState
          icon={<SearchIcon />}
          title="No items match"
          sub="Try a different search or category."
        />
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {visible.map((item) => {
            const sellable = isSellable(item);
            const hint = stockHint(item, quotaAlerts);
            const qty = qtyById.get(item.product_id) ?? 0;
            return (
              <li
                key={item.product_id}
                className={cn(
                  'flex items-center gap-3 rounded-card border bg-surface p-3 shadow-soft',
                  qty > 0 ? 'border-leaf' : 'border-border',
                )}
              >
                <Thumb item={item} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-bold text-foreground">
                    {item.name}
                  </p>
                  <p className="text-sm font-semibold text-leaf">
                    ₱{item.price.toFixed(2)}
                  </p>
                  {hint ? (
                    <p
                      className={cn(
                        'text-xs font-medium',
                        item.remaining_quantity === null || !quotaAlerts
                          ? 'text-muted'
                          : sellable
                            ? 'text-warning'
                            : 'text-danger',
                      )}
                    >
                      {hint}
                    </p>
                  ) : null}
                </div>
                {qty > 0 ? (
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
                    aria-label={`Add ${item.name} to cart`}
                    title={`Add ${item.name} to cart`}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-peri text-pine-deep disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <CartIcon />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
