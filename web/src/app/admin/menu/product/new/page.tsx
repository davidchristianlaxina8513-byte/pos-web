import Link from 'next/link';
import { requireRole } from '@/features/auth/queries';
import { getCategories } from '@/features/menu/queries';
import { ProductForm } from '@/features/menu/components/ProductForm';
import { Card } from '@/components/common/Card';

/** v2 admin product create (shares the restyled ProductForm). */
export default async function NewProductPage() {
  await requireRole('admin');
  const categories = await getCategories();
  return (
    <main className="min-h-screen bg-mist text-foreground">
      <div className="mx-auto w-full max-w-6xl px-4 pt-4 pb-8">
        <Link
          href="/admin/menu"
          className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold shadow-soft"
        >
          Back to Menu
        </Link>
        <h1 className="mt-4 text-xl font-extrabold tracking-tight">
          Add product
        </h1>
        <Card className="mt-3 rounded-card border-border shadow-soft">
          <ProductForm categories={categories} initial={null} />
        </Card>
      </div>
    </main>
  );
}
