'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useMemo } from 'react';
import { voidTransaction } from '@/features/reports/actions';
import type { ReceiptRecord, SoldLine } from '@/features/reports/aggregate';
import { useAlert } from '@/components/toast';
import { Modal } from '@/components/modal/Modal';
import {
  DocumentTextIcon,
  ShoppingBagIcon,
  MagnifyingGlassIcon,
  ChevronUpDownIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  EyeIcon,
  ReceiptRefundIcon,
  NoSymbolIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
} from '@/components/common/hero-icons';
import { EmptyState } from '@/components/error/EmptyState';
import { ReceiptIcon, ChartIcon } from '@/components/common/icons';
import { cn } from '@/lib/cn';

const PAYMENT_LABELS = {
  cash: 'Cash',
  gcash: 'GCash',
  maya: 'Maya',
} as const;

const PAYMENT_STATUS_LABELS = {
  paid: 'Paid',
  pending_verification: 'Pending Verification',
  verified: 'Verified',
  rejected: 'Rejected',
} as const;

interface TransactionReviewTableProps {
  receipts: ReceiptRecord[];
  lines: SoldLine[];
  receiptsTruncated: boolean;
  linesTruncated: boolean;
}

type SortField =
  | 'date'
  | 'total_amount'
  | 'transaction_number'
  | 'cashier_name';
type SortOrder = 'asc' | 'desc';

export function TransactionReviewTable({
  receipts,
  lines,
  receiptsTruncated,
  linesTruncated,
}: TransactionReviewTableProps) {
  const router = useRouter();
  const { warningAlert, errorAlert } = useAlert();

  // Active view: 'receipts' | 'items'
  const [activeTab, setActiveTab] = useState<'receipts' | 'items'>('receipts');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'voided'>(
    'all',
  );

  // Sorting state
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Void modal state
  const [voidModalOpen, setVoidModalOpen] = useState(false);
  const [targetReceipt, setTargetReceipt] = useState<ReceiptRecord | null>(
    null,
  );
  const [voidReason, setVoidReason] = useState('');
  const [voidSubmitting, setVoidSubmitting] = useState(false);

  // Toggle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Filtered & sorted receipts
  const filteredReceipts = useMemo(() => {
    return receipts
      .filter((r) => {
        // Status filter
        if (statusFilter === 'active' && r.status === 'voided') return false;
        if (statusFilter === 'voided' && r.status !== 'voided') return false;

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTxn = r.transaction_number.toLowerCase().includes(q);
          const matchCashier = r.cashier_name.toLowerCase().includes(q);
          const matchRef =
            r.payment_reference?.toLowerCase().includes(q) ?? false;
          const matchItems = r.items.some((i) =>
            i.product_name.toLowerCase().includes(q),
          );
          return matchTxn || matchCashier || matchRef || matchItems;
        }
        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortField === 'date') {
          cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
        } else if (sortField === 'total_amount') {
          cmp = a.total_amount - b.total_amount;
        } else if (sortField === 'transaction_number') {
          cmp = a.transaction_number.localeCompare(b.transaction_number);
        } else if (sortField === 'cashier_name') {
          cmp = a.cashier_name.localeCompare(b.cashier_name);
        }
        return sortOrder === 'asc' ? cmp : -cmp;
      });
  }, [receipts, statusFilter, searchQuery, sortField, sortOrder]);

  // Filtered items
  const filteredLines = useMemo(() => {
    if (!searchQuery.trim()) return lines;
    const q = searchQuery.toLowerCase();
    return lines.filter(
      (l) =>
        l.product_name.toLowerCase().includes(q) ||
        (l.order_number !== null && String(l.order_number).includes(q)),
    );
  }, [lines, searchQuery]);

  // Initiate void modal
  const openVoidModal = (receipt: ReceiptRecord) => {
    setTargetReceipt(receipt);
    setVoidReason('');
    setVoidModalOpen(true);
  };

  // Submit void transaction
  const handleConfirmVoid = async () => {
    if (!targetReceipt) return;
    if (!voidReason.trim()) {
      errorAlert(
        'Refund Reason Required',
        'Please provide a reason for refunding this transaction.',
      );
      return;
    }

    setVoidSubmitting(true);
    const result = await voidTransaction(
      targetReceipt.transaction_id,
      voidReason,
    );
    setVoidSubmitting(false);

    if (!result.ok) {
      errorAlert('Refund Failed', result.error);
    } else {
      setVoidModalOpen(false);
      warningAlert(
        'Transaction Refunded',
        `Transaction ${targetReceipt.transaction_number} was recorded as refunded.`,
      );
      router.refresh();
    }
  };

  return (
    <div className="rounded-xl border border-border bg-surface shadow-sm">
      {/* Table Header Controls */}
      <div className="flex flex-col gap-3 border-b border-border/70 p-4 sm:flex-row sm:items-center sm:justify-between">
        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1.5 rounded-lg border border-border bg-slate-50/70 p-1">
          <button
            type="button"
            onClick={() => setActiveTab('receipts')}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all',
              activeTab === 'receipts'
                ? 'bg-surface text-foreground shadow-xs'
                : 'text-muted hover:text-foreground',
            )}
          >
            <DocumentTextIcon className="h-4 w-4" />
            Receipts Ledger
            <span className="rounded-full bg-mist px-1.5 py-0.5 text-[10px] font-semibold text-muted">
              {receipts.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('items')}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all',
              activeTab === 'items'
                ? 'bg-surface text-foreground shadow-xs'
                : 'text-muted hover:text-foreground',
            )}
          >
            <ShoppingBagIcon className="h-4 w-4" />
            Items Sold
            <span className="rounded-full bg-mist px-1.5 py-0.5 text-[10px] font-semibold text-muted">
              {lines.length}
            </span>
          </button>
        </div>

        {/* Search & Status Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {activeTab === 'receipts' && (
            <div className="flex items-center rounded-md border border-border bg-surface p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={cn(
                  'rounded px-2.5 py-1.5 transition-colors',
                  statusFilter === 'all'
                    ? 'bg-pine text-surface font-semibold'
                    : 'text-muted hover:text-foreground',
                )}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('active')}
                className={cn(
                  'rounded px-2.5 py-1.5 transition-colors',
                  statusFilter === 'active'
                    ? 'bg-pine text-surface font-semibold'
                    : 'text-muted hover:text-foreground',
                )}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('voided')}
                className={cn(
                  'rounded px-2.5 py-1.5 transition-colors',
                  statusFilter === 'voided'
                    ? 'bg-danger text-surface font-semibold'
                    : 'text-muted hover:text-foreground',
                )}
              >
                Refunded
              </button>
            </div>
          )}

          <div className="relative min-w-48 flex-1 sm:w-64">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                activeTab === 'receipts'
                  ? 'Filter by txn, cashier, item...'
                  : 'Filter products sold...'
              }
              className="h-10 w-full rounded-md border border-border bg-white pl-9 pr-3 text-sm text-foreground placeholder:text-muted/60 focus:border-pine focus:outline-pine"
            />
          </div>
        </div>
      </div>

      {/* Receipts Ledger View */}
      {activeTab === 'receipts' && (
        <section
          aria-label="Transaction / Sales Review"
          className="overflow-x-auto"
        >
          <h2 className="sr-only">Transaction / Sales Review</h2>
          {filteredReceipts.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={<ReceiptIcon />}
                title="No receipts match your filter"
                sub="Try clearing the search query or adjusting your date range."
              />
            </div>
          ) : (
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-border/80 bg-mist/40 text-muted">
                  <th
                    scope="col"
                    onClick={() => handleSort('transaction_number')}
                    className="cursor-pointer select-none px-4 py-3 font-semibold hover:text-foreground"
                  >
                    <div className="flex items-center gap-1">
                      <span>Transaction / Order</span>
                      {sortField === 'transaction_number' ? (
                        sortOrder === 'asc' ? (
                          <ChevronUpIcon className="h-3.5 w-3.5 text-pine" />
                        ) : (
                          <ChevronDownIcon className="h-3.5 w-3.5 text-pine" />
                        )
                      ) : (
                        <ChevronUpDownIcon className="h-3.5 w-3.5 text-muted/60" />
                      )}
                    </div>
                  </th>
                  <th
                    scope="col"
                    onClick={() => handleSort('date')}
                    className="cursor-pointer select-none px-4 py-3 font-semibold hover:text-foreground"
                  >
                    <div className="flex items-center gap-1">
                      <span>Date & Time</span>
                      {sortField === 'date' ? (
                        sortOrder === 'asc' ? (
                          <ChevronUpIcon className="h-3.5 w-3.5 text-pine" />
                        ) : (
                          <ChevronDownIcon className="h-3.5 w-3.5 text-pine" />
                        )
                      ) : (
                        <ChevronUpDownIcon className="h-3.5 w-3.5 text-muted/60" />
                      )}
                    </div>
                  </th>
                  <th
                    scope="col"
                    onClick={() => handleSort('cashier_name')}
                    className="cursor-pointer select-none px-4 py-3 font-semibold hover:text-foreground"
                  >
                    <div className="flex items-center gap-1">
                      <span>Cashier</span>
                      {sortField === 'cashier_name' ? (
                        sortOrder === 'asc' ? (
                          <ChevronUpIcon className="h-3.5 w-3.5 text-pine" />
                        ) : (
                          <ChevronDownIcon className="h-3.5 w-3.5 text-pine" />
                        )
                      ) : (
                        <ChevronUpDownIcon className="h-3.5 w-3.5 text-muted/60" />
                      )}
                    </div>
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Items Sold
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Payment Method
                  </th>
                  <th
                    scope="col"
                    onClick={() => handleSort('total_amount')}
                    className="cursor-pointer select-none px-4 py-3 text-right font-semibold hover:text-foreground"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Total Amount</span>
                      {sortField === 'total_amount' ? (
                        sortOrder === 'asc' ? (
                          <ChevronUpIcon className="h-3.5 w-3.5 text-pine" />
                        ) : (
                          <ChevronDownIcon className="h-3.5 w-3.5 text-pine" />
                        )
                      ) : (
                        <ChevronUpDownIcon className="h-3.5 w-3.5 text-muted/60" />
                      )}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-center font-semibold"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-right font-semibold"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredReceipts.map((receipt) => {
                  const isVoided = receipt.status === 'voided';
                  const dateObj = new Date(receipt.date);
                  const formattedDate = dateObj.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  });
                  const formattedTime = dateObj.toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                  });

                  return (
                    <tr
                      key={receipt.transaction_id}
                      className={cn(
                        'transition-colors hover:bg-mist/40',
                        isVoided && 'bg-danger/5 opacity-75',
                      )}
                    >
                      {/* Transaction # */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-0.5">
                          <Link
                            href={`/pos/receipt/${receipt.transaction_id}`}
                            aria-label={`View receipt ${receipt.transaction_number}`}
                            className="font-bold text-pine hover:underline"
                          >
                            {receipt.transaction_number}
                          </Link>
                          <div className="flex items-center gap-1.5 text-[11px] text-muted">
                            {receipt.order_number !== null && (
                              <span className="font-semibold text-foreground">
                                Order #{receipt.order_number}
                              </span>
                            )}
                            {receipt.payment_reference && (
                              <span className="truncate max-w-36 text-muted/70">
                                Ref: {receipt.payment_reference}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Date & Time */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-medium text-foreground">
                          {formattedDate}
                        </div>
                        <div className="text-[11px] text-muted">
                          {formattedTime}
                        </div>
                      </td>

                      {/* Cashier */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-pine/10 text-[10px] font-bold text-pine">
                            {receipt.cashier_name.charAt(0).toUpperCase()}
                          </span>
                          <span className="font-medium text-foreground">
                            {receipt.cashier_name}
                          </span>
                        </div>
                      </td>

                      {/* Items Sold */}
                      <td className="px-4 py-3">
                        <div className="max-w-xs truncate font-medium text-foreground">
                          {receipt.items.length > 0
                            ? receipt.items
                                .map((i) => `${i.quantity}× ${i.product_name}`)
                                .join(', ')
                            : 'No item records'}
                        </div>
                        <div className="text-[11px] text-muted">
                          {receipt.items.reduce((s, i) => s + i.quantity, 0)}{' '}
                          total units
                        </div>
                      </td>

                      {/* Payment */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <span
                            className={cn(
                              'inline-flex w-fit items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                              receipt.payment_mode === 'cash' &&
                                'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
                              receipt.payment_mode === 'gcash' &&
                                'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300',
                              receipt.payment_mode === 'maya' &&
                                'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300',
                            )}
                          >
                            {PAYMENT_LABELS[receipt.payment_mode]}
                          </span>
                          <span className="text-[10px] text-muted">
                            {PAYMENT_STATUS_LABELS[receipt.payment_status]}
                          </span>
                        </div>
                      </td>

                      {/* Total Amount */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <span
                          className={cn(
                            'text-sm font-black',
                            isVoided
                              ? 'line-through text-muted'
                              : 'text-foreground',
                          )}
                        >
                          ₱{receipt.total_amount.toFixed(2)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {isVoided ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-danger/10 px-2.5 py-0.5 text-[11px] font-bold text-danger">
                            <NoSymbolIcon className="h-3 w-3" />
                            Refunded
                          </span>
                        ) : receipt.status === 'cancelled' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            Cancelled
                          </span>
                        ) : receipt.status === 'pending' ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-200/80 bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                            <ClockIcon className="h-3 w-3" />
                            Pending
                          </span>
                        ) : receipt.status === 'preparing' ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-blue-200/80 bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-700 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                            Preparing
                          </span>
                        ) : receipt.status === 'ready' ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-purple-200/80 bg-purple-50 px-2.5 py-0.5 text-[11px] font-bold text-purple-700 dark:border-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
                            Ready
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                            <CheckCircleIcon className="h-3 w-3" />
                            Completed
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/pos/receipt/${receipt.transaction_id}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface text-muted transition-colors hover:border-pine/30 hover:bg-pine/5 hover:text-pine"
                            title="View Receipt"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </Link>

                          {!isVoided ? (
                            <button
                              type="button"
                              onClick={() => openVoidModal(receipt)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface text-muted transition-colors hover:border-danger/30 hover:bg-danger/5 hover:text-danger"
                              title="Process Refund &amp; Return"
                            >
                              <ReceiptRefundIcon className="h-4 w-4" />
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
      )}

      {/* Items Sold Breakdown View */}
      {activeTab === 'items' && (
        <section aria-label="Items sold" className="overflow-x-auto">
          <h2 className="sr-only">Items sold</h2>
          {filteredLines.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={<ChartIcon />}
                title="No items sold recorded"
                sub="Completed items will appear here."
              />
            </div>
          ) : (
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-border/80 bg-mist/40 text-muted">
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Product Name
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Order / Transaction
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Date Sold
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-center font-semibold"
                  >
                    Quantity
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-right font-semibold"
                  >
                    Unit Price
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-right font-semibold"
                  >
                    Subtotal
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredLines.map((line, index) => {
                  const dateObj = new Date(line.date);
                  const formattedDate = dateObj.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  });
                  const formattedTime = dateObj.toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                  });

                  return (
                    <tr
                      key={`${line.transaction_id}-${line.product_name}-${index}`}
                      className="transition-colors hover:bg-mist/40"
                    >
                      <td className="px-4 py-3 font-bold text-foreground">
                        {line.product_name}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Link
                          href={`/pos/receipt/${line.transaction_id}`}
                          className="font-medium text-pine hover:underline"
                        >
                          {line.order_number !== null
                            ? `Order #${line.order_number}`
                            : 'View Receipt'}
                        </Link>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-medium text-foreground">
                          {formattedDate}
                        </span>
                        <span className="text-muted text-[11px] ml-1.5">
                          {formattedTime}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span className="inline-flex rounded-md bg-mist px-2 py-0.5 font-bold text-foreground">
                          {line.quantity}×
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap text-muted">
                        ₱{line.unit_price.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap font-black text-foreground">
                        ₱{line.subtotal.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
      )}

      {/* Pagination / Truncation note */}
      <div className="flex items-center justify-between border-t border-border/70 p-3 text-xs text-muted">
        <div>
          {activeTab === 'receipts'
            ? `Showing ${filteredReceipts.length} of ${receipts.length} transactions`
            : `Showing ${filteredLines.length} of ${lines.length} sold lines`}
        </div>
        {activeTab === 'receipts' && receiptsTruncated && (
          <span className="text-[11px] text-amber-600 dark:text-amber-400">
            Ledger limited to the latest 50 receipts. Use date filters to narrow
            down.
          </span>
        )}
        {activeTab === 'items' && linesTruncated && (
          <span className="text-[11px] text-amber-600 dark:text-amber-400">
            Showing the latest 100 sold lines.
          </span>
        )}
      </div>

      {/* Refund Confirmation Modal */}
      {targetReceipt && (
        <Modal
          isOpen={voidModalOpen}
          onOpenChange={(open) => !voidSubmitting && setVoidModalOpen(open)}
          isDismissDisabled={voidSubmitting}
          title="Process Transaction Refund"
        >
          <div className="space-y-4">
            {/* Warning banner */}
            <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5">
              <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
              <div className="text-xs leading-relaxed text-foreground">
                <span className="font-bold text-amber-800 dark:text-amber-300">
                  Manager Authorization:
                </span>{' '}
                Refunding this transaction records an authorized customer
                return, deducts from net sales, and restores portion quota with
                an immutable audit log.
              </div>
            </div>

            {/* Transaction summary card */}
            <div className="rounded-xl border border-border bg-mist/40 p-3 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-muted">Transaction Number:</span>
                <span className="font-bold text-foreground">
                  {targetReceipt.transaction_number}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Cashier:</span>
                <span className="font-bold text-foreground">
                  {targetReceipt.cashier_name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Refund Amount:</span>
                <span className="font-bold text-rose-600">
                  {PAYMENT_LABELS[targetReceipt.payment_mode]} (₱
                  {targetReceipt.total_amount.toFixed(2)})
                </span>
              </div>
            </div>

            {/* Refund Reason Input */}
            <div>
              <label
                htmlFor="void-reason"
                className="block text-xs font-semibold text-foreground mb-1"
              >
                Reason for customer refund{' '}
                <span className="text-danger">*</span>
              </label>
              <textarea
                id="void-reason"
                rows={3}
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="e.g., Customer cancelled, defective/spilled drink, incorrect order entry..."
                className="w-full rounded-md border border-border bg-white p-3 text-sm text-foreground placeholder:text-muted/60 focus:border-danger focus:outline-2 focus:outline-danger"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
              <button
                type="button"
                disabled={voidSubmitting}
                onClick={() => setVoidModalOpen(false)}
                className="h-10 rounded-md border border-border bg-white px-4 text-sm font-semibold text-foreground hover:bg-mist disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={voidSubmitting || !voidReason.trim()}
                onClick={handleConfirmVoid}
                className="action-focus inline-flex h-10 items-center rounded-md bg-rose-600 px-4 text-sm font-semibold text-white shadow-xs hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
              >
                {voidSubmitting ? 'Processing Refund...' : 'Confirm Refund'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
