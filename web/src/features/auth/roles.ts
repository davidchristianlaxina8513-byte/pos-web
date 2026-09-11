/**
 * Staff roles, mirroring the Expo app (`src/types/entities.ts` → `UserRole`,
 * `src/context/AuthContext.tsx`). The web reads the same `user` table row;
 * unlike Expo it fails closed on unknown roles (no cashier fallback).
 */
export type UserRole = 'admin' | 'cashier';

export function landingForRole(role: UserRole): '/pos' | '/admin' {
  return role === 'admin' ? '/admin' : '/pos';
}

export function parseRole(value: unknown): UserRole | null {
  return value === 'admin' || value === 'cashier' ? value : null;
}

/**
 * POS sellers: both staff roles can sell (capability matrix — admin sees the
 * same Menu(POS) entry as cashier in the Expo app).
 */
export function isStaffRole(role: UserRole): boolean {
  return role === 'admin' || role === 'cashier';
}

const ALLOWED_DESTINATIONS = ['/', '/pos', '/admin'] as const;

type AppDestination = (typeof ALLOWED_DESTINATIONS)[number];

/** Allow-list for post-login destinations: app-relative paths only. */
export function isAppRelativeDestination(
  value: unknown,
): value is AppDestination {
  return (
    typeof value === 'string' &&
    (ALLOWED_DESTINATIONS as readonly string[]).includes(value)
  );
}

export function resolveCallbackDestination(value: unknown): AppDestination {
  return isAppRelativeDestination(value) ? value : '/';
}
