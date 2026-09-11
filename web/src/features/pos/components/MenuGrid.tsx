'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/common/Button';
import { cn } from '@/lib/cn';
import { isSellable, type MenuCategory, type MenuItem } from '../types';

export interface MenuGridProps {
  categories: MenuCategory[];
  items: MenuItem[];
  onAdd: (item: MenuItem) => void;
}

function stockHint(item: MenuItem): string | null {
  if (!item.is_available) return 'Unavailable';
  if (item.stock_quantity <= 0) return 'Out of stock';
  if (item.stock_quantity <= 5) return `Only ${item.stock_quantity} left`;
  return null;
}

/** Category pills + search + item cards. Add is disabled unless sellable. */
export function MenuGrid({ categories, items, onAdd }: MenuGridProps) {
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
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant={activeCategory === null ? 'primary' : 'secondary'}
          size="sm"
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
            onClick={() => setActiveCategory(category.category_id)}
          >
            {category.name}
          </Button>
        ))}
      </div>
      <label className="mt-3 block">
        <span className="text-muted">Search menu</span>
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search items"
          className="mt-1 block w-full rounded border border-border bg-surface px-3 py-2 text-foreground"
        />
      </label>
      {visible.length === 0 ? (
        <p className="mt-4 text-muted">No items match.</p>
      ) : (
        <ul className="mt-4 grid gap-3">
          {visible.map((item) => {
            const sellable = isSellable(item);
            const hint = stockHint(item);
            return (
              <li
                key={item.product_id}
                className="flex items-center justify-between gap-3 rounded border border-border bg-surface px-4 py-3"
              >
                <div>
                  <p className="text-foreground">{item.name}</p>
                  <p className="text-muted">
                    ₱{item.price.toFixed(2)} · {item.category_name}
                  </p>
                  {hint ? (
                    <p
                      className={cn(sellable ? 'text-warning' : 'text-danger')}
                    >
                      {hint}
                    </p>
                  ) : null}
                </div>
                <Button
                  size="sm"
                  disabled={!sellable}
                  onClick={() => onAdd(item)}
                  aria-label={`Add ${item.name} to cart`}
                >
                  Add
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
