import { BackLink } from '@/components/common/BackLink';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { StaffShell } from '@/components/layout/staff-shell';
import { getSessionProfile } from '@/features/auth/queries';
import { getShiftReportData } from '@/features/shift-report/queries';
import { PrintReportButton } from '@/features/shift-report/components/PrintReportButton';
import type { ProductKind } from '@/features/shift-report/classify';

const KIND_LABELS: Record<ProductKind, string> = {
  drink: 'Finished drink',
  physical: 'Physical product',
  unclassified: 'Unclassified',
};

const KIND_UNITS: Record<ProductKind, string> = {
  drink: 'cups',
  physical: 'units',
  unclassified: 'units',
};

const manilaDateTime = new Intl.DateTimeFormat('en-PH', {
  timeZone: 'Asia/Manila',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

function peso(value: number): string {
  return `₱${value.toFixed(2)}`;
}

export default async function ShiftReportPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; shift?: string; cashier?: string }>;
}) {
  const params = await searchParams;
  const [profile, data] = await Promise.all([
    getSessionProfile(),
    getShiftReportData({
      dateKey: params.date,
      shiftId: params.shift || undefined,
      cashierId: params.cashier || undefined,
    }),
  ]);
  const { report } = data;
  const isAdmin = data.scope.role === 'admin';
  const trackedUnits = report.cupsTotal + report.physicalUnitsTotal;

  return (
    <StaffShell
      email={profile?.email ?? ''}
      role={data.scope.role}
      title="End-of-Shift Report"
      subtitle="Sales & product inventory for a business date or shift"
      actions={<PrintReportButton />}
    >
      <p className="mb-3 print:hidden">
        {isAdmin ? (
          <BackLink href="/admin/reports">Back to Reports</BackLink>
        ) : (
          <BackLink href="/daily-sales">Back to Daily Sales</BackLink>
        )}
      </p>
      <form
        method="get"
        action="/shift-report"
        className="flex flex-wrap items-end gap-2 print:hidden"
      >
        <label className="block">
          <span className="text-sm text-muted">Business date</span>
          <input
            type="date"
            name="date"
            defaultValue={params.date ?? data.quotaDate}
            className="mt-1 block h-[52px] rounded-2xl border border-border bg-mist px-3.5 text-foreground"
          />
        </label>
        <label className="block min-w-56 flex-1">
          <span className="text-sm text-muted">Shift (optional)</span>
          <select
            name="shift"
            defaultValue={params.shift ?? ''}
            className="mt-1 block h-[52px] w-full rounded-2xl border border-border bg-mist px-3.5 text-foreground"
          >
            <option value="">Select a shift</option>
            {data.shifts.map((shift) => (
              <option key={shift.shift_id} value={shift.shift_id}>
                {shift.business_date} · {shift.cashier_name} ·{' '}
                {manilaDateTime.format(new Date(shift.started_at))} –{' '}
                {shift.ended_at
                  ? manilaDateTime.format(new Date(shift.ended_at))
                  : 'open'}
              </option>
            ))}
          </select>
        </label>
        {isAdmin ? (
          <label className="block min-w-40 flex-1">
            <span className="text-sm text-muted">Cashier</span>
            <select
              name="cashier"
              defaultValue={params.cashier ?? ''}
              className="mt-1 block h-[52px] w-full rounded-2xl border border-border bg-mist px-3.5 text-foreground"
            >
              <option value="">All staff</option>
              {data.cashiers.map((cashier) => (
                <option key={cashier.user_id} value={cashier.user_id}>
                  {cashier.username}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <Button type="submit">Apply</Button>
      </form>

      <p className="mt-3 text-sm text-muted">
        Showing: <strong className="text-foreground">{data.scopeLabel}</strong>{' '}
        · {manilaDateTime.format(new Date(data.rangeStart))} –{' '}
        {manilaDateTime.format(new Date(data.rangeEnd))} (Manila)
      </p>
      {data.shiftNote ? (
        <p className="mt-2 text-sm text-muted">{data.shiftNote}</p>
      ) : null}

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Card title="Completed sales">
          <strong className="block text-xl">
            {peso(report.completedTotal)}
          </strong>
          <span className="text-sm text-muted">
            {report.completedCount} orders
          </span>
        </Card>
        <Card title="Voided">
          <strong className="block text-xl">{peso(report.voidedTotal)}</strong>
          <span className="text-sm text-muted">
            {report.voidedCount} voided
          </span>
        </Card>
        <Card title="Cash">
          <strong className="block text-xl">{peso(report.cashTotal)}</strong>
        </Card>
        <Card title="Online collected">
          <strong className="block text-xl">
            {peso(report.onlineCollected)}
          </strong>
          <span className="text-sm text-muted">GCash + Maya, verified</span>
        </Card>
        <Card title="Pending verification">
          <strong className="block text-xl">
            {peso(report.onlinePending)}
          </strong>
          <span className="text-sm text-muted">recorded, not collected</span>
        </Card>
        <Card title="Finished-drink cups">
          <strong className="block text-xl">{report.cupsTotal}</strong>
        </Card>
        <Card title="Physical units">
          <strong className="block text-xl">{report.physicalUnitsTotal}</strong>
        </Card>
        <Card title="Unclassified units">
          <strong className="block text-xl">
            {report.unclassifiedUnitsTotal}
          </strong>
        </Card>
      </div>

      <Card title="Reconciliation" className="mt-4">
        <p className="text-sm leading-6">
          Completed {peso(report.completedTotal)} = cash{' '}
          {peso(report.cashTotal)} + online collected{' '}
          {peso(report.onlineCollected)} + pending {peso(report.onlinePending)}{' '}
          + rejected {peso(report.rejectedTotal)} ({report.rejectedCount}{' '}
          orders, excluded from collected totals). Voided{' '}
          {peso(report.voidedTotal)} is reported separately and never feeds
          sales, products, or quotas.
        </p>
        <p className="mt-2 text-sm leading-6 text-muted">
          Combined tracked units sold: <strong>{trackedUnits}</strong> (cups +
          physical units; unclassified units are listed separately and use the
          configured product unit from the catalog).
        </p>
      </Card>

      <Card title="Products" className="mt-4">
        {report.products.length === 0 ? (
          <p className="text-sm text-muted">
            No completed sales in this period.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted">
                  <th className="py-2 pr-3 font-medium">Product</th>
                  <th className="py-2 pr-3 font-medium">Type</th>
                  <th className="py-2 pr-3 text-right font-medium">Qty</th>
                  <th className="py-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {report.products.map((row) => (
                  <tr key={row.product_id}>
                    <td className="py-2 pr-3">
                      <span className="block font-medium">{row.name}</span>
                      <span className="block text-muted">{row.category}</span>
                    </td>
                    <td className="py-2 pr-3 text-muted">
                      {KIND_LABELS[row.kind]}
                    </td>
                    <td className="py-2 pr-3 text-right">
                      {row.quantity} {KIND_UNITS[row.kind]}
                    </td>
                    <td className="py-2 text-right">{peso(row.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Quota remaining" className="mt-4">
        <p className="text-sm leading-6 text-muted">
          Daily production availability for {data.quotaDate}. Quota remaining is
          derived from recorded sales — it is not a verified physical count.
        </p>
        {!data.quotaAvailable ? (
          <p className="mt-2 text-sm">
            No quota records for this date — stock columns show Not recorded.
          </p>
        ) : null}
        {report.products.length === 0 ? null : (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted">
                  <th className="py-2 pr-3 font-medium">Product</th>
                  <th className="py-2 pr-3 text-right font-medium">Limit</th>
                  <th className="py-2 pr-3 text-right font-medium">Sold</th>
                  <th className="py-2 text-right font-medium">Remaining</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {report.products.map((row) => (
                  <tr key={row.product_id}>
                    <td className="py-2 pr-3 font-medium">{row.name}</td>
                    <td className="py-2 pr-3 text-right">
                      {row.quotaLimit === 'unrecorded' ? (
                        <span className="text-muted">Not recorded</span>
                      ) : row.quotaLimit === null ? (
                        'Unlimited'
                      ) : (
                        row.quotaLimit
                      )}
                    </td>
                    <td className="py-2 pr-3 text-right">{row.quotaSold}</td>
                    <td className="py-2 text-right">
                      {row.quotaRemaining === 'unrecorded' ? (
                        <span className="text-muted">Not recorded</span>
                      ) : row.quotaRemaining === null ? (
                        'Unlimited'
                      ) : (
                        row.quotaRemaining
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-2 text-sm leading-6 text-muted">
          Sales are matched to shifts by cashier and time because transactions
          do not store a shift reference. This report only reads records — it
          never deducts stock or changes quotas.
        </p>
      </Card>
    </StaffShell>
  );
}
