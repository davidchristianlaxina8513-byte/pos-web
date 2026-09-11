import Link from 'next/link';
import { requireRole } from '@/features/auth/queries';
import { signOut } from '@/features/auth/actions';
import { getInventoryItems } from '@/features/inventory/queries';
import { InventoryList } from '@/features/inventory/components/InventoryList';
import { Button } from '@/components/common/Button';

/** Admin inventory: counts, restock shortcut, filterable stock list. */
export default async function InventoryPage() {
  const profile = await requireRole('admin');
  const items = await getInventoryItems();
  const lowCount = items.filter((item) => item.status === 'low').length;
  const criticalCount = items.filter(
    (item) => item.status === 'critical',
  ).length;
  return (
    <main className="bg-background text-foreground">
      <header className="flex items-center justify-between">
        <div>
          <h1>Inventory</h1>
          <p className="text-muted">
            {items.length} items · {lowCount} low · {criticalCount} critical ·
            Signed in as {profile.email}
          </p>
        </div>
        <form action={signOut}>
          <Button variant="secondary" size="sm" type="submit">
            Sign out
          </Button>
        </form>
      </header>
      <p className="mt-3">
        <Link
          href="/admin/restock"
          className="rounded border border-border bg-surface px-3 py-1 font-medium text-foreground"
        >
          Restock requests
        </Link>{' '}
        <Link
          href="/admin"
          className="rounded border border-border bg-surface px-3 py-1 font-medium text-foreground"
        >
          Back to Admin
        </Link>
      </p>
      <div className="mt-4">
        <InventoryList items={items} />
      </div>
    </main>
  );
}
