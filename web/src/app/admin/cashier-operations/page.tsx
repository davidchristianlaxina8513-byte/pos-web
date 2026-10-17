import { requireRole } from '@/features/auth/queries';
import { getAllShifts, getAllTurnovers } from '@/features/shifts/queries';
import { AdminCashierOperationsManager } from '@/components/modules/shifts';
import { StaffShell } from '@/components/layout/staff-shell';

export default async function AdminCashierOperationsPage() {
  const profile = await requireRole('admin');
  const [shifts, turnovers] = await Promise.all([
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
      fullWidth={true}
    >
      <AdminCashierOperationsManager shifts={shifts} turnovers={turnovers} />
    </StaffShell>
  );
}
