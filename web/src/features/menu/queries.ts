import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/features/auth/queries';
import { getMenu } from '@/features/pos/queries';
import type { MenuCategory, MenuItem } from '@/features/pos/types';

export const UNCATEGORIZED = 'Uncategorized';

export interface EditableProduct extends MenuItem {
  par_level: number | null;
}

/** Full catalog for management (includes unavailable items). */
export async function getManagedMenu(): Promise<{
  categories: MenuCategory[];
  items: MenuItem[];
}> {
  await requireRole('admin');
  return getMenu();
}

/** Categories for pickers, admin-gated. */
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

/** One product with its par level for the edit form. Null when missing. */
export async function getEditableProduct(
  productId: number,
): Promise<EditableProduct | null> {
  await requireRole('admin');
  const menu = await getMenu();
  const item = menu.items.find((entry) => entry.product_id === productId);
  if (!item) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from('inventory')
    .select('par_level')
    .eq('product_id', productId)
    .maybeSingle();
  const par = (data as { par_level: unknown } | null)?.par_level;
  return {
    ...item,
    par_level: typeof par === 'number' ? par : null,
  };
}
