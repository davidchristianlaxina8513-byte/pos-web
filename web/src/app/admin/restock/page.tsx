import Link from 'next/link';
import { requireRole } from '@/features/auth/queries';
import { signOut } from '@/features/auth/actions';
import {
  getOpenRequests,
  getOpenRestockCount,
  getRestockRequests,
} from '@/features/restock/queries';
import {
  groupBySupplier,
  parseRestockFilter,
  type RestockFilter,
} from '@/features/restock/restock';
import { RestockList } from '@/features/restock/components/RestockList';
import { Button } from '@/components/common/Button';
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
  const groups = groupBySupplier(printable);
  const query = (value: RestockFilter) => `/admin/restock?status=${value}`;
  return (
    <main className="bg-background text-foreground">
      <header className="flex items-center justify-between">
        <div>
          <h1>Restock requests</h1>
          <p className="text-muted">
            {openCount} open · Signed in as {profile.email}
          </p>
        </div>
        <div className="flex gap-2 print:hidden">
          <PrintButton />
          <form action={signOut}>
            <Button variant="secondary" size="sm" type="submit">
              Sign out
            </Button>
          </form>
        </div>
      </header>
      <p className="mt-1 print:hidden">
        <Link
          href="/admin"
          className="rounded border border-border bg-surface px-3 py-1 font-medium text-foreground"
        >
          Back to Admin
        </Link>
      </p>
      <div className="mt-3 flex flex-wrap gap-2 print:hidden">
        {TABS.map((entry) => (
          <Link
            key={entry.value}
            href={query(entry.value)}
            aria-current={filter === entry.value ? 'page' : undefined}
            className={
              filter === entry.value
                ? 'rounded bg-primary px-3 py-1 font-medium text-surface'
                : 'rounded border border-border bg-surface px-3 py-1 font-medium text-foreground'
            }
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
        {groups.length === 0 ? (
          <p>Nothing to order.</p>
        ) : (
          groups.map((group) => (
            <section key={group.supplier}>
              <h2>{group.supplier}</h2>
              <ul>
                {group.rows.map((row) => (
                  <li key={row.request_id}>
                    {row.product_name} — order {row.suggested_quantity} (on hand{' '}
                    {row.current_stock_snapshot}, reorder at{' '}
                    {row.reorder_point_snapshot}, par {row.par_level_snapshot})
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </section>
    </main>
  );
}
