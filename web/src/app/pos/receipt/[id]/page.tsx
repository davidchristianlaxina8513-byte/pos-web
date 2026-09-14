import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getReceipt } from '@/features/pos/actions';
import { Card } from '@/components/common/Card';
import { CheckIcon } from '@/components/common/icons';
import { PrintButton } from './print-button';

const PAYMENT_LABELS = {
  cash: 'Cash',
  gcash: 'GCash',
  maya: 'Maya',
} as const;

/** v2 receipt: success block, dashed-detail card, transaction + print. */
export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const receipt = await getReceipt(id);
  if (!receipt) notFound();
  return (
    <main className="min-h-screen bg-mist text-foreground">
      <div className="mx-auto w-full max-w-md px-4 py-6">
        <div className="print:hidden">
          <Link
            href="/pos"
            className="action-focus rounded text-sm font-semibold text-pine-deep"
          >
            Back to POS
          </Link>
        </div>

        <div className="mt-4 flex flex-col items-center text-center print:hidden">
          <span
            aria-hidden="true"
            className="flex h-20 w-20 items-center justify-center rounded-full bg-mint text-pine-deep"
          >
            <CheckIcon className="h-9 w-9" />
          </span>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-pine-deep">
            Payment Successful
          </h1>
          <p className="mt-1 text-sm text-muted">Thank you for your visit!</p>
        </div>

        <Card className="mt-6 rounded-card border-border shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <div>
              {receipt.order_number !== null ? (
                <p className="text-xs font-bold tracking-wider uppercase">
                  Order #{receipt.order_number}
                </p>
              ) : null}
              <p className="mt-1 text-sm text-muted">
                {new Date(receipt.date).toLocaleString()}
              </p>
            </div>
            {receipt.cashier_name ? (
              <div className="text-right">
                <p className="text-xs font-semibold tracking-wider text-muted uppercase">
                  Cashier
                </p>
                <p className="mt-1 text-sm font-semibold">
                  {receipt.cashier_name}
                </p>
              </div>
            ) : null}
          </div>

          <ul className="mt-4 flex flex-col gap-3 border-t border-dashed border-border pt-4">
            {receipt.items.map((line, index) => (
              <li
                key={`${line.name}-${index}`}
                className="flex items-start justify-between gap-3"
              >
                <div>
                  <p className="text-[15px] font-bold">{line.name}</p>
                  <p className="text-sm text-muted">
                    ₱{(line.subtotal / line.quantity).toFixed(2)} ×{' '}
                    {line.quantity}
                  </p>
                </div>
                <p className="text-[15px] font-extrabold">
                  ₱{line.subtotal.toFixed(2)}
                </p>
              </li>
            ))}
          </ul>

          <div className="mt-4 border-t border-dashed border-border pt-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted">Subtotal</span>
              <span className="font-semibold">
                ₱{receipt.total_amount.toFixed(2)}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-base font-bold">Total</span>
              <span className="text-lg font-extrabold text-leaf">
                ₱{receipt.total_amount.toFixed(2)}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs font-semibold tracking-wider text-muted uppercase">
                Payment method
              </span>
              <span className="font-semibold">
                {PAYMENT_LABELS[receipt.payment_mode]}
              </span>
            </div>
            {receipt.payment_mode === 'cash' ? (
              <>
                <p className="mt-1">
                  Received:{' '}
                  {receipt.amount_received === null
                    ? '—'
                    : `₱${receipt.amount_received.toFixed(2)}`}
                </p>
                <p className="mt-1">
                  Change:{' '}
                  {receipt.change_given === null
                    ? '—'
                    : `₱${receipt.change_given.toFixed(2)}`}
                </p>
              </>
            ) : null}
          </div>
        </Card>

        <div className="mt-6 flex flex-col gap-2 print:hidden">
          <Link
            href="/pos"
            className="action-focus flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-pine text-base font-semibold text-surface shadow-active"
          >
            <span aria-hidden="true" className="text-xl leading-none">
              +
            </span>{' '}
            New Transaction
          </Link>
          <PrintButton />
        </div>
      </div>
    </main>
  );
}
