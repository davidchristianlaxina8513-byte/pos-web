'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { landingForRole, parseRole } from './roles';

/**
 * Mirrors Expo `AuthContext.login`: email+password sign-in, then role lookup
 * from the `user` table. Online-only — no offline profile cache on web.
 * Unknown roles fail closed (sign out + error, no cashier fallback).
 */
export async function signIn(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  if (!email || !password) redirect('/login?error=missing_credentials');
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error || !data.user) redirect('/login?error=invalid_credentials');
  const { data: row } = await supabase
    .from('user')
    .select('user_id, role')
    .eq('user_id', data.user.id)
    .maybeSingle();
  const role = parseRole((row as { role: unknown } | null)?.role);
  if (!role) {
    await supabase.auth.signOut();
    redirect('/login?error=unknown_role');
  }
  redirect(landingForRole(role));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
