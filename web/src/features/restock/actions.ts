'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireRole } from '@/features/auth/queries';
import { createClient } from '@/lib/supabase/server';
import { parseRestockStatus } from './queries';

export interface RestockPatch {
  suggested_quantity?: number;
  supplier?: string | null;
  status?: 'ordered' | 'received' | 'cancelled' | 'pending';
}

function validatePatch(patch: RestockPatch): string | null {
  if (patch.suggested_quantity !== undefined) {
    if (
      !Number.isInteger(patch.suggested_quantity) ||
      patch.suggested_quantity < 0
    ) {
      return 'Suggested quantity must be a whole number greater than or equal to zero.';
    }
  }
  if (
    patch.supplier !== undefined &&
    patch.supplier !== null &&
    patch.supplier.trim().length === 0
  ) {
    return 'Supplier must be a name or empty.';
  }
  if (patch.status !== undefined && !parseRestockStatus(patch.status)) {
    return 'Unknown status.';
  }
  return null;
}

/** Admin-only update: quantity / supplier / status. Terminal statuses stamp resolved_at/by; reopening clears them. */
export async function updateRestockRequest(
  requestId: number,
  patch: RestockPatch,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const profile = await requireRole('admin');
  if (!Number.isInteger(requestId) || requestId <= 0) {
    return { ok: false, error: 'Unknown request.' };
  }
  const invalid = validatePatch(patch);
  if (invalid) return { ok: false, error: invalid };
  const supabase = await createClient();
  const update: Record<string, string | number | null> = {};
  if (patch.suggested_quantity !== undefined)
    update.suggested_quantity = patch.suggested_quantity;
  if (patch.supplier !== undefined) {
    update.supplier =
      patch.supplier === null || patch.supplier.trim() === ''
        ? null
        : patch.supplier.trim();
  }
  if (patch.status !== undefined) {
    update.status = patch.status;
    if (patch.status === 'received' || patch.status === 'cancelled') {
      update.resolved_at = new Date().toISOString();
      update.resolved_by = profile.userId;
    } else {
      update.resolved_at = null;
      update.resolved_by = null;
    }
  }
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
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireRole('admin');
  if (!Number.isInteger(productId) || productId <= 0) {
    return { ok: false, error: 'Unknown product.' };
  }
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

/** Form adapters: parse FormData, delegate to the validated cores, bounce with an error code on failure (same pattern as the login actions). */
export async function updateQuantityFromForm(
  requestId: number,
  formData: FormData,
): Promise<void> {
  const raw = String(formData.get('suggested_quantity') ?? '').trim();
  const quantity = raw === '' ? NaN : Number(raw);
  const result = await updateRestockRequest(requestId, {
    suggested_quantity: Number.isInteger(quantity) ? quantity : -1,
  });
  if (!result.ok) redirect('/admin/restock?error=save_failed');
}

export async function updateSupplierFromForm(
  requestId: number,
  formData: FormData,
): Promise<void> {
  const supplier = String(formData.get('supplier') ?? '');
  const result = await updateRestockRequest(requestId, { supplier });
  if (!result.ok) redirect('/admin/restock?error=save_failed');
}

export async function updateParFromForm(
  productId: number,
  formData: FormData,
): Promise<void> {
  const raw = String(formData.get('par_level') ?? '').trim();
  const parLevel = raw === '' ? null : Number(raw);
  const result = await updateParLevel(
    productId,
    parLevel === null || Number.isInteger(parLevel) ? parLevel : -1,
  );
  if (!result.ok) redirect('/admin/restock?error=save_failed');
}

/** Status buttons: bound as `markRestockOrdered.bind(null, id)` — zero-arg form actions returning void. */
export async function markRestockOrdered(requestId: number): Promise<void> {
  const result = await updateRestockRequest(requestId, { status: 'ordered' });
  if (!result.ok) redirect('/admin/restock?error=save_failed');
}

export async function markRestockReceived(requestId: number): Promise<void> {
  const result = await updateRestockRequest(requestId, { status: 'received' });
  if (!result.ok) redirect('/admin/restock?error=save_failed');
}

export async function markRestockCancelled(requestId: number): Promise<void> {
  const result = await updateRestockRequest(requestId, { status: 'cancelled' });
  if (!result.ok) redirect('/admin/restock?error=save_failed');
}
