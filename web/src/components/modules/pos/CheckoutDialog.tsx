'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SectionLabel } from '@/components/common/SectionLabel';
import { Button } from '@/components/form/Button';
import { Field } from '@/components/form/Field';
import { QtyStepper } from '@/components/form/QtyStepper';
import { Modal } from '@/components/modal/Modal';
import { cn } from '@/lib/cn';
import { checkoutSale } from '@/features/pos/actions';
import {
  validateCheckout,
  validateOnlinePayment,
} from '@/features/pos/checkout';
import {
  cartTotal,
  type CartLine,
  type PaymentMode,
} from '@/features/pos/types';
import { useAlert } from '@/components/toast';
import { PaymentEvidenceCapture } from './PaymentEvidenceCapture';
import { PaymongoQRModal } from './PaymongoQRModal';

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
  const { errorAlert } = useAlert();
  const clientTxnIdRef = useRef<string>(crypto.randomUUID());
  const total = cartTotal(lines);
  const [method, setMethod] = useState<PaymentMode>('cash');
  const [amountText, setAmountText] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isQRPhActive, setIsQRPhActive] = useState(false);
  const [isManualOverride, setIsManualOverride] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amountReceived = amountText.trim() === '' ? null : Number(amountText);
  const validation = useMemo(
    () => validateCheckout(lines, method, amountReceived),
    [lines, method, amountReceived],
  );
  const onlineError = validateOnlinePayment(method, paymentReference);
  const change =
    method === 'cash' &&
    amountReceived !== null &&
    Number.isFinite(amountReceived)
      ? amountReceived - total
      : null;

  const handleConfirm = async () => {
    setIsProcessing(true);
    setError(null);
    const evidenceData = evidenceFile ? new FormData() : null;
    if (evidenceFile) evidenceData?.set('evidence', evidenceFile);
    const result = await checkoutSale(
      lines,
      method,
      amountReceived,
      paymentReference,
      evidenceData,
      clientTxnIdRef.current,
    );
    if (!result.ok) {
      setError(result.error);
      errorAlert('Checkout Failed', result.error);
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
      size="4xl"
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      isDismissDisabled={isProcessing}
    >
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left Column: Order Items */}
        <div className="md:col-span-7 flex flex-col min-w-0">
          <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-border/70">
            <span className="text-xs font-bold tracking-wider uppercase text-muted">
              Order Items ({lines.reduce((acc, l) => acc + l.qty, 0)} total)
            </span>
            <span className="text-xs font-semibold text-muted">
              {lines.length} {lines.length === 1 ? 'item' : 'items'}
            </span>
          </div>

          <ul className="flex flex-col gap-2.5 max-h-[300px] md:max-h-[480px] overflow-y-auto pr-1.5">
            {lines.map((line) => (
              <li
                key={line.product_id}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface p-2.5 shadow-xs transition-colors hover:border-border/90"
              >
                <LineThumb line={line} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-foreground">
                    {line.name}
                  </p>
                  <p className="text-xs font-semibold text-muted">
                    ₱{line.price.toFixed(2)} each
                  </p>
                </div>
                <QtyStepper
                  value={line.qty}
                  itemName={line.name}
                  onIncrement={() => onIncrement(line.product_id)}
                  onDecrement={() => onDecrement(line.product_id)}
                />
                <div className="w-18 shrink-0 text-right">
                  <p className="text-sm font-bold text-leaf">
                    ₱{(line.price * line.qty).toFixed(2)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Right Column: Payment Details & Confirmation */}
        <div className="md:col-span-5 flex flex-col justify-between md:border-l md:border-border/70 md:pl-6 space-y-4">
          <div className="space-y-4">
            {/* Payment detail card */}
            <div className="rounded-xl border border-border/80 bg-mist/30 p-3.5 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted font-medium">Subtotal</span>
                <span className="font-semibold text-foreground">
                  ₱{total.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-border/60 pt-2">
                <span className="text-base font-bold text-foreground">
                  Total Due
                </span>
                <span className="text-xl font-extrabold text-leaf">
                  ₱{total.toFixed(2)}
                </span>
              </div>
            </div>

            <fieldset>
              <SectionLabel as="legend">Payment method</SectionLabel>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {MODES.map((mode) => {
                  const selected = method === mode.value;
                  return (
                    <button
                      key={mode.value}
                      type="button"
                      onClick={() => {
                        setMethod(mode.value);
                        setError(null);
                        setIsQRPhActive(false);
                        setIsManualOverride(false);
                        if (mode.value === 'cash') {
                          setPaymentReference('');
                          setEvidenceFile(null);
                        }
                      }}
                      aria-pressed={selected}
                      className={cn(
                        'flex flex-col items-center justify-center gap-1.5 rounded-xl border p-2.5 sm:p-3 text-center transition-all cursor-pointer shadow-xs',
                        selected
                          ? 'border-pine bg-pine/5 text-pine ring-1 ring-pine font-bold'
                          : 'border-border bg-surface text-foreground hover:bg-mist/50 font-semibold',
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold',
                          selected
                            ? 'bg-pine text-white'
                            : 'bg-mist text-muted',
                        )}
                      >
                        {mode.mark}
                      </span>
                      <span className="text-xs sm:text-sm font-bold">
                        {mode.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {method === 'cash' ? (
              <div className="space-y-3">
                <Field
                  label="Amount received"
                  labelClassName="text-xs font-semibold tracking-wider text-muted uppercase"
                  name="amountReceived"
                  type="number"
                  min={0}
                  step="any"
                  inputMode="decimal"
                  inputClassName="h-10 rounded-md border-border bg-white text-sm"
                  value={amountText}
                  onChange={(event) => setAmountText(event.target.value)}
                />

                {/* Quick Cash Suggestions */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setAmountText(String(total))}
                    className="rounded-md border border-border bg-white px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-mist cursor-pointer"
                  >
                    Exact (₱{total.toFixed(2)})
                  </button>
                  {[
                    Math.ceil(total / 100) * 100,
                    Math.ceil(total / 500) * 500,
                    1000,
                  ]
                    .filter(
                      (val, i, arr) => val > total && arr.indexOf(val) === i,
                    )
                    .slice(0, 3)
                    .map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setAmountText(String(val))}
                        className="rounded-md border border-border bg-white px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-mist cursor-pointer"
                      >
                        ₱{val.toLocaleString()}
                      </button>
                    ))}
                </div>

                <div className="flex items-center justify-between rounded-lg bg-surface border border-border/70 px-3 py-2.5">
                  <span className="text-sm font-semibold text-muted">
                    Change
                  </span>
                  <p
                    className={cn(
                      'text-lg font-extrabold',
                      change !== null && change < 0
                        ? 'text-danger'
                        : 'text-pine',
                    )}
                  >
                    {change !== null && change >= 0
                      ? `₱${change.toFixed(2)}`
                      : '—'}
                  </p>
                </div>
              </div>
            ) : isQRPhActive ? (
              <PaymongoQRModal
                lines={lines}
                paymentMode={method}
                onSuccess={(transactionId) => {
                  onSuccess();
                  router.push(`/pos/receipt/${transactionId}`);
                }}
                onCancel={() => setIsQRPhActive(false)}
                onSwitchToManual={() => {
                  setIsQRPhActive(false);
                  setIsManualOverride(true);
                }}
              />
            ) : isManualOverride ? (
              <div className="space-y-3">
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-2.5 flex items-center justify-between text-xs text-amber-800">
                  <span className="font-semibold">
                    ⚠️ Manager Manual Override Active
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsManualOverride(false)}
                    className="text-pine font-bold underline cursor-pointer"
                  >
                    Use QR Ph
                  </button>
                </div>
                <div>
                  <Field
                    label="Online transaction reference"
                    name="paymentReference"
                    autoComplete="off"
                    minLength={4}
                    maxLength={64}
                    value={paymentReference}
                    onChange={(event) =>
                      setPaymentReference(event.target.value)
                    }
                    placeholder="Enter last 4 digits (e.g. 7182) or full ref"
                  />
                  <p className="mt-1 text-[11px] text-muted">
                    ⚡ Quick check: Enter just the last 4 digits from the
                    customer&apos;s {method === 'gcash' ? 'GCash' : 'Maya'}{' '}
                    screen.
                  </p>
                </div>
                <PaymentEvidenceCapture
                  value={evidenceFile}
                  onChange={setEvidenceFile}
                  disabled={isProcessing}
                />
              </div>
            ) : (
              <div className="space-y-3.5 rounded-xl border border-border/80 bg-mist/20 p-4 text-center">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-pine/10 px-3 py-1 text-xs font-bold text-pine">
                  ⚡ PayMongo QR Ph Instant Checkout
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">
                    Instant {method === 'gcash' ? 'GCash' : 'Maya'} QR Ph
                  </p>
                  <p className="mt-1 text-xs text-muted leading-relaxed">
                    Customer scans the dynamic QR code using GCash, Maya, or any
                    Philippine banking app. Payment verifies automatically with
                    zero manual entry.
                  </p>
                </div>
                <Button
                  type="button"
                  className="h-10 w-full bg-pine text-white text-sm font-bold shadow-xs hover:bg-pine-deep"
                  onClick={() => setIsQRPhActive(true)}
                >
                  Generate QR Ph Code (₱{total.toFixed(2)})
                </Button>
                <div>
                  <button
                    type="button"
                    onClick={() => setIsManualOverride(true)}
                    className="text-xs text-muted hover:text-foreground font-semibold underline cursor-pointer"
                  >
                    Manager Manual Override (Legacy Entry)
                  </button>
                </div>
              </div>
            )}

            {error ? (
              <p role="alert" className="text-center text-sm text-danger">
                {error}
              </p>
            ) : null}
          </div>

          {!isQRPhActive && (
            <div className="pt-2 flex flex-col gap-2">
              {method === 'cash' || isManualOverride ? (
                <Button
                  className="h-10 w-full rounded-md bg-pine text-sm font-semibold text-surface shadow-xs hover:bg-pine-deep"
                  onClick={handleConfirm}
                  disabled={
                    !validation.ok ||
                    (method !== 'cash' && onlineError !== null) ||
                    isProcessing
                  }
                >
                  {isProcessing ? 'Processing…' : 'Process Checkout'}
                </Button>
              ) : null}
              <Button
                variant="secondary"
                className="h-10 w-full rounded-md text-sm"
                onClick={onClose}
                disabled={isProcessing}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
