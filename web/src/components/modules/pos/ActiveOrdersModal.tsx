'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { Modal } from '@/components/modal/Modal';
import { Button } from '@/components/form/Button';
import { Field } from '@/components/form/Field';
import { PasswordField } from '@/components/form/PasswordField';
import { Card } from '@/components/common/Card';
import { EmptyState } from '@/components/error/EmptyState';
import {
  ClockIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  TableCellsIcon,
  Squares2X2Icon,
  MagnifyingGlassIcon,
  FireIcon,
  BellIcon,
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
  actionLabel?: string;
  nextStatus?: OrderStatus;
}

const DEFAULT_BADGE: StatusBadgeConfig = {
  label: 'Pending',
  badgeClass:
    'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
  dotClass: 'bg-amber-500',
  actionLabel: 'Start Preparing',
  nextStatus: 'preparing',
};

const STATUS_BADGES: Record<string, StatusBadgeConfig> = {
  pending: DEFAULT_BADGE,
  preparing: {
    label: 'Preparing',
    badgeClass:
      'bg-pine/10 text-pine border-pine/30 dark:bg-pine/20 dark:text-pine-light dark:border-pine/40',
    dotClass: 'bg-pine',
    actionLabel: 'Mark Ready',
    nextStatus: 'ready',
  },
  ready: {
    label: 'Ready for Pickup',
    badgeClass:
      'bg-leaf/10 text-leaf border-leaf/30 dark:bg-leaf/20 dark:text-leaf-light dark:border-leaf/40',
    dotClass: 'bg-leaf',
    actionLabel: 'Mark Served',
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
  isAdmin = false,
}: ActiveOrdersModalProps) {
  const { successAlert, errorAlert } = useAlert();
  const [orders, setOrders] = useState<ActiveOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
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
      title="Active / Pending Orders Queue"
      isOpen={isOpen}
      size="full"
      onOpenChange={(open: boolean) => {
        if (!open) onClose();
      }}
    >
      <div className="flex flex-col gap-4">
        {/* KPI Summary Banner - On Brand: neutral cards, standard border, pine accents */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="relative overflow-hidden rounded-card border border-border bg-surface p-3.5 shadow-soft">
            <div className="absolute right-3 top-3 rounded-xl bg-mist p-2 text-foreground">
              <ClockIcon className="h-5 w-5 text-pine" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
              Active Queue
            </span>
            <div className="mt-1 text-2xl font-black text-foreground">
              {orders.length}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-card border border-border bg-surface p-3.5 shadow-soft">
            <div className="absolute right-3 top-3 rounded-xl bg-mist p-2 text-foreground">
              <FireIcon className="h-5 w-5 text-pine" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
              In Preparation
            </span>
            <div className="mt-1 text-2xl font-black text-foreground">
              {preparingCount}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-card border border-border bg-surface p-3.5 shadow-soft">
            <div className="absolute right-3 top-3 rounded-xl bg-mist p-2 text-foreground">
              <BellIcon className="h-5 w-5 text-pine" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
              Ready for Pickup
            </span>
            <div className="mt-1 text-2xl font-black text-foreground">
              {readyCount}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-card border border-border bg-surface p-3.5 shadow-soft">
            <div className="absolute right-3 top-3 rounded-xl bg-mist p-2 text-foreground">
              <ShoppingBagIcon className="h-5 w-5 text-pine" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
              Items to Make
            </span>
            <div className="mt-1 text-2xl font-black text-foreground">
              {totalItemsCount}
            </div>
          </div>
        </div>

        {/* Top Control Bar: Status Filter Chips + Search + View Switcher + Refresh */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/70 pb-3">
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
                  'action-focus inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer',
                  filter === chip.key
                    ? 'border-pine bg-pine text-surface shadow-xs'
                    : 'border-border/80 bg-surface text-foreground hover:bg-mist',
                )}
              >
                <span>{chip.label}</span>
                <span
                  className={cn(
                    'rounded px-1.5 py-0.5 text-[11px] font-semibold',
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
            <div className="relative min-w-[180px] max-w-xs">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5">
                <MagnifyingGlassIcon className="h-4 w-4 text-muted" />
              </div>
              <input
                type="text"
                placeholder="Search order or item…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full h-9 rounded-md border-0 py-1.5 pl-8 pr-2.5 bg-surface text-foreground text-xs shadow-xs ring-1 ring-inset ring-border placeholder:text-muted focus:ring-2 focus:ring-inset focus:ring-pine"
              />
            </div>

            {/* View Mode Toggle: Table vs Cards */}
            <div className="flex items-center rounded-lg border border-border bg-mist/40 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                title="List / Table View"
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer',
                  viewMode === 'table'
                    ? 'bg-surface text-foreground shadow-2xs'
                    : 'text-muted hover:text-foreground',
                )}
              >
                <TableCellsIcon className="h-4 w-4" />
                <span className="hidden sm:inline">List View</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                title="Cards View"
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer',
                  viewMode === 'cards'
                    ? 'bg-surface text-foreground shadow-2xs'
                    : 'text-muted hover:text-foreground',
                )}
              >
                <Squares2X2Icon className="h-4 w-4" />
                <span className="hidden sm:inline">Cards View</span>
              </button>
            </div>

            {/* Refresh Button */}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void refreshOrders()}
              disabled={isLoading || isPendingTransition}
              className="inline-flex items-center gap-1.5"
            >
              <ArrowPathIcon
                className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')}
              />
              <span>{isLoading ? 'Updating…' : 'Refresh'}</span>
            </Button>
          </div>
        </div>

        {/* Content Section */}
        {filteredOrders.length === 0 ? (
          <div className="py-14 text-center">
            <EmptyState
              icon={<ClockIcon className="h-12 w-12 text-muted/50" />}
              title={
                searchQuery
                  ? 'No matching active orders'
                  : filter === 'all'
                    ? 'No active orders in queue'
                    : `No ${filter} orders`
              }
              sub={
                searchQuery
                  ? 'Try clearing the search filter to view all active orders.'
                  : 'Orders placed at checkout will appear here until they are fulfilled and served.'
              }
            />
          </div>
        ) : viewMode === 'table' ? (
          /* High-Density Table / List View */
          <div className="overflow-x-auto rounded-card border border-border bg-surface shadow-soft max-h-[68vh] overflow-y-auto">
            <table className="w-full text-left text-sm text-foreground">
              <thead className="sticky top-0 z-10 border-b border-border bg-mist text-xs font-bold uppercase tracking-wider text-muted">
                <tr>
                  <th className="py-3 pl-4 pr-3 sm:pl-6">Order</th>
                  <th className="px-3 py-3">Elapsed</th>
                  <th className="px-3 py-3">Ordered Items</th>
                  <th className="px-3 py-3 text-right">Amount</th>
                  <th className="px-3 py-3 text-center">Status</th>
                  <th className="py-3 pl-3 pr-4 sm:pr-6 text-right">
                    Fulfillment Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredOrders.map((order) => {
                  const badge = STATUS_BADGES[order.status] ?? DEFAULT_BADGE;
                  return (
                    <tr
                      key={order.transaction_id}
                      className="hover:bg-mist/30 transition-colors"
                    >
                      {/* Order Number & Transaction ID */}
                      <td className="py-3.5 pl-4 pr-3 sm:pl-6 align-top">
                        <div className="font-black text-foreground text-base tracking-tight flex items-center gap-2">
                          <span>
                            {order.order_number !== null
                              ? `#${order.order_number}`
                              : 'Order'}
                          </span>
                          <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-mist text-muted border border-border">
                            {order.payment_mode === 'cash'
                              ? 'Cash'
                              : 'E-Wallet'}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-muted mt-0.5">
                          {order.transaction_number}
                        </div>
                      </td>

                      {/* Time & Elapsed */}
                      <td className="px-3 py-3.5 whitespace-nowrap align-top">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-foreground">
                          <ClockIcon className="h-3 w-3 text-muted shrink-0" />
                          <span suppressHydrationWarning>
                            {formatElapsed(order.date)}
                          </span>
                        </span>
                        <div className="text-[11px] text-muted mt-0.5 font-medium">
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
                              className="inline-flex items-center gap-1 rounded-md bg-mist/60 border border-border/70 px-2 py-0.5 text-xs text-foreground font-medium"
                            >
                              <span className="font-extrabold text-pine">
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
                            'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold uppercase tracking-wide',
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

                      {/* Action Buttons: Standard Buttons adhering strictly to design tokens */}
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
                            className="text-danger hover:bg-danger/10 text-xs font-semibold px-2 cursor-pointer"
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
                            >
                              {badge.actionLabel}
                            </Button>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-leaf font-bold">
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
        ) : (
          /* Cards Grid View: Standard Card structure with design system tokens */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-h-[68vh] overflow-y-auto pr-1">
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
                        'rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                        badge.badgeClass,
                      )}
                    >
                      {badge.label}
                    </span>
                  }
                  className="rounded-card border-border shadow-soft"
                >
                  <div className="flex flex-col justify-between gap-3">
                    <div className="flex items-center justify-between text-xs text-muted">
                      <span className="font-mono">
                        {order.transaction_number}
                      </span>
                      <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-mist text-muted border border-border">
                        {order.payment_mode === 'cash' ? 'Cash' : 'E-Wallet'}
                      </span>
                      <span suppressHydrationWarning>
                        {formatElapsed(order.date)}
                      </span>
                    </div>

                    {/* Items List */}
                    <ul className="space-y-1.5 rounded-lg bg-mist/60 p-2.5 text-xs">
                      {order.items.map((item, idx) => (
                        <li
                          key={idx}
                          className="flex items-center justify-between text-foreground"
                        >
                          <span className="font-semibold">
                            <span className="text-pine font-extrabold mr-1">
                              {item.quantity}×
                            </span>
                            {item.name}
                          </span>
                          <span className="text-muted font-mono">
                            ₱{item.subtotal.toFixed(2)}
                          </span>
                        </li>
                      ))}
                    </ul>

                    {/* Actions row */}
                    <div className="flex items-center justify-between border-t border-border pt-2.5">
                      <span className="text-sm font-extrabold text-leaf">
                        ₱{order.total_amount.toFixed(2)}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setOrderToVoid(order)}
                          disabled={isPendingTransition}
                          className="text-danger hover:bg-danger/10 text-xs font-semibold px-2 cursor-pointer"
                          title="Cancel and refund this order"
                        >
                          Cancel &amp; Refund
                        </Button>
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
                  <span className="font-bold text-danger">
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
                  className="action-focus inline-flex h-10 items-center rounded-md bg-danger px-4 text-sm font-semibold text-white shadow-xs hover:bg-danger/90 disabled:opacity-50 cursor-pointer"
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
