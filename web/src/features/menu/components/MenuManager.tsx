'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { EmptyState } from '@/components/common/EmptyState';
import { Field } from '@/components/common/Field';
import { IconTile } from '@/components/common/IconTile';
import { CupIcon, SearchIcon } from '@/components/common/icons';
import { Select } from '@/components/ui/select/Select';
import { cn } from '@/lib/cn';
import { createCategory, deleteCategory } from '../actions';
import { UNCATEGORIZED } from '../validate';
import type { MenuCategory, MenuItem } from '@/features/pos/types';

export interface MenuManagerProps {
  categories: MenuCategory[];
  items: MenuItem[];
}

/** Grouped catalog with search, product edit links, and category tools. */
export function MenuManager({ categories, items }: MenuManagerProps) {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [deleteId, setDeleteId] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const query = search.trim().toLowerCase();
  const visible = useMemo(
    () =>
      items.filter((item) => {
        if (activeCategory && item.category_id !== activeCategory) return false;
        if (
          query &&
          !`${item.name} ${item.category_name}`.toLowerCase().includes(query)
        ) {
          return false;
        }
        return true;
      }),
    [items, activeCategory, query],
  );

  const handleAddCategory = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    const result = await createCategory(newCategory);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setNewCategory('');
    setNotice('Category added.');
    router.refresh();
  };

  const handleDeleteCategory = async () => {
    if (!deleteId) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    const result = await deleteCategory(deleteId);
    setBusy(false);
    setConfirmDelete(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setDeleteId('');
    setNotice('Category deleted. Its products moved to Uncategorized.');
    router.refresh();
  };

  return (
    <div>
      <Link
        href="/admin/menu/product/new"
        className="action-focus flex h-11 items-center justify-center rounded-full bg-pine px-4 text-sm font-semibold text-surface"
      >
        Add product
      </Link>
      <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1">
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
      <label className="relative mt-3 block">
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
          placeholder="Search items"
          className="block h-[52px] w-full rounded-full border border-border bg-surface pr-4 pl-11 text-foreground shadow-soft placeholder:text-muted"
        />
      </label>
      {visible.length === 0 ? (
        <EmptyState
          icon={<SearchIcon />}
          title="No items match"
          sub="Try a different search or category."
        />
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {visible.map((item) => (
            <li
              key={item.product_id}
              className="card-hover flex items-center gap-3 rounded-card border border-border bg-surface p-3 shadow-soft"
            >
              <IconTile tone="sage">
                <CupIcon />
              </IconTile>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-bold text-foreground">
                  {item.name}
                  {!item.is_available ? ' (hidden)' : null}
                </p>
                <p className="text-sm text-muted">
                  ₱{item.price.toFixed(2)} · {item.category_name}
                </p>
              </div>
              <Link
                href={`/admin/menu/product/${item.product_id}`}
                className="action-focus flex h-11 shrink-0 items-center rounded-full bg-pine px-4 text-sm font-semibold text-surface"
              >
                Edit
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Card
        title="Categories"
        className="mt-6 max-w-md rounded-card border-border shadow-soft"
      >
        <div className="mt-2 flex items-end gap-2">
          <Field
            label="New category"
            name="newCategory"
            value={newCategory}
            onChange={(event) => setNewCategory(event.target.value)}
            inputClassName="h-[52px] rounded-2xl border-border bg-mist"
            className="flex-1"
          />
          <Button
            size="sm"
            className="h-11 shrink-0 rounded-full bg-pine px-4 font-semibold text-surface"
            disabled={busy || !newCategory.trim()}
            onClick={handleAddCategory}
          >
            Add
          </Button>
        </div>
        <Select
          label="Delete category"
          placeholder="Select a category"
          options={categories
            .filter((category) => category.name !== UNCATEGORIZED)
            .map((category) => ({
              id: category.category_id,
              label: category.name,
            }))}
          value={deleteId}
          onChange={(next) => {
            setDeleteId(next);
            setConfirmDelete(false);
          }}
        />
        <p className="mt-1 text-muted">
          Products in a deleted category move to {UNCATEGORIZED}.
        </p>
        <Button
          variant="danger"
          size="sm"
          disabled={busy || !deleteId}
          onClick={handleDeleteCategory}
        >
          {confirmDelete ? 'Confirm delete' : 'Delete'}
        </Button>
        {error ? (
          <p role="alert" className="mt-2 text-danger">
            {error}
          </p>
        ) : null}
        {notice ? <p className="mt-2 text-success">{notice}</p> : null}
      </Card>
    </div>
  );
}
