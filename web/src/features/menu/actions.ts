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
  revalidatePath('/menu');
  revalidatePath('/pos');
  revalidatePath('/today-products');
}

function storagePath(url: string | null): string | null {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${IMAGE_BUCKET}/`;
  const index = url.indexOf(marker);
  if (index >= 0) return url.slice(index + marker.length);
  return !url.includes('://') ? url : null;
}

export async function createProduct(input: {
  name: string;
  category_id: string;
  priceText: string;
  defaultQuotaText: string;
  image_url: string | null;
}): Promise<MenuResult> {
  await requireRole('admin');
  const validation = validateProduct(input);
  if (!validation.ok) return { ok: false, error: validation.error };
  const supabase = await createClient();
  const { error } = await supabase.from('product').insert({
    name: validation.value.name,
    category_id: validation.value.category_id,
    price: validation.value.price,
    daily_quota_limit: validation.value.dailyQuotaLimit,
    is_available: true,
    image_url: input.image_url,
  });
  if (error) return { ok: false, error: 'Could not save product.' };
  revalidateMenu();
  return { ok: true };
}

export async function updateProduct(input: {
  product_id: number;
  name: string;
  category_id: string;
  priceText: string;
  defaultQuotaText: string;
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
  if (error) return { ok: false, error: 'Could not save product.' };
  const { error: quotaError } = await supabase.rpc(
    'set_default_product_quota',
    {
      p_product_id: input.product_id,
      p_new_quota: validation.value.dailyQuotaLimit,
      p_reason: 'Product settings updated',
    },
  );
  if (quotaError) return { ok: false, error: 'Could not save default quota.' };
  const oldPath = storagePath(
    typeof current?.image_url === 'string' ? current.image_url : null,
  );
  const newPath = storagePath(input.image_url);
  if (oldPath && oldPath !== newPath)
    await supabase.storage.from(IMAGE_BUCKET).remove([oldPath]);
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
  const { error } = await supabase
    .from('product')
    .delete()
    .eq('product_id', productId);
  if (error)
    return {
      ok: false,
      error:
        'Products with sales history cannot be deleted. Hide the product instead.',
    };
  const oldPath = storagePath(
    typeof current?.image_url === 'string' ? current.image_url : null,
  );
  if (oldPath) await supabase.storage.from(IMAGE_BUCKET).remove([oldPath]);
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
  if (error) return { ok: false, error: 'Could not save category.' };
  revalidateMenu();
  return { ok: true };
}

export async function deleteCategory(categoryId: string): Promise<MenuResult> {
  await requireRole('admin');
  const supabase = await createClient();
  const { data: target } = await supabase
    .from('category')
    .select('name')
    .eq('category_id', categoryId)
    .maybeSingle();
  if (!target) return { ok: false, error: 'Category not found.' };
  if (target.name === UNCATEGORIZED)
    return { ok: false, error: `Cannot delete "${UNCATEGORIZED}".` };
  const { data: fallback } = await supabase
    .from('category')
    .upsert({ name: UNCATEGORIZED }, { onConflict: 'name' })
    .select('category_id')
    .single();
  if (!fallback) return { ok: false, error: 'Could not delete category.' };
  await supabase
    .from('product')
    .update({ category_id: fallback.category_id })
    .eq('category_id', categoryId);
  const { error } = await supabase
    .from('category')
    .delete()
    .eq('category_id', categoryId);
  if (error) return { ok: false, error: 'Could not delete category.' };
  revalidateMenu();
  return { ok: true };
}

export async function uploadProductImage(
  formData: FormData,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  await requireRole('admin');
  const file = formData.get('image');
  if (!(file instanceof File) || file.size === 0)
    return { ok: false, error: 'Choose an image file.' };
  if (!file.type.startsWith('image/') || file.size > MAX_IMAGE_BYTES)
    return { ok: false, error: 'Choose an image up to 5 MB.' };
  const safeBase = file.name.replace(/[^a-zA-Z0-9.-]/g, '') || 'product';
  const path = `${crypto.randomUUID()}-${safeBase}`;
  const supabase = await createClient();
  const { error } = await supabase.storage
    .from(IMAGE_BUCKET)
    .upload(path, await file.arrayBuffer(), { contentType: file.type });
  if (error) return { ok: false, error: 'Upload failed.' };
  return {
    ok: true,
    url: supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl,
  };
}
