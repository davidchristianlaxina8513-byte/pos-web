'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { Modal } from '@/components/modal/Modal';
import { Button } from '@/components/form/Button';
import { Card } from '@/components/common/Card';
import { EmptyState } from '@/components/error/EmptyState';
import { ClockIcon } from '@/components/common/icons';
import { useAlert } from '@/components/toast';
import { cn } from '@/lib/cn';
import {
  getActiveOrders,
  updateOrderStatusAction,
} from '@/features/pos/actions';
import type { ActiveOrder, OrderStatus } from '@/features/pos/types';

interface ActiveOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCountChange?: (count: number) => void;
}

interface StatusBadgeConfig {
  label: string;
  badgeClass: string;
  actionLabel?: string;
  nextStatus?: OrderStatus;
}

const DEFAULT_BADGE: StatusBadgeConfig = {
  label: 'Pending',
  badgeClass:
    'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800',
  actionLabel: 'Start Preparing',
  nextStatus: 'preparing',
};

const STATUS_BADGES: Record<string, StatusBadgeConfig> = {
  pending: DEFAULT_BADGE,
  preparing: {
    label: 'Preparing',
    badgeClass:
      'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300 dark:border-blue-800',
    actionLabel: 'Mark Ready',
    nextStatus: 'ready',
  },
  ready: {
    label: 'Ready',
    badgeClass:
      'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-300 dark:border-purple-800',
    actionLabel: 'Mark Served / Fulfilled',
    nextStatus: 'completed',
  },
};

function formatElapsed(dateString: string): string {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins === 1) return '1 min ago';
  if (mins < 60) return `${mins} mins ago`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ${mins % 60}m ago`;
}

export function ActiveOrdersModal({
  isOpen,
  onClose,
  onCountChange,
}: ActiveOrdersModalProps) {
  const { successAlert, errorAlert } = useAlert();
  const [orders, setOrders] = useState<ActiveOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState<
    'all' | 'pending' | 'preparing' | 'ready'
  >('all');
  const [isPendingTransition, startTransition] = useTransition();

  const refreshOrders = async () => {
    setIsLoading(true);
    try {
      const data = await getActiveOrders();
      setOrders(data);
      onCountChange?.(data.length);
    } catch {
      // Ignore load error
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchOrders = () => {
      getActiveOrders()
        .then((data) => {
          if (!isMounted) return;
          setOrders(data);
          onCountChange?.(data.length);
          setIsLoading(false);
        })
        .catch(() => {
          if (!isMounted) return;
          setIsLoading(false);
        });
    };

    fetchOrders();
    const timer = setInterval(fetchOrders, 15000);
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [isOpen, onCountChange]);

  const handleProgress = (order: ActiveOrder) => {
    const nextStatus = STATUS_BADGES[order.status]?.nextStatus;
    if (!nextStatus) return;

    startTransition(async () => {
      const res = await updateOrderStatusAction(
        order.transaction_id,
        nextStatus,
      );
      if (!res.ok) {
        errorAlert('Update Failed', res.error);
        return;
      }
      successAlert(
        'Order Updated',
        `Order #${order.order_number ?? ''} is now ${STATUS_BADGES[nextStatus]?.label}.`,
      );
      void refreshOrders();
    });
  };

  const filteredOrders = orders.filter((o) => {
    if (filter === 'all') return true;
    return o.status === filter;
  });

  const filterChips = [
    { key: 'all' as const, label: 'All Active', count: orders.length },
    {
      key: 'pending' as const,
      label: 'Pending',
      count: orders.filter((o) => o.status === 'pending').length,
    },
    {
      key: 'preparing' as const,
      label: 'Preparing',
      count: orders.filter((o) => o.status === 'preparing').length,
    },
    {
      key: 'ready' as const,
      label: 'Ready',
      count: orders.filter((o) => o.status === 'ready').length,
    },
  ];

  return (
    <Modal
      title="Active / Pending Orders"
      isOpen={isOpen}
      size="2xl"
      onOpenChange={(open: boolean) => {
        if (!open) onClose();
      }}
    >
      <div className="flex flex-col gap-4">
        {/* Header toolbar with DCASIS filter chips and Button */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
          <div
            className="flex flex-wrap items-center gap-1.5"
            role="group"
            aria-label="Filter active orders"
          >
            {filterChips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={() => setFilter(chip.key)}
                aria-pressed={filter === chip.key}
                className={cn(
                  'action-focus inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer',
                  filter === chip.key
                    ? 'border-pine bg-pine text-surface shadow-xs'
                    : 'border-border/80 bg-white text-foreground hover:bg-mist',
                )}
              >
                <span>{chip.label}</span>
                <span
                  className={cn(
                    'rounded px-1.5 py-0.5 text-[11px] font-semibold',
                    filter === chip.key
                      ? 'bg-white/20 text-surface'
                      : 'bg-mist text-muted',
                  )}
                >
                  {chip.count}
                </span>
              </button>
            ))}
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => void refreshOrders()}
            disabled={isLoading || isPendingTransition}
          >
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>

        {/* Content list */}
        {filteredOrders.length === 0 ? (
          <div className="py-10">
            <EmptyState
              icon={<ClockIcon className="h-10 w-10 text-muted/60" />}
              title="No active orders"
              sub="Orders placed at checkout will appear here until they are fulfilled and served."
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
            {filteredOrders.map((order) => {
              const badge = STATUS_BADGES[order.status] ?? DEFAULT_BADGE;
              return (
                <Card
                  key={order.transaction_id}
                  title={
                    order.order_number !== null
                      ? `Order #${order.order_number}`
                      : 'Order'
                  }
                  actions={
                    <span
                      className={cn(
                        'rounded-full border px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide',
                        badge.badgeClass,
                      )}
                    >
                      {badge.label}
                    </span>
                  }
                  className="rounded-xl border-border/80 shadow-xs [&>header]:px-4 [&>header]:py-2.5 [&>div]:p-4"
                >
                  <div className="flex flex-col justify-between gap-3">
                    <div className="flex items-center justify-between text-xs text-muted">
                      <span className="font-mono">
                        {order.transaction_number}
                      </span>
                      <span suppressHydrationWarning>
                        {formatElapsed(order.date)}
                      </span>
                    </div>

                    {/* Items List */}
                    <ul className="space-y-1 rounded-lg bg-mist/50 p-2 text-xs">
                      {order.items.map((item, idx) => (
                        <li
                          key={idx}
                          className="flex items-center justify-between text-foreground"
                        >
                          <span className="font-semibold">
                            {item.quantity}× {item.name}
                          </span>
                          <span className="text-muted">
                            ₱{item.subtotal.toFixed(2)}
                          </span>
                        </li>
                      ))}
                    </ul>

                    {/* Actions row */}
                    <div className="flex items-center justify-between border-t border-border/60 pt-2.5">
                      <span className="text-xs font-extrabold text-leaf">
                        ₱{order.total_amount.toFixed(2)}
                      </span>

                      <div className="flex items-center gap-2">
                        <Link href={`/pos/receipt/${order.transaction_id}`}>
                          <Button variant="secondary" size="sm">
                            Receipt
                          </Button>
                        </Link>

                        {badge.actionLabel && badge.nextStatus ? (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleProgress(order)}
                            disabled={isPendingTransition}
                          >
                            {badge.actionLabel}
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}
