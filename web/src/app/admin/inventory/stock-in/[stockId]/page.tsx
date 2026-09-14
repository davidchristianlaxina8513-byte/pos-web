import { notFound } from 'next/navigation';
import { requireRole } from '@/features/auth/queries';
import { getInventoryItem } from '@/features/inventory/queries';
import { StockInForm } from '@/features/inventory/components/StockInForm';
import { StaffShell } from '@/components/layout/staff-shell';

/** Admin stock-in for one stock row. */
export default async function StockInPage({
  params,
}: {
  params: Promise<{ stockId: string }>;
}) {
  const profile = await requireRole('admin');
  const { stockId } = await params;
  const id = Number.parseInt(stockId, 10);
  const item = Number.isInteger(id) ? await getInventoryItem(id) : null;
  if (!item) notFound();
  return (
    <StaffShell
      email={profile.email}
      role={profile.role}
      title={`Stock In — ${item.product_name}`}
      subtitle={`On hand: ${item.quantity} · Reorder at: ${item.reorder_level}`}
    >
      <StockInForm stockId={item.stock_id} />
    </StaffShell>
  );
}
