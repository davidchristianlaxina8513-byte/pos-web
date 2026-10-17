import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireRole } from '@/features/auth/queries';
import { getCategories, getEditableProduct } from '@/features/menu/queries';
import { ProductForm } from '@/components/modules/menu/ProductForm';
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
      title={`Edit Product — ${product.name}`}
      subtitle="Update product details, pricing, daily production quota, and POS visibility"
      breadcrumbs={[
        { name: 'Menu Management', href: '/admin/menu' },
        { name: `Edit Product: ${product.name}`, current: true },
      ]}
      actions={
        <Link
          href="/admin/menu"
          className="action-focus inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-semibold text-foreground shadow-xs transition hover:bg-mist"
        >
          Back to Menu
        </Link>
      }
    >
      <ProductForm categories={categories} initial={product} />
    </StaffShell>
  );
}
