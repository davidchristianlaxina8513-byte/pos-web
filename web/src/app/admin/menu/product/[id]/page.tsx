import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireRole } from '@/features/auth/queries';
import { getCategories, getEditableProduct } from '@/features/menu/queries';
import { ProductForm } from '@/features/menu/components/ProductForm';
import { Card } from '@/components/common/Card';
import { StaffShell } from '@/components/layout/staff-shell';

/** v2 admin product edit (price history skipped — price is unversioned). */
export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await requireRole('admin');
  const { id } = await params;
  const productId = Number(id);
  const [categories, product] = await Promise.all([
    getCategories(),
    Number.isInteger(productId) ? getEditableProduct(productId) : null,
  ]);
  if (!product) notFound();
  return (
    <StaffShell
      email={profile.email}
      role={profile.role}
      title={`Edit product — ${product.name}`}
      actions={
        <Link
          href="/admin/menu"
          className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold shadow-soft"
        >
          Back to Menu
        </Link>
      }
    >
      <Card className="rounded-card border-border shadow-soft">
        <ProductForm categories={categories} initial={product} />
      </Card>
    </StaffShell>
  );
}
