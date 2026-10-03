import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/features/auth/queries';
import { getMenu } from '@/features/pos/queries';
import type { MenuCategory, MenuItem } from '@/features/pos/types';

export interface EditableProduct extends MenuItem {
  daily_quota_limit: number | null;
}

export async function getManagedMenu(): Promise<{
  categories: MenuCategory[];
  items: MenuItem[];
}> {
  await requireRole('admin');
  return getMenu();
}

export async function getCategories(): Promise<MenuCategory[]> {
  await requireRole('admin');
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('category')
    .select('category_id, name')
    .order('name');
  if (error) throw error;
  return ((data ?? []) as { category_id: unknown; name: unknown }[]).flatMap(
    (row) =>
      typeof row.category_id === 'string' && typeof row.name === 'string'
        ? [{ category_id: row.category_id, name: row.name }]
        : [],
  );
}

export async function getEditableProduct(
  productId: number,
): Promise<EditableProduct | null> {
  await requireRole('admin');
  const supabase = await createClient();
  const [menu, productRes] = await Promise.all([
    getMenu(),
    supabase
      .from('product')
      .select('daily_quota_limit')
      .eq('product_id', productId)
      .maybeSingle(),
  ]);
  const item = menu.items.find((entry) => entry.product_id === productId);
  if (!item) return null;
  return {
    ...item,
    daily_quota_limit:
      productRes.data?.daily_quota_limit === null
        ? null
        : Number(productRes.data?.daily_quota_limit ?? 0),
  };
}
