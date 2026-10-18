'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireStaff } from '@/features/auth/queries';

export async function voidTransaction(
  transactionId: string,
  reason: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const profile = await requireStaff();
  if (profile.role !== 'admin') {
    return {
      ok: false,
      error:
        'Only managers or supervisors are authorized to void transactions.',
    };
  }
  if (!transactionId || !reason.trim())
    return { ok: false, error: 'A void reason is required.' };
  const supabase = await createClient();
  const { error } = await supabase.rpc('void_sale', {
    p_transaction_id: transactionId,
    p_reason: reason.trim(),
  });
  if (error)
    return {
      ok: false,
      error: error.message || 'Could not void this transaction.',
    };
  for (const path of [
    '/daily-sales',
    '/admin/reports',
    '/today-products',
    '/pos',
    `/pos/receipt/${transactionId}`,
    '/dashboard',
    '/cash-turnover',
    '/cashier-operations',
    '/admin/cashier-operations',
  ])
    revalidatePath(path);
  return { ok: true };
}
