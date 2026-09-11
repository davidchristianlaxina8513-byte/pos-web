'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/common/Button';
import { Field } from '@/components/common/Field';
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

/** Create/edit product form with photo upload and edit-only par level. */
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
  const [isAvailable, setIsAvailable] = useState(
    initial?.is_available ?? true,
  );
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
    const result = await deleteProduct(
      (initial as EditableProduct).product_id,
    );
    if (!result.ok) {
      setError(result.error);
      setIsSaving(false);
      return;
    }
    router.push('/admin/menu');
  };

  return (
    <div className="flex max-w-md flex-col gap-3">
      <div>
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="Product photo preview" width={160} />
        ) : (
          <p className="text-muted">No photo.</p>
        )}
        <label className="mt-2 block">
          <span className="text-muted">Photo</span>
          <input
            type="file"
            accept="image/*"
            disabled={isUploading || isSaving}
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              void handleImage(file);
            }}
            className="mt-1 block w-full text-foreground"
          />
        </label>
        {imageUrl ? (
          <Button
            variant="ghost"
            size="sm"
            disabled={isSaving}
            onClick={() => setImageUrl(null)}
          >
            Remove photo
          </Button>
        ) : null}
      </div>
      <Field
        label="Name"
        name="name"
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <label className="block">
        <span className="text-foreground">Category</span>
        <select
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
          className="mt-1 block w-full rounded border border-border bg-surface px-3 py-2 text-foreground"
        >
          <option value="">Select a category</option>
          {categories.map((category) => (
            <option
              key={category.category_id}
              value={category.category_id}
            >
              {category.name}
            </option>
          ))}
        </select>
      </label>
      <Field
        label="Price"
        name="price"
        type="number"
        min={0}
        step="any"
        inputMode="decimal"
        value={priceText}
        onChange={(event) => setPriceText(event.target.value)}
      />
      <label className="flex items-center gap-2 text-foreground">
        <input
          type="checkbox"
          checked={isAvailable}
          onChange={(event) => setIsAvailable(event.target.checked)}
        />
        Available on POS
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
        />
      ) : null}
      {error ? (
        <p role="alert" className="text-danger">
          {error}
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={isSaving || isUploading}>
          {isSaving ? 'Saving…' : isEditing ? 'Save changes' : 'Add product'}
        </Button>
        {isEditing ? (
          <Button
            variant="danger"
            onClick={handleDelete}
            disabled={isSaving}
          >
            {confirmDelete ? 'Confirm delete' : 'Delete'}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
