import Link from 'next/link';
import { requireRole } from '@/features/auth/queries';
import { getCategories } from '@/features/menu/queries';
import { ProductForm } from '@/components/modules/menu/ProductForm';
import { StaffShell } from '@/components/layout/staff-shell';

/** v2 admin product create (shares the restyled ProductForm). */
export default async function NewProductPage() {
  const [profile, categories] = await Promise.all([
    requireRole('admin'),
    getCategories(),
  ]);
  return (
    <StaffShell
      fullWidth={true}
      email={profile.email}
      role={profile.role}
      title="Add Product"
      subtitle="Configure a new beverage, food, or retail item for POS sales and daily stock monitoring"
      breadcrumbs={[
        { name: 'Menu Management', href: '/admin/menu' },
        { name: 'Add Product', current: true },
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
      <ProductForm categories={categories} initial={null} />
    </StaffShell>
  );
}
