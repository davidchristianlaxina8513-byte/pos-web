'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireRole, requireStaff } from '@/features/auth/queries';

export type QuotaResult = { ok: true } | { ok: false; error: string };

function revalidateQuotaViews(): void {
  revalidatePath('/today-products');
  revalidatePath('/dashboard');
  revalidatePath('/pos');
  revalidatePath('/admin');
}

export async function changeTodayQuota(
  productId: number,
  newQuota: number | null,
  reason: string,
): Promise<QuotaResult> {
  await requireStaff();
  if (
    !Number.isInteger(productId) ||
    (newQuota !== null && (!Number.isInteger(newQuota) || newQuota < 0))
  ) {
    return { ok: false, error: 'Enter a valid whole-number quota.' };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc('set_today_product_quota', {
    p_product_id: productId,
    p_new_quota: newQuota,
    p_reason: reason.trim() || null,
  });
  if (error) {
    if (error.message.includes('lower than the quantity already sold')) {
      return { ok: false, error: error.message };
    }
    return { ok: false, error: "Could not update today's quota." };
  }
  revalidateQuotaViews();
  return { ok: true };
}

export async function changeDefaultQuota(
  productId: number,
  newQuota: number | null,
  reason: string,
): Promise<QuotaResult> {
  await requireRole('admin');
  if (
    !Number.isInteger(productId) ||
    (newQuota !== null && (!Number.isInteger(newQuota) || newQuota < 0))
  ) {
    return { ok: false, error: 'Enter a valid whole-number default quota.' };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc('set_default_product_quota', {
    p_product_id: productId,
    p_new_quota: newQuota,
    p_reason: reason.trim() || null,
  });
  if (error) return { ok: false, error: 'Could not update the default quota.' };
  revalidateQuotaViews();
  return { ok: true };
}
