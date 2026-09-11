export type StockStatus = 'ok' | 'low' | 'critical';

export const STOCK_LABELS: Record<StockStatus, string> = {
  ok: 'In Stock',
  low: 'Low Stock',
  critical: 'Critical',
};

/**
 * Stock status, mirroring Expo `useInventory.getStatus`: zero or negative
 * is critical, at-or-below the reorder level is low, otherwise ok.
 */
export function getStockStatus(
  quantity: number,
  reorderLevel: number,
): StockStatus {
  if (quantity <= 0) return 'critical';
  if (quantity <= reorderLevel) return 'low';
  return 'ok';
}
