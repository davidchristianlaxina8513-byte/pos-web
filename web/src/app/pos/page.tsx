import Link from 'next/link';
import { requireStaff } from '@/features/auth/queries';
import { getMenu } from '@/features/pos/queries';
import { PosScreen } from '@/features/pos/components/PosScreen';
import { StaffShell } from '@/components/layout/staff-shell';

/** POS: menu → cart → checkout for cashiers and admins. */
export default async function PosPage() {
  const profile = await requireStaff();
  const menu = await getMenu();
  return (
    <StaffShell
      email={profile.email}
      role={profile.role}
      title="Point of sale"
      actions={
        profile.role === 'admin' ? (
          <Link
            href="/admin"
            className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold shadow-soft"
          >
            Dashboard
          </Link>
        ) : null
      }
    >
      <PosScreen menu={menu} />
    </StaffShell>
  );
}
