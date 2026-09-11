import { notFound } from 'next/navigation';
import { requireRole } from '@/features/auth/queries';
import { getInventoryItem } from '@/features/inventory/queries';
import { StockInForm } from '@/features/inventory/components/StockInForm';

/** Admin stock-in for one stock row. */
export default async function StockInPage({
  params,
}: {
  params: Promise<{ stockId: string }>;
}) {
  await requireRole('admin');
  const { stockId } = await params;
  const id = Number.parseInt(stockId, 10);
  const item = Number.isInteger(id) ? await getInventoryItem(id) : null;
  if (!item) notFound();
  return (
    <main className="bg-background text-foreground">
      <h1>Stock In — {item.product_name}</h1>
      <p className="text-muted">
        On hand: {item.quantity} · Reorder at: {item.reorder_level}
      </p>
      <div className="mt-4">
        <StockInForm stockId={item.stock_id} />
      </div>
    </main>
  );
}
