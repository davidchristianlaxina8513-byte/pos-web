import Link from 'next/link';
import { requireRole } from '@/features/auth/queries';
import { signOut } from '@/features/auth/actions';
import { getInventoryItems } from '@/features/inventory/queries';
import { getOpenRestockCount } from '@/features/restock/queries';
import { InventoryList } from '@/features/inventory/components/InventoryList';
import { Avatar } from '@/components/common/Avatar';
import { Card } from '@/components/common/Card';
import { SignOutIcon } from '@/components/common/icons';

/** v2 admin inventory: header, restock shortcut, carded stock list. */
export default async function InventoryPage() {
  const profile = await requireRole('admin');
  const [items, openRestockCount] = await Promise.all([
    getInventoryItems(),
    getOpenRestockCount(),
  ]);
  const lowCount = items.filter((item) => item.status === 'low').length;
  const criticalCount = items.filter(
    (item) => item.status === 'critical',
  ).length;
  return (
    <main className="min-h-screen bg-mist text-foreground">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3">
          <Avatar name={profile.email} />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[15px] font-extrabold tracking-tight">
              Inventory
            </h1>
            <p className="truncate text-xs text-muted">
              {items.length} items · {lowCount} low · {criticalCount} critical
            </p>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              aria-label="Sign out"
              title="Sign out"
              className="flex h-11 w-11 items-center justify-center rounded-full text-pine-deep"
            >
              <SignOutIcon />
            </button>
          </form>
        </div>
      </header>
      <div className="mx-auto w-full max-w-6xl px-4 pt-4 pb-8">
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/restock"
            className="rounded-full bg-pine px-4 py-2 text-sm font-semibold text-surface shadow-soft"
          >
            Restock requests
            {openRestockCount > 0 ? ` (${openRestockCount} open)` : null}
          </Link>
          <Link
            href="/admin"
            className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold shadow-soft"
          >
            Back to Admin
          </Link>
        </div>
        <Card
          title="Stock levels"
          className="mt-3 rounded-card border-border shadow-soft"
        >
          <InventoryList items={items} />
        </Card>
      </div>
    </main>
  );
}
