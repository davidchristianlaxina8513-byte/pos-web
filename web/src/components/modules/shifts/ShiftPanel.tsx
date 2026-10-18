'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/form/Button';
import { openShift, submitTurnover } from '@/features/shifts/actions';
import type { CashierShift } from '@/features/shifts/queries';
import { useAlert } from '@/components/toast';
import {
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@/components/common/hero-icons';
import { cn } from '@/lib/cn';

interface ShiftPanelProps {
  shift: CashierShift | null;
  turnoverMode?: boolean;
  cashierEmail?: string;
  onSwitchToTurnover?: () => void;
}

const STARTING_FLOAT_PRESETS = [500, 1000, 1500, 2000, 3000, 5000];

/** Full-width DCASIS form matching authentic sports-client / athlete form architecture. */
export function ShiftPanel({
  shift,
  turnoverMode = false,
  cashierEmail,
  onSwitchToTurnover,
}: ShiftPanelProps) {
  const router = useRouter();
  const { successAlert, errorAlert } = useAlert();
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOpen = shift?.status === 'open';
  const countedCash = amount.trim() === '' ? null : Number(amount);
  const variance =
    isOpen &&
    turnoverMode &&
    countedCash !== null &&
    Number.isFinite(countedCash)
      ? countedCash - shift.expected_cash
      : null;
  const hasDiscrepancy = variance !== null && Math.abs(variance) >= 0.005;

  const submit = async () => {
    setBusy(true);
    setError(null);
    const isTurnover = isOpen && turnoverMode;
    const result = isTurnover
      ? await submitTurnover(shift.shift_id, Number(amount), notes)
      : await openShift(Number(amount), notes);
    setBusy(false);

    if (!result.ok) {
      setError(result.error);
      errorAlert(
        isTurnover ? 'Turnover Failed' : 'Shift Open Failed',
        result.error,
      );
      return;
    }

    setAmount('');
    setNotes('');
    successAlert(
      isTurnover ? 'Turnover Submitted' : 'Shift Opened',
      isTurnover
        ? 'Cash turnover submitted successfully. Shift has been closed.'
        : 'Shift has been opened successfully. Register is ready for sales.',
    );
    router.refresh();
  };

  // Case 1: Shift is already open and viewing "Cashier Shift" tab
  if (isOpen && !turnoverMode) {
    return (
      <div className="divide-y divide-gray-900/10 dark:divide-border/60">
        {/* Section 1: Active Register Session */}
        <div className="grid grid-cols-1 gap-x-8 gap-y-8 py-8 md:grid-cols-3">
          <div className="px-4 sm:px-0">
            <h2 className="text-base font-semibold leading-7 text-foreground">
              Active Shift Session
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              Live details of your currently open cash register session.
            </p>
          </div>

          <div className="bg-surface shadow-xs ring-1 ring-border sm:rounded-xl md:col-span-2">
            <div className="px-4 py-6 sm:p-8 space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                <div>
                  <span className="block text-xs font-semibold uppercase tracking-wider text-muted">
                    Cashier Account
                  </span>
                  <p className="mt-1 font-bold text-foreground break-all text-sm">
                    {cashierEmail || 'Active Cashier'}
                  </p>
                </div>

                <div>
                  <span className="block text-xs font-semibold uppercase tracking-wider text-muted">
                    Shift Started
                  </span>
                  <p className="mt-1 font-bold text-foreground text-sm">
                    {new Date(shift.started_at).toLocaleTimeString('en-PH', {
                      timeZone: 'Asia/Manila',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </p>
                  <p className="text-xs text-muted">
                    {new Date(shift.started_at).toLocaleDateString('en-PH', {
                      timeZone: 'Asia/Manila',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>

                <div>
                  <span className="block text-xs font-semibold uppercase tracking-wider text-muted">
                    Register Status
                  </span>
                  <div className="mt-1">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      Live &amp; Accepting Sales
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Real-time Drawer Cash Breakdown */}
        <div className="grid grid-cols-1 gap-x-8 gap-y-8 py-8 md:grid-cols-3">
          <div className="px-4 sm:px-0">
            <h2 className="text-base font-semibold leading-7 text-foreground">
              Drawer Cash Summary
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              Live reconciliation of physical cash currently expected in your
              cash drawer.
            </p>
          </div>

          <div className="bg-surface shadow-xs ring-1 ring-border sm:rounded-xl md:col-span-2">
            <div className="px-4 py-6 sm:p-8 space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-border bg-mist/40 p-4">
                  <span className="text-xs font-semibold uppercase text-muted">
                    Starting Float
                  </span>
                  <p className="mt-1 text-2xl font-black text-foreground">
                    ₱{shift.starting_cash.toFixed(2)}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">Opening balance</p>
                </div>

                <div className="rounded-xl border border-border bg-mist/40 p-4">
                  <span className="text-xs font-semibold uppercase text-muted">
                    Cash Sales Collected
                  </span>
                  <p className="mt-1 text-2xl font-black text-foreground">
                    ₱{shift.cash_sales.toFixed(2)}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    Valid physical cash orders
                  </p>
                </div>

                <div className="rounded-xl border border-pine/30 bg-pine/5 p-4">
                  <span className="text-xs font-semibold uppercase text-pine font-bold">
                    Expected in Drawer
                  </span>
                  <p className="mt-1 text-2xl font-black text-pine">
                    ₱{shift.expected_cash.toFixed(2)}
                  </p>
                  <p className="mt-0.5 text-xs text-pine/80 font-medium">
                    Float + cash sales
                  </p>
                </div>
              </div>

              {/* Shift Close Guidance Callout */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-border bg-mist/30 p-4">
                <div className="text-xs text-foreground">
                  <p className="font-bold">Ready to close register?</p>
                  <p className="text-muted mt-0.5">
                    Switch to the Cash Turnover tab to count drawer bills and
                    coins and submit closing turnover.
                  </p>
                </div>
                {onSwitchToTurnover && (
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={onSwitchToTurnover}
                    className="shrink-0"
                  >
                    Count Cash &amp; Submit Turnover →
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Case 2: No active shift and viewing "Cash Turnover" tab
  if (!isOpen && turnoverMode) {
    return (
      <div className="rounded-xl border border-border bg-surface p-8 text-center shadow-xs">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
          <ClockIcon className="h-6 w-6" />
        </div>
        <h3 className="mt-4 text-base font-bold text-foreground">
          No Active Shift Open
        </h3>
        <p className="mt-1.5 text-xs text-muted max-w-md mx-auto leading-relaxed">
          You must have an open register shift before you can count cash and
          submit a drawer turnover.
        </p>
        {onSwitchToTurnover && (
          <div className="mt-5">
            <Button
              type="button"
              variant="primary"
              onClick={onSwitchToTurnover}
            >
              Start a Shift →
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Case 3: Shift is open and viewing "Cash Turnover" tab
  if (isOpen && turnoverMode) {
    return (
      <div className="divide-y divide-gray-900/10 dark:divide-border/60">
        {/* Error Feedback */}
        {error && (
          <div
            role="alert"
            className="mb-6 flex items-center gap-2.5 rounded-xl border border-danger-border bg-danger-surface p-4 text-sm font-semibold text-danger shadow-xs"
          >
            <ExclamationTriangleIcon className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Section 1: Register Reconciliation Summary */}
        <div className="grid grid-cols-1 gap-x-8 gap-y-8 py-8 md:grid-cols-3">
          <div className="px-4 sm:px-0">
            <h2 className="text-base font-semibold leading-7 text-foreground">
              Shift Closing Summary
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              Verify system recorded cash sales and starting float before
              counting the physical cash drawer.
            </p>
          </div>

          <div className="bg-surface shadow-xs ring-1 ring-border sm:rounded-xl md:col-span-2">
            <div className="px-4 py-6 sm:p-8 space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-border bg-mist/40 p-4">
                  <span className="text-xs font-semibold uppercase text-muted">
                    Starting Float
                  </span>
                  <p className="mt-1 text-2xl font-black text-foreground">
                    ₱{shift.starting_cash.toFixed(2)}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">Opening balance</p>
                </div>

                <div className="rounded-xl border border-border bg-mist/40 p-4">
                  <span className="text-xs font-semibold uppercase text-muted">
                    Cash Sales Collected
                  </span>
                  <p className="mt-1 text-2xl font-black text-foreground">
                    ₱{shift.cash_sales.toFixed(2)}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    Valid physical cash orders
                  </p>
                </div>

                <div className="rounded-xl border border-pine/30 bg-pine/5 p-4">
                  <span className="text-xs font-semibold uppercase text-pine font-bold">
                    Expected in Drawer
                  </span>
                  <p className="mt-1 text-2xl font-black text-pine">
                    ₱{shift.expected_cash.toFixed(2)}
                  </p>
                  <p className="mt-0.5 text-xs text-pine/80 font-medium">
                    Float + cash sales
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Physical Drawer Count & Discrepancy Reconciliation */}
        <div className="grid grid-cols-1 gap-x-8 gap-y-8 py-8 md:grid-cols-3">
          <div className="px-4 sm:px-0">
            <h2 className="text-base font-semibold leading-7 text-foreground">
              Drawer Cash Count
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              Physically count all paper bills and coins currently in the cash
              drawer and enter the total counted amount.
            </p>
          </div>

          <div className="bg-surface shadow-xs ring-1 ring-border sm:rounded-xl md:col-span-2">
            <div className="px-4 py-6 sm:p-8 space-y-6">
              {/* Quick Action: Match Expected */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-2">
                  Quick Actions
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAmount(shift.expected_cash.toFixed(2))}
                    className="inline-flex items-center gap-1.5 rounded-full border border-pine/30 bg-pine/10 px-3.5 py-1.5 text-xs font-bold text-pine hover:bg-pine/20 cursor-pointer transition shadow-2xs"
                  >
                    <CheckCircleIcon className="h-4 w-4" />
                    <span>
                      Match Expected Total (₱{shift.expected_cash.toFixed(2)})
                    </span>
                  </button>
                </div>
              </div>

              {/* Counted Cash Input */}
              <div>
                <div className="flex">
                  <label
                    htmlFor="countedCash"
                    className="block text-sm font-medium leading-6 text-foreground"
                  >
                    Physical Counted Cash (PHP)
                  </label>
                  <span className="text-red-500 ml-1">*</span>
                </div>
                <div className="relative mt-2">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <span className="text-muted font-bold text-sm">₱</span>
                  </div>
                  <input
                    id="countedCash"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="block w-full h-11 rounded-md border-0 py-2.5 pl-8 pr-3 bg-surface text-foreground shadow-xs ring-1 ring-inset ring-border placeholder:text-muted focus:ring-2 focus:ring-inset focus:ring-pine text-base sm:text-sm font-semibold"
                  />
                </div>
                <p className="mt-1.5 text-xs text-muted">
                  Total sum of all paper currency and coins counted in the
                  drawer.
                </p>
              </div>

              {/* Live Variance Calculation Banner */}
              {variance !== null && (
                <div
                  className={cn(
                    'rounded-xl border p-4 text-sm font-bold flex flex-wrap items-center justify-between gap-3 shadow-2xs',
                    hasDiscrepancy
                      ? variance < 0
                        ? 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400'
                        : 'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300'
                      : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300',
                  )}
                >
                  <div className="flex items-center gap-2">
                    {hasDiscrepancy ? (
                      <ExclamationTriangleIcon className="h-5 w-5 shrink-0" />
                    ) : (
                      <CheckCircleIcon className="h-5 w-5 shrink-0" />
                    )}
                    <span>
                      {hasDiscrepancy
                        ? `Cash Variance: ${variance < 0 ? '-₱' : '+₱'}${Math.abs(variance).toFixed(2)} (${variance < 0 ? 'Drawer Shortage' : 'Drawer Overage'})`
                        : 'Drawer Cash Balanced (Exact Match)'}
                    </span>
                  </div>
                  {hasDiscrepancy && (
                    <span className="inline-flex rounded-full bg-rose-500/20 px-2.5 py-0.5 text-xs font-black uppercase tracking-wider text-rose-800 dark:text-rose-300">
                      Discrepancy Reason Required
                    </span>
                  )}
                </div>
              )}

              {/* Discrepancy Reason / Shift Notes */}
              <div>
                <div className="flex">
                  <label
                    htmlFor="turnoverNotes"
                    className="block text-sm font-medium leading-6 text-foreground"
                  >
                    {hasDiscrepancy
                      ? 'Reason for Cash Difference'
                      : 'Turnover Notes'}
                  </label>
                  {hasDiscrepancy ? (
                    <span className="text-red-500 ml-1">*</span>
                  ) : (
                    <span className="text-xs text-muted font-normal ml-1">
                      (optional)
                    </span>
                  )}
                </div>
                <div className="mt-2">
                  <input
                    id="turnoverNotes"
                    type="text"
                    required={hasDiscrepancy}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={
                      hasDiscrepancy
                        ? 'e.g., Short change on cash order #12, coin rounding, denomination mismatch...'
                        : 'e.g., Regular shift closing, cash counted accurately...'
                    }
                    className={cn(
                      'block w-full h-11 rounded-md border-0 py-2.5 px-3 bg-surface text-foreground shadow-xs ring-1 ring-inset placeholder:text-muted focus:ring-2 focus:ring-inset sm:text-sm',
                      hasDiscrepancy
                        ? 'ring-rose-400 focus:ring-rose-500'
                        : 'ring-border focus:ring-pine',
                    )}
                  />
                </div>
                <p className="mt-1.5 text-xs text-muted">
                  {hasDiscrepancy
                    ? 'Required: Explain why counted cash does not match expected total. This will be recorded in the audit trail for manager review.'
                    : 'Optional remarks saved with your turnover record.'}
                </p>
              </div>

              {/* Policy Callout */}
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                <strong className="font-bold">Turnover Policy:</strong>{' '}
                Submitting turnover closes your active register shift. Once
                closed, you must open a new shift to process orders. Any cash
                variance is permanently logged in the audit trail.
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-x-3 py-6">
          {amount && (
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() => {
                setAmount('');
                setNotes('');
              }}
            >
              Reset Count
            </Button>
          )}
          <Button
            type="button"
            variant={hasDiscrepancy && variance < 0 ? 'danger' : 'primary'}
            disabled={
              busy ||
              !amount.trim() ||
              Number(amount) < 0 ||
              (hasDiscrepancy && !notes.trim())
            }
            onClick={() => void submit()}
          >
            {busy
              ? 'Submitting Turnover…'
              : 'Submit Cash Turnover & Close Shift'}
          </Button>
        </div>
      </div>
    );
  }

  // Case 4: Shift is NOT open and viewing "Cashier Shift" tab (Start New Shift Form)
  return (
    <div className="divide-y divide-gray-900/10 dark:divide-border/60">
      {/* Error Feedback */}
      {error && (
        <div
          role="alert"
          className="mb-6 flex items-center gap-2.5 rounded-xl border border-danger-border bg-danger-surface p-4 text-sm font-semibold text-danger shadow-xs"
        >
          <ExclamationTriangleIcon className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Section 1: Cashier & Register Session Identity */}
      <div className="grid grid-cols-1 gap-x-8 gap-y-8 py-8 md:grid-cols-3">
        <div className="px-4 sm:px-0">
          <h2 className="text-base font-semibold leading-7 text-foreground">
            Register Session
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            Verify the active cashier identity and register session before
            opening the cash drawer.
          </p>
        </div>

        <div className="bg-surface shadow-xs ring-1 ring-border sm:rounded-xl md:col-span-2">
          <div className="px-4 py-6 sm:p-8 space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium leading-6 text-foreground">
                  Cashier Account
                </label>
                <div className="mt-2">
                  <input
                    type="text"
                    disabled
                    value={cashierEmail || 'Active Cashier'}
                    className="block w-full h-11 rounded-md border-0 py-2.5 px-3 bg-mist/60 text-foreground font-semibold shadow-xs ring-1 ring-inset ring-border sm:text-sm cursor-not-allowed"
                  />
                </div>
                <p className="mt-1.5 text-xs text-muted">
                  Current authenticated staff member operating this register.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium leading-6 text-foreground">
                  Opening Date &amp; Status
                </label>
                <div className="mt-2 flex items-center h-11 px-3 rounded-md bg-mist/60 ring-1 ring-inset ring-border text-sm font-medium text-foreground">
                  <ClockIcon className="h-4 w-4 mr-2 text-pine" />
                  {new Date().toLocaleDateString('en-PH', {
                    timeZone: 'Asia/Manila',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}{' '}
                  — Ready to open
                </div>
                <p className="mt-1.5 text-xs text-muted">
                  Manila local timestamp will be recorded on shift open.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Opening Cash Drawer Float */}
      <div className="grid grid-cols-1 gap-x-8 gap-y-8 py-8 md:grid-cols-3">
        <div className="px-4 sm:px-0">
          <h2 className="text-base font-semibold leading-7 text-foreground">
            Opening Cash Float
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            Count and record the initial cash float placed into the drawer
            before taking customer orders.
          </p>
        </div>

        <div className="bg-surface shadow-xs ring-1 ring-border sm:rounded-xl md:col-span-2">
          <div className="px-4 py-6 sm:p-8 space-y-6">
            {/* Quick Float Preset Chips */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-2.5">
                Quick Select Starting Float
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {STARTING_FLOAT_PRESETS.map((preset) => {
                  const isSelected = amount.trim() === String(preset);
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAmount(String(preset))}
                      className={cn(
                        'rounded-full px-3.5 py-1.5 text-xs font-bold transition cursor-pointer shadow-2xs',
                        isSelected
                          ? 'bg-pine text-surface ring-1 ring-pine'
                          : 'border border-border bg-surface text-foreground hover:bg-mist',
                      )}
                    >
                      ₱{preset.toLocaleString()}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Starting Cash Input */}
            <div>
              <div className="flex">
                <label
                  htmlFor="startingCash"
                  className="block text-sm font-medium leading-6 text-foreground"
                >
                  Starting Cash Float (PHP)
                </label>
                <span className="text-red-500 ml-1">*</span>
              </div>
              <div className="relative mt-2">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <span className="text-muted font-bold text-sm">₱</span>
                </div>
                <input
                  id="startingCash"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="block w-full h-11 rounded-md border-0 py-2.5 pl-8 pr-3 bg-surface text-foreground shadow-xs ring-1 ring-inset ring-border placeholder:text-muted focus:ring-2 focus:ring-inset focus:ring-pine text-base sm:text-sm font-semibold"
                />
              </div>
              <p className="mt-1.5 text-xs text-muted">
                Initial paper and coin fund provided for customer change.
              </p>
            </div>

            {/* Shift Notes */}
            <div>
              <label
                htmlFor="shiftNotes"
                className="block text-sm font-medium leading-6 text-foreground"
              >
                Opening Notes{' '}
                <span className="text-xs text-muted font-normal">
                  (optional)
                </span>
              </label>
              <div className="mt-2">
                <input
                  id="shiftNotes"
                  type="text"
                  placeholder="e.g. Morning shift, Terminal 1 drawer verified..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="block w-full h-11 rounded-md border-0 py-2.5 px-3 bg-surface text-foreground shadow-xs ring-1 ring-inset ring-border placeholder:text-muted focus:ring-2 focus:ring-inset focus:ring-pine sm:text-sm"
                />
              </div>
            </div>

            {/* Cash Drawer Rule Callout */}
            <div className="rounded-lg border border-pine/20 bg-pine/5 p-4 text-xs text-foreground leading-relaxed">
              <strong className="text-pine font-bold">Cash Drawer Rule:</strong>{' '}
              Opening cash float is excluded from net sales and is used as the
              starting baseline to calculate expected physical cash drawer
              balance when you submit your shift turnover.
            </div>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-end gap-x-3 py-6">
        {amount && (
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={() => {
              setAmount('');
              setNotes('');
            }}
          >
            Clear
          </Button>
        )}
        <Button
          type="button"
          variant="primary"
          disabled={busy || !amount.trim() || Number(amount) < 0}
          onClick={() => void submit()}
        >
          {busy ? 'Starting Shift…' : 'Start Shift & Open Drawer'}
        </Button>
      </div>
    </div>
  );
}
