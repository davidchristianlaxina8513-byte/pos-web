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

interface InventoryDbRow {
  product_id: unknown;
  quantity: unknown;
}

function parseCategory(row: CategoryDbRow): MenuCategory | null {
  if (typeof row.category_id !== 'string' || typeof row.name !== 'string') {
    return null;
  }
  return { category_id: row.category_id, name: row.name };
}

function parseItem(
  row: ProductDbRow,
  stockByProduct: Map<number, number>,
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
  return {
    product_id,
    name: row.name,
    price,
    is_available: row.is_available,
    image_url: typeof row.image_url === 'string' ? row.image_url : null,
    category_id: row.category_id,
    category_name:
      typeof categoryName === 'string' ? categoryName : 'Uncategorized',
    stock_quantity: stockByProduct.get(product_id) ?? 0,
  };
}

/**
 * Join catalog rows with inventory snapshots. Pure (no I/O) so the mapping
 * is unit-testable; `getMenu` supplies the rows.
 */
export function mapMenuItems(
  products: ProductDbRow[],
  inventory: InventoryDbRow[],
): MenuItem[] {
  const stockByProduct = new Map<number, number>();
  for (const row of inventory) {
    if (typeof row.product_id === 'number') {
      const qty = Number(row.quantity);
      if (Number.isFinite(qty)) {
        stockByProduct.set(
          row.product_id,
          (stockByProduct.get(row.product_id) ?? 0) + qty,
        );
      }
    }
  }
  const items: MenuItem[] = [];
  for (const row of products) {
    const item = parseItem(row, stockByProduct);
    if (item) items.push(item);
  }
  return items;
}

/**
 * Menu read for the POS screen. Server-only caller, staff-gated; RLS
 * (`product_read`, `category_read`, `inventory_read`) enforces cashier access.
 * Request-scoped, never cached across users (permission-adjacent data).
 */
export async function getMenu(): Promise<Menu> {
  await requireStaff();
  const supabase = await createClient();
  const [categoriesRes, productsRes, inventoryRes] = await Promise.all([
    supabase.from('category').select('category_id, name').order('name'),
    supabase
      .from('product')
      .select(
        'product_id, name, price, is_available, image_url, category_id, category(name)',
      )
      .order('name'),
    supabase.from('inventory').select('product_id, quantity'),
  ]);
  if (categoriesRes.error) throw categoriesRes.error;
  if (productsRes.error) throw productsRes.error;
  if (inventoryRes.error) throw inventoryRes.error;
  const categories: MenuCategory[] = [];
  for (const row of (categoriesRes.data ?? []) as CategoryDbRow[]) {
    const category = parseCategory(row);
    if (category) categories.push(category);
  }
  const items = mapMenuItems(
    (productsRes.data ?? []) as ProductDbRow[],
    (inventoryRes.data ?? []) as InventoryDbRow[],
  );
  return { categories, items };
}
