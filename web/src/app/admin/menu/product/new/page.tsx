import Link from 'next/link';
import { requireRole } from '@/features/auth/queries';
import { getCategories } from '@/features/menu/queries';
import { ProductForm } from '@/features/menu/components/ProductForm';
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
      title="Add product"
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
        <ProductForm categories={categories} initial={null} />
      </Card>
    </StaffShell>
  );
}
