import Link from 'next/link';
import { requireStaff } from '@/features/auth/queries';
import {
  getCurrentShift,
  getMyShifts,
  getMyTurnovers,
} from '@/features/shifts/queries';
import { CashierOperationsManager } from '@/components/modules/shifts/CashierOperationsManager';
import { StaffShell } from '@/components/layout/staff-shell';
import {
  ArrowRightIcon,
  ShoppingCartIcon,
} from '@/components/common/hero-icons';

export const dynamic = 'force-dynamic';

export default async function CashierOperationsPage() {
  const [profile, shift, shifts, turnovers] = await Promise.all([
    requireStaff(),
    getCurrentShift(),
    getMyShifts(),
    getMyTurnovers(),
  ]);

  return (
    <StaffShell
      email={profile.email}
      role={profile.role}
      title="Cashier Operations"
      subtitle="Open register shifts, track drawer cash sales, and submit daily turnovers."
      breadcrumbs={[{ name: 'Cashier Operations', current: true }]}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {profile.role === 'admin' && (
            <Link
              href="/admin/cashier-operations"
              className="action-focus inline-flex h-10 items-center justify-center gap-2 rounded-md border border-pine/30 bg-surface px-4 text-sm font-semibold text-pine shadow-xs transition hover:bg-pine/5"
            >
              <span>Admin Operations</span>
              <ArrowRightIcon className="h-3.5 w-3.5" />
            </Link>
          )}
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
      <CashierOperationsManager
        cashierEmail={profile.email}
        shift={shift}
        shifts={shifts}
        turnovers={turnovers}
      />
    </StaffShell>
  );
}
