import type { UserRole } from '@/features/auth/roles';
import { parseRole } from '@/features/auth/roles';

export interface NewStaffValues {
  username: string;
  password: string;
  role: string;
}

export interface ValidStaff {
  username: string;
  password: string;
  role: UserRole;
}

const EMAIL_LIKE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * Staff creation rules, mirroring Expo `useUsers.validatePayload`:
 * email-shaped username, password present (Supabase Auth minimum), known role.
 */
export function validateNewStaff(
  values: NewStaffValues,
): { ok: true; value: ValidStaff } | { ok: false; error: string } {
  const username = values.username.trim();
  if (!EMAIL_LIKE.test(username)) {
    return { ok: false, error: 'Enter a valid email address.' };
  }
  if (!values.password || values.password.length < 6) {
    return {
      ok: false,
      error: 'Password must be at least 6 characters.',
    };
  }
  const role = parseRole(values.role);
  if (!role) return { ok: false, error: 'Choose a role.' };
  return { ok: true, value: { username, password: values.password, role } };
}
