import { requireRole } from '@/features/auth/queries';
import { signOut } from '@/features/auth/actions';
import { getOpenRequests, groupBySupplier } from '@/features/restock/queries';
import {
  markRestockCancelled,
  markRestockOrdered,
  markRestockReceived,
  updateParFromForm,
  updateQuantityFromForm,
  updateSupplierFromForm,
} from '@/features/restock/actions';
import { PrintButton } from './print-button';

export default async function RestockPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireRole('admin');
  const { error } = await searchParams;
  const requests = await getOpenRequests();
  const groups = groupBySupplier(requests);
  return (
    <main className="bg-background text-foreground">
      <h1>Restock Requests</h1>
      <div className="print:hidden">
        <PrintButton />
        <form action={signOut}>
          <button type="submit">Sign out</button>
        </form>
      </div>
      {error === 'save_failed' ? (
        <p role="alert">Could not save. Check the value and try again.</p>
      ) : null}
      {groups.length === 0 ? (
        <p>No open restock requests. Nothing to order.</p>
      ) : null}
      {groups.map((group) => (
        <section key={group.supplier}>
          <h2>{group.supplier}</h2>
          {group.rows.map((row) => (
            <article key={row.request_id} className="bg-surface border-border">
              <h3>
                {row.product_name} ({row.status})
              </h3>
              <p>
                On hand {row.current_stock_snapshot} · reorder at{' '}
                {row.reorder_point_snapshot} · par {row.par_level_snapshot}
              </p>
              <form action={updateQuantityFromForm.bind(null, row.request_id)}>
                <label>
                  Suggested quantity
                  <input
                    name="suggested_quantity"
                    type="number"
                    min={0}
                    step={1}
                    defaultValue={row.suggested_quantity}
                  />
                </label>
                <button type="submit">Save quantity</button>
              </form>
              <form action={updateSupplierFromForm.bind(null, row.request_id)}>
                <label>
                  Supplier
                  <input
                    name="supplier"
                    defaultValue={row.supplier ?? ''}
                    placeholder="Supplier name"
                  />
                </label>
                <button type="submit">Save supplier</button>
              </form>
              <form action={updateParFromForm.bind(null, row.product_id)}>
                <label>
                  Par level
                  <input
                    name="par_level"
                    type="number"
                    min={0}
                    step={1}
                    defaultValue={row.par_level_snapshot}
                    placeholder="Unset"
                  />
                </label>
                <button type="submit">Save par</button>
              </form>
              <div className="print:hidden">
                <form action={markRestockOrdered.bind(null, row.request_id)}>
                  <button type="submit">Mark ordered</button>
                </form>
                <form action={markRestockReceived.bind(null, row.request_id)}>
                  <button type="submit">Mark received</button>
                </form>
                <form action={markRestockCancelled.bind(null, row.request_id)}>
                  <button type="submit">Cancel</button>
                </form>
              </div>
            </article>
          ))}
        </section>
      ))}
    </main>
  );
}
