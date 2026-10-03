import type { AdminShift } from '../queries';

const MANILA_FORMAT: Intl.DateTimeFormatOptions = {
  timeZone: 'Asia/Manila',
  dateStyle: 'medium',
  timeStyle: 'short',
};

export function ShiftHistoryList({ shifts }: { shifts: AdminShift[] }) {
  if (shifts.length === 0) {
    return <p className="text-sm text-muted">No cashier shifts yet.</p>;
  }
  return (
    <ul className="divide-y divide-border">
      {shifts.map((shift) => (
        <li key={shift.shift_id} className="py-3 text-sm">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <strong className="break-all">{shift.cashier_name}</strong>
              <p className="text-muted">Business date: {shift.business_date}</p>
            </div>
            <span className="rounded-full bg-mist px-2 py-1 text-xs font-bold uppercase">
              {shift.status}
            </span>
          </div>
          <dl className="mt-2 grid gap-2 sm:grid-cols-3">
            <div>
              <dt className="text-muted">Start time</dt>
              <dd>
                {new Date(shift.started_at).toLocaleString(
                  'en-PH',
                  MANILA_FORMAT,
                )}
              </dd>
            </div>
            <div>
              <dt className="text-muted">End time</dt>
              <dd>
                {shift.ended_at
                  ? new Date(shift.ended_at).toLocaleString(
                      'en-PH',
                      MANILA_FORMAT,
                    )
                  : 'In progress'}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Starting cash</dt>
              <dd>₱{shift.starting_cash.toFixed(2)}</dd>
            </div>
          </dl>
          {shift.notes ? (
            <p className="mt-2 text-muted">{shift.notes}</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
