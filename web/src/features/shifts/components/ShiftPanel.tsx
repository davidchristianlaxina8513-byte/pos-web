'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/common/Button';
import { Field } from '@/components/common/Field';
import { openShift, submitTurnover } from '../actions';
import type { CashierShift } from '../queries';

export function ShiftPanel({
  shift,
  turnoverMode = false,
}: {
  shift: CashierShift | null;
  turnoverMode?: boolean;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const countedCash = amount.trim() === '' ? null : Number(amount);
  const variance =
    shift?.status === 'open' &&
    turnoverMode &&
    countedCash !== null &&
    Number.isFinite(countedCash)
      ? countedCash - shift.expected_cash
      : null;
  const hasDiscrepancy = variance !== null && Math.abs(variance) >= 0.005;
  const submit = async () => {
    setBusy(true);
    setError(null);
    const result =
      shift?.status === 'open' && turnoverMode
        ? await submitTurnover(shift.shift_id, Number(amount), notes)
        : await openShift(Number(amount), notes);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setAmount('');
    setNotes('');
    router.refresh();
  };
  if (shift?.status === 'open' && !turnoverMode) {
    return (
      <div className="space-y-2 text-sm">
        <p>
          <strong>Started:</strong>{' '}
          {new Date(shift.started_at).toLocaleTimeString('en-PH', {
            timeZone: 'Asia/Manila',
          })}
        </p>
        <p>
          <strong>Starting cash:</strong> ₱{shift.starting_cash.toFixed(2)}
        </p>
        <p>
          <strong>Cash sales:</strong> ₱{shift.cash_sales.toFixed(2)}
        </p>
        <p>
          <strong>Expected cash:</strong> ₱{shift.expected_cash.toFixed(2)}
        </p>
      </div>
    );
  }
  if (shift?.status !== 'open' && turnoverMode)
    return (
      <p className="text-sm text-muted">
        Open a shift before submitting a cash turnover.
      </p>
    );
  return (
    <div className="max-w-md space-y-3">
      {shift?.status === 'open' && turnoverMode ? (
        <div className="rounded-2xl bg-mist p-3 text-sm">
          <p>Starting cash: ₱{shift.starting_cash.toFixed(2)}</p>
          <p>Valid cash sales: ₱{shift.cash_sales.toFixed(2)}</p>
          <p className="font-bold">
            Expected cash: ₱{shift.expected_cash.toFixed(2)}
          </p>
        </div>
      ) : null}
      <Field
        label={turnoverMode ? 'Counted cash' : 'Starting cash'}
        name="amount"
        type="number"
        min={0}
        step="0.01"
        value={amount}
        onChange={(event) => setAmount(event.target.value)}
      />
      <Field
        label={hasDiscrepancy ? 'Discrepancy reason' : 'Notes (optional)'}
        name="notes"
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
      />
      {variance !== null ? (
        <p
          className={
            hasDiscrepancy
              ? 'rounded-2xl bg-warning/10 p-3 text-sm font-bold text-warning'
              : 'rounded-2xl bg-success/10 p-3 text-sm font-bold text-success'
          }
        >
          {hasDiscrepancy
            ? `Cash Difference: ${variance < 0 ? '-' : '+'}₱${Math.abs(variance).toFixed(2)}`
            : 'Cash Balanced'}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      <Button
        onClick={() => void submit()}
        disabled={busy || (hasDiscrepancy && !notes.trim())}
      >
        {busy
          ? 'Saving…'
          : turnoverMode
            ? 'End shift and submit turnover'
            : 'Open shift'}
      </Button>
    </div>
  );
}
