'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/common/Button';
import { Field } from '@/components/common/Field';
import { SectionLabel } from '@/components/common/SectionLabel';
import {
  createProduct,
  deleteProduct,
  updateProduct,
  uploadProductImage,
} from '../actions';
import type { MenuCategory } from '@/features/pos/types';
import type { EditableProduct } from '../queries';

export interface ProductFormProps {
  categories: MenuCategory[];
  initial: EditableProduct | null;
}

const PILL_INPUT = 'h-[52px] rounded-2xl border-border bg-mist';

/** v2 create/edit product form: photo overlay, pills, delete link. */
export function ProductForm({ categories, initial }: ProductFormProps) {
  const router = useRouter();
  const isEditing = initial !== null;
  const [name, setName] = useState(initial?.name ?? '');
  const [categoryId, setCategoryId] = useState(initial?.category_id ?? '');
  const [priceText, setPriceText] = useState(
    initial ? String(initial.price) : '',
  );
  const [parText, setParText] = useState(
    initial?.par_level !== null && initial?.par_level !== undefined
      ? String(initial.par_level)
      : '',
  );
  const [isAvailable, setIsAvailable] = useState(initial?.is_available ?? true);
  const [imageUrl, setImageUrl] = useState<string | null>(
    initial?.image_url ?? null,
  );
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImage = async (file: File | null) => {
    if (!file) {
      setImageUrl(null);
      return;
    }
    setIsUploading(true);
    setError(null);
    const formData = new FormData();
    formData.set('image', file);
    const result = await uploadProductImage(formData);
    setIsUploading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setImageUrl(result.url);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    const result = isEditing
      ? await updateProduct({
          product_id: (initial as EditableProduct).product_id,
          name,
          category_id: categoryId,
          priceText,
          parText,
          is_available: isAvailable,
          image_url: imageUrl,
        })
      : await createProduct({
          name,
          category_id: categoryId,
          priceText,
          image_url: imageUrl,
        });
    if (!result.ok) {
      setError(result.error);
      setIsSaving(false);
      return;
    }
    router.push('/admin/menu');
  };

  const handleDelete = async () => {
    if (!isEditing || !confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setIsSaving(true);
    const result = await deleteProduct((initial as EditableProduct).product_id);
    if (!result.ok) {
      setError(result.error);
      setIsSaving(false);
      return;
    }
    router.push('/admin/menu');
  };

  return (
    <div className="flex max-w-md flex-col gap-4">
      <div className="relative overflow-hidden rounded-card border border-border bg-mist shadow-soft">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt="Product photo preview"
            className="h-56 w-full object-cover"
          />
        ) : (
          <p className="flex h-56 w-full items-center justify-center text-6xl">
            <span aria-hidden="true">☕</span>
            <span className="sr-only">No photo.</span>
          </p>
        )}
        <label className="absolute right-3 bottom-3 cursor-pointer rounded-full bg-pine-deep/85 px-4 py-2 text-sm font-semibold text-surface">
          {isUploading ? 'Uploading…' : imageUrl ? 'Change photo' : 'Add photo'}
          <input
            type="file"
            accept="image/*"
            disabled={isUploading || isSaving}
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              void handleImage(file);
            }}
            className="sr-only"
          />
        </label>
      </div>
      {imageUrl ? (
        <Button
          variant="ghost"
          size="sm"
          disabled={isSaving}
          onClick={() => setImageUrl(null)}
          className="self-start text-muted"
        >
          Remove photo
        </Button>
      ) : null}
      <Field
        label="Name"
        name="name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        inputClassName={PILL_INPUT}
      />
      <div>
        <SectionLabel as="p">Category</SectionLabel>
        <select
          aria-label="Category"
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
          className="mt-1 block h-[52px] w-full rounded-2xl border border-border bg-mist px-3.5 text-foreground"
        >
          <option value="">Select a category</option>
          {categories.map((category) => (
            <option key={category.category_id} value={category.category_id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>
      <Field
        label="Price"
        name="price"
        type="number"
        min={0}
        step="any"
        inputMode="decimal"
        value={priceText}
        onChange={(event) => setPriceText(event.target.value)}
        inputClassName={PILL_INPUT}
      />
      <label className="flex cursor-pointer items-center gap-3 rounded-2xl bg-mist p-3 text-sm text-foreground">
        <input
          type="checkbox"
          checked={isAvailable}
          onChange={(event) => setIsAvailable(event.target.checked)}
          className="h-5 w-5 accent-pine"
        />
        <span>
          <span className="font-bold">Available on POS</span>
          <span className="block text-sm text-muted">
            Show this item on the POS menu
          </span>
        </span>
      </label>
      {isEditing ? (
        <Field
          label="Par level (optional)"
          name="par"
          type="number"
          min={0}
          step={1}
          inputMode="numeric"
          placeholder="Unset"
          value={parText}
          onChange={(event) => setParText(event.target.value)}
          inputClassName={PILL_INPUT}
        />
      ) : null}
      {error ? (
        <p role="alert" className="text-center text-sm text-danger">
          {error}
        </p>
      ) : null}
      <div className="flex flex-col gap-2">
        <Button
          onClick={handleSave}
          disabled={isSaving || isUploading}
          className="h-[52px] w-full rounded-full bg-pine text-base text-surface"
        >
          {isSaving ? 'Saving…' : isEditing ? 'Save changes' : 'Add product'}
        </Button>
        <Button
          variant="secondary"
          onClick={() => router.push('/admin/menu')}
          disabled={isSaving || isUploading}
          className="h-12 w-full rounded-full"
        >
          Discard
        </Button>
        {isEditing ? (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isSaving}
            className="mt-1 text-center text-sm font-bold text-danger disabled:opacity-50"
          >
            {confirmDelete ? 'Confirm delete' : 'Delete Product'}
          </button>
        ) : null}
      </div>
    </div>
  );
}
