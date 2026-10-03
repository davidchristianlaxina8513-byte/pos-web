'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireStaff } from '@/features/auth/queries';

export async function voidTransaction(
  transactionId: string,
  reason: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireStaff();
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
      error: error.message.includes('Not authorized')
        ? 'You can void only your own sales.'
        : 'Could not void this transaction.',
    };
  for (const path of [
    '/daily-sales',
    '/admin/reports',
    '/today-products',
    '/pos',
    '/dashboard',
    '/cash-turnover',
    '/cashier-operations',
    '/admin/cashier-operations',
  ])
    revalidatePath(path);
  return { ok: true };
}
