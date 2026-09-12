import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireRole } from '@/features/auth/queries';
import { getCategories, getEditableProduct } from '@/features/menu/queries';
import { ProductForm } from '@/features/menu/components/ProductForm';
import { Card } from '@/components/common/Card';

/** v2 admin product edit (price history skipped — price is unversioned). */
export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole('admin');
  const { id } = await params;
  const productId = Number(id);
  const [categories, product] = await Promise.all([
    getCategories(),
    Number.isInteger(productId) ? getEditableProduct(productId) : null,
  ]);
  if (!product) notFound();
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
          Edit product — {product.name}
        </h1>
        <Card className="mt-3 rounded-card border-border shadow-soft">
          <ProductForm categories={categories} initial={product} />
        </Card>
      </div>
    </main>
  );
}
