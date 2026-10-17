import Link from 'next/link';
import { requireRole } from '@/features/auth/queries';
import { getCategories } from '@/features/menu/queries';
import { ProductForm } from '@/components/modules/menu/ProductForm';
import { Card } from '@/components/common/Card';
import { StaffShell } from '@/components/layout/staff-shell';

/** v2 admin product create (shares the restyled ProductForm). */
export default async function NewProductPage() {
  const profile = await requireRole('admin');
  const categories = await getCategories();
  return (
    <StaffShell
      email={profile.email}
      role={profile.role}
      title="Add Product"
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
      <Card className="rounded-card border-border shadow-soft">
        <ProductForm categories={categories} initial={null} />
      </Card>
    </StaffShell>
  );
}
