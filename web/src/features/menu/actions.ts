'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/features/auth/queries';
import {
  validateCategoryName,
  validateProduct,
  UNCATEGORIZED,
} from './validate';

const IMAGE_BUCKET = 'product-images';
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export type MenuResult = { ok: true } | { ok: false; error: string };

function revalidateMenu(): void {
  revalidatePath('/admin/menu');
  revalidatePath('/pos');
}

function storagePath(url: string | null): string | null {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${IMAGE_BUCKET}/`;
  const index = url.indexOf(marker);
  if (index >= 0) return url.slice(index + marker.length);
  if (!url.includes('://')) return url;
  return null;
}

/**
 * Approved deviation from Expo: new products get an inventory row
 * (quantity 0) so they are immediately stockable and sellable. Expo leaves
 * new products row-less, which makes `process_sale` throw.
 */
async function ensureInventoryRow(productId: number): Promise<void> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('inventory')
    .select('stock_id')
    .eq('product_id', productId)
    .maybeSingle();
  if (!data) {
    await supabase.from('inventory').insert({
      product_id: productId,
      quantity: 0,
      reorder_level: 0,
    });
  }
}

async function writeParLevel(
  productId: number,
  parLevel: number | null,
): Promise<void> {
  await ensureInventoryRow(productId);
  const supabase = await createClient();
  await supabase
    .from('inventory')
    .update({ par_level: parLevel })
    .eq('product_id', productId);
}

export async function createProduct(input: {
  name: string;
  category_id: string;
  priceText: string;
  image_url: string | null;
}): Promise<MenuResult> {
  await requireRole('admin');
  const validation = validateProduct({ ...input, parText: '' });
  if (!validation.ok) return { ok: false, error: validation.error };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('product')
    .insert({
      name: validation.value.name,
      category_id: validation.value.category_id,
      price: validation.value.price,
      is_available: true,
      image_url: input.image_url,
    })
    .select('product_id')
    .single();
  if (error || !data) return { ok: false, error: 'Could not save. Try again.' };
  await ensureInventoryRow((data as { product_id: number }).product_id);
  revalidateMenu();
  return { ok: true };
}

export async function updateProduct(input: {
  product_id: number;
  name: string;
  category_id: string;
  priceText: string;
  parText: string;
  is_available: boolean;
  image_url: string | null;
}): Promise<MenuResult> {
  await requireRole('admin');
  const validation = validateProduct(input);
  if (!validation.ok) return { ok: false, error: validation.error };
  const supabase = await createClient();
  const { data: current } = await supabase
    .from('product')
    .select('image_url')
    .eq('product_id', input.product_id)
    .maybeSingle();
  const { error } = await supabase
    .from('product')
    .update({
      name: validation.value.name,
      category_id: validation.value.category_id,
      price: validation.value.price,
      is_available: input.is_available,
      image_url: input.image_url,
    })
    .eq('product_id', input.product_id);
  if (error) return { ok: false, error: 'Could not save. Try again.' };
  await writeParLevel(input.product_id, validation.value.parLevel);
  const oldPath = storagePath(
    (current as { image_url: unknown } | null)?.image_url as string | null,
  );
  const newPath = storagePath(input.image_url);
  if (oldPath && oldPath !== newPath) {
    await supabase.storage.from(IMAGE_BUCKET).remove([oldPath]);
  }
  revalidateMenu();
  return { ok: true };
}

export async function deleteProduct(productId: number): Promise<MenuResult> {
  await requireRole('admin');
  const supabase = await createClient();
  const { data: current } = await supabase
    .from('product')
    .select('image_url')
    .eq('product_id', productId)
    .maybeSingle();
  await supabase.from('inventory').delete().eq('product_id', productId);
  const { error } = await supabase
    .from('product')
    .delete()
    .eq('product_id', productId);
  if (error) return { ok: false, error: 'Could not delete. Try again.' };
  const oldPath = storagePath(
    (current as { image_url: unknown } | null)?.image_url as string | null,
  );
  if (oldPath) {
    await supabase.storage.from(IMAGE_BUCKET).remove([oldPath]);
  }
  revalidateMenu();
  return { ok: true };
}

export async function createCategory(name: string): Promise<MenuResult> {
  await requireRole('admin');
  const validation = validateCategoryName(name);
  if (!validation.ok) return { ok: false, error: validation.error };
  const supabase = await createClient();
  const { error } = await supabase
    .from('category')
    .insert({ name: validation.value });
  if (error) return { ok: false, error: 'Could not save. Try again.' };
  revalidateMenu();
  return { ok: true };
}

/**
 * Deletes a category after moving its products to Uncategorized
 * (mirrors Expo `deleteCategory`). The Uncategorized row itself is refused.
 */
export async function deleteCategory(categoryId: string): Promise<MenuResult> {
  await requireRole('admin');
  const supabase = await createClient();
  const { data: target } = await supabase
    .from('category')
    .select('name')
    .eq('category_id', categoryId)
    .maybeSingle();
  if (!target) return { ok: false, error: 'Category not found.' };
  if ((target as { name: string }).name === UNCATEGORIZED) {
    return { ok: false, error: `Cannot delete "${UNCATEGORIZED}".` };
  }
  const { data: fallback } = await supabase
    .from('category')
    .upsert({ name: UNCATEGORIZED }, { onConflict: 'name' })
    .select('category_id')
    .single();
  if (!fallback) return { ok: false, error: 'Could not delete. Try again.' };
  await supabase
    .from('product')
    .update({
      category_id: (fallback as { category_id: string }).category_id,
    })
    .eq('category_id', categoryId);
  const { error } = await supabase
    .from('category')
    .delete()
    .eq('category_id', categoryId);
  if (error) return { ok: false, error: 'Could not delete. Try again.' };
  revalidateMenu();
  return { ok: true };
}

/** Uploads a product photo to the public bucket. Returns its public URL. */
export async function uploadProductImage(
  formData: FormData,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  await requireRole('admin');
  const file = formData.get('image');
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: 'Choose an image file.' };
  }
  if (!file.type.startsWith('image/')) {
    return { ok: false, error: 'Only image files are allowed.' };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, error: 'Images must be 5 MB or smaller.' };
  }
  const ext = file.type.split('/')[1] ?? 'jpg';
  const safeBase = file.name.replace(/[^a-zA-Z0-9.-]/g, '') || 'product';
  const path = `${crypto.randomUUID()}-${safeBase}.${ext}`;
  const supabase = await createClient();
  const { error } = await supabase.storage
    .from(IMAGE_BUCKET)
    .upload(path, await file.arrayBuffer(), { contentType: file.type });
  if (error) return { ok: false, error: 'Upload failed. Try again.' };
  const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path);
  return { ok: true, url: data.publicUrl };
}
