'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/features/auth/queries';
import { validateNewStaff, type NewStaffValues } from './validate';

export type UsersResult = { ok: true } | { ok: false; error: string };

function edgeErrorMessage(raw: unknown): string {
  if (typeof raw === 'object' && raw !== null && 'message' in raw) {
    const message = (raw as { message: unknown }).message;
    if (typeof message === 'string' && message) return message;
  }
  return 'Could not create the account. Try again.';
}

/**
 * Staff creation via the `create-user` edge function (same as mobile:
 * Auth user + `user` profile row). The function re-verifies admin via
 * `get_app_role` on the caller's JWT — this gate is defense in depth.
 */
export async function createStaff(
  values: NewStaffValues,
): Promise<UsersResult> {
  const profile = await requireRole('admin');
  const validation = validateNewStaff(values);
  if (!validation.ok) return { ok: false, error: validation.error };
  if (validation.value.username === profile.email) {
    return { ok: false, error: 'That account already exists.' };
  }
  const supabase = await createClient();
  const { error } = await supabase.functions.invoke('create-user', {
    body: validation.value,
  });
  if (error) return { ok: false, error: edgeErrorMessage(error) };
  revalidatePath('/admin/users');
  return { ok: true };
}

/** Enable/disable via the admin-only `set_user_active` RPC. */
export async function setStaffActive(
  userId: string,
  isActive: boolean,
): Promise<UsersResult> {
  const profile = await requireRole('admin');
  if (userId === profile.userId) {
    return { ok: false, error: 'You cannot change your own account.' };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc('set_user_active', {
    p_user_id: userId,
    p_active: isActive,
  });
  if (error) return { ok: false, error: 'Could not update. Try again.' };
  revalidatePath('/admin/users');
  return { ok: true };
}
