'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/features/auth/queries';

export type ShiftResult = { ok: true } | { ok: false; error: string };
function refresh(): void {
  revalidatePath('/dashboard');
  revalidatePath('/my-shift');
  revalidatePath('/cash-turnover');
  revalidatePath('/admin/cash-turnovers');
  revalidatePath('/cashier-operations');
  revalidatePath('/admin/cashier-operations');
}

export async function openShift(
  startingCash: number,
  notes: string,
): Promise<ShiftResult> {
  await requireRole('cashier');
  if (!Number.isFinite(startingCash) || startingCash < 0)
    return { ok: false, error: 'Enter a valid starting cash amount.' };
  const supabase = await createClient();
  const { error } = await supabase.rpc('open_cashier_shift', {
    p_starting_cash: startingCash,
    p_notes: notes.trim() || null,
  });
  if (error)
    return {
      ok: false,
      error: error.message.includes('already exists')
        ? 'You already have an open shift.'
        : 'Could not open shift.',
    };
  refresh();
  return { ok: true };
}

export async function submitTurnover(
  shiftId: string,
  countedCash: number,
  notes: string,
): Promise<ShiftResult> {
  await requireRole('cashier');
  if (!shiftId || !Number.isFinite(countedCash) || countedCash < 0)
    return { ok: false, error: 'Enter a valid counted cash amount.' };
  const supabase = await createClient();
  const { error } = await supabase.rpc('submit_cash_turnover', {
    p_shift_id: shiftId,
    p_counted_cash: countedCash,
    p_notes: notes.trim() || null,
  });
  if (error)
    return {
      ok: false,
      error: error.message.includes('discrepancy reason')
        ? 'Enter a reason for the cash difference.'
        : 'Could not submit cash turnover.',
    };
  refresh();
  return { ok: true };
}

export async function verifyTurnover(
  turnoverId: string,
  status: 'verified' | 'flagged',
  note: string,
): Promise<ShiftResult> {
  await requireRole('admin');
  const supabase = await createClient();
  const { error } = await supabase.rpc('verify_cash_turnover', {
    p_turnover_id: turnoverId,
    p_status: status,
    p_note: note.trim() || null,
  });
  if (error) return { ok: false, error: 'Could not verify cash turnover.' };
  refresh();
  return { ok: true };
}
