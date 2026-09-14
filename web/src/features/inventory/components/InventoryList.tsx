'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { IconTile } from '@/components/common/IconTile';
import { BoxIcon, SearchIcon } from '@/components/common/icons';
import { cn } from '@/lib/cn';
import { STOCK_LABELS, type StockStatus } from '../status';
import type { InventoryItem } from '../queries';

export interface InventoryListProps {
  items: InventoryItem[];
}

type Filter = 'all' | 'low' | 'critical';

const BADGE: Record<StockStatus, string> = {
  ok: 'bg-leaf text-surface',
  low: 'bg-warning text-surface',
  critical: 'bg-danger text-surface',
};

/** v2 filterable stock list with per-row stock-in links. */
export function InventoryList({ items }: InventoryListProps) {
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const query = search.trim().toLowerCase();
  const visible = useMemo(
    () =>
      items.filter((item) => {
        if (filter !== 'all' && item.status !== filter) return false;
        if (
          query &&
          !`${item.product_name} ${item.product_category}`
            .toLowerCase()
            .includes(query)
        ) {
          return false;
        }
        return true;
      }),
    [items, filter, query],
  );
  return (
    <div>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {(['all', 'low', 'critical'] as Filter[]).map((value) => (
          <Button
            key={value}
            variant={filter === value ? 'primary' : 'secondary'}
            size="sm"
            className={cn(
              'shrink-0 rounded-full px-4 py-2',
              filter === value
                ? 'border-transparent bg-pine text-surface'
                : 'border-border hover:bg-mist',
            )}
            onClick={() => setFilter(value)}
          >
            {value === 'all' ? 'All' : STOCK_LABELS[value]}
          </Button>
        ))}
      </div>
      <label className="relative mt-3 block">
        <span className="sr-only">Search inventory</span>
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
          placeholder="Search by product"
          className="block h-[52px] w-full rounded-full border border-border bg-surface pr-4 pl-11 text-foreground shadow-soft placeholder:text-muted"
        />
      </label>
      {visible.length === 0 ? (
        <EmptyState
          icon={<SearchIcon />}
          title="No items match"
          sub="Try a different search or filter."
        />
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {visible.map((item) => (
            <li
              key={item.stock_id}
              className="card-hover flex items-center gap-3 rounded-card border border-border bg-surface p-3 shadow-soft"
            >
              <IconTile tone="sage">
                <BoxIcon />
              </IconTile>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-bold text-foreground">
                  {item.product_name}
                </p>
                <p className="text-sm text-muted">
                  {item.product_category} · On hand: {item.quantity} · Reorder
                  at: {item.reorder_level}
                  {item.par_level !== null ? ` · Par: ${item.par_level}` : null}
                </p>
                <span
                  className={cn(
                    'mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-bold',
                    BADGE[item.status],
                  )}
                >
                  {STOCK_LABELS[item.status]}
                </span>
              </div>
              <Link
                href={`/admin/inventory/stock-in/${item.stock_id}`}
                className="action-focus flex h-11 shrink-0 items-center rounded-full bg-pine px-4 text-sm font-semibold text-surface"
              >
                Stock In
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
