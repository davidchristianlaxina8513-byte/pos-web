'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/form/Button';
import { Card } from '@/components/common/Card';
import { useAlert } from '@/components/toast';
import { cn } from '@/lib/cn';
import { updateOrderStatusAction } from '@/features/pos/actions';
import type { OrderStatus } from '@/features/pos/types';

interface ReceiptOrderActionsProps {
  transactionId: string;
  status: OrderStatus;
  voidReason?: string | null;
  isAdmin?: boolean;
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
    label: 'Refunded',
    badgeClass:
      'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800',
    description: 'This transaction was refunded and customer payment returned.',
  },
};

export function ReceiptOrderActions({
  transactionId,
  status,
  children,
}: ReceiptOrderActionsProps) {
  const router = useRouter();
  const { successAlert, errorAlert } = useAlert();
  const [isPending, startTransition] = useTransition();

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
                <Button
                  variant="primary"
                  onClick={() => handleUpdateStatus('preparing')}
                  disabled={isPending}
                  className="w-full"
                >
                  {isPending ? 'Updating...' : 'Start Preparing'}
                </Button>
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
    </div>
  );
}
