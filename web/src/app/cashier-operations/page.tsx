import Link from 'next/link';
import { requireRole } from '@/features/auth/queries';
import {
  getCurrentShift,
  getMyShifts,
  getMyTurnovers,
} from '@/features/shifts/queries';
import { ShiftPanel } from '@/features/shifts/components/ShiftPanel';
import { ShiftHistoryList } from '@/features/shifts/components/ShiftHistoryList';
import { TurnoverList } from '@/features/shifts/components/TurnoverList';
import { Card } from '@/components/common/Card';
import { StaffShell } from '@/components/layout/staff-shell';

export default async function CashierOperationsPage() {
  const profile = await requireRole('cashier');
  const [shift, shifts, turnovers] = await Promise.all([
    getCurrentShift(),
    getMyShifts(),
    getMyTurnovers(),
  ]);
  return (
    <StaffShell
      email={profile.email}
      role={profile.role}
      title="Cashier Operations"
      subtitle="Manage your shift and submit cash turnover"
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

      <section id="shift" className="scroll-mt-4 space-y-4">
        <Card
          title={shift?.status === 'open' ? 'Current shift' : 'Start shift'}
          className="rounded-card border-border shadow-soft"
        >
          <dl className="mb-3 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted">Current cashier</dt>
              <dd className="break-all font-bold">{profile.email}</dd>
            </div>
            <div>
              <dt className="text-muted">Shift status</dt>
              <dd className="font-bold uppercase">
                {shift?.status === 'open' ? 'Open' : 'Closed'}
              </dd>
            </div>
            {shift?.ended_at ? (
              <div>
                <dt className="text-muted">Last end time</dt>
                <dd>
                  {new Date(shift.ended_at).toLocaleString('en-PH', {
                    timeZone: 'Asia/Manila',
                  })}
                </dd>
              </div>
            ) : null}
          </dl>
          <ShiftPanel shift={shift} />
          {shift?.status === 'open' ? (
            <p className="mt-3 text-sm text-muted">
              Use the Cash Turnover section to count cash and end this shift.
            </p>
          ) : null}
        </Card>
        <Card
          title="Shift history"
          className="rounded-card border-border shadow-soft"
        >
          <ShiftHistoryList shifts={shifts} />
        </Card>
      </section>

      <section id="turnover" className="mt-6 scroll-mt-4 space-y-4">
        <Card
          title="Cash turnover"
          className="rounded-card border-border shadow-soft"
        >
          <ShiftPanel shift={shift} turnoverMode />
        </Card>
        <Card
          title="Turnover history"
          className="rounded-card border-border shadow-soft"
        >
          <TurnoverList turnovers={turnovers} />
        </Card>
      </section>
    </StaffShell>
  );
}
