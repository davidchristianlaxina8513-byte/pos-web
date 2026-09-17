'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/common/Button';
import { Field } from '@/components/common/Field';
import { IconTile } from '@/components/common/IconTile';
import { QtyStepper } from '@/components/common/QtyStepper';
import { SectionLabel } from '@/components/common/SectionLabel';
import { Modal } from '@/components/layout/modal/Modal';
import { cn } from '@/lib/cn';
import { checkoutSale } from '../actions';
import { validateCheckout } from '../checkout';
import { cartTotal, type CartLine, type PaymentMode } from '../types';

export interface CheckoutDialogProps {
  lines: CartLine[];
  onIncrement: (product_id: number) => void;
  onDecrement: (product_id: number) => void;
  onClose: () => void;
  onSuccess: () => void;
}

const MODES: { value: PaymentMode; label: string; mark: string }[] = [
  { value: 'cash', label: 'Cash', mark: '₱' },
  { value: 'gcash', label: 'GCash', mark: 'G' },
  { value: 'maya', label: 'Maya', mark: 'M' },
];

const WALLET_HINT: Record<Exclude<PaymentMode, 'cash'>, string> = {
  gcash: 'Customer scans the shop QR in their GCash app.',
  maya: 'Customer scans the shop QR in their Maya app.',
};

function LineThumb({ line }: { line: CartLine }) {
  if (line.image_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={line.image_url}
        alt=""
        width={48}
        height={48}
        className="h-12 w-12 shrink-0 rounded-2xl object-cover"
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sage-100 text-xl"
    >
      ☕
    </span>
  );
}

/** v2 payment sheet: thumb rows with steppers, detail, method, confirm. */
export function CheckoutDialog({
  lines,
  onIncrement,
  onDecrement,
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
    <Modal
      title="Check Out"
      isOpen
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      isDismissDisabled={isProcessing}
    >
      <ul className="flex flex-col gap-3">
        {lines.map((line) => (
          <li
            key={line.product_id}
            className="flex items-center gap-3 rounded-card border border-border bg-surface p-3 shadow-soft"
          >
            <LineThumb line={line} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-bold text-foreground">
                {line.name}
              </p>
              <p className="text-sm font-semibold text-leaf">
                ₱{line.price.toFixed(2)}
              </p>
            </div>
            <QtyStepper
              value={line.qty}
              itemName={line.name}
              onIncrement={() => onIncrement(line.product_id)}
              onDecrement={() => onDecrement(line.product_id)}
            />
          </li>
        ))}
      </ul>

      <div className="mt-4 border-t border-border pt-4">
        <SectionLabel>Payment detail</SectionLabel>
        <div className="mt-2 flex items-center justify-between text-sm">
          <span className="text-muted">Subtotal</span>
          <span className="font-semibold">₱{total.toFixed(2)}</span>
        </div>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-base font-bold">Total</span>
          <span className="text-lg font-extrabold text-leaf">
            ₱{total.toFixed(2)}
          </span>
        </div>
      </div>

      <fieldset className="mt-4">
        <SectionLabel as="legend">Payment method</SectionLabel>
        <div className="mt-2 flex flex-col gap-2">
          {MODES.map((mode) => {
            const selected = method === mode.value;
            return (
              <button
                key={mode.value}
                type="button"
                onClick={() => setMethod(mode.value)}
                aria-pressed={selected}
                className={cn(
                  'flex items-center gap-3 rounded-2xl border bg-surface p-3 text-left shadow-soft',
                  selected ? 'border-pine' : 'border-border',
                )}
              >
                <IconTile tone="sage" className="h-9 w-9 text-sm font-bold">
                  {mode.mark}
                </IconTile>
                <span className="flex-1 text-sm font-bold text-foreground">
                  {mode.label}
                </span>
                {selected ? (
                  <span
                    aria-hidden="true"
                    className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-pine text-xs text-surface"
                  >
                    ✓
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </fieldset>
      {method === 'cash' ? (
        <div className="mt-4">
          <Field
            label="Amount received"
            labelClassName="text-xs font-semibold tracking-wider text-muted uppercase"
            name="amountReceived"
            type="number"
            min={0}
            step="any"
            inputMode="decimal"
            inputClassName="h-[52px] rounded-2xl border-border bg-mist"
            value={amountText}
            onChange={(event) => setAmountText(event.target.value)}
          />
          <div className="mt-3 flex items-center justify-between">
            <SectionLabel>Change</SectionLabel>
            <p
              className={cn(
                'text-lg font-extrabold',
                change !== null && change < 0 ? 'text-danger' : 'text-pine',
              )}
            >
              {change !== null && change >= 0 ? `₱${change.toFixed(2)}` : '—'}
            </p>
          </div>
        </div>
      ) : (
        <p className="mt-4 rounded-2xl bg-sage-100 p-3 text-sm text-pine-deep">
          {WALLET_HINT[method]}
        </p>
      )}
      {error ? (
        <p role="alert" className="mt-3 text-center text-sm text-danger">
          {error}
        </p>
      ) : null}
      <div className="mt-4 flex flex-col gap-2">
        <Button
          className="h-[52px] w-full rounded-full bg-pine text-base text-surface"
          onClick={handleConfirm}
          disabled={!validation.ok || isProcessing}
        >
          {isProcessing ? 'Processing…' : 'Process Checkout'}
        </Button>
        <Button
          variant="secondary"
          className="h-12 w-full rounded-full"
          onClick={onClose}
          disabled={isProcessing}
        >
          Cancel
        </Button>
      </div>
    </Modal>
  );
}
