'use client';

import { useMemo, useState } from 'react';
import type { AuditEntry } from '@/features/audit/queries';
import {
  AdjustmentsHorizontalIcon,
  BanknotesIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ChevronUpDownIcon,
  ClipboardDocumentCheckIcon,
  MagnifyingGlassIcon,
  ReceiptRefundIcon,
  XMarkIcon,
} from '@/components/common/hero-icons';
import { Modal } from '@/components/modal/Modal';
import { EmptyState } from '@/components/error/EmptyState';

interface AuditLogManagerProps {
  entries: AuditEntry[];
}

type CategoryFilter = 'all' | 'quota' | 'shift' | 'sale' | 'user';
type ActorFilter = 'all' | 'admin' | 'cashier' | 'system';
type SortField = 'created_at' | 'event_type' | 'entity_type' | 'actor_email';
type SortOrder = 'asc' | 'desc';

function categorizeEvent(
  eventType: string,
  entityType: string,
): CategoryFilter {
  const ev = eventType.toLowerCase();
  const ent = entityType.toLowerCase();

  if (ev.includes('quota') || ent.includes('quota')) return 'quota';
  if (
    ev.includes('shift') ||
    ev.includes('turnover') ||
    ent.includes('shift') ||
    ent.includes('turnover')
  )
    return 'shift';
  if (
    ev.includes('sale') ||
    ev.includes('transaction') ||
    ev.includes('receipt') ||
    ev.includes('void') ||
    ent.includes('transaction')
  )
    return 'sale';
  if (
    ev.includes('user') ||
    ev.includes('auth') ||
    ev.includes('login') ||
    ent.includes('user')
  )
    return 'user';
  return 'all';
}

function formatDetailsSummary(details: Record<string, unknown>): string {
  if (!details || Object.keys(details).length === 0)
    return 'No payload details';

  const parts: string[] = [];

  if ('product_name' in details) parts.push(String(details.product_name));
  if ('previous_quota' in details && 'new_quota' in details) {
    const prev = details.previous_quota === null ? '∞' : details.previous_quota;
    const next = details.new_quota === null ? '∞' : details.new_quota;
    parts.push(`Quota: ${prev} → ${next}`);
  }
  if ('transaction_number' in details)
    parts.push(String(details.transaction_number));
  if ('total_amount' in details)
    parts.push(`₱${Number(details.total_amount).toFixed(2)}`);
  if ('reason' in details && details.reason) parts.push(`"${details.reason}"`);
  if ('counted_cash' in details)
    parts.push(`Counted: ₱${Number(details.counted_cash).toFixed(2)}`);
  if ('variance' in details)
    parts.push(`Var: ₱${Number(details.variance).toFixed(2)}`);
  if ('cashier_name' in details) parts.push(`Cashier: ${details.cashier_name}`);

  if (parts.length > 0) return parts.join(' · ');

  return Object.entries(details)
    .slice(0, 2)
    .map(
      ([k, v]) =>
        `${k.replaceAll('_', ' ')}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`,
    )
    .join(' · ');
}

function formatDetailKey(key: string): string {
  const map: Record<string, string> = {
    business_date: 'Business Date',
    new_quota_limit: 'New Quota Limit',
    old_quota_limit: 'Previous Quota Limit',
    new_quota: 'New Quota Limit',
    previous_quota: 'Previous Quota Limit',
    product_name: 'Product Name',
    transaction_number: 'Transaction Ref #',
    total_amount: 'Total Amount',
    payment_mode: 'Payment Method',
    counted_cash: 'Counted Cash',
    expected_cash: 'Expected Cash',
    variance: 'Cash Variance',
    cashier_name: 'Cashier Name',
    cashier_email: 'Cashier Email',
    reason: 'Reason / Note',
    is_active: 'Account Active',
    is_available: 'Available on POS',
  };
  if (map[key]) return map[key];
  return key
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDetailValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return 'None (Unlimited / N/A)';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') {
    const k = key.toLowerCase();
    if (
      k.includes('amount') ||
      k.includes('price') ||
      k.includes('cash') ||
      k.includes('variance')
    ) {
      return `₱${value.toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    }
    return value.toLocaleString('en-PH');
  }
  if (typeof value === 'object') {
    return Object.entries(value)
      .map(([subKey, subVal]) => `${subKey}: ${subVal}`)
      .join(', ');
  }
  const str = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const d = new Date(str + 'T00:00:00');
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-PH', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
  }
  return str;
}

export function AuditLogManager({ entries }: AuditLogManagerProps) {
  // Search & Filter state
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [actorFilter, setActorFilter] = useState<ActorFilter>('all');

  // Sorting state
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Selected entry for inspection modal
  const [inspectEntry, setInspectEntry] = useState<AuditEntry | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  // Overview Counts calculation
  const counts = useMemo(() => {
    let quotaCount = 0;
    let shiftCount = 0;
    let saleCount = 0;
    let userCount = 0;

    for (const entry of entries) {
      const cat = categorizeEvent(entry.event_type, entry.entity_type);
      if (cat === 'quota') quotaCount++;
      else if (cat === 'shift') shiftCount++;
      else if (cat === 'sale') saleCount++;
      else if (cat === 'user') userCount++;
    }

    return {
      total: entries.length,
      quota: quotaCount,
      shift: shiftCount,
      sale: saleCount,
      user: userCount,
    };
  }, [entries]);

  // Filtered and Sorted entries
  const filteredEntries = useMemo(() => {
    return entries
      .filter((entry) => {
        // Category filter
        if (categoryFilter !== 'all') {
          const cat = categorizeEvent(entry.event_type, entry.entity_type);
          if (cat !== categoryFilter) return false;
        }

        // Actor filter
        if (actorFilter !== 'all') {
          const role = (entry.actor_role ?? 'system').toLowerCase();
          if (role !== actorFilter) return false;
        }

        // Search text query
        if (search.trim()) {
          const q = search.toLowerCase();
          const matchEvent = entry.event_type.toLowerCase().includes(q);
          const matchEntity = entry.entity_type.toLowerCase().includes(q);
          const matchEntityId =
            entry.entity_id?.toLowerCase().includes(q) ?? false;
          const matchActor = (entry.actor_role ?? 'system')
            .toLowerCase()
            .includes(q);
          const matchEmail = (entry.actor_email ?? '')
            .toLowerCase()
            .includes(q);
          const matchDetails = JSON.stringify(entry.details)
            .toLowerCase()
            .includes(q);

          return (
            matchEvent ||
            matchEntity ||
            matchEntityId ||
            matchActor ||
            matchEmail ||
            matchDetails
          );
        }

        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortField === 'created_at') {
          cmp =
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        } else if (sortField === 'event_type') {
          cmp = a.event_type.localeCompare(b.event_type);
        } else if (sortField === 'entity_type') {
          cmp = a.entity_type.localeCompare(b.entity_type);
        } else if (sortField === 'actor_email') {
          const emailA = a.actor_email ?? 'System';
          const emailB = b.actor_email ?? 'System';
          cmp = emailA.localeCompare(emailB);
        }
        return sortOrder === 'asc' ? cmp : -cmp;
      });
  }, [entries, categoryFilter, actorFilter, search, sortField, sortOrder]);

  // Paginated slice
  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / pageSize));
  const paginatedEntries = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredEntries.slice(start, start + pageSize);
  }, [filteredEntries, currentPage, pageSize]);

  // Handle Sort toggle
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Reset all filters
  const resetFilters = () => {
    setSearch('');
    setCategoryFilter('all');
    setActorFilter('all');
    setCurrentPage(1);
  };

  const isFiltered =
    search.trim() !== '' || categoryFilter !== 'all' || actorFilter !== 'all';

  return (
    <div className="space-y-6">
      {/* 4 Summary KPI Metric Cards (DCASIS Neutral Style) */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Audited Events */}
        <div className="relative overflow-hidden rounded-xl border border-border bg-surface p-5 sm:p-6 shadow-sm">
          <div className="absolute right-3 top-3 rounded-lg bg-mist p-2 text-foreground">
            <ClipboardDocumentCheckIcon className="h-5 w-5 text-pine" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted">
            Total Events
          </span>
          <div className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">
            {counts.total}
          </div>
          <p className="mt-1 text-xs text-muted">Recorded audit entries</p>
        </div>

        {/* Quota & Stock Events */}
        <div className="relative overflow-hidden rounded-xl border border-border bg-surface p-5 sm:p-6 shadow-sm">
          <div className="absolute right-3 top-3 rounded-lg bg-mist p-2 text-foreground">
            <AdjustmentsHorizontalIcon className="h-5 w-5 text-foreground" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted">
            Stock Adjustments
          </span>
          <div className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">
            {counts.quota}
          </div>
          <p className="mt-1 text-xs text-muted">
            Daily limits & stock changes
          </p>
        </div>

        {/* Cashier & Shift Events */}
        <div className="relative overflow-hidden rounded-xl border border-border bg-surface p-5 sm:p-6 shadow-sm">
          <div className="absolute right-3 top-3 rounded-lg bg-mist p-2 text-foreground">
            <BanknotesIcon className="h-5 w-5 text-foreground" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted">
            Cashier Operations
          </span>
          <div className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">
            {counts.shift}
          </div>
          <p className="mt-1 text-xs text-muted">Shifts & turnover reviews</p>
        </div>

        {/* Sales & Orders Events */}
        <div className="relative overflow-hidden rounded-xl border border-border bg-surface p-5 sm:p-6 shadow-sm">
          <div className="absolute right-3 top-3 rounded-lg bg-mist p-2 text-foreground">
            <ReceiptRefundIcon className="h-5 w-5 text-foreground" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted">
            Sales &amp; Refunds
          </span>
          <div className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">
            {counts.sale}
          </div>
          <p className="mt-1 text-xs text-muted">
            Completed orders &amp; refund actions
          </p>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="rounded-xl border border-border bg-surface shadow-sm">
        {/* Simple DCASIS Search & Filter Bar */}
        <div className="flex flex-col gap-3 border-b border-border/70 p-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Search Input */}
          <div className="relative min-w-48 flex-1 max-w-md">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by email, event, entity, or details..."
              className="h-10 w-full rounded-md border border-border bg-white pl-9 pr-9 text-xs sm:text-sm font-medium text-foreground placeholder:text-muted/60 focus:border-pine focus:outline-pine"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                aria-label="Clear search query"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Clean Filter Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Category Select */}
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value as CategoryFilter);
                setCurrentPage(1);
              }}
              className="h-10 rounded-md border border-border bg-white px-3 text-xs sm:text-sm font-semibold text-foreground focus:border-pine focus:outline-pine cursor-pointer"
            >
              <option value="all">All Categories ({counts.total})</option>
              <option value="quota">Stock & Quotas ({counts.quota})</option>
              <option value="shift">Cashier & Shifts ({counts.shift})</option>
              <option value="sale">Sales &amp; Refunds ({counts.sale})</option>
              {counts.user > 0 && (
                <option value="user">Users & Auth ({counts.user})</option>
              )}
            </select>

            {/* Actor Select */}
            <select
              value={actorFilter}
              onChange={(e) => {
                setActorFilter(e.target.value as ActorFilter);
                setCurrentPage(1);
              }}
              className="h-10 rounded-md border border-border bg-white px-3 text-xs sm:text-sm font-semibold text-foreground focus:border-pine focus:outline-pine cursor-pointer"
            >
              <option value="all">All Actors</option>
              <option value="admin">Admin</option>
              <option value="cashier">Cashier</option>
              <option value="system">System (Automated)</option>
            </select>

            {isFiltered && (
              <button
                type="button"
                onClick={resetFilters}
                className="h-10 rounded-md border border-border bg-white px-3 text-xs font-semibold text-pine hover:bg-mist cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Audit Log Table */}
        {filteredEntries.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={<ClipboardDocumentCheckIcon />}
              title="No audit events found"
              sub={
                isFiltered
                  ? 'No entries match your search or filter criteria.'
                  : 'No system audit events recorded yet.'
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-border/80 bg-mist/50 text-xs font-semibold text-muted">
                  <th
                    scope="col"
                    onClick={() => handleSort('created_at')}
                    className="cursor-pointer select-none px-4 py-3 hover:text-foreground"
                  >
                    <div className="flex items-center gap-1">
                      <span>Date & Time</span>
                      {sortField === 'created_at' ? (
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
                    onClick={() => handleSort('actor_email')}
                    className="cursor-pointer select-none px-4 py-3 hover:text-foreground"
                  >
                    <div className="flex items-center gap-1">
                      <span>Email / Actor</span>
                      {sortField === 'actor_email' ? (
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
                    onClick={() => handleSort('event_type')}
                    className="cursor-pointer select-none px-4 py-3 hover:text-foreground"
                  >
                    <div className="flex items-center gap-1">
                      <span>Event</span>
                      {sortField === 'event_type' ? (
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
                    onClick={() => handleSort('entity_type')}
                    className="cursor-pointer select-none px-4 py-3 hover:text-foreground"
                  >
                    <div className="flex items-center gap-1">
                      <span>Target</span>
                      {sortField === 'entity_type' ? (
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
                  <th scope="col" className="px-4 py-3">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {paginatedEntries.map((entry) => {
                  const summaryText = formatDetailsSummary(entry.details);
                  const dateObj = new Date(entry.created_at);
                  const formattedDate = dateObj.toLocaleDateString('en-PH', {
                    timeZone: 'Asia/Manila',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  });
                  const formattedTime = dateObj.toLocaleTimeString('en-PH', {
                    timeZone: 'Asia/Manila',
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  });

                  const isSystem =
                    (entry.actor_role ?? 'system').toLowerCase() === 'system' &&
                    !entry.actor_email;
                  const actorEmail = entry.actor_email ?? 'System (Automated)';
                  const roleLabel = isSystem
                    ? 'Automated Task'
                    : entry.actor_role === 'admin'
                      ? 'Administrator'
                      : entry.actor_role === 'cashier'
                        ? 'Cashier'
                        : (entry.actor_role ?? 'Staff');

                  return (
                    <tr
                      key={entry.audit_id}
                      onClick={() => setInspectEntry(entry)}
                      title="Click to view full details"
                      className="cursor-pointer transition-colors hover:bg-mist/50"
                    >
                      {/* Date & Time */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-semibold text-foreground">
                          {formattedDate}
                        </div>
                        <div className="text-xs text-muted font-medium">
                          {formattedTime}
                        </div>
                      </td>

                      {/* Email / Actor */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-foreground">
                            {actorEmail}
                          </span>
                          <span className="text-xs font-medium text-muted">
                            {roleLabel}
                          </span>
                        </div>
                      </td>

                      {/* Event */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm font-semibold text-foreground capitalize">
                          {entry.event_type.replaceAll('_', ' ')}
                        </span>
                      </td>

                      {/* Target */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-foreground capitalize">
                            {entry.entity_type.replaceAll('_', ' ')}
                          </span>
                          {entry.entity_id && (
                            <span className="text-xs text-muted truncate max-w-36">
                              {entry.entity_id}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Details */}
                      <td className="px-4 py-3">
                        <p className="truncate text-sm text-muted font-medium max-w-md lg:max-w-xl">
                          {summaryText}
                        </p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        <div className="flex flex-col items-center justify-between gap-3 border-t border-border/70 p-4 sm:flex-row text-xs text-muted">
          <div>
            Showing{' '}
            <strong className="text-foreground">
              {filteredEntries.length === 0
                ? 0
                : (currentPage - 1) * pageSize + 1}
            </strong>{' '}
            to{' '}
            <strong className="text-foreground">
              {Math.min(currentPage * pageSize, filteredEntries.length)}
            </strong>{' '}
            of{' '}
            <strong className="text-foreground">
              {filteredEntries.length}
            </strong>{' '}
            events
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="action-focus h-8 rounded-md border border-border bg-white px-3 font-semibold text-foreground hover:bg-mist disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                Previous
              </button>

              <span className="px-2 font-semibold text-foreground">
                Page {currentPage} of {totalPages}
              </span>

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                className="action-focus h-8 rounded-md border border-border bg-white px-3 font-semibold text-foreground hover:bg-mist disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Inspect Event Modal */}
      {inspectEntry && (
        <Modal
          title="Audit Event Details"
          isOpen={true}
          onOpenChange={(open) => {
            if (!open) setInspectEntry(null);
          }}
        >
          <div className="space-y-4 text-sm">
            {/* Header info */}
            <div className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border bg-surface text-sm shadow-xs">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="font-medium text-muted">User / Email:</span>
                <span className="font-semibold text-foreground">
                  {inspectEntry.actor_email ?? 'System (Automated)'}
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="font-medium text-muted">Actor Role:</span>
                <span className="font-semibold uppercase tracking-wider text-pine">
                  {(inspectEntry.actor_role ?? 'system').toLowerCase() ===
                    'system' && !inspectEntry.actor_email
                    ? 'Automated System'
                    : inspectEntry.actor_role === 'admin'
                      ? 'Administrator'
                      : inspectEntry.actor_role === 'cashier'
                        ? 'Cashier'
                        : (inspectEntry.actor_role ?? 'Staff')}
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="font-medium text-muted">Event:</span>
                <span className="font-semibold text-foreground capitalize">
                  {inspectEntry.event_type.replaceAll('_', ' ')}
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="font-medium text-muted">Target Entity:</span>
                <span className="font-semibold text-foreground capitalize">
                  {inspectEntry.entity_type.replaceAll('_', ' ')}
                  {inspectEntry.entity_id
                    ? ` (#${inspectEntry.entity_id})`
                    : ''}
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="font-medium text-muted">Timestamp:</span>
                <span className="font-semibold text-foreground">
                  {new Date(inspectEntry.created_at).toLocaleString('en-PH', {
                    timeZone: 'Asia/Manila',
                    dateStyle: 'medium',
                    timeStyle: 'medium',
                  })}
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-3 text-xs">
                <span className="font-medium text-muted">Audit Record ID:</span>
                <span className="font-mono text-muted/80">
                  {inspectEntry.audit_id}
                </span>
              </div>
            </div>

            {/* Details Breakdown */}
            <div>
              <p className="font-bold text-foreground mb-2 text-sm">
                Event Details & Adjustments:
              </p>
              {Object.keys(inspectEntry.details).length === 0 ? (
                <div className="rounded-xl border border-border bg-mist/20 p-4 text-center text-sm text-muted">
                  No additional details recorded for this event.
                </div>
              ) : (
                <div className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border bg-surface text-sm shadow-xs">
                  {Object.entries(inspectEntry.details).map(([key, val]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-mist/30"
                    >
                      <span className="font-medium text-muted">
                        {formatDetailKey(key)}:
                      </span>
                      <span className="font-semibold text-foreground text-right max-w-[65%] truncate">
                        {formatDetailValue(key, val)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end pt-3 border-t border-border/70">
              <button
                type="button"
                onClick={() => setInspectEntry(null)}
                className="h-10 rounded-md border border-border bg-white px-5 text-sm font-semibold text-foreground hover:bg-mist cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
