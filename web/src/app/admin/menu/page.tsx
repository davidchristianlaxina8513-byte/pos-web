import Link from 'next/link';
import { requireRole } from '@/features/auth/queries';
import { getCategories, getManagedMenu } from '@/features/menu/queries';
import { MenuManager } from '@/features/menu/components/MenuManager';

/** Admin menu + category management. */
export default async function MenuPage() {
  await requireRole('admin');
  const [{ items }, categories] = await Promise.all([
    getManagedMenu(),
    getCategories(),
  ]);
  return (
    <main className="bg-background text-foreground">
      <h1>Menu management</h1>
      <p className="mt-1">
        <Link
          href="/admin"
          className="rounded border border-border bg-surface px-3 py-1 font-medium text-foreground"
        >
          Back to Admin
        </Link>
      </p>
      <div className="mt-4">
        <MenuManager categories={categories} items={items} />
      </div>
    </main>
  );
}
