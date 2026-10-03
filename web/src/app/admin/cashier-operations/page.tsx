import Link from 'next/link';
import { requireRole } from '@/features/auth/queries';
import { getAllShifts, getAllTurnovers } from '@/features/shifts/queries';
import { ShiftHistoryList } from '@/features/shifts/components/ShiftHistoryList';
import { TurnoverList } from '@/features/shifts/components/TurnoverList';
import { Card } from '@/components/common/Card';
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
      subtitle="Review cashier shifts and verify cash turnover"
    >
      <nav
        aria-label="Cashier operations sections"
        className="mb-4 flex gap-2 overflow-x-auto pb-1"
      >
        <Link
          href="#shift"
          className="action-focus shrink-0 rounded-full bg-pine px-4 py-2 text-sm font-semibold text-surface"
        >
          Cashier Shift
        </Link>
        <Link
          href="#turnover"
          className="action-focus shrink-0 rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold"
        >
          Cash Turnover
        </Link>
      </nav>
      <section id="shift" className="scroll-mt-4">
        <Card
          title="Shift history"
          className="rounded-card border-border shadow-soft"
        >
          <ShiftHistoryList shifts={shifts} />
        </Card>
      </section>
      <section id="turnover" className="mt-6 scroll-mt-4">
        <h2 className="mb-3 text-lg font-extrabold">Turnover history</h2>
        <TurnoverList turnovers={turnovers} admin />
      </section>
    </StaffShell>
  );
}
