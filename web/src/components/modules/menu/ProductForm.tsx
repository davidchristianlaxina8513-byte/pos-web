'use client';

import { useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  createCategory,
  createProduct,
  deleteProduct,
  updateProduct,
  uploadProductImage,
} from '@/features/menu/actions';
import type { MenuCategory } from '@/features/pos/types';
import type { EditableProduct } from '@/features/menu/queries';
import { Modal } from '@/components/modal';
import { useAlert } from '@/components/toast';
import {
  PhotoIcon,
  PlusIcon,
  TrashIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  ChevronDownIcon,
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

/** Full-width DCASIS form matching the authentic sports-client / athlete form architecture. */
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

  const [extraCategories, setExtraCategories] = useState<MenuCategory[]>([]);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [categoryModalError, setCategoryModalError] = useState<string | null>(
    null,
  );

  const categoryOptions = useMemo(() => {
    const existingIds = new Set(categories.map((c) => c.category_id));
    const extra = extraCategories.filter(
      (c) => !existingIds.has(c.category_id),
    );
    return [...categories, ...extra];
  }, [categories, extraCategories]);

  const handleCreateCategory = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      setCategoryModalError('Category name is required.');
      return;
    }

    setIsCreatingCategory(true);
    setCategoryModalError(null);
    const result = await createCategory(trimmed);
    setIsCreatingCategory(false);

    if (!result.ok) {
      setCategoryModalError(result.error);
      return;
    }

    const created = result.category;
    setExtraCategories((prev) => [...prev, { ...created, is_default: false }]);
    setCategoryId(created.category_id);
    setIsCategoryModalOpen(false);
    setNewCategoryName('');
    successAlert(
      'Category Created',
      `Category "${created.name}" was created and selected.`,
    );
    router.refresh();
  };

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
    <div>
      {/* Error Feedback */}
      {error && (
        <div
          role="alert"
          className="mb-8 flex items-center gap-2.5 rounded-xl border border-danger-border bg-danger-surface p-4 text-sm font-semibold text-danger shadow-xs"
        >
          <ExclamationTriangleIcon className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="divide-y divide-gray-900/10">
        {/* Section 1: General Information */}
        <div className="grid grid-cols-1 gap-x-8 gap-y-8 py-10 md:grid-cols-3">
          <div className="px-4 sm:px-0">
            <h2 className="text-base font-semibold leading-7 text-gray-900">
              General Information
            </h2>
            <p className="mt-1 text-sm leading-6 text-gray-600">
              Essential details of the product including the item name, menu
              category classification, and base selling price.
            </p>
          </div>

          <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl md:col-span-2">
            <div className="px-4 py-6 sm:p-8">
              <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2">
                {/* Product Name (Full Width) */}
                <div className="sm:col-span-2">
                  <div className="flex">
                    <label
                      htmlFor="productName"
                      className="block text-sm font-medium leading-6 text-gray-900"
                    >
                      Product Name
                    </label>
                    <span className="text-red-500 ml-1">*</span>
                  </div>
                  <div className="mt-2">
                    <input
                      id="productName"
                      type="text"
                      required
                      placeholder="e.g. Spanish Latte, Butterscotch Latte, Blueberry Cheesecake"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="block w-full rounded-md border-0 py-2.5 px-3 bg-white text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-pine sm:text-sm sm:leading-6"
                    />
                  </div>
                </div>

                {/* Category Selection */}
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex">
                      <label
                        htmlFor="productCategory"
                        className="block text-sm font-medium leading-6 text-gray-900"
                      >
                        Menu Category
                      </label>
                      <span className="text-red-500 ml-1">*</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setNewCategoryName('');
                        setCategoryModalError(null);
                        setIsCategoryModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-pine hover:text-pine-deep hover:underline cursor-pointer transition-colors"
                    >
                      <PlusIcon className="h-3.5 w-3.5" />
                      <span>Add new category</span>
                    </button>
                  </div>
                  <div className="relative mt-2">
                    <select
                      id="productCategory"
                      required
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="block w-full h-[44px] appearance-none rounded-md border-0 py-2.5 pl-3 pr-10 bg-white text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-pine sm:text-sm sm:leading-6 cursor-pointer"
                    >
                      <option value="" disabled>
                        Select an option…
                      </option>
                      {categoryOptions.map((cat) => (
                        <option key={cat.category_id} value={cat.category_id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                      <ChevronDownIcon
                        className="h-5 w-5 text-gray-400"
                        aria-hidden="true"
                      />
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-slate-500 font-medium">
                    Categories group items on the POS touch register.
                  </p>
                </div>

                {/* Selling Price */}
                <div>
                  <div className="flex">
                    <label
                      htmlFor="productPrice"
                      className="block text-sm font-medium leading-6 text-gray-900"
                    >
                      Selling Price (PHP)
                    </label>
                    <span className="text-red-500 ml-1">*</span>
                  </div>
                  <div className="relative mt-2 rounded-md shadow-sm">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <span className="text-gray-500 font-bold sm:text-sm">
                        ₱
                      </span>
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
                      className="block w-full rounded-md border-0 py-2.5 pl-8 pr-3 bg-white text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-pine sm:text-sm sm:leading-6"
                    />
                  </div>
                  <p className="mt-2 text-xs text-slate-500 font-medium">
                    Default unit price charged at checkout.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Product Image & Media */}
        <div className="grid grid-cols-1 gap-x-8 gap-y-8 py-10 md:grid-cols-3">
          <div className="px-4 sm:px-0">
            <h2 className="text-base font-semibold leading-7 text-gray-900">
              Product Photo
            </h2>
            <p className="mt-1 text-sm leading-6 text-gray-600">
              Upload a high-resolution photo of the item for display on the
              Point of Sale touchscreen menu. Supported formats: PNG, JPG, or
              WebP up to 5MB.
            </p>
          </div>

          <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl md:col-span-2">
            <div className="px-4 py-6 sm:p-8">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                {/* Photo Preview Container */}
                <div className="relative h-44 w-44 shrink-0 overflow-hidden rounded-2xl border border-gray-200 bg-slate-50">
                  {imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imageUrl}
                      alt={name ? `${name} preview` : 'Product preview'}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center p-4 text-center">
                      <PhotoIcon className="h-10 w-10 text-gray-400" />
                      <span className="mt-2 text-xs font-semibold text-gray-500">
                        No photo uploaded
                      </span>
                    </div>
                  )}

                  {/* Uploading Spinner Overlay */}
                  {isUploading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-white backdrop-blur-xs">
                      <ArrowPathIcon className="h-7 w-7 animate-spin text-mint" />
                      <span className="mt-2 text-[11px] font-semibold">
                        Uploading…
                      </span>
                    </div>
                  )}
                </div>

                {/* Upload Actions & Instructions */}
                <div className="flex-1 space-y-3">
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

                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      disabled={isUploading || isSaving}
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-2 rounded-md bg-white px-3.5 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
                    >
                      <PhotoIcon className="h-4 w-4 text-gray-500" />
                      <span>{imageUrl ? 'Change photo' : 'Select photo'}</span>
                    </button>

                    {imageUrl && (
                      <button
                        type="button"
                        disabled={isSaving || isUploading}
                        onClick={() => setImageUrl(null)}
                        className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 hover:text-red-700"
                      >
                        <TrashIcon className="h-4 w-4" />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>

                  <p className="text-xs text-gray-500 leading-relaxed">
                    JPG, PNG, or WebP. Recommend square images at least
                    400×400px for best clarity on thermal orders and POS
                    screens.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Register Availability */}
        <div className="grid grid-cols-1 gap-x-8 gap-y-8 py-10 md:grid-cols-3">
          <div className="px-4 sm:px-0">
            <h2 className="text-base font-semibold leading-7 text-gray-900">
              Register Availability
            </h2>
            <p className="mt-1 text-sm leading-6 text-gray-600">
              Control whether this item is active and orderable by cashiers on
              the Point of Sale terminal.
            </p>
          </div>

          <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl md:col-span-2">
            <div className="px-4 py-6 sm:p-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setIsAvailable(true)}
                  className={cn(
                    'flex h-12 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-semibold transition-all cursor-pointer shadow-xs',
                    isAvailable
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                  )}
                >
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <span>Active on POS</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsAvailable(false)}
                  className={cn(
                    'flex h-12 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-semibold transition-all cursor-pointer shadow-xs',
                    !isAvailable
                      ? 'border-slate-400 bg-slate-100 text-slate-800 ring-2 ring-slate-400'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                  )}
                >
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
                  <span>Hidden from POS</span>
                </button>
              </div>

              <p className="mt-3 text-xs leading-relaxed text-gray-500">
                {isAvailable
                  ? 'Visible on POS: cashiers can view, select, and process this item during customer checkout.'
                  : 'Hidden from register: cashiers cannot select this item (useful for seasonal or paused menu items).'}
              </p>
            </div>
          </div>
        </div>

        {/* Section 4: Daily Production Quota */}
        <div className="grid grid-cols-1 gap-x-8 gap-y-8 py-10 md:grid-cols-3">
          <div className="px-4 sm:px-0">
            <h2 className="text-base font-semibold leading-7 text-gray-900">
              Daily Production Quota
            </h2>
            <p className="mt-1 text-sm leading-6 text-gray-600">
              Set a daily batch limit to prevent overselling raw ingredients.
              Leave blank or select Unlimited if this item has no daily limit.
            </p>
          </div>

          <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl md:col-span-2">
            <div className="px-4 py-6 sm:p-8 space-y-6">
              {/* Quick Preset Chips */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                  Quick Select Preset
                </label>
                <div className="flex flex-wrap items-center gap-2.5">
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
                          'rounded-full px-4 py-1.5 text-xs font-semibold transition cursor-pointer shadow-2xs',
                          isSelected
                            ? 'bg-pine text-white ring-1 ring-pine'
                            : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
                        )}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Daily Limit Input */}
              <div>
                <label
                  htmlFor="quotaInput"
                  className="block text-sm font-medium leading-6 text-gray-900"
                >
                  Custom Daily Limit (Units)
                </label>
                <div className="mt-2">
                  <input
                    id="quotaInput"
                    type="number"
                    min="0"
                    step="1"
                    inputMode="numeric"
                    placeholder="Unlimited daily quota (leave blank)"
                    value={defaultQuotaText}
                    onChange={(e) => setDefaultQuotaText(e.target.value)}
                    className="block w-full rounded-md border-0 py-2.5 px-3 bg-white text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-pine sm:text-sm sm:leading-6"
                  />
                </div>
              </div>

              {/* Quota Rule Callout */}
              <div className="rounded-lg border border-pine/20 bg-pine/5 p-4 text-xs text-pine-deep leading-relaxed">
                <span className="font-bold">Inventory Rule:</span> The POS
                system automatically decrements stock with every completed sale
                and marks the item as sold out when today&apos;s quota is
                reached.
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions matching DCASIS athlete form */}
        <div className="flex flex-wrap items-center justify-between gap-4 py-6">
          <div>
            {isEditing && (
              <>
                {confirmDelete ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-red-600">
                      Confirm delete?
                    </span>
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={handleDelete}
                      className="rounded-md bg-red-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-red-500"
                    >
                      Yes, Delete
                    </button>
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => setConfirmDelete(false)}
                      className="rounded-md bg-white px-2.5 py-2 text-xs font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    disabled={isSaving}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 hover:text-red-700 hover:underline disabled:opacity-50"
                  >
                    <TrashIcon className="h-4 w-4" />
                    Delete Product
                  </button>
                )}
              </>
            )}
          </div>

          <div className="flex items-center gap-x-4">
            <button
              type="button"
              disabled={isSaving || isUploading}
              onClick={() => router.push('/admin/menu')}
              className="w-full sm:w-auto px-6 py-2.5 rounded-md bg-white border border-gray-300 text-sm font-semibold text-gray-900 hover:bg-gray-50 shadow-sm transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSaving || isUploading}
              className="w-full sm:w-auto px-6 py-2.5 rounded-md bg-pine text-sm font-semibold text-white hover:bg-pine-deep shadow-sm transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <ArrowPathIcon className="h-4 w-4 animate-spin" />
                  <span>Saving…</span>
                </>
              ) : (
                <>
                  <PlusIcon className="h-4 w-4" />
                  <span>{isEditing ? 'Save Changes' : 'Submit'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Add New Category Modal matching DCASIS modal architecture */}
      <Modal
        title="Add New Category"
        isOpen={isCategoryModalOpen}
        onOpenChange={(open) => {
          if (!isCreatingCategory) {
            setIsCategoryModalOpen(open);
            if (!open) {
              setNewCategoryName('');
              setCategoryModalError(null);
            }
          }
        }}
        isDismissDisabled={isCreatingCategory}
        size="md"
      >
        <form onSubmit={handleCreateCategory} className="space-y-4">
          {categoryModalError && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700"
            >
              <ExclamationTriangleIcon className="h-4 w-4 shrink-0 text-red-500" />
              <span>{categoryModalError}</span>
            </div>
          )}

          <div>
            <div className="flex">
              <label
                htmlFor="newCategoryName"
                className="block text-sm font-medium leading-6 text-gray-900"
              >
                Category Name
              </label>
              <span className="text-red-500 ml-1">*</span>
            </div>
            <div className="mt-2">
              <input
                id="newCategoryName"
                type="text"
                autoFocus
                required
                placeholder="e.g. Specialty Drinks, Pastries, Breakfast"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                disabled={isCreatingCategory}
                className="block w-full rounded-md border-0 py-2.5 px-3 bg-white text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-pine sm:text-sm sm:leading-6"
              />
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Enter a unique name for this menu category.
            </p>
          </div>

          <div className="flex space-x-2 mt-6 justify-between items-center pt-2">
            <button
              type="button"
              disabled={isCreatingCategory}
              onClick={() => setIsCategoryModalOpen(false)}
              className="w-full rounded-md bg-white border border-gray-300 py-2.5 px-4 text-sm font-semibold text-gray-900 hover:bg-gray-50 shadow-sm transition disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreatingCategory || !newCategoryName.trim()}
              className="w-full rounded-md bg-pine py-2.5 px-4 text-sm font-semibold text-white hover:bg-pine-deep shadow-sm transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isCreatingCategory ? (
                <>
                  <ArrowPathIcon className="h-4 w-4 animate-spin" />
                  <span>Saving…</span>
                </>
              ) : (
                <span>Save</span>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
