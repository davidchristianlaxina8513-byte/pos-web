'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/features/auth/queries';

export type StockInResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Admin stock-in. Validates like Expo (`useInventory.addStock`), then calls
 * the `adjust_stock` RPC (admin-only server-side). Movement logging and the
 * restock trigger happen inside the database.
 */
export async function stockIn(
  stockId: number,
  quantity: number,
  supplier: string | null,
): Promise<StockInResult> {
  await requireRole('admin');
  if (!Number.isInteger(stockId)) {
    return { ok: false, error: 'Unknown stock item.' };
  }
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return {
      ok: false,
      error: 'Stock-in quantity must be a whole number greater than zero.',
    };
  }
  const cleanSupplier = supplier?.trim() ? supplier.trim() : null;
  const supabase = await createClient();
  const { error } = await supabase.rpc('adjust_stock', {
    p_stock_id: stockId,
    p_quantity: quantity,
    p_supplier: cleanSupplier,
  });
  if (error) return { ok: false, error: 'Stock-in failed. Try again.' };
  revalidatePath('/admin/inventory');
  return { ok: true };
}
