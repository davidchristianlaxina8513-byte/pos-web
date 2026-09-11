'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/features/auth/queries';
import { createClient } from '@/lib/supabase/server';
import { parseRestockStatus } from './restock';

export type RestockResult = { ok: true } | { ok: false; error: string };

interface ReorderRow {
  request_id: number;
  product_id: number;
  status: unknown;
  supplier: string | null;
  suggested_quantity: number;
}

interface InventoryRow {
  stock_id: number;
}

function validId(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

/**
 * Admin-only inline edit: suggested quantity / supplier on an open request.
 * Status changes never go through here — they use the guarded transitions
 * below so every move is allow-listed (see `canTransitionRestock`).
 */
export async function updateRestockRequest(
  requestId: number,
  patch: { suggested_quantity?: number; supplier?: string | null },
): Promise<RestockResult> {
  await requireRole('admin');
  if (!validId(requestId)) return { ok: false, error: 'Unknown request.' };
  const update: Record<string, string | number | null> = {};
  if (patch.suggested_quantity !== undefined) {
    if (
      !Number.isInteger(patch.suggested_quantity) ||
      patch.suggested_quantity < 0
    ) {
      return {
        ok: false,
        error:
          'Suggested quantity must be a whole number greater than or equal to zero.',
      };
    }
    update.suggested_quantity = patch.suggested_quantity;
  }
  if (patch.supplier !== undefined) {
    // Blank clears the supplier (falls into the 'Unassigned' print bucket).
    update.supplier =
      patch.supplier === null || patch.supplier.trim() === ''
        ? null
        : patch.supplier.trim();
  }
  if (Object.keys(update).length === 0) {
    return { ok: false, error: 'Nothing to save.' };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from('reorder_requests')
    .update(update)
    .eq('request_id', requestId);
  if (error) return { ok: false, error: 'Could not save the request.' };
  revalidatePath('/admin/restock');
  return { ok: true };
}

/** Admin-only: set (or clear) a product's par_level on its inventory row. */
export async function updateParLevel(
  productId: number,
  parLevel: number | null,
): Promise<RestockResult> {
  await requireRole('admin');
  if (!validId(productId)) return { ok: false, error: 'Unknown product.' };
  if (parLevel !== null && (!Number.isInteger(parLevel) || parLevel < 0)) {
    return {
      ok: false,
      error:
        'Par level must be a whole number greater than or equal to zero, or empty.',
    };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from('inventory')
    .update({ par_level: parLevel })
    .eq('product_id', productId);
  if (error) return { ok: false, error: 'Could not save the par level.' };
  revalidatePath('/admin/restock');
  return { ok: true };
}

/** Pending → ordered. Conditional write: only wins while still pending. */
export async function markRestockOrdered(
  requestId: number,
): Promise<RestockResult> {
  await requireRole('admin');
  if (!validId(requestId)) return { ok: false, error: 'Unknown request.' };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('reorder_requests')
    .update({ status: 'ordered', resolved_at: null, resolved_by: null })
    .eq('request_id', requestId)
    .eq('status', 'pending')
    .select('request_id');
  if (error) return { ok: false, error: 'Could not mark as ordered.' };
  if (!data || data.length === 0) {
    return { ok: false, error: 'Only pending requests can be ordered.' };
  }
  revalidatePath('/admin/restock');
  return { ok: true };
}

/**
 * Ordered to received, plus a real stock bump via the existing `adjust_stock`
 * RPC (same integration point as stock-in: atomic quantity increase with an
 * `in` movement, which also refreshes the request snapshots via the
 * reorder trigger).
 *
 * Concurrency: the status flip is a conditional claim (ordered to received
 * only while still ordered), so a double-click or a second admin cannot
 * double-bump stock — only the claim winner calls `adjust_stock`. If the
 * RPC then fails, the claim is reverted to ordered.
 *
 * Note: the stock bump fires the reorder trigger. A partial delivery that
 * leaves stock at/below the reorder level therefore surfaces a follow-up
 * pending request for the remainder — that is the trigger's documented
 * source-of-truth behavior, not a duplicate.
 */
export async function markRestockReceived(
  requestId: number,
  quantity: number,
): Promise<RestockResult> {
  const profile = await requireRole('admin');
  if (!validId(requestId)) return { ok: false, error: 'Unknown request.' };
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return {
      ok: false,
      error: 'Received quantity must be a whole number greater than zero.',
    };
  }
  const supabase = await createClient();
  const { data: rowData, error: rowError } = await supabase
    .from('reorder_requests')
    .select('request_id, product_id, status, supplier, suggested_quantity')
    .eq('request_id', requestId)
    .maybeSingle();
  if (rowError || !rowData) {
    return { ok: false, error: 'Request not found.' };
  }
  const row = rowData as ReorderRow;
  if (parseRestockStatus(row.status) !== 'ordered') {
    return { ok: false, error: 'Only ordered requests can be received.' };
  }
  const { data: invData, error: invError } = await supabase
    .from('inventory')
    .select('stock_id')
    .eq('product_id', row.product_id)
    .maybeSingle();
  if (invError || !invData) {
    return { ok: false, error: 'No inventory row for this product.' };
  }
  const stockId = (invData as InventoryRow).stock_id;

  const claimedAt = new Date().toISOString();
  const { data: claimed, error: claimError } = await supabase
    .from('reorder_requests')
    .update({
      status: 'received',
      resolved_at: claimedAt,
      resolved_by: profile.userId,
    })
    .eq('request_id', requestId)
    .eq('status', 'ordered')
    .select('request_id');
  if (claimError || !claimed || claimed.length === 0) {
    return { ok: false, error: 'This request was already handled.' };
  }

  const { error: rpcError } = await supabase.rpc('adjust_stock', {
    p_stock_id: stockId,
    p_quantity: quantity,
    p_supplier: row.supplier,
  });
  if (rpcError) {
    await supabase
      .from('reorder_requests')
      .update({ status: 'ordered', resolved_at: null, resolved_by: null })
      .eq('request_id', requestId);
    return { ok: false, error: 'Stock update failed. Try again.' };
  }
  revalidatePath('/admin/restock');
  return { ok: true };
}

/**
 * Pending/ordered to cancelled with a mandatory reason (mirrors the
 * void-reason pattern; enforced again by `chk_reorder_cancel_reason`).
 */
export async function markRestockCancelled(
  requestId: number,
  reason: string,
): Promise<RestockResult> {
  const profile = await requireRole('admin');
  if (!validId(requestId)) return { ok: false, error: 'Unknown request.' };
  const cleanReason = reason.trim();
  if (cleanReason.length === 0) {
    return { ok: false, error: 'A cancel reason is required.' };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('reorder_requests')
    .update({
      status: 'cancelled',
      cancel_reason: cleanReason,
      resolved_at: new Date().toISOString(),
      resolved_by: profile.userId,
    })
    .eq('request_id', requestId)
    .in('status', ['pending', 'ordered'])
    .select('request_id');
  if (error) return { ok: false, error: 'Could not cancel the request.' };
  if (!data || data.length === 0) {
    return {
      ok: false,
      error: 'Only pending or ordered requests can be cancelled.',
    };
  }
  revalidatePath('/admin/restock');
  return { ok: true };
}
