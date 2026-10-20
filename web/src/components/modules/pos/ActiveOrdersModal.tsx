'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { Modal } from '@/components/modal/Modal';
import { Button } from '@/components/form/Button';
import { Field } from '@/components/form/Field';
import { PasswordField } from '@/components/form/PasswordField';
import { EmptyState } from '@/components/error/EmptyState';
import {
  ClockIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  TableCellsIcon,
  Squares2X2Icon,
  MagnifyingGlassIcon,
  ArrowRightIcon,
  DocumentTextIcon,
  ReceiptRefundIcon,
  ShoppingBagIcon,
} from '@/components/common/hero-icons';
import { useAlert } from '@/components/toast';
import { cn } from '@/lib/cn';
import {
  getActiveOrders,
  updateOrderStatusAction,
  voidOrderAction,
} from '@/features/pos/actions';
import type { ActiveOrder, OrderStatus } from '@/features/pos/types';

interface ActiveOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCountChange?: (count: number) => void;
  isAdmin?: boolean;
}

interface StatusBadgeConfig {
  label: string;
  badgeClass: string;
  dotClass: string;
  cardBorderClass: string;
  actionLabel?: string;
  nextStatus?: OrderStatus;
  actionButtonClass?: string;
}

const DEFAULT_BADGE: StatusBadgeConfig = {
  label: 'Pending',
  badgeClass:
    'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800',
  dotClass: 'bg-amber-500',
  cardBorderClass: 'border-t-4 border-t-amber-500',
  actionLabel: 'Start Preparing',
  nextStatus: 'preparing',
  actionButtonClass: 'bg-pine hover:bg-pine-deep text-white',
};

const STATUS_BADGES: Record<string, StatusBadgeConfig> = {
  pending: DEFAULT_BADGE,
  preparing: {
    label: 'Preparing',
    badgeClass:
      'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300 dark:border-blue-800',
    dotClass: 'bg-blue-500',
    cardBorderClass: 'border-t-4 border-t-blue-500',
    actionLabel: 'Mark Ready for Pickup',
    nextStatus: 'ready',
    actionButtonClass: 'bg-blue-600 hover:bg-blue-700 text-white',
  },
  ready: {
    label: 'Ready for Pickup',
    badgeClass:
      'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-300 dark:border-purple-800',
    dotClass: 'bg-purple-500',
    cardBorderClass: 'border-t-4 border-t-purple-500',
    actionLabel: 'Mark Served / Fulfilled',
    nextStatus: 'completed',
    actionButtonClass: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  },
};

function getElapsedInfo(dateString: string): {
  text: string;
  isUrgent: boolean;
  isWarning: boolean;
} {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diffMs / 60000);
  let text = 'Just now';
  if (mins === 1) text = '1 min ago';
  else if (mins < 60) text = `${mins} mins ago`;
  else {
    const hours = Math.floor(mins / 60);
    text = `${hours}h ${mins % 60}m ago`;
  }
  return {
    text,
    isUrgent: mins >= 25,
    isWarning: mins >= 15 && mins < 25,
  };
}

export function ActiveOrdersModal({
  isOpen,
  onClose,
  onCountChange,
  isAdmin = false,
}: ActiveOrdersModalProps) {
  const { successAlert, errorAlert } = useAlert();
  const [orders, setOrders] = useState<ActiveOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [filter, setFilter] = useState<
    'all' | 'pending' | 'preparing' | 'ready'
  >('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [orderToVoid, setOrderToVoid] = useState<ActiveOrder | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [managerEmail, setManagerEmail] = useState('');
  const [managerPassword, setManagerPassword] = useState('');
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
        })
        .catch(() => {
          // Ignore load error
        });
    };

    fetchOrders();

    // Auto-refresh active orders every 10 seconds while modal is open
    const interval = setInterval(fetchOrders, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
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

  const handleConfirmVoid = () => {
    if (!orderToVoid) return;
    if (!isAdmin && (!managerEmail.trim() || !managerPassword)) {
      errorAlert(
        'Manager Authorization Required',
        'Please enter manager email and password to authorize this refund.',
      );
      return;
    }
    const finalReason = voidReason.trim() || 'Customer requested refund';

    startTransition(async () => {
      const res = await voidOrderAction(
        orderToVoid.transaction_id,
        finalReason,
        !isAdmin
          ? { email: managerEmail.trim(), password: managerPassword }
          : undefined,
      );
      if (!res.ok) {
        errorAlert('Refund Failed', res.error);
        return;
      }
      successAlert(
        'Order Cancelled & Refunded',
        `Order #${orderToVoid.order_number ?? ''} was cancelled and customer refund recorded.`,
      );
      setOrderToVoid(null);
      setVoidReason('');
      setManagerEmail('');
      setManagerPassword('');
      void refreshOrders();
    });
  };

  // Filter orders by status and search query
  const filteredOrders = orders.filter((o) => {
    const matchesStatus = filter === 'all' || o.status === filter;
    if (!matchesStatus) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const orderNo = String(o.order_number ?? '');
    const txnNo = o.transaction_number.toLowerCase();
    const itemNames = o.items.map((i) => i.name.toLowerCase()).join(' ');

    return orderNo.includes(q) || txnNo.includes(q) || itemNames.includes(q);
  });

  const preparingCount = orders.filter((o) => o.status === 'preparing').length;
  const readyCount = orders.filter((o) => o.status === 'ready').length;
  const pendingCount = orders.filter((o) => o.status === 'pending').length;
  const totalItemsCount = orders.reduce(
    (sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0),
    0,
  );

  const filterChips = [
    { key: 'all' as const, label: 'All Active', count: orders.length },
    {
      key: 'preparing' as const,
      label: 'Preparing',
      count: preparingCount,
    },
    {
      key: 'ready' as const,
      label: 'Ready for Pickup',
      count: readyCount,
    },
    ...(pendingCount > 0
      ? [
          {
            key: 'pending' as const,
            label: 'Pending',
            count: pendingCount,
          },
        ]
      : []),
  ];

  return (
    <Modal
      title="Active Orders Queue (Kitchen & Counter)"
      isOpen={isOpen}
      size="full"
      onOpenChange={(open: boolean) => {
        if (!open) onClose();
      }}
    >
      <div className="flex flex-col gap-4">
        {/* KPI Summary Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-border/80 bg-mist/40 p-3 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted">
                Active Queue
              </p>
              <p className="text-xl sm:text-2xl font-black text-foreground">
                {orders.length}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface border border-border/80 text-muted shadow-2xs">
              <ClockIcon className="h-5 w-5 text-pine" />
            </div>
          </div>

          <div className="rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20 p-3 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                In Preparation
              </p>
              <p className="text-xl sm:text-2xl font-black text-blue-900 dark:text-blue-100">
                {preparingCount}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold">
              🍳
            </div>
          </div>

          <div className="rounded-xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/50 dark:bg-purple-950/20 p-3 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
                Ready for Pickup
              </p>
              <p className="text-xl sm:text-2xl font-black text-purple-900 dark:text-purple-100">
                {readyCount}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-bold">
              🔔
            </div>
          </div>

          <div className="rounded-xl border border-border/80 bg-mist/40 p-3 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted">
                Items to Make
              </p>
              <p className="text-xl sm:text-2xl font-black text-foreground">
                {totalItemsCount}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface border border-border/80 text-muted shadow-2xs">
              <ShoppingBagIcon className="h-5 w-5 text-pine" />
            </div>
          </div>
        </div>

        {/* Top Control Bar: Status Filter Chips + Search + View Switcher + Refresh */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/70 pb-3 pt-1">
          {/* Status Filter Chips */}
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
                  'action-focus inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-bold transition-all cursor-pointer',
                  filter === chip.key
                    ? 'border-pine bg-pine text-surface shadow-xs scale-[1.02]'
                    : 'border-border/80 bg-surface text-foreground hover:bg-mist',
                )}
              >
                <span>{chip.label}</span>
                <span
                  className={cn(
                    'rounded-md px-1.5 py-0.5 text-[11px] font-black',
                    filter === chip.key
                      ? 'bg-surface/20 text-surface'
                      : 'bg-mist text-muted',
                  )}
                >
                  {chip.count}
                </span>
              </button>
            ))}
          </div>

          {/* Right Toolbar: Search, View Mode Toggle, and Refresh */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Quick search input */}
            <div className="relative min-w-[200px] max-w-xs">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5">
                <MagnifyingGlassIcon className="h-4 w-4 text-muted" />
              </div>
              <input
                type="text"
                placeholder="Search order #, item, txn…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full h-9.5 rounded-lg border-0 py-1.5 pl-8 pr-2.5 bg-surface text-foreground text-xs shadow-xs ring-1 ring-inset ring-border placeholder:text-muted focus:ring-2 focus:ring-inset focus:ring-pine"
              />
            </div>

            {/* View Mode Toggle: Cards vs Table */}
            <div className="flex items-center rounded-lg border border-border bg-mist/40 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                title="Kitchen Cards Board View"
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer',
                  viewMode === 'cards'
                    ? 'bg-surface text-foreground shadow-2xs'
                    : 'text-muted hover:text-foreground',
                )}
              >
                <Squares2X2Icon className="h-4 w-4" />
                <span className="hidden sm:inline">Cards View</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                title="Table / List View"
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer',
                  viewMode === 'table'
                    ? 'bg-surface text-foreground shadow-2xs'
                    : 'text-muted hover:text-foreground',
                )}
              >
                <TableCellsIcon className="h-4 w-4" />
                <span className="hidden sm:inline">List View</span>
              </button>
            </div>

            {/* Refresh Button */}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void refreshOrders()}
              disabled={isLoading || isPendingTransition}
              className="inline-flex items-center gap-1.5 h-9.5 px-3"
            >
              <ArrowPathIcon
                className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')}
              />
              <span className="text-xs font-semibold">
                {isLoading ? 'Updating…' : 'Refresh'}
              </span>
            </Button>
          </div>
        </div>

        {/* Content Section */}
        {filteredOrders.length === 0 ? (
          <div className="py-16 text-center">
            <EmptyState
              icon={
                <CheckCircleIcon className="h-14 w-14 text-emerald-500/60" />
              }
              title={
                searchQuery
                  ? 'No matching active orders'
                  : filter === 'all'
                    ? 'All Caught Up! 🎉'
                    : `No orders in ${filter} state`
              }
              sub={
                searchQuery
                  ? 'Try clearing the search query to view all active orders in queue.'
                  : 'All placed orders have been fulfilled. New paid transactions will automatically appear here.'
              }
            />
          </div>
        ) : viewMode === 'cards' ? (
          /* Redesigned Large & Organized Kitchen Order Cards */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-4.5 max-h-[72vh] overflow-y-auto pr-1">
            {filteredOrders.map((order) => {
              const badge = STATUS_BADGES[order.status] ?? DEFAULT_BADGE;
              const elapsed = getElapsedInfo(order.date);
              const totalItemsInOrder = order.items.reduce(
                (sum, it) => sum + it.quantity,
                0,
              );

              return (
                <div
                  key={order.transaction_id}
                  className={cn(
                    'rounded-2xl border border-border/90 bg-surface shadow-xs transition-all hover:shadow-md flex flex-col justify-between overflow-hidden',
                    badge.cardBorderClass,
                  )}
                >
                  <div className="p-4 sm:p-5 flex-1 flex flex-col">
                    {/* Top Row: Big Order Number + Status Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                            {order.order_number !== null
                              ? `Order #${order.order_number}`
                              : 'Order'}
                          </span>
                        </div>
                        <span className="font-mono text-xs text-muted block mt-0.5">
                          {order.transaction_number}
                        </span>
                      </div>

                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wider shrink-0 shadow-2xs',
                          badge.badgeClass,
                        )}
                      >
                        <span
                          className={cn(
                            'h-2 w-2 rounded-full animate-pulse',
                            badge.dotClass,
                          )}
                        />
                        {badge.label}
                      </span>
                    </div>

                    {/* Metadata Strip: Elapsed Time + Payment Mode */}
                    <div className="flex flex-wrap items-center gap-2 mt-3 pt-2.5 border-t border-border/50 text-xs">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold',
                          elapsed.isUrgent
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300'
                            : elapsed.isWarning
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300'
                              : 'bg-mist text-foreground/80 border border-border/60',
                        )}
                        suppressHydrationWarning
                      >
                        <ClockIcon className="h-3.5 w-3.5 shrink-0 opacity-70" />
                        <span>{elapsed.text}</span>
                      </span>

                      <span
                        className={cn(
                          'inline-flex items-center rounded-md px-2.5 py-1 text-xs font-extrabold uppercase tracking-wider border',
                          order.payment_mode === 'cash'
                            ? 'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300'
                            : 'bg-blue-50 text-blue-900 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300',
                        )}
                      >
                        {order.payment_mode === 'cash' ? 'Cash' : 'E-Wallet'}
                      </span>

                      {order.cashier_name && (
                        <span className="text-muted text-[11px] font-medium ml-auto">
                          Cashier: {order.cashier_name}
                        </span>
                      )}
                    </div>

                    {/* Organized Items List (Kitchen Order Detail) */}
                    <div className="mt-4 rounded-xl border border-border/70 bg-mist/40 p-3.5 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-muted mb-2">
                          <span>Items to Prepare</span>
                          <span className="text-pine font-extrabold">
                            {totalItemsInOrder}{' '}
                            {totalItemsInOrder === 1 ? 'item' : 'items'}
                          </span>
                        </div>

                        <ul className="divide-y divide-border/40">
                          {order.items.map((item, idx) => (
                            <li
                              key={idx}
                              className="flex items-center justify-between py-2 text-foreground"
                            >
                              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                <span className="flex h-7 min-w-[28px] items-center justify-center rounded-md bg-pine text-surface text-xs font-black px-1.5 shadow-2xs shrink-0">
                                  {item.quantity}×
                                </span>
                                <span className="font-bold text-sm sm:text-base tracking-tight truncate">
                                  {item.name}
                                </span>
                              </div>
                              <span className="text-xs font-semibold text-muted font-mono shrink-0">
                                ₱{item.subtotal.toFixed(2)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Total Amount in Items Box */}
                      <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center justify-between">
                        <span className="text-xs font-bold text-muted uppercase tracking-wider">
                          Total Paid
                        </span>
                        <span className="text-base sm:text-lg font-black text-leaf">
                          ₱{order.total_amount.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Actions Bottom Area */}
                  <div className="p-4 sm:p-5 pt-0 bg-surface space-y-2">
                    {/* Primary Large Touch-Friendly Fulfillment Button */}
                    {badge.actionLabel && badge.nextStatus ? (
                      <button
                        type="button"
                        onClick={() => handleProgress(order)}
                        disabled={isPendingTransition}
                        className={cn(
                          'action-focus flex h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold shadow-xs active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50',
                          badge.actionButtonClass ?? 'bg-pine text-white',
                        )}
                      >
                        {order.status === 'ready' ? (
                          <CheckCircleIcon className="h-4.5 w-4.5" />
                        ) : null}
                        <span>{badge.actionLabel}</span>
                        {order.status !== 'ready' ? (
                          <ArrowRightIcon className="h-4 w-4" />
                        ) : null}
                      </button>
                    ) : (
                      <div className="flex h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-50 text-emerald-800 text-sm font-bold border border-emerald-200">
                        <CheckCircleIcon className="h-4 w-4" />
                        <span>Order Fulfilled</span>
                      </div>
                    )}

                    {/* Secondary Discreet Utilities: View Receipt & Manager Refund */}
                    <div className="flex items-center justify-between pt-1">
                      <Link
                        href={`/pos/receipt/${order.transaction_id}`}
                        className="text-xs font-semibold text-pine hover:text-pine-deep hover:underline inline-flex items-center gap-1 py-1"
                      >
                        <DocumentTextIcon className="h-3.5 w-3.5" />
                        <span>View Receipt</span>
                      </Link>

                      <button
                        type="button"
                        onClick={() => setOrderToVoid(order)}
                        disabled={isPendingTransition}
                        className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer disabled:opacity-50 inline-flex items-center gap-1 py-1"
                        title="Cancel and refund this order (Manager step-up authorization required)"
                      >
                        <ReceiptRefundIcon className="h-3.5 w-3.5" />
                        <span>Cancel &amp; Refund</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* High-Density Table / List View */
          <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow-xs max-h-[70vh] overflow-y-auto">
            <table className="w-full text-left text-sm text-foreground">
              <thead className="sticky top-0 z-10 border-b border-border bg-mist/90 backdrop-blur-xs text-xs font-bold uppercase tracking-wider text-muted">
                <tr>
                  <th className="py-3.5 pl-4 pr-3 sm:pl-6">Order #</th>
                  <th className="px-3 py-3.5">Elapsed</th>
                  <th className="px-3 py-3.5">Items in Order</th>
                  <th className="px-3 py-3.5 text-right">Amount</th>
                  <th className="px-3 py-3.5 text-center">Status</th>
                  <th className="py-3.5 pl-3 pr-4 sm:pr-6 text-right">
                    Fulfillment Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredOrders.map((order) => {
                  const badge = STATUS_BADGES[order.status] ?? DEFAULT_BADGE;
                  const elapsed = getElapsedInfo(order.date);
                  return (
                    <tr
                      key={order.transaction_id}
                      className="hover:bg-mist/30 transition-colors"
                    >
                      {/* Order Number & Transaction ID */}
                      <td className="py-3.5 pl-4 pr-3 sm:pl-6 align-top">
                        <div className="font-black text-foreground text-lg tracking-tight flex items-center gap-2">
                          <span>
                            {order.order_number !== null
                              ? `#${order.order_number}`
                              : 'Order'}
                          </span>
                          <span
                            className={cn(
                              'inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                              order.payment_mode === 'cash'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200/80'
                                : 'bg-blue-100 text-blue-800 border border-blue-200/80',
                            )}
                          >
                            {order.payment_mode}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-muted mt-0.5">
                          {order.transaction_number}
                        </div>
                      </td>

                      {/* Time & Elapsed */}
                      <td className="px-3 py-3.5 whitespace-nowrap align-top">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold',
                            elapsed.isUrgent
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-mist text-foreground',
                          )}
                        >
                          <ClockIcon className="h-3 w-3 text-muted shrink-0" />
                          <span suppressHydrationWarning>{elapsed.text}</span>
                        </span>
                        <div className="text-[11px] text-muted mt-1 font-medium">
                          {new Date(order.date).toLocaleTimeString('en-PH', {
                            timeZone: 'Asia/Manila',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>

                      {/* Line Items Breakdown */}
                      <td className="px-3 py-3.5 align-top">
                        <div className="flex flex-wrap gap-1.5 max-w-lg">
                          {order.items.map((item, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1.5 rounded-md bg-mist/70 border border-border/70 px-2.5 py-1 text-xs text-foreground font-semibold"
                            >
                              <span className="font-black text-pine">
                                {item.quantity}×
                              </span>
                              <span>{item.name}</span>
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Total Amount */}
                      <td className="px-3 py-3.5 text-right font-black text-leaf whitespace-nowrap align-top text-base">
                        ₱{order.total_amount.toFixed(2)}
                      </td>

                      {/* Status Badge */}
                      <td className="px-3 py-3.5 text-center whitespace-nowrap align-top">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-extrabold uppercase tracking-wide',
                            badge.badgeClass,
                          )}
                        >
                          <span
                            className={cn(
                              'h-1.5 w-1.5 rounded-full',
                              badge.dotClass,
                            )}
                          />
                          {badge.label}
                        </span>
                      </td>

                      {/* Quick Action Button & Receipt */}
                      <td className="py-3.5 pl-3 pr-4 sm:pr-6 text-right whitespace-nowrap align-top">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/pos/receipt/${order.transaction_id}`}>
                            <Button variant="secondary" size="sm">
                              Receipt
                            </Button>
                          </Link>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setOrderToVoid(order)}
                            disabled={isPendingTransition}
                            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-xs font-semibold px-2 cursor-pointer"
                            title="Cancel and refund this order"
                          >
                            Cancel &amp; Refund
                          </Button>

                          {badge.actionLabel && badge.nextStatus ? (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleProgress(order)}
                              disabled={isPendingTransition}
                              className={cn(
                                badge.actionButtonClass ?? 'bg-pine text-white',
                              )}
                            >
                              {badge.actionLabel}
                            </Button>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-bold">
                              <CheckCircleIcon className="h-4 w-4" />
                              Fulfilled
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Cancel & Refund Confirmation Modal */}
        <Modal
          title="Cancel & Refund Order"
          isOpen={orderToVoid !== null}
          size="md"
          onOpenChange={(open: boolean) => {
            if (!open) {
              setOrderToVoid(null);
              setVoidReason('');
              setManagerEmail('');
              setManagerPassword('');
            }
          }}
          isDismissDisabled={isPendingTransition}
        >
          {orderToVoid && (
            <div className="space-y-4">
              {/* Transaction summary card */}
              <div className="rounded-xl border border-border bg-mist/40 p-3 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted">Order Number:</span>
                  <span className="font-bold text-foreground">
                    {orderToVoid.order_number !== null
                      ? `#${orderToVoid.order_number}`
                      : orderToVoid.transaction_number}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Transaction ID:</span>
                  <span className="font-mono text-foreground">
                    {orderToVoid.transaction_number}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Refund Amount:</span>
                  <span className="font-bold text-rose-600">
                    ₱{orderToVoid.total_amount.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Manager Authorization (Cashier only) */}
              {!isAdmin && (
                <div className="space-y-3">
                  <p className="text-xs text-muted">
                    Manager credentials are required to authorize this customer
                    refund.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field
                      id="mgr-email"
                      name="mgr-email"
                      label="Manager Email"
                      type="email"
                      placeholder="admin@elvira.cafe"
                      value={managerEmail}
                      onChange={(e) => setManagerEmail(e.target.value)}
                      disabled={isPendingTransition}
                    />
                    <PasswordField
                      id="mgr-pwd"
                      name="mgr-pwd"
                      label="Manager Password"
                      placeholder="••••••••"
                      value={managerPassword}
                      onChange={(e) => setManagerPassword(e.target.value)}
                      disabled={isPendingTransition}
                    />
                  </div>
                </div>
              )}

              {/* Refund Reason Input */}
              <div>
                <label
                  htmlFor="void-reason-input"
                  className="block text-xs font-semibold text-foreground mb-1"
                >
                  Reason for refund &amp; cancellation{' '}
                  <span className="text-danger">*</span>
                </label>
                <textarea
                  id="void-reason-input"
                  rows={3}
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  placeholder="e.g., Customer cancelled before preparation, wrong order punched..."
                  className="w-full rounded-md border border-border bg-white p-3 text-sm text-foreground placeholder:text-muted/60 focus:border-danger focus:outline-2 focus:outline-danger"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                <button
                  type="button"
                  disabled={isPendingTransition}
                  onClick={() => {
                    setOrderToVoid(null);
                    setVoidReason('');
                    setManagerEmail('');
                    setManagerPassword('');
                  }}
                  className="h-10 rounded-md border border-border bg-white px-4 text-sm font-semibold text-foreground hover:bg-mist disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isPendingTransition || !voidReason.trim()}
                  onClick={handleConfirmVoid}
                  className="action-focus inline-flex h-10 items-center rounded-md bg-rose-600 px-4 text-sm font-semibold text-white shadow-xs hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
                >
                  {isPendingTransition
                    ? 'Processing Refund...'
                    : 'Authorize Refund & Cancel'}
                </button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </Modal>
  );
}
