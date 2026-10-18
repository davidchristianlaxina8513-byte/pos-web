import Link from 'next/link';
import { requireRole } from '@/features/auth/queries';
import { getAllShifts, getAllTurnovers } from '@/features/shifts/queries';
import { AdminCashierOperationsManager } from '@/components/modules/shifts';
import { StaffShell } from '@/components/layout/staff-shell';
import {
  ArrowRightIcon,
  ShoppingCartIcon,
} from '@/components/common/hero-icons';

export default async function AdminCashierOperationsPage() {
  const [profile, shifts, turnovers] = await Promise.all([
    requireRole('admin'),
    getAllShifts(),
    getAllTurnovers(),
  ]);

  return (
    <StaffShell
      email={profile.email}
      role={profile.role}
      title="Cashier Operations"
      subtitle="Review cashier shifts, monitor drawer balances, and verify cash turnover submissions."
      breadcrumbs={[{ name: 'Cashier Operations', current: true }]}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/pos"
            className="action-focus inline-flex h-10 items-center justify-center gap-2 rounded-md bg-pine px-4 text-sm font-semibold text-surface shadow-xs transition hover:bg-pine-deep"
          >
            <ShoppingCartIcon className="h-4 w-4" />
            <span>Open Register</span>
            <ArrowRightIcon className="h-3.5 w-3.5" />
          </Link>
        </div>
      }
      fullWidth={true}
    >
      <AdminCashierOperationsManager shifts={shifts} turnovers={turnovers} />
    </StaffShell>
  );
}
