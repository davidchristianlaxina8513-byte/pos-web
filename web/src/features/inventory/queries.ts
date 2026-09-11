import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/features/auth/queries';
import { getStockStatus, type StockStatus } from './status';

export interface InventoryItem {
  stock_id: number;
  product_id: number;
  quantity: number;
  reorder_level: number;
  par_level: number | null;
  product_name: string;
  product_category: string;
  price: number;
  is_available: boolean;
  status: StockStatus;
}

interface InventoryDbRow {
  stock_id: unknown;
  product_id: unknown;
  quantity: unknown;
  reorder_level: unknown;
  par_level: unknown;
}

interface ProductDbRow {
  product_id: unknown;
  name: unknown;
  price: unknown;
  is_available: unknown;
  category: { name: unknown } | unknown[] | null;
}

export function itemStatus(
  item: Pick<InventoryItem, 'quantity' | 'reorder_level'>,
): StockStatus {
  return getStockStatus(item.quantity, item.reorder_level);
}

function toItems(
  inventory: InventoryDbRow[],
  products: ProductDbRow[],
): InventoryItem[] {
  const byProduct = new Map<number, ProductDbRow>();
  for (const row of products) {
    if (typeof row.product_id === 'number') byProduct.set(row.product_id, row);
  }
  const items: InventoryItem[] = [];
  for (const row of inventory) {
    if (
      typeof row.stock_id !== 'number' ||
      typeof row.product_id !== 'number'
    ) {
      continue;
    }
    const product = byProduct.get(row.product_id);
    const quantity = Number(row.quantity);
    const reorderLevel = Number(row.reorder_level);
    if (!Number.isFinite(quantity) || !Number.isFinite(reorderLevel)) continue;
    const categoryName =
      product?.category && !Array.isArray(product.category)
        ? product.category.name
        : null;
    const item: InventoryItem = {
      stock_id: row.stock_id,
      product_id: row.product_id,
      quantity,
      reorder_level: reorderLevel,
      par_level:
        typeof row.par_level === 'number' || row.par_level === null
          ? row.par_level
          : null,
      product_name:
        typeof product?.name === 'string'
          ? product.name
          : `Product #${row.product_id}`,
      product_category:
        typeof categoryName === 'string' ? categoryName : 'Uncategorized',
      price: Number(product?.price ?? 0),
      is_available: product?.is_available === true,
      status: 'ok',
    };
    item.status = itemStatus(item);
    items.push(item);
  }
  return items;
}

/**
 * Admin inventory list. Server-only, admin-gated; RLS (`inventory_read`,
 * `product_read`) enforces access. Request-scoped, never cached.
 */
export async function getInventoryItems(): Promise<InventoryItem[]> {
  await requireRole('admin');
  const supabase = await createClient();
  const [inventoryRes, productsRes] = await Promise.all([
    supabase
      .from('inventory')
      .select('stock_id, product_id, quantity, reorder_level, par_level')
      .order('stock_id'),
    supabase
      .from('product')
      .select('product_id, name, price, is_available, category(name)'),
  ]);
  if (inventoryRes.error) throw inventoryRes.error;
  if (productsRes.error) throw productsRes.error;
  return toItems(
    (inventoryRes.data ?? []) as InventoryDbRow[],
    (productsRes.data ?? []) as ProductDbRow[],
  );
}

/** Single stock row for the stock-in header. Null when missing. */
export async function getInventoryItem(
  stockId: number,
): Promise<InventoryItem | null> {
  const items = await getInventoryItems();
  return items.find((item) => item.stock_id === stockId) ?? null;
}
