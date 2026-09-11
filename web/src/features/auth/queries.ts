import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isStaffRole, landingForRole, parseRole, type UserRole } from './roles';

export interface SessionProfile {
  userId: string;
  email: string;
  role: UserRole;
}

interface UserRow {
  user_id: string;
  username: string;
  role: unknown;
  is_active: unknown;
}

/**
 * Mirrors Expo `authApi.getUserProfile`: reads the caller's own `user` row.
 * Allowed by RLS policy `user_read_own` (0003_rbac) — no migration changes.
 * Uses claims (not `getSession()` alone) per the Supabase-Next.js playbook.
 */
export async function getSessionProfile(): Promise<SessionProfile | null> {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;
  if (!userId) return null;
  const { data: authData } = await supabase.auth.getUser();
  const { data } = await supabase
    .from('user')
    .select('user_id, username, role, is_active')
    .eq('user_id', userId)
    .maybeSingle();
  const row = data as UserRow | null;
  const role = parseRole(row?.role);
  if (!row || !role || row.is_active === false) return null;
  return { userId: row.user_id, email: authData.user?.email ?? '', role };
}

/**
 * Server-side gate: unauthenticated → /login; wrong role → own landing.
 * Proxy/layout redirects stay optimistic — this is the enforcement point.
 */
export async function requireRole(role: UserRole): Promise<SessionProfile> {
  const profile = await getSessionProfile();
  if (!profile) redirect('/login');
  if (profile.role !== role) redirect(landingForRole(profile.role));
  return profile;
}

/**
 * POS gate: any staff role (cashier or admin) may sell. Unknown roles cannot
 * occur here — getSessionProfile already fails closed on them.
 */
export async function requireStaff(): Promise<SessionProfile> {
  const profile = await getSessionProfile();
  if (!profile) redirect('/login');
  if (!isStaffRole(profile.role)) redirect(landingForRole(profile.role));
  return profile;
}
