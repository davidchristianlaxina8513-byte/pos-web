import { createClient } from '@/lib/supabase/server';
import { requireStaff } from '@/features/auth/queries';
import { type Menu, type MenuCategory, type MenuItem } from './types';

interface CategoryDbRow {
  category_id: unknown;
  name: unknown;
}

interface ProductDbRow {
  product_id: unknown;
  name: unknown;
  price: unknown;
  is_available: unknown;
  image_url: unknown;
  category_id: unknown;
  category: { name: unknown } | unknown[] | null;
}

interface QuotaDbRow {
  product_id: unknown;
  today_quota_limit: unknown;
  sold_quantity: unknown;
  remaining_quantity: unknown;
}

interface ParsedQuota {
  today_quota_limit: number | null;
  sold_quantity: number;
  remaining_quantity: number | null;
}

function nullableQuota(value: unknown): number | null | undefined {
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined;
}

function parseCategory(row: CategoryDbRow): MenuCategory | null {
  if (typeof row.category_id !== 'string' || typeof row.name !== 'string') {
    return null;
  }
  return { category_id: row.category_id, name: row.name };
}

function parseItem(
  row: ProductDbRow,
  quotaByProduct: Map<number, ParsedQuota>,
): MenuItem | null {
  const product_id = typeof row.product_id === 'number' ? row.product_id : null;
  const price = Number(row.price);
  if (
    product_id === null ||
    typeof row.name !== 'string' ||
    !Number.isFinite(price) ||
    typeof row.is_available !== 'boolean' ||
    typeof row.category_id !== 'string'
  ) {
    return null;
  }
  const categoryName =
    row.category && !Array.isArray(row.category) ? row.category.name : null;
  const quota = quotaByProduct.get(product_id);
  return {
    product_id,
    name: row.name,
    price,
    is_available: row.is_available,
    image_url: typeof row.image_url === 'string' ? row.image_url : null,
    category_id: row.category_id,
    category_name:
      typeof categoryName === 'string' ? categoryName : 'Uncategorized',
    today_quota_limit: quota ? quota.today_quota_limit : 0,
    sold_quantity: Number(quota?.sold_quantity ?? 0),
    remaining_quantity: quota ? quota.remaining_quantity : 0,
  };
}

/**
 * Join catalog rows with today's quota snapshots. Pure (no I/O) so the mapping
 * is unit-testable; `getMenu` supplies the rows.
 */
export function mapMenuItems(
  products: ProductDbRow[],
  quotas: QuotaDbRow[],
): MenuItem[] {
  const quotaByProduct = new Map<number, ParsedQuota>();
  for (const row of quotas) {
    if (typeof row.product_id === 'number') {
      const todayQuota = nullableQuota(row.today_quota_limit);
      const sold = Number(row.sold_quantity);
      const remaining = nullableQuota(row.remaining_quantity);
      if (
        todayQuota !== undefined &&
        remaining !== undefined &&
        Number.isFinite(sold)
      ) {
        quotaByProduct.set(row.product_id, {
          today_quota_limit: todayQuota,
          sold_quantity: sold,
          remaining_quantity: remaining,
        });
      }
    }
  }
  const items: MenuItem[] = [];
  for (const row of products) {
    const item = parseItem(row, quotaByProduct);
    if (item) items.push(item);
  }
  return items;
}

/**
 * Menu read for the POS screen. Server-only caller, staff-gated; RLS
 * (`product_read`, `category_read`) enforces cashier access.
 * Request-scoped, never cached across users (permission-adjacent data).
 */
export async function getMenu(): Promise<Menu> {
  await requireStaff();
  const supabase = await createClient();
  const [categoriesRes, productsRes, quotasRes] = await Promise.all([
    supabase.from('category').select('category_id, name').order('name'),
    supabase
      .from('product')
      .select(
        'product_id, name, price, is_available, image_url, category_id, category(name)',
      )
      .order('name'),
    supabase.rpc('get_today_product_quotas'),
  ]);
  if (categoriesRes.error) throw categoriesRes.error;
  if (productsRes.error) throw productsRes.error;
  if (quotasRes.error) throw quotasRes.error;
  const categories: MenuCategory[] = [];
  for (const row of (categoriesRes.data ?? []) as CategoryDbRow[]) {
    const category = parseCategory(row);
    if (category) categories.push(category);
  }
  const items = mapMenuItems(
    (productsRes.data ?? []) as ProductDbRow[],
    (quotasRes.data ?? []) as QuotaDbRow[],
  );
  return { categories, items };
}
