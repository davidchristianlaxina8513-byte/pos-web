/**
 * Staff roles from the `user` table. Unknown roles fail closed.
 */
export type UserRole = 'admin' | 'cashier';

export function landingForRole(role: UserRole): '/dashboard' | '/admin' {
  return role === 'admin' ? '/admin' : '/dashboard';
}

export function parseRole(value: unknown): UserRole | null {
  return value === 'admin' || value === 'cashier' ? value : null;
}

/**
 * Both staff roles can sell through the POS.
 */
export function isStaffRole(role: UserRole): boolean {
  return role === 'admin' || role === 'cashier';
}

const ALLOWED_DESTINATIONS = ['/', '/pos', '/admin', '/dashboard'] as const;

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
