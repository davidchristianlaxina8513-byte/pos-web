import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getReceipt } from '@/features/pos/actions';
import { requireStaff } from '@/features/auth/queries';
import { PaymentEvidenceActions } from '@/components/modules/pos/PaymentEvidenceActions';
import { Card } from '@/components/common/Card';
import { CheckIcon } from '@/components/common/icons';
import { PrintButton } from './print-button';

const PAYMENT_LABELS = {
  cash: 'Cash',
  gcash: 'GCash',
  maya: 'Maya',
} as const;

const PAYMENT_STATUS_LABELS = {
  paid: 'Paid',
  pending_verification: 'Pending Verification',
  verified: 'Verified',
  rejected: 'Rejected',
} as const;

/** v2 receipt: success block, dashed-detail card, transaction + print. */
export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [receipt, profile] = await Promise.all([
    getReceipt(id),
    requireStaff(),
  ]);
  if (!receipt) notFound();
  const isPaymongo = Boolean(
    receipt.payment_reference?.startsWith('pay_') ||
      receipt.payment_reference?.startsWith('PAY-'),
  );

  return (
    <main className="min-h-screen bg-mist text-foreground print:min-h-0 print:bg-white print:p-0">
      <div className="mx-auto w-full max-w-md px-4 py-6 print:m-0 print:max-w-none print:w-full print:p-0">
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
            {isPaymongo
              ? 'Payment Successful'
              : receipt.payment_status === 'pending_verification'
                ? 'Payment Evidence Submitted'
                : receipt.payment_status === 'rejected'
                  ? 'Payment Requires Attention'
                  : 'Payment Successful'}
          </h1>
          <p className="mt-1 text-sm text-muted">Thank you for your visit!</p>
        </div>

        <Card className="pos-receipt-print mt-6 rounded-card border-border shadow-soft print:mt-0 print:rounded-none print:border-none print:shadow-none print:p-0 print:bg-white">
          {/* Store Header for Printed Receipt (58mm & 80mm compatible) */}
          <div className="hidden print:block text-center pb-2 mb-3 border-b border-dashed border-border">
            <h2 className="text-sm font-black tracking-wider uppercase">
              CAFE ELVIRA
            </h2>
            <p className="text-[10px] font-medium">Official Sales Receipt</p>
          </div>

          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold tracking-wider text-pine uppercase">
                {receipt.transaction_number}
              </p>
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
                  <p className="text-sm font-bold">{line.name}</p>
                  <p className="text-sm text-muted">
                    ₱{(line.subtotal / line.quantity).toFixed(2)} ×{' '}
                    {line.quantity}
                  </p>
                </div>
                <p className="text-sm font-extrabold">
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
                {isPaymongo
                  ? `${PAYMENT_LABELS[receipt.payment_mode]} (QR Ph)`
                  : PAYMENT_LABELS[receipt.payment_mode]}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-xs font-semibold tracking-wider text-muted uppercase">
                Payment status
              </span>
              <span className="font-semibold text-leaf">
                {isPaymongo
                  ? 'Paid'
                  : PAYMENT_STATUS_LABELS[receipt.payment_status]}
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
            ) : isPaymongo ? (
              <div className="mt-3 border-t border-dashed border-border pt-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted">PayMongo Ref</span>
                  <span className="font-mono font-semibold">
                    {receipt.payment_reference ?? '—'}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-leaf">
                  <span className="inline-block h-2 w-2 rounded-full bg-leaf" />
                  Verified via PayMongo QR Ph
                </div>
              </div>
            ) : (
              <>
                <p className="mt-2">
                  Reference: {receipt.payment_reference ?? '—'}
                </p>
                <p className="mt-1">
                  Payment Evidence:{' '}
                  {receipt.has_payment_evidence ? 'Available' : 'Unavailable'}
                </p>
                {receipt.payment_review_note ? (
                  <p className="mt-1">
                    Review note: {receipt.payment_review_note}
                  </p>
                ) : null}
                <PaymentEvidenceActions
                  transactionId={receipt.transaction_id}
                  canReview={profile.role === 'admin'}
                  pending={receipt.payment_status === 'pending_verification'}
                  hasEvidence={receipt.has_payment_evidence}
                />
              </>
            )}
          </div>

          {/* Store Footer for Printed Receipt */}
          <div className="hidden print:block text-center pt-3 mt-3 border-t border-dashed border-border text-xs">
            <p className="font-semibold">Thank you for your visit!</p>
            <p className="text-[10px] mt-0.5 text-muted">Please come again</p>
          </div>
        </Card>

        <div className="mt-6 flex flex-col gap-2 print:hidden">
          <Link
            href="/pos"
            className="action-focus flex h-10 w-full items-center justify-center gap-2 rounded-md bg-pine text-sm font-semibold text-surface shadow-xs hover:bg-pine-deep"
          >
            <span aria-hidden="true" className="text-lg leading-none">
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
