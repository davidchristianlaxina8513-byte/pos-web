'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/form/Button';
import { Card } from '@/components/common/Card';
import {
  createProduct,
  deleteProduct,
  updateProduct,
  uploadProductImage,
} from '@/features/menu/actions';
import type { MenuCategory } from '@/features/pos/types';
import type { EditableProduct } from '@/features/menu/queries';
import { useAlert } from '@/components/toast';
import {
  PhotoIcon,
  CheckCircleIcon,
  PlusIcon,
  TrashIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
} from '@/components/common/hero-icons';
import { cn } from '@/lib/cn';

export interface ProductFormProps {
  categories: MenuCategory[];
  initial: EditableProduct | null;
}

const QUOTA_PRESETS = [
  { label: 'Unlimited', value: null },
  { label: '10 units', value: 10 },
  { label: '25 units', value: 25 },
  { label: '50 units', value: 50 },
  { label: '100 units', value: 100 },
];

/** Modern DCASIS 2-column product form: image uploader, pricing, category, & daily quota controls. */
export function ProductForm({ categories, initial }: ProductFormProps) {
  const router = useRouter();
  const { successAlert, errorAlert } = useAlert();
  const isEditing = initial !== null;

  const [name, setName] = useState(initial?.name ?? '');
  const [categoryId, setCategoryId] = useState(initial?.category_id ?? '');
  const [priceText, setPriceText] = useState(
    initial ? String(initial.price) : '',
  );
  const [defaultQuotaText, setDefaultQuotaText] = useState(
    initial?.daily_quota_limit === null
      ? ''
      : String(initial?.daily_quota_limit ?? ''),
  );
  const [isAvailable, setIsAvailable] = useState(initial?.is_available ?? true);
  const [imageUrl, setImageUrl] = useState<string | null>(
    initial?.image_url ?? null,
  );
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

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
      errorAlert('Upload Failed', result.error);
      return;
    }
    setImageUrl(result.url);
    successAlert('Image Uploaded', 'Product image uploaded successfully.');
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!name.trim()) {
      setError('Product name is required.');
      return;
    }
    if (!categoryId.trim()) {
      setError('Please select a category for this product.');
      return;
    }
    if (!priceText.trim() || Number(priceText) < 0) {
      setError('Please enter a valid price greater than or equal to 0.');
      return;
    }

    setIsSaving(true);
    setError(null);

    const result = isEditing
      ? await updateProduct({
          product_id: (initial as EditableProduct).product_id,
          name,
          category_id: categoryId,
          priceText,
          defaultQuotaText,
          is_available: isAvailable,
          image_url: imageUrl,
        })
      : await createProduct({
          name,
          category_id: categoryId,
          priceText,
          defaultQuotaText,
          image_url: imageUrl,
        });

    if (!result.ok) {
      setError(result.error);
      errorAlert('Save Failed', result.error);
      setIsSaving(false);
      return;
    }

    successAlert(
      isEditing ? 'Product Updated' : 'Product Created',
      `Product "${name}" was saved successfully.`,
    );
    router.push('/admin/menu');
  };

  const handleDelete = async () => {
    if (!isEditing) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setIsSaving(true);
    const result = await deleteProduct((initial as EditableProduct).product_id);
    if (!result.ok) {
      setError(result.error);
      errorAlert('Delete Failed', result.error);
      setIsSaving(false);
      return;
    }
    successAlert(
      'Product Deleted',
      `Product "${(initial as EditableProduct).name}" was removed.`,
    );
    router.push('/admin/menu');
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
        {/* Left Column: Media & Register Availability (5 Cols) */}
        <div className="space-y-6 lg:col-span-5">
          {/* Product Media Card */}
          <Card
            title="Product Image"
            className="rounded-card border-border shadow-soft"
          >
            <div className="flex flex-col gap-4">
              <div
                className={cn(
                  'relative aspect-4/3 sm:aspect-square w-full overflow-hidden rounded-xl border border-border bg-mist flex items-center justify-center transition-all',
                  !imageUrl && 'hover:border-pine cursor-pointer',
                )}
                onClick={() => {
                  if (!imageUrl && fileInputRef.current) {
                    fileInputRef.current.click();
                  }
                }}
              >
                {imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageUrl}
                    alt={name ? `${name} preview` : 'Product preview'}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center p-6 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-pine/10 text-pine mb-3">
                      <PhotoIcon className="h-7 w-7" />
                    </div>
                    <p className="text-sm font-bold text-foreground">
                      Click to upload photo
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      JPG, PNG, or WebP up to 5MB
                    </p>
                  </div>
                )}

                {/* Uploading Spinner Overlay */}
                {isUploading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-white backdrop-blur-xs">
                    <ArrowPathIcon className="h-8 w-8 animate-spin text-mint" />
                    <span className="mt-2 text-xs font-semibold">
                      Uploading image…
                    </span>
                  </div>
                )}
              </div>

              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={isUploading || isSaving}
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  void handleImage(file);
                }}
                className="sr-only"
              />

              {/* Image Controls */}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={isUploading || isSaving}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 text-xs"
                >
                  <PhotoIcon className="h-4 w-4" />
                  {imageUrl ? 'Replace photo' : 'Select photo'}
                </Button>

                {imageUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isSaving || isUploading}
                    onClick={() => setImageUrl(null)}
                    className="text-xs text-danger hover:bg-danger-surface hover:text-danger"
                  >
                    Remove
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {/* POS Status & Visibility Card */}
          <Card
            title="POS Availability"
            className="rounded-card border-border shadow-soft"
          >
            <div
              onClick={() => setIsAvailable((prev) => !prev)}
              className={cn(
                'group flex cursor-pointer items-start gap-3.5 rounded-xl border p-4 transition-all duration-150',
                isAvailable
                  ? 'border-pine/40 bg-pine/5 shadow-xs'
                  : 'border-border bg-mist/40 hover:bg-mist/70',
              )}
            >
              <div className="pt-0.5">
                <input
                  type="checkbox"
                  id="isAvailable"
                  checked={isAvailable}
                  onChange={(e) => setIsAvailable(e.target.checked)}
                  className="h-5 w-5 rounded accent-pine"
                />
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-foreground">
                    {isAvailable ? 'Available on POS' : 'Hidden from POS'}
                  </span>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
                      isAvailable
                        ? 'bg-mint text-pine-deep'
                        : 'bg-muted/20 text-muted',
                    )}
                  >
                    <span
                      className={cn(
                        'h-1.5 w-1.5 rounded-full',
                        isAvailable ? 'bg-leaf animate-pulse' : 'bg-muted',
                      )}
                    />
                    {isAvailable ? 'Active' : 'Hidden'}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  {isAvailable
                    ? 'Cashiers can view, select, and sell this product on the POS terminal.'
                    : 'This product is hidden from register menus and cannot be ordered right now.'}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Information, Pricing, & Quota (7 Cols) */}
        <div className="space-y-6 lg:col-span-7">
          {/* General Information Card */}
          <Card
            title="General Information"
            className="rounded-card border-border shadow-soft"
          >
            <div className="space-y-4">
              {/* Product Name */}
              <div>
                <label
                  htmlFor="productName"
                  className="block text-xs font-bold tracking-wider uppercase text-foreground mb-1.5"
                >
                  Product Name <span className="text-danger">*</span>
                </label>
                <input
                  id="productName"
                  type="text"
                  required
                  placeholder="e.g. Spanish Latte, Butterscotch Latte, Croissant"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-11 w-full rounded-md border border-border bg-surface px-3.5 text-sm font-medium text-foreground transition focus:border-pine focus:outline-none focus:ring-1 focus:ring-pine"
                />
              </div>

              {/* Category Select */}
              <div>
                <label
                  htmlFor="productCategory"
                  className="block text-xs font-bold tracking-wider uppercase text-foreground mb-1.5"
                >
                  Menu Category <span className="text-danger">*</span>
                </label>
                <select
                  id="productCategory"
                  required
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="h-11 w-full rounded-md border border-border bg-surface px-3 text-sm font-medium text-foreground transition focus:border-pine focus:outline-none focus:ring-1 focus:ring-pine"
                >
                  <option value="" disabled>
                    Select category…
                  </option>
                  {categories.map((cat) => (
                    <option key={cat.category_id} value={cat.category_id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-muted">
                  Categories organize POS menu navigation tabs and sales
                  reporting.
                </p>
              </div>

              {/* Selling Price */}
              <div>
                <label
                  htmlFor="productPrice"
                  className="block text-xs font-bold tracking-wider uppercase text-foreground mb-1.5"
                >
                  Selling Price <span className="text-danger">*</span>
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                    <span className="text-base font-bold text-pine">₱</span>
                  </div>
                  <input
                    id="productPrice"
                    type="number"
                    min="0"
                    step="any"
                    inputMode="decimal"
                    required
                    placeholder="0.00"
                    value={priceText}
                    onChange={(e) => setPriceText(e.target.value)}
                    className="h-11 w-full rounded-md border border-border bg-surface pl-8 pr-3 text-sm font-semibold text-foreground transition focus:border-pine focus:outline-none focus:ring-1 focus:ring-pine"
                  />
                </div>
                <p className="mt-1 text-xs text-muted">
                  Unit price in Philippine Peso (PHP) charged at POS checkout.
                </p>
              </div>
            </div>
          </Card>

          {/* Daily Production Quota Card */}
          <Card
            title="Daily Production Quota"
            className="rounded-card border-border shadow-soft"
          >
            <div className="space-y-4">
              <p className="text-xs text-muted leading-relaxed">
                Set a daily batch limit to prevent overselling raw ingredients.
                Leave blank or set to Unlimited if not quota-constrained.
              </p>

              {/* Quick Preset Chips */}
              <div className="flex flex-wrap items-center gap-2">
                {QUOTA_PRESETS.map((preset) => {
                  const isSelected =
                    preset.value === null
                      ? defaultQuotaText.trim() === ''
                      : defaultQuotaText.trim() === String(preset.value);

                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() =>
                        setDefaultQuotaText(
                          preset.value === null ? '' : String(preset.value),
                        )
                      }
                      className={cn(
                        'rounded-full px-3 py-1.5 text-xs font-semibold transition',
                        isSelected
                          ? 'bg-pine text-surface shadow-xs'
                          : 'border border-border bg-surface text-foreground hover:bg-mist',
                      )}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>

              {/* Custom Quota Input */}
              <div>
                <label
                  htmlFor="quotaInput"
                  className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1"
                >
                  Custom Daily Limit
                </label>
                <input
                  id="quotaInput"
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  placeholder="Unlimited daily quota"
                  value={defaultQuotaText}
                  onChange={(e) => setDefaultQuotaText(e.target.value)}
                  className="h-11 w-full rounded-md border border-border bg-surface px-3 text-sm text-foreground transition focus:border-pine focus:outline-none focus:ring-1 focus:ring-pine"
                />
              </div>

              {/* Explanation Banner */}
              <div className="rounded-lg bg-mist/60 border border-border/70 p-3 text-xs text-foreground/80">
                <span className="font-bold text-pine">Quota Rule:</span> The POS
                register automatically tracks sold units against this daily
                quota, disabling the product when today&apos;s limit is reached.
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Error Feedback */}
      {error && (
        <div
          role="alert"
          className="flex items-center gap-2.5 rounded-xl border border-danger-border bg-danger-surface p-4 text-sm font-semibold text-danger shadow-xs"
        >
          <ExclamationTriangleIcon className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Bottom Sticky Action Footer */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6">
        <div className="flex items-center gap-3">
          <Button
            type="submit"
            disabled={isSaving || isUploading}
            className="h-11 min-w-[140px] rounded-md bg-pine px-6 text-sm font-semibold text-surface shadow-xs hover:bg-pine-deep"
          >
            {isSaving ? (
              <span className="flex items-center gap-2">
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
                Saving…
              </span>
            ) : isEditing ? (
              <span className="flex items-center gap-2">
                <CheckCircleIcon className="h-4 w-4" />
                Save Changes
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <PlusIcon className="h-4 w-4" />
                Add Product
              </span>
            )}
          </Button>

          <Button
            type="button"
            variant="secondary"
            disabled={isSaving || isUploading}
            onClick={() => router.push('/admin/menu')}
            className="h-11 rounded-md px-5 text-sm font-semibold"
          >
            Discard
          </Button>
        </div>

        {isEditing && (
          <div className="flex items-center gap-2">
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-danger">
                  Confirm delete?
                </span>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  disabled={isSaving}
                  onClick={handleDelete}
                  className="h-9 px-3 text-xs"
                >
                  Yes, Delete Product
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isSaving}
                  onClick={() => setConfirmDelete(false)}
                  className="h-9 px-2 text-xs"
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-danger hover:underline disabled:opacity-50"
              >
                <TrashIcon className="h-4 w-4" />
                Delete Product
              </button>
            )}
          </div>
        )}
      </div>
    </form>
  );
}
