import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/features/auth/queries';
import { parseRole, type UserRole } from '@/features/auth/roles';

export interface StaffUser {
  user_id: string;
  username: string;
  role: UserRole;
  is_active: boolean;
}

/** Staff list. Server-only, admin-gated (`user_read_admin`). */
export async function getUsers(): Promise<StaffUser[]> {
  await requireRole('admin');
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('user')
    .select('user_id, username, role, is_active')
    .order('username');
  if (error) throw error;
  return (
    (data ?? []) as {
      user_id: unknown;
      username: unknown;
      role: unknown;
      is_active: unknown;
    }[]
  ).flatMap((row) => {
    const role = parseRole(row.role);
    if (
      typeof row.user_id !== 'string' ||
      typeof row.username !== 'string' ||
      !role
    ) {
      return [];
    }
    return [
      {
        user_id: row.user_id,
        username: row.username,
        role,
        is_active: row.is_active !== false,
      },
    ];
  });
}
