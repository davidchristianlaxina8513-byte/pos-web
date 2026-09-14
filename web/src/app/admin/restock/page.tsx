import Link from 'next/link';
import { requireRole } from '@/features/auth/queries';
import {
  getOpenRequests,
  getOpenRestockCount,
  getRestockRequests,
} from '@/features/restock/queries';
import {
  groupPrintSections,
  parseRestockFilter,
  type RestockFilter,
} from '@/features/restock/restock';
import { RestockList } from '@/features/restock/components/RestockList';
import { StaffShell } from '@/components/layout/staff-shell';
import { cn } from '@/lib/cn';
import { PrintButton } from './print-button';

const TABS: { value: RestockFilter; label: string }[] = [
  { value: 'open', label: 'Pending + Ordered' },
  { value: 'pending', label: 'Pending' },
  { value: 'ordered', label: 'Ordered' },
  { value: 'received', label: 'Received' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'all', label: 'All' },
];

function formatManilaDay(value: Date): string {
  return value.toLocaleDateString('en-PH', {
    timeZone: 'Asia/Manila',
    dateStyle: 'long',
  });
}

/** Admin restock queue: actionable requests first, history behind tabs. */
export default async function RestockPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const profile = await requireRole('admin');
  const params = await searchParams;
  const filter = parseRestockFilter(params.status) ?? 'open';
  const [requests, openCount, openRequests] = await Promise.all([
    getRestockRequests(filter),
    getOpenRestockCount(),
    filter === 'open' ? null : getOpenRequests(),
  ]);
  // The supplier handoff always covers the actionable set, whatever tab
  // is on screen.
  const printable = filter === 'open' ? requests : (openRequests ?? []);
  const sections = groupPrintSections(printable);
  const query = (value: RestockFilter) => `/admin/restock?status=${value}`;
  return (
    <StaffShell
      email={profile.email}
      role={profile.role}
      title="Restock requests"
      subtitle={`${openCount} open · Signed in as ${profile.email}`}
      actions={<PrintButton />}
    >
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 print:hidden">
        {TABS.map((entry) => (
          <Link
            key={entry.value}
            href={query(entry.value)}
            aria-current={filter === entry.value ? 'page' : undefined}
            className={cn(
              'action-focus shrink-0 rounded-full px-4 py-2 text-sm font-semibold',
              filter === entry.value
                ? 'bg-pine text-surface'
                : 'border border-border bg-surface text-foreground hover:bg-mist',
            )}
          >
            {entry.label}
          </Link>
        ))}
      </div>

      <div className="mt-4 print:hidden">
        <RestockList rows={requests} />
      </div>

      <section aria-label="Supplier print list" className="hidden print:block">
        <h1>Cafe Elvira — Restock list</h1>
        <p>
          {formatManilaDay(new Date())} · {printable.length} open requests
        </p>
        {sections.length === 0 ? (
          <p>Nothing to order.</p>
        ) : (
          sections.map((section) => (
            <section key={section.title}>
              <h2>
                {section.title} (
                {section.groups.reduce(
                  (sum, group) => sum + group.rows.length,
                  0,
                )}{' '}
                items)
              </h2>
              {section.groups.map((group) => (
                <section key={group.supplier}>
                  <h3>{group.supplier}</h3>
                  <ul>
                    {group.rows.map((row) => (
                      <li key={row.request_id}>
                        {row.product_name} — order {row.suggested_quantity} (on
                        hand {row.current_stock_snapshot}, reorder at{' '}
                        {row.reorder_point_snapshot}, par{' '}
                        {row.par_level_snapshot})
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </section>
          ))
        )}
      </section>
    </StaffShell>
  );
}
