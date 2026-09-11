'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/common/Button';
import { Field } from '@/components/common/Field';
import { createCategory, deleteCategory } from '../actions';
import { UNCATEGORIZED } from '../queries';
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
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/admin/menu/product/new"
          className="rounded bg-primary px-3 py-1 font-medium text-surface"
        >
          Add product
        </Link>
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
      <label className="mt-3 block max-w-md">
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
        <ul className="mt-4 grid gap-2">
          {visible.map((item) => (
            <li
              key={item.product_id}
              className="flex items-center justify-between gap-3 rounded border border-border bg-surface px-4 py-2"
            >
              <div>
                <p className="text-foreground">
                  {item.name}
                  {!item.is_available ? ' (hidden)' : null}
                </p>
                <p className="text-muted">
                  ₱{item.price.toFixed(2)} · {item.category_name}
                </p>
              </div>
              <Link
                href={`/admin/menu/product/${item.product_id}`}
                className="rounded border border-border bg-surface px-3 py-1 font-medium text-foreground"
              >
                Edit
              </Link>
            </li>
          ))}
        </ul>
      )}
      <section className="mt-6 max-w-md rounded border border-border bg-surface p-4">
        <h2 className="text-foreground">Categories</h2>
        <div className="mt-2 flex gap-2">
          <Field
            label="New category"
            name="newCategory"
            value={newCategory}
            onChange={(event) => setNewCategory(event.target.value)}
          />
          <Button
            size="sm"
            disabled={busy || !newCategory.trim()}
            onClick={handleAddCategory}
          >
            Add
          </Button>
        </div>
        <label className="mt-3 block">
          <span className="text-foreground">Delete category</span>
          <select
            value={deleteId}
            onChange={(event) => {
              setDeleteId(event.target.value);
              setConfirmDelete(false);
            }}
            className="mt-1 block w-full rounded border border-border bg-surface px-3 py-2 text-foreground"
          >
            <option value="">Select a category</option>
            {categories
              .filter((category) => category.name !== UNCATEGORIZED)
              .map((category) => (
                <option
                  key={category.category_id}
                  value={category.category_id}
                >
                  {category.name}
                </option>
              ))}
          </select>
        </label>
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
      </section>
    </div>
  );
}
