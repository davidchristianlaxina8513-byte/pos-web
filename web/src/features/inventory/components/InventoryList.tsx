'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Button } from '@/components/common/Button';
import { cn } from '@/lib/cn';
import { STOCK_LABELS, type StockStatus } from '../status';
import type { InventoryItem } from '../queries';

export interface InventoryListProps {
  items: InventoryItem[];
}

type Filter = 'all' | 'low' | 'critical';

const BADGE: Record<StockStatus, string> = {
  ok: 'bg-success text-surface',
  low: 'bg-warning text-surface',
  critical: 'bg-danger text-surface',
};

/** Filterable stock list with per-row stock-in links. */
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
      <div className="flex flex-wrap gap-2">
        {(['all', 'low', 'critical'] as Filter[]).map((value) => (
          <Button
            key={value}
            variant={filter === value ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setFilter(value)}
          >
            {value === 'all' ? 'All' : STOCK_LABELS[value]}
          </Button>
        ))}
      </div>
      <label className="mt-3 block">
        <span className="text-muted">Search inventory</span>
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by product"
          className="mt-1 block w-full rounded border border-border bg-surface px-3 py-2 text-foreground"
        />
      </label>
      {visible.length === 0 ? (
        <p className="mt-4 text-muted">No items match.</p>
      ) : (
        <ul className="mt-4 grid gap-3">
          {visible.map((item) => (
            <li
              key={item.stock_id}
              className="flex items-center justify-between gap-3 rounded border border-border bg-surface px-4 py-3"
            >
              <div>
                <p className="text-foreground">{item.product_name}</p>
                <p className="text-muted">{item.product_category}</p>
                <p className="text-foreground">On hand: {item.quantity}</p>
                <p className="text-muted">
                  Reorder at: {item.reorder_level}
                  {item.par_level !== null ? ` · Par: ${item.par_level}` : null}
                </p>
                <span
                  className={cn(
                    'mt-1 inline-block rounded px-2 py-0.5',
                    BADGE[item.status],
                  )}
                >
                  {STOCK_LABELS[item.status]}
                </span>
              </div>
              <Link
                href={`/admin/inventory/stock-in/${item.stock_id}`}
                className="rounded bg-primary px-3 py-1 font-medium text-surface"
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
