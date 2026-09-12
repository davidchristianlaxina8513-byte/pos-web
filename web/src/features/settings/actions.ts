'use server';

import { createClient } from '@/lib/supabase/server';

export type PasswordResult = { ok: true } | { ok: false; error: string };

/**
 * Password change for the signed-in staff member. Backed by Supabase Auth
 * (`updateUser` acts on the session user) — real functionality, not a
 * placeholder. Never exercised by e2e: rotating the admin password would
 * break every other smoke test.
 */
export async function updatePassword(input: {
  password: string;
}): Promise<PasswordResult> {
  if (input.password.length < 6) {
    return { ok: false, error: 'Password must be at least 6 characters.' };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: input.password,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
