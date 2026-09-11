import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getReceipt } from '@/features/pos/actions';
import { PrintButton } from './print-button';

const PAYMENT_LABELS = {
  cash: 'Cash',
  gcash: 'GCash',
  maya: 'Maya',
} as const;

/** Server-rendered receipt for a completed sale, with browser print. */
export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const receipt = await getReceipt(id);
  if (!receipt) notFound();
  return (
    <main className="bg-background text-foreground">
      <div className="print:hidden">
        <Link href="/pos">Back to POS</Link> <PrintButton />
      </div>
      <section className="bg-surface">
        <h1>Cafe Elvira — Receipt</h1>
        {receipt.order_number !== null ? (
          <p>Order #{receipt.order_number}</p>
        ) : null}
        <p>{new Date(receipt.date).toLocaleString()}</p>
        {receipt.cashier_name ? <p>Cashier: {receipt.cashier_name}</p> : null}
        <ul>
          {receipt.items.map((line, index) => (
            <li key={`${line.name}-${index}`}>
              {line.name} × {line.quantity} — ₱{line.subtotal.toFixed(2)}
            </li>
          ))}
        </ul>
        <p>Total: ₱{receipt.total_amount.toFixed(2)}</p>
        <p>Payment: {PAYMENT_LABELS[receipt.payment_mode]}</p>
        {receipt.payment_mode === 'cash' ? (
          <>
            <p>
              Received:{' '}
              {receipt.amount_received === null
                ? '—'
                : `₱${receipt.amount_received.toFixed(2)}`}
            </p>
            <p>
              Change:{' '}
              {receipt.change_given === null
                ? '—'
                : `₱${receipt.change_given.toFixed(2)}`}
            </p>
          </>
        ) : null}
      </section>
      <div className="print:hidden">
        <Link
          href="/pos"
          className="rounded border border-border bg-surface px-4 py-2 font-medium text-foreground"
        >
          New sale
        </Link>
      </div>
    </main>
  );
}
