'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/form/Button';
import { Field } from '@/components/form/Field';
import { PasswordField } from '@/components/form/PasswordField';
import { Card } from '@/components/common/Card';
import { Modal } from '@/components/modal/Modal';
import { useAlert } from '@/components/toast';
import { cn } from '@/lib/cn';
import {
  updateOrderStatusAction,
  voidOrderAction,
} from '@/features/pos/actions';
import type { OrderStatus } from '@/features/pos/types';

interface ReceiptOrderActionsProps {
  transactionId: string;
  status: OrderStatus;
  voidReason?: string | null;
  isAdmin: boolean;
  children?: React.ReactNode;
}

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; badgeClass: string; description: string }
> = {
  pending: {
    label: 'Pending',
    badgeClass:
      'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
    description: 'Order placed; waiting to be prepared.',
  },
  preparing: {
    label: 'Preparing',
    badgeClass:
      'bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
    description: 'Kitchen is currently preparing this order.',
  },
  ready: {
    label: 'Ready for Pickup',
    badgeClass:
      'bg-purple-50 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800',
    description: 'Order is ready to be served or picked up.',
  },
  completed: {
    label: 'Completed',
    badgeClass:
      'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
    description: 'Order has been fulfilled and served.',
  },
  cancelled: {
    label: 'Cancelled',
    badgeClass:
      'bg-neutral-100 text-neutral-700 border-neutral-300 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700',
    description: 'This order was cancelled.',
  },
  voided: {
    label: 'Voided',
    badgeClass:
      'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800',
    description: 'This transaction was voided and excluded from sales.',
  },
};

export function ReceiptOrderActions({
  transactionId,
  status,
  isAdmin,
  children,
}: ReceiptOrderActionsProps) {
  const router = useRouter();
  const { successAlert, errorAlert } = useAlert();
  const [isPending, startTransition] = useTransition();

  const [voidModalOpen, setVoidModalOpen] = useState(false);
  const [voidReasonInput, setVoidReasonInput] = useState('');
  const [managerEmail, setManagerEmail] = useState('');
  const [managerPassword, setManagerPassword] = useState('');

  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;

  const handleUpdateStatus = (newStatus: OrderStatus, notes?: string) => {
    startTransition(async () => {
      const res = await updateOrderStatusAction(
        transactionId,
        newStatus,
        notes,
      );
      if (!res.ok) {
        errorAlert('Order Status Update Failed', res.error);
        return;
      }
      successAlert(
        'Order Updated',
        `Status changed to ${STATUS_CONFIG[newStatus].label}.`,
      );
      router.refresh();
    });
  };

  const handleConfirmVoid = () => {
    if (!voidReasonInput.trim()) {
      errorAlert(
        'Reason Required',
        'Please provide a reason to void this transaction.',
      );
      return;
    }
    if (!isAdmin && (!managerEmail.trim() || !managerPassword)) {
      errorAlert(
        'Manager Authorization Required',
        'Please enter manager email and password to authorize this void.',
      );
      return;
    }

    startTransition(async () => {
      const res = await voidOrderAction(
        transactionId,
        voidReasonInput.trim(),
        !isAdmin
          ? { email: managerEmail.trim(), password: managerPassword }
          : undefined,
      );
      if (!res.ok) {
        errorAlert('Void Failed', res.error);
        return;
      }
      setVoidModalOpen(false);
      setVoidReasonInput('');
      setManagerEmail('');
      setManagerPassword('');
      successAlert('Transaction Voided', 'The transaction has been voided.');
      router.refresh();
    });
  };

  const isTerminal =
    status === 'completed' || status === 'cancelled' || status === 'voided';

  return (
    <div className="mt-4 flex flex-col gap-3 print:hidden">
      {/* Active Order Kitchen Progression Card */}
      {!isTerminal ? (
        <Card className="rounded-xl border border-border bg-surface shadow-xs [&>div]:p-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted">
                  Order Fulfillment
                </p>
                <p className="text-xs text-muted/80">{config.description}</p>
              </div>
              <span
                className={cn(
                  'rounded-full border px-2.5 py-0.5 text-xs font-extrabold uppercase tracking-wide',
                  config.badgeClass,
                )}
              >
                {config.label}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/60">
              {status === 'pending' && (
                <>
                  <Button
                    variant="primary"
                    onClick={() => handleUpdateStatus('preparing')}
                    disabled={isPending}
                    className="flex-1"
                  >
                    {isPending ? 'Updating...' : 'Start Preparing'}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setVoidModalOpen(true)}
                    disabled={isPending}
                    className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold"
                  >
                    Void Order
                  </Button>
                </>
              )}

              {status === 'preparing' && (
                <Button
                  variant="primary"
                  onClick={() => handleUpdateStatus('ready')}
                  disabled={isPending}
                  className="w-full"
                >
                  {isPending ? 'Updating...' : 'Mark as Ready for Pickup'}
                </Button>
              )}

              {status === 'ready' && (
                <Button
                  variant="primary"
                  onClick={() => handleUpdateStatus('completed')}
                  disabled={isPending}
                  className="w-full"
                >
                  {isPending ? 'Updating...' : 'Mark as Served / Fulfilled'}
                </Button>
              )}
            </div>
          </div>
        </Card>
      ) : null}

      {/* Primary Navigation & Print Button */}
      {children}

      {/* Discreet Void Action */}
      {status !== 'voided' ? (
        <div className="pt-1 text-center">
          <button
            type="button"
            onClick={() => setVoidModalOpen(true)}
            disabled={isPending}
            className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer disabled:opacity-50"
          >
            Void Transaction (Manager Authorization)
          </button>
        </div>
      ) : null}

      {/* Clean Void Modal */}
      <Modal
        title="Void Transaction"
        isOpen={voidModalOpen}
        onOpenChange={(open: boolean) => {
          if (!open) {
            setVoidModalOpen(false);
            setVoidReasonInput('');
            setManagerEmail('');
            setManagerPassword('');
          }
        }}
        size="md"
        isDismissDisabled={isPending}
      >
        <div className="space-y-4">
          <p className="text-sm text-foreground/80">
            Are you sure you want to void this transaction? This action will
            mark the transaction as voided, exclude its amounts from Daily
            Sales, and restore daily stock.
          </p>

          {/* Manager Authorization (Cashier only) */}
          {!isAdmin && (
            <div className="space-y-3">
              <p className="text-xs text-muted">
                Manager credentials are required to authorize this void.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field
                  id="receipt-mgr-email"
                  name="receipt-mgr-email"
                  label="Manager Email"
                  type="email"
                  placeholder="admin@elvira.cafe"
                  value={managerEmail}
                  onChange={(e) => setManagerEmail(e.target.value)}
                  disabled={isPending}
                />
                <PasswordField
                  id="receipt-mgr-pwd"
                  name="receipt-mgr-pwd"
                  label="Manager Password"
                  placeholder="••••••••"
                  value={managerPassword}
                  onChange={(e) => setManagerPassword(e.target.value)}
                  disabled={isPending}
                />
              </div>
            </div>
          )}

          {/* Void Reason Input */}
          <div>
            <label
              htmlFor="void-reason"
              className="block text-xs font-semibold text-foreground mb-1"
            >
              Reason for voiding <span className="text-danger">*</span>
            </label>
            <textarea
              id="void-reason"
              rows={3}
              value={voidReasonInput}
              onChange={(e) => setVoidReasonInput(e.target.value)}
              placeholder="e.g., Customer cancelled, incorrect order entry..."
              className="w-full rounded-md border border-border bg-white p-3 text-sm text-foreground placeholder:text-muted/60 focus:border-danger focus:outline-2 focus:outline-danger"
              disabled={isPending}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                setVoidModalOpen(false);
                setVoidReasonInput('');
                setManagerEmail('');
                setManagerPassword('');
              }}
              className="h-10 rounded-md border border-border bg-white px-4 text-sm font-semibold text-foreground hover:bg-mist disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isPending || !voidReasonInput.trim()}
              onClick={handleConfirmVoid}
              className="action-focus inline-flex h-10 items-center rounded-md bg-danger px-4 text-sm font-semibold text-surface shadow-xs hover:bg-danger/90 disabled:opacity-50 cursor-pointer"
            >
              {isPending ? 'Voiding...' : 'Confirm Void'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
