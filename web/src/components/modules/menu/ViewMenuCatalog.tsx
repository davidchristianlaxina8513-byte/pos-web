'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { Button } from '@/components/form/Button';
import { Modal } from '@/components/modal/Modal';
import { EmptyState } from '@/components/error/EmptyState';
import {
  BookOpenIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronUpDownIcon,
  ChevronUpIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  ShoppingCartIcon,
  Squares2X2Icon,
  TableCellsIcon,
  TagIcon,
} from '@/components/common/hero-icons';
import { cn } from '@/lib/cn';
import type { MenuCategory, MenuItem } from '@/features/pos/types';

type SortField = 'name' | 'category' | 'price' | 'status' | 'quota';
type SortDirection = 'asc' | 'desc';

function SortHeader({
  label,
  field,
  currentField,
  direction,
  onSort,
}: {
  label: string;
  field: SortField;
  currentField: SortField;
  direction: SortDirection;
  onSort: (field: SortField) => void;
}) {
  const isActive = currentField === field;
  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      className={cn(
        'group inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider select-none transition-colors focus:outline-none cursor-pointer',
        isActive ? 'text-pine' : 'text-muted hover:text-foreground',
      )}
      title={`Sort by ${label} (${isActive && direction === 'asc' ? 'descending' : 'ascending'})`}
    >
      <span>{label}</span>
      <span
        className={cn(
          'transition-colors',
          isActive ? 'text-pine' : 'text-muted/60 group-hover:text-muted',
        )}
      >
        {isActive ? (
          direction === 'asc' ? (
            <ChevronUpIcon className="h-3.5 w-3.5" />
          ) : (
            <ChevronDownIcon className="h-3.5 w-3.5" />
          )
        ) : (
          <ChevronUpDownIcon className="h-3.5 w-3.5" />
        )}
      </span>
    </button>
  );
}

function ProductThumb({
  item,
  size = 'md',
}: {
  item: MenuItem;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeClasses = {
    sm: 'h-10 w-10 text-lg rounded-xl',
    md: 'h-12 w-12 text-xl rounded-2xl',
    lg: 'h-40 w-full text-4xl rounded-t-2xl',
  }[size];

  if (item.image_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={item.image_url}
        alt={item.name}
        className={cn('object-cover shrink-0', sizeClasses)}
        loading="lazy"
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className={cn(
        'flex items-center justify-center bg-sage-100/80 text-pine shrink-0 border border-border/40 select-none',
        sizeClasses,
      )}
    >
      ☕
    </div>
  );
}

export interface ViewMenuCatalogProps {
  categories: MenuCategory[];
  items: MenuItem[];
  userRole?: 'admin' | 'cashier';
}

export function ViewMenuCatalog({
  categories,
  items,
  userRole = 'cashier',
}: ViewMenuCatalogProps) {
  // Filters & display state
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [availabilityFilter, setAvailabilityFilter] = useState<
    'all' | 'available' | 'hidden'
  >('all');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Sorting state
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // View details modal state
  const [viewingProduct, setViewingProduct] = useState<MenuItem | null>(null);

  // Category product count mapping
  const categoryCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const it of items) {
      map.set(it.category_id, (map.get(it.category_id) ?? 0) + 1);
    }
    return map;
  }, [items]);

  // Overall metrics
  const stats = useMemo(() => {
    let available = 0;
    let hidden = 0;
    for (const it of items) {
      if (it.is_available) available++;
      else hidden++;
    }
    return {
      total: items.length,
      available,
      hidden,
      categoriesCount: categories.length,
    };
  }, [items, categories]);

  // Filtered and sorted item list
  const query = search.trim().toLowerCase();
  const visible = useMemo(() => {
    const list = items.filter((it) => {
      // Category filter
      if (activeCategory !== null && it.category_id !== activeCategory) {
        return false;
      }
      // Availability filter
      if (availabilityFilter === 'available' && !it.is_available) return false;
      if (availabilityFilter === 'hidden' && it.is_available) return false;

      // Text query
      if (query.length > 0) {
        const matchesName = it.name.toLowerCase().includes(query);
        const matchesCategory = it.category_name.toLowerCase().includes(query);
        if (!matchesName && !matchesCategory) return false;
      }

      return true;
    });

    list.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'category':
          cmp = a.category_name.localeCompare(b.category_name);
          if (cmp === 0) cmp = a.name.localeCompare(b.name);
          break;
        case 'price':
          cmp = a.price - b.price;
          break;
        case 'status':
          cmp = a.is_available === b.is_available ? 0 : a.is_available ? -1 : 1;
          if (cmp === 0) cmp = a.name.localeCompare(b.name);
          break;
        case 'quota': {
          const aQuota = a.today_quota_limit ?? 999999;
          const bQuota = b.today_quota_limit ?? 999999;
          cmp = aQuota - bQuota;
          if (cmp === 0)
            cmp =
              (a.remaining_quantity ?? 999999) -
              (b.remaining_quantity ?? 999999);
          break;
        }
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [
    items,
    activeCategory,
    availabilityFilter,
    query,
    sortField,
    sortDirection,
  ]);

  return (
    <div className="flex flex-col gap-5">
      {/* 1. DCASIS Page Header Banner */}
      <div>
        <Breadcrumbs
          pages={[{ name: 'Menu', href: '/menu', current: true }]}
          homeHref={userRole === 'admin' ? '/admin' : '/dashboard'}
        />
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-pine">
              Menu Catalog
            </h1>
            <span className="rounded-full bg-pine/10 px-2.5 py-0.5 text-xs font-bold text-pine">
              {items.length} Products
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {userRole === 'admin' && (
              <Link
                href="/admin/menu"
                className="action-focus inline-flex h-10 items-center gap-2 rounded-md border border-border bg-white px-3.5 text-sm font-semibold text-foreground shadow-2xs transition-colors hover:bg-slate-50"
              >
                <BookOpenIcon className="h-4 w-4 text-pine" />
                <span>Master Menu Catalog →</span>
              </Link>
            )}
            <Link
              href="/today-products"
              className="action-focus inline-flex h-10 items-center gap-2 rounded-md border border-border bg-white px-3.5 text-sm font-semibold text-foreground shadow-2xs transition-colors hover:bg-slate-50"
            >
              <CalendarDaysIcon className="h-4 w-4 text-pine" />
              <span>Today&apos;s Stock Quotas →</span>
            </Link>
            <Link
              href="/pos"
              className="action-focus inline-flex h-10 items-center gap-2 rounded-md bg-pine px-4 text-sm font-semibold text-surface shadow-xs transition-colors hover:bg-pine-deep"
            >
              <ShoppingCartIcon className="h-4 w-4" />
              <span>Go to POS</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Contextual guidance banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-pine/20 bg-pine/5 px-4 py-2.5 text-xs text-foreground">
        <div className="flex items-center gap-2">
          <span className="font-bold text-pine">
            Counter Reference &amp; Portions:
          </span>
          <span className="text-muted">
            View live counter prices, categories, and real-time portion
            availability for today.
          </span>
        </div>
        <Link
          href="/today-products"
          className="font-bold text-pine hover:underline whitespace-nowrap"
        >
          Manage Today&apos;s Stock →
        </Link>
      </div>

      {/* 2. Key Metrics KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Total Products */}
        <div className="rounded-2xl border border-border/70 bg-surface p-4 shadow-soft">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-muted">
              Total Catalog
            </p>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-pine/10 text-pine">
              <BookOpenIcon className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black tracking-tight text-foreground">
            {stats.total}
          </p>
          <p className="mt-0.5 text-xs text-muted">Registered in database</p>
        </div>

        {/* Active on POS */}
        <div className="rounded-2xl border border-border/70 bg-surface p-4 shadow-soft">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-muted">
              Active on POS
            </p>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-leaf/15 text-leaf">
              <CheckCircleIcon className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black tracking-tight text-leaf">
            {stats.available}
          </p>
          <p className="mt-0.5 text-xs text-muted">Visible for orders</p>
        </div>

        {/* Hidden from POS */}
        <div className="rounded-2xl border border-border/70 bg-surface p-4 shadow-soft">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-muted">
              Hidden Products
            </p>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-mist text-muted">
              <EyeIcon className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black tracking-tight text-foreground">
            {stats.hidden}
          </p>
          <p className="mt-0.5 text-xs text-muted">Inactive or draft</p>
        </div>

        {/* Categories */}
        <div className="rounded-2xl border border-border/70 bg-surface p-4 shadow-soft">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-muted">
              Categories
            </p>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-pine/10 text-pine">
              <TagIcon className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black tracking-tight text-foreground">
            {stats.categoriesCount}
          </p>
          <p className="mt-0.5 text-xs text-muted">Active groupings</p>
        </div>
      </div>

      {/* 3. Toolbar: Search, Filters & View Switcher */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-surface p-4 shadow-soft">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Search bar */}
          <div className="relative flex-1">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted"
            >
              <MagnifyingGlassIcon className="h-4 w-4" />
            </span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products by name or category..."
              className="block h-10 w-full rounded-md border border-border bg-white pr-4 pl-10 text-sm font-medium text-foreground transition-colors placeholder:text-muted focus:border-pine focus:outline-pine"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Status availability filter */}
            <div className="inline-flex rounded-md border border-border bg-slate-50/70 p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setAvailabilityFilter('all')}
                className={cn(
                  'rounded px-2.5 py-1.5 transition-all cursor-pointer',
                  availabilityFilter === 'all'
                    ? 'bg-surface text-foreground shadow-xs font-semibold'
                    : 'text-muted hover:text-foreground',
                )}
              >
                All ({stats.total})
              </button>
              <button
                type="button"
                onClick={() => setAvailabilityFilter('available')}
                className={cn(
                  'rounded px-2.5 py-1.5 transition-all cursor-pointer',
                  availabilityFilter === 'available'
                    ? 'bg-surface text-leaf shadow-xs font-semibold'
                    : 'text-muted hover:text-foreground',
                )}
              >
                Available ({stats.available})
              </button>
              <button
                type="button"
                onClick={() => setAvailabilityFilter('hidden')}
                className={cn(
                  'rounded px-2.5 py-1.5 transition-all cursor-pointer',
                  availabilityFilter === 'hidden'
                    ? 'bg-surface text-foreground shadow-xs font-semibold'
                    : 'text-muted hover:text-foreground',
                )}
              >
                Hidden ({stats.hidden})
              </button>
            </div>

            {/* View Switcher: Table vs Card */}
            <div className="inline-flex rounded-md border border-border bg-slate-50/70 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                title="Table View"
                aria-label="Table View"
                className={cn(
                  'rounded p-1.5 transition-colors cursor-pointer',
                  viewMode === 'table'
                    ? 'bg-surface text-pine shadow-xs'
                    : 'text-muted hover:text-foreground',
                )}
              >
                <TableCellsIcon className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                title="Card Grid View"
                aria-label="Card Grid View"
                className={cn(
                  'rounded p-1.5 transition-colors cursor-pointer',
                  viewMode === 'grid'
                    ? 'bg-surface text-pine shadow-xs'
                    : 'text-muted hover:text-foreground',
                )}
              >
                <Squares2X2Icon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Category Filter Horizontal Pills */}
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pt-1 pb-0.5">
          <button
            type="button"
            onClick={() => setActiveCategory(null)}
            className={cn(
              'shrink-0 rounded-md px-3.5 py-2 text-sm font-semibold transition-all cursor-pointer',
              activeCategory === null
                ? 'bg-pine text-surface shadow-xs'
                : 'border border-border/80 bg-white text-foreground hover:bg-mist',
            )}
          >
            All Categories ({items.length})
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
                  'shrink-0 rounded-md px-3.5 py-2 text-sm font-semibold transition-all cursor-pointer',
                  isSelected
                    ? 'bg-pine text-surface shadow-xs'
                    : 'border border-border/80 bg-white text-foreground hover:bg-mist',
                )}
              >
                {category.name} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Products Display (Table or Grid) */}
      {visible.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-8 shadow-soft">
          <EmptyState
            icon={<MagnifyingGlassIcon className="h-8 w-8 text-pine" />}
            title="No matching products found"
            sub="Try adjusting your search keywords, category filter, or availability status."
          />
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="overflow-hidden rounded-2xl border border-border/80 bg-surface shadow-soft">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="border-b border-border/80 bg-mist/60 text-xs font-bold uppercase tracking-wider text-muted">
                <tr>
                  <th scope="col" className="py-3.5 pr-3 pl-4">
                    <SortHeader
                      label="Product"
                      field="name"
                      currentField={sortField}
                      direction={sortDirection}
                      onSort={handleSort}
                    />
                  </th>
                  <th scope="col" className="px-3 py-3.5">
                    <SortHeader
                      label="Category"
                      field="category"
                      currentField={sortField}
                      direction={sortDirection}
                      onSort={handleSort}
                    />
                  </th>
                  <th scope="col" className="px-3 py-3.5">
                    <SortHeader
                      label="Price"
                      field="price"
                      currentField={sortField}
                      direction={sortDirection}
                      onSort={handleSort}
                    />
                  </th>
                  <th scope="col" className="px-3 py-3.5">
                    <SortHeader
                      label="Status"
                      field="status"
                      currentField={sortField}
                      direction={sortDirection}
                      onSort={handleSort}
                    />
                  </th>
                  <th scope="col" className="px-3 py-3.5">
                    <SortHeader
                      label="Today's Quota"
                      field="quota"
                      currentField={sortField}
                      direction={sortDirection}
                      onSort={handleSort}
                    />
                  </th>
                  <th scope="col" className="py-3.5 pr-4 pl-3 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {visible.map((item) => (
                  <tr
                    key={item.product_id}
                    className="transition-colors hover:bg-mist/40"
                  >
                    {/* Product & Thumbnail */}
                    <td className="py-3 pr-3 pl-4">
                      <div className="flex items-center gap-3">
                        <ProductThumb item={item} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate font-bold text-foreground">
                            {item.name}
                          </p>
                          <p className="font-mono text-[11px] text-muted">
                            #PROD-{item.product_id}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 rounded-lg border border-border bg-mist px-2.5 py-1 text-xs font-semibold text-foreground">
                        <TagIcon className="h-3 w-3 text-muted" />
                        {item.category_name}
                      </span>
                    </td>

                    {/* Price */}
                    <td className="px-3 py-3 font-bold whitespace-nowrap text-foreground">
                      ₱{item.price.toFixed(2)}
                    </td>

                    {/* Availability Status */}
                    <td className="px-3 py-3 whitespace-nowrap">
                      {item.is_available ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-leaf/30 bg-leaf/15 px-2.5 py-1 text-xs font-bold text-leaf">
                          <span className="h-1.5 w-1.5 rounded-full bg-leaf" />
                          Available
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-mist px-2.5 py-1 text-xs font-bold text-muted">
                          <span className="h-1.5 w-1.5 rounded-full bg-muted" />
                          Hidden
                        </span>
                      )}
                    </td>

                    {/* Today's Quota */}
                    <td className="px-3 py-3 whitespace-nowrap">
                      {item.today_quota_limit === null ? (
                        <span className="inline-flex items-center rounded-lg border border-border bg-mist/60 px-2 py-0.5 text-xs font-semibold text-muted">
                          Unlimited
                        </span>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-foreground">
                            {item.remaining_quantity ?? 0}
                          </span>
                          <span className="text-xs text-muted">
                            / {item.today_quota_limit} left
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 pr-4 pl-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setViewingProduct(item)}
                          title={`View details for ${item.name}`}
                          aria-label={`View ${item.name}`}
                          className="action-focus inline-flex h-8 items-center gap-1 rounded-lg border border-border bg-surface px-2.5 text-xs font-semibold text-muted shadow-xs transition-colors hover:border-leaf hover:bg-leaf/10 hover:text-leaf cursor-pointer"
                        >
                          <EyeIcon className="h-3.5 w-3.5" />
                          <span>View</span>
                        </button>
                        <Link
                          href="/pos"
                          title={`Order ${item.name} in POS`}
                          className="action-focus inline-flex h-8 items-center gap-1 rounded-lg bg-pine px-3 text-xs font-semibold text-surface shadow-xs transition-colors hover:bg-pine-deep"
                        >
                          <ShoppingCartIcon className="h-3.5 w-3.5" />
                          <span>Order</span>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* GRID CARD VIEW */
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((item) => (
            <div
              key={item.product_id}
              className="flex flex-col justify-between overflow-hidden rounded-2xl border border-border/80 bg-surface shadow-soft transition-all hover:shadow-hover"
            >
              <div>
                <div className="relative">
                  <ProductThumb item={item} size="lg" />
                  <div className="absolute top-2.5 right-2.5">
                    {item.is_available ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-leaf/40 bg-surface/95 px-2.5 py-1 text-xs font-bold text-leaf shadow-sm backdrop-blur-xs">
                        <span className="h-1.5 w-1.5 rounded-full bg-leaf" />
                        Available
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface/95 px-2.5 py-1 text-xs font-bold text-muted shadow-sm backdrop-blur-xs">
                        <span className="h-1.5 w-1.5 rounded-full bg-muted" />
                        Hidden
                      </span>
                    )}
                  </div>
                  <div className="absolute bottom-2.5 left-2.5">
                    <span className="inline-flex items-center gap-1 rounded-lg border border-border/60 bg-surface/95 px-2 py-0.5 text-xs font-semibold text-foreground shadow-sm backdrop-blur-xs">
                      {item.category_name}
                    </span>
                  </div>
                </div>

                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="line-clamp-1 font-bold text-foreground">
                      {item.name}
                    </h3>
                    <p className="font-extrabold text-leaf">
                      ₱{item.price.toFixed(2)}
                    </p>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted">
                    <span>
                      Quota:{' '}
                      {item.today_quota_limit === null
                        ? 'Unlimited'
                        : `${item.remaining_quantity ?? 0} / ${item.today_quota_limit} left`}
                    </span>
                    <span>Sold: {item.sold_quantity}</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-border/70 p-3">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setViewingProduct(item)}
                    className="action-focus flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md border border-border bg-white text-xs font-semibold text-foreground shadow-xs transition-colors hover:bg-mist cursor-pointer"
                  >
                    <EyeIcon className="h-3.5 w-3.5 text-muted" />
                    <span>View</span>
                  </button>
                  <Link
                    href="/pos"
                    className="action-focus flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md bg-pine text-xs font-semibold text-surface shadow-xs transition-colors hover:bg-pine-deep"
                  >
                    <ShoppingCartIcon className="h-3.5 w-3.5" />
                    <span>Order</span>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 5. Product Details Modal */}
      <Modal
        title="Product Details"
        isOpen={viewingProduct !== null}
        onOpenChange={(open) => {
          if (!open) setViewingProduct(null);
        }}
      >
        {viewingProduct ? (
          <div className="flex flex-col gap-4 pt-1">
            {/* Product Image preview */}
            <div className="relative overflow-hidden rounded-2xl border border-border bg-mist">
              {viewingProduct.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={viewingProduct.image_url}
                  alt={viewingProduct.name}
                  className="h-52 w-full object-cover"
                />
              ) : (
                <div className="flex h-52 w-full items-center justify-center bg-sage-100 text-6xl">
                  ☕
                </div>
              )}
              <div className="absolute top-3 right-3">
                {viewingProduct.is_available ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-leaf/40 bg-surface/95 px-3 py-1 text-xs font-bold text-leaf shadow-sm backdrop-blur-xs">
                    <span className="h-2 w-2 rounded-full bg-leaf" />
                    Available on POS
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/95 px-3 py-1 text-xs font-bold text-muted shadow-sm backdrop-blur-xs">
                    <span className="h-2 w-2 rounded-full bg-muted" />
                    Hidden from POS
                  </span>
                )}
              </div>
            </div>

            {/* Info Header */}
            <div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-lg font-black text-foreground">
                    {viewingProduct.name}
                  </h3>
                  <span className="inline-flex items-center gap-1 mt-1 rounded-lg border border-border bg-mist px-2.5 py-0.5 text-xs font-semibold text-foreground">
                    <TagIcon className="h-3 w-3 text-muted" />
                    {viewingProduct.category_name}
                  </span>
                </div>
                <p className="text-xl font-black text-leaf">
                  ₱{viewingProduct.price.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Daily Quota / Inventory Summary */}
            <div className="grid grid-cols-3 gap-2 rounded-2xl border border-border bg-mist/50 p-3 text-center">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted">
                  Today&apos;s Quota
                </p>
                <p className="mt-1 font-bold text-foreground">
                  {viewingProduct.today_quota_limit === null
                    ? 'Unlimited'
                    : `${viewingProduct.today_quota_limit}`}
                </p>
              </div>
              <div className="border-x border-border/80">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted">
                  Sold Today
                </p>
                <p className="mt-1 font-bold text-foreground">
                  {viewingProduct.sold_quantity}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted">
                  Remaining
                </p>
                <p className="mt-1 font-bold text-leaf">
                  {viewingProduct.remaining_quantity === null
                    ? 'Unlimited'
                    : `${viewingProduct.remaining_quantity}`}
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="mt-2 flex items-center justify-end gap-2 border-t border-border pt-4">
              <Button
                variant="secondary"
                onClick={() => setViewingProduct(null)}
              >
                Close
              </Button>
              <Link
                href="/pos"
                className="action-focus inline-flex h-10 items-center justify-center gap-1.5 rounded-md bg-pine px-4 text-sm font-semibold text-surface shadow-xs transition-colors hover:bg-pine-deep"
              >
                <ShoppingCartIcon className="h-4 w-4" />
                <span>Order in POS</span>
              </Link>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
