'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/common/Button';
import { Field } from '@/components/common/Field';
import { checkoutSale } from '../actions';
import { validateCheckout } from '../checkout';
import { cartTotal, type CartLine, type PaymentMode } from '../types';

export interface CheckoutDialogProps {
  lines: CartLine[];
  onClose: () => void;
  onSuccess: () => void;
}

const MODES: { value: PaymentMode; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'gcash', label: 'GCash' },
  { value: 'maya', label: 'Maya' },
];

const WALLET_HINT: Record<Exclude<PaymentMode, 'cash'>, string> = {
  gcash: 'Customer scans the shop QR in their GCash app.',
  maya: 'Customer scans the shop QR in their Maya app.',
};

/** Payment sheet: method pick, cash change calc, confirm posts the sale. */
export function CheckoutDialog({
  lines,
  onClose,
  onSuccess,
}: CheckoutDialogProps) {
  const router = useRouter();
  const total = cartTotal(lines);
  const [method, setMethod] = useState<PaymentMode>('cash');
  const [amountText, setAmountText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amountReceived = amountText.trim() === '' ? null : Number(amountText);
  const validation = useMemo(
    () => validateCheckout(lines, method, amountReceived),
    [lines, method, amountReceived],
  );
  const change =
    method === 'cash' &&
    amountReceived !== null &&
    Number.isFinite(amountReceived)
      ? amountReceived - total
      : null;

  const handleConfirm = async () => {
    setIsProcessing(true);
    setError(null);
    const result = await checkoutSale(lines, method, amountReceived);
    if (!result.ok) {
      setError(result.error);
      setIsProcessing(false);
      return;
    }
    onSuccess();
    router.push(`/pos/receipt/${result.transactionId}`);
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-foreground/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Checkout"
    >
      <div className="w-full max-w-md rounded border border-border bg-surface p-4">
        <h2 className="text-foreground">Checkout — ₱{total.toFixed(2)}</h2>
        <fieldset className="mt-3">
          <legend className="text-muted">Payment method</legend>
          <div className="mt-1 flex gap-2">
            {MODES.map((mode) => (
              <Button
                key={mode.value}
                variant={method === mode.value ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setMethod(mode.value)}
                aria-pressed={method === mode.value}
              >
                {mode.label}
              </Button>
            ))}
          </div>
        </fieldset>
        {method === 'cash' ? (
          <div className="mt-3">
            <Field
              label="Amount received"
              name="amountReceived"
              type="number"
              min={0}
              step="any"
              inputMode="decimal"
              value={amountText}
              onChange={(event) => setAmountText(event.target.value)}
            />
            <p className="mt-1 text-foreground">
              Change: {change === null ? '—' : `₱${change.toFixed(2)}`}
            </p>
          </div>
        ) : (
          <p className="mt-3 text-muted">{WALLET_HINT[method]}</p>
        )}
        {error ? (
          <p role="alert" className="mt-3 text-danger">
            {error}
          </p>
        ) : null}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!validation.ok || isProcessing}
          >
            {isProcessing ? 'Processing…' : 'Confirm sale'}
          </Button>
        </div>
      </div>
    </div>
  );
}
