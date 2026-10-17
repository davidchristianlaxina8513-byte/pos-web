'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { AdminShift, CashTurnover } from '@/features/shifts/queries';
import { verifyTurnover } from '@/features/shifts/actions';
import { useAlert } from '@/components/toast';
import { Modal } from '@/components/modal/Modal';
import {
  BanknotesIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  ChevronUpDownIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  UsersIcon,
} from '@/components/common/hero-icons';
import { EmptyState } from '@/components/error/EmptyState';
import { ReceiptIcon, ChartIcon } from '@/components/common/icons';
import { cn } from '@/lib/cn';

interface AdminCashierOperationsManagerProps {
  shifts: AdminShift[];
  turnovers: CashTurnover[];
}

type TurnoverSortField =
  | 'submitted_at'
  | 'cashier_name'
  | 'counted_cash'
  | 'variance'
  | 'status';
type ShiftSortField =
  | 'started_at'
  | 'cashier_name'
  | 'starting_cash'
  | 'status';
type SortOrder = 'asc' | 'desc';

export function AdminCashierOperationsManager({
  shifts,
  turnovers,
}: AdminCashierOperationsManagerProps) {
  const router = useRouter();
  const { successAlert, warningAlert, errorAlert } = useAlert();

  // Active section: 'turnovers' | 'shifts'
  const [activeTab, setActiveTab] = useState<'turnovers' | 'shifts'>(
    'turnovers',
  );

  // Filters for Turnovers
  const [turnoverStatusFilter, setTurnoverStatusFilter] = useState<
    'all' | 'pending' | 'verified' | 'flagged'
  >('all');
  const [turnoverSearch, setTurnoverSearch] = useState('');
  const [turnoverSortField, setTurnoverSortField] =
    useState<TurnoverSortField>('submitted_at');
  const [turnoverSortOrder, setTurnoverSortOrder] = useState<SortOrder>('desc');

  // Filters for Shifts
  const [shiftStatusFilter, setShiftStatusFilter] = useState<
    'all' | 'open' | 'closed'
  >('all');
  const [shiftSearch, setShiftSearch] = useState('');
  const [shiftSortField, setShiftSortField] =
    useState<ShiftSortField>('started_at');
  const [shiftSortOrder, setShiftSortOrder] = useState<SortOrder>('desc');

  // Action states for Turnover Verification
  const [busyTurnoverId, setBusyTurnoverId] = useState<string | null>(null);

  // Flag Modal state
  const [flagModalOpen, setFlagModalOpen] = useState(false);
  const [targetTurnover, setTargetTurnover] = useState<CashTurnover | null>(
    null,
  );
  const [flagNote, setFlagNote] = useState('');
  const [flagSubmitting, setFlagSubmitting] = useState(false);

  // Summary Metrics calculations
  const activeShiftsCount = useMemo(
    () => shifts.filter((s) => s.status === 'open').length,
    [shifts],
  );
  const pendingTurnoversCount = useMemo(
    () => turnovers.filter((t) => t.status === 'pending').length,
    [turnovers],
  );
  const totalCountedCash = useMemo(
    () => turnovers.reduce((sum, t) => sum + t.counted_cash, 0),
    [turnovers],
  );
  const discrepancyCount = useMemo(
    () => turnovers.filter((t) => Math.abs(t.variance) >= 0.01).length,
    [turnovers],
  );

  // Turnover Sort Toggle
  const handleTurnoverSort = (field: TurnoverSortField) => {
    if (turnoverSortField === field) {
      setTurnoverSortOrder(turnoverSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setTurnoverSortField(field);
      setTurnoverSortOrder('desc');
    }
  };

  // Shift Sort Toggle
  const handleShiftSort = (field: ShiftSortField) => {
    if (shiftSortField === field) {
      setShiftSortOrder(shiftSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setShiftSortField(field);
      setShiftSortOrder('desc');
    }
  };

  // Filtered Turnovers
  const filteredTurnovers = useMemo(() => {
    return turnovers
      .filter((t) => {
        if (turnoverStatusFilter !== 'all' && t.status !== turnoverStatusFilter)
          return false;
        if (turnoverSearch.trim()) {
          const q = turnoverSearch.toLowerCase();
          const matchCashier = t.cashier_name.toLowerCase().includes(q);
          const matchNotes = t.notes?.toLowerCase().includes(q) ?? false;
          const matchAdminNote =
            t.verification_note?.toLowerCase().includes(q) ?? false;
          return matchCashier || matchNotes || matchAdminNote;
        }
        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (turnoverSortField === 'submitted_at') {
          cmp =
            new Date(a.submitted_at).getTime() -
            new Date(b.submitted_at).getTime();
        } else if (turnoverSortField === 'cashier_name') {
          cmp = a.cashier_name.localeCompare(b.cashier_name);
        } else if (turnoverSortField === 'counted_cash') {
          cmp = a.counted_cash - b.counted_cash;
        } else if (turnoverSortField === 'variance') {
          cmp = a.variance - b.variance;
        } else if (turnoverSortField === 'status') {
          cmp = a.status.localeCompare(b.status);
        }
        return turnoverSortOrder === 'asc' ? cmp : -cmp;
      });
  }, [
    turnovers,
    turnoverStatusFilter,
    turnoverSearch,
    turnoverSortField,
    turnoverSortOrder,
  ]);

  // Filtered Shifts
  const filteredShifts = useMemo(() => {
    return shifts
      .filter((s) => {
        if (shiftStatusFilter !== 'all' && s.status !== shiftStatusFilter)
          return false;
        if (shiftSearch.trim()) {
          const q = shiftSearch.toLowerCase();
          const matchCashier = s.cashier_name.toLowerCase().includes(q);
          const matchDate = s.business_date.toLowerCase().includes(q);
          const matchNotes = s.notes?.toLowerCase().includes(q) ?? false;
          return matchCashier || matchDate || matchNotes;
        }
        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (shiftSortField === 'started_at') {
          cmp =
            new Date(a.started_at).getTime() - new Date(b.started_at).getTime();
        } else if (shiftSortField === 'cashier_name') {
          cmp = a.cashier_name.localeCompare(b.cashier_name);
        } else if (shiftSortField === 'starting_cash') {
          cmp = a.starting_cash - b.starting_cash;
        } else if (shiftSortField === 'status') {
          cmp = a.status.localeCompare(b.status);
        }
        return shiftSortOrder === 'asc' ? cmp : -cmp;
      });
  }, [shifts, shiftStatusFilter, shiftSearch, shiftSortField, shiftSortOrder]);

  // Verify turnover handler
  const handleVerify = async (turnover: CashTurnover) => {
    setBusyTurnoverId(turnover.turnover_id);
    const result = await verifyTurnover(turnover.turnover_id, 'verified', '');
    setBusyTurnoverId(null);
    if (!result.ok) {
      errorAlert('Verification Failed', result.error);
    } else {
      successAlert(
        'Turnover Verified',
        `Cash turnover for ${turnover.cashier_name} was verified successfully.`,
      );
      router.refresh();
    }
  };

  // Open flag modal
  const openFlagModal = (turnover: CashTurnover) => {
    setTargetTurnover(turnover);
    setFlagNote('');
    setFlagModalOpen(true);
  };

  // Submit flag
  const handleConfirmFlag = async () => {
    if (!targetTurnover) return;
    if (!flagNote.trim()) {
      errorAlert(
        'Reason Required',
        'Please provide a reason for flagging this turnover.',
      );
      return;
    }

    setFlagSubmitting(true);
    const result = await verifyTurnover(
      targetTurnover.turnover_id,
      'flagged',
      flagNote,
    );
    setFlagSubmitting(false);

    if (!result.ok) {
      errorAlert('Flagging Failed', result.error);
    } else {
      setFlagModalOpen(false);
      warningAlert(
        'Turnover Flagged',
        `Turnover for ${targetTurnover.cashier_name} has been flagged for audit review.`,
      );
      router.refresh();
    }
  };

  return (
    <div className="space-y-6">
      {/* 4 Summary KPI Metric Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Active Registers */}
        <div className="relative overflow-hidden rounded-xl border border-border bg-surface p-5 sm:p-6 shadow-sm">
          <div className="absolute right-3 top-3 rounded-lg bg-mist p-2 text-foreground">
            <UsersIcon className="h-5 w-5" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted">
            Active Registers
          </span>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-2xl font-black text-foreground">
              {activeShiftsCount}
            </span>
            {activeShiftsCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Shifts
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-muted">
            {activeShiftsCount === 0
              ? 'No open cashier shifts'
              : `${activeShiftsCount} cashier${activeShiftsCount > 1 ? 's' : ''} currently on duty`}
          </p>
        </div>

        {/* Turnovers Pending Review */}
        <div
          className={cn(
            'relative overflow-hidden rounded-xl border p-5 sm:p-6 shadow-sm transition-colors',
            pendingTurnoversCount > 0
              ? 'border-amber-500/30 bg-surface'
              : 'border-border bg-surface',
          )}
        >
          <div
            className={cn(
              'absolute right-3 top-3 rounded-lg p-2',
              pendingTurnoversCount > 0
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                : 'bg-mist text-foreground',
            )}
          >
            <ClockIcon className="h-5 w-5" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted">
            Pending Turnovers
          </span>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={cn(
                'text-2xl font-black',
                pendingTurnoversCount > 0
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-foreground',
              )}
            >
              {pendingTurnoversCount}
            </span>
            {pendingTurnoversCount > 0 && (
              <span className="inline-flex rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-400">
                Action Required
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-muted">
            Awaiting manager verification
          </p>
        </div>

        {/* Total Counted Cash */}
        <div className="relative overflow-hidden rounded-xl border border-border bg-surface p-5 sm:p-6 shadow-sm">
          <div className="absolute right-3 top-3 rounded-lg bg-mist p-2 text-foreground">
            <BanknotesIcon className="h-5 w-5" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted">
            Turnover Cash Handed
          </span>
          <div className="mt-2 text-2xl font-black text-foreground">
            ₱
            {totalCountedCash.toLocaleString('en-US', {
              minimumFractionDigits: 2,
            })}
          </div>
          <p className="mt-1 text-xs text-muted">
            Total counted physical cash across turnovers
          </p>
        </div>

        {/* Discrepancies Count */}
        <div className="relative overflow-hidden rounded-xl border border-border bg-surface p-5 sm:p-6 shadow-sm">
          <div className="absolute right-3 top-3 rounded-lg bg-mist p-2 text-foreground">
            <ExclamationTriangleIcon className="h-5 w-5" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted">
            Discrepant Turnovers
          </span>
          <div className="mt-2 text-2xl font-black text-foreground">
            {discrepancyCount}
          </div>
          <p className="mt-1 text-xs text-muted">
            {discrepancyCount === 0
              ? 'All drawer turn overs balanced'
              : 'Turnovers with cash variance / shortage'}
          </p>
        </div>
      </div>

      {/* Main Operations Container */}
      <div className="rounded-xl border border-border bg-surface shadow-sm">
        {/* Navigation Tabs Header */}
        <div className="flex flex-col gap-3 border-b border-border/70 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-1.5 rounded-lg border border-border bg-slate-50/70 p-1">
            <button
              type="button"
              onClick={() => setActiveTab('turnovers')}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all',
                activeTab === 'turnovers'
                  ? 'bg-surface text-foreground shadow-xs'
                  : 'text-muted hover:text-foreground',
              )}
            >
              <BanknotesIcon className="h-4 w-4" />
              Cash Turnover Review
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                  pendingTurnoversCount > 0
                    ? 'bg-amber-500 text-surface'
                    : 'bg-mist text-muted',
                )}
              >
                {turnovers.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('shifts')}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all',
                activeTab === 'shifts'
                  ? 'bg-surface text-foreground shadow-xs'
                  : 'text-muted hover:text-foreground',
              )}
            >
              <ClockIcon className="h-4 w-4" />
              Cashier Shifts History
              <span className="rounded-full bg-mist px-1.5 py-0.5 text-[10px] font-semibold text-muted">
                {shifts.length}
              </span>
            </button>
          </div>

          {/* Quick Tab Filters & Search */}
          <div className="flex flex-wrap items-center gap-2">
            {activeTab === 'turnovers' ? (
              <>
                <div className="flex items-center rounded-md border border-border bg-surface p-0.5 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setTurnoverStatusFilter('all')}
                    className={cn(
                      'rounded px-2.5 py-1.5 transition-colors',
                      turnoverStatusFilter === 'all'
                        ? 'bg-pine text-surface font-semibold'
                        : 'text-muted hover:text-foreground',
                    )}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setTurnoverStatusFilter('pending')}
                    className={cn(
                      'rounded px-2.5 py-1.5 transition-colors',
                      turnoverStatusFilter === 'pending'
                        ? 'bg-amber-500 text-surface font-semibold'
                        : 'text-muted hover:text-foreground',
                    )}
                  >
                    Pending ({pendingTurnoversCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTurnoverStatusFilter('verified')}
                    className={cn(
                      'rounded px-2.5 py-1.5 transition-colors',
                      turnoverStatusFilter === 'verified'
                        ? 'bg-emerald-600 text-surface font-semibold'
                        : 'text-muted hover:text-foreground',
                    )}
                  >
                    Verified
                  </button>
                  <button
                    type="button"
                    onClick={() => setTurnoverStatusFilter('flagged')}
                    className={cn(
                      'rounded px-2.5 py-1.5 transition-colors',
                      turnoverStatusFilter === 'flagged'
                        ? 'bg-danger text-surface font-semibold'
                        : 'text-muted hover:text-foreground',
                    )}
                  >
                    Flagged
                  </button>
                </div>

                <div className="relative min-w-44 flex-1 sm:w-56">
                  <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted" />
                  <input
                    type="text"
                    value={turnoverSearch}
                    onChange={(e) => setTurnoverSearch(e.target.value)}
                    placeholder="Search cashier or notes..."
                    className="h-10 w-full rounded-md border border-border bg-white pl-9 pr-3 text-sm text-foreground placeholder:text-muted/60 focus:border-pine focus:outline-pine"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center rounded-md border border-border bg-surface p-0.5 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setShiftStatusFilter('all')}
                    className={cn(
                      'rounded px-2.5 py-1.5 transition-colors',
                      shiftStatusFilter === 'all'
                        ? 'bg-pine text-surface font-semibold'
                        : 'text-muted hover:text-foreground',
                    )}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setShiftStatusFilter('open')}
                    className={cn(
                      'rounded px-2.5 py-1.5 transition-colors',
                      shiftStatusFilter === 'open'
                        ? 'bg-emerald-600 text-surface font-semibold'
                        : 'text-muted hover:text-foreground',
                    )}
                  >
                    Active Shifts ({activeShiftsCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setShiftStatusFilter('closed')}
                    className={cn(
                      'rounded px-2.5 py-1.5 transition-colors',
                      shiftStatusFilter === 'closed'
                        ? 'bg-pine text-surface font-semibold'
                        : 'text-muted hover:text-foreground',
                    )}
                  >
                    Closed
                  </button>
                </div>

                <div className="relative min-w-44 flex-1 sm:w-56">
                  <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted" />
                  <input
                    type="text"
                    value={shiftSearch}
                    onChange={(e) => setShiftSearch(e.target.value)}
                    placeholder="Search cashier or date..."
                    className="h-10 w-full rounded-md border border-border bg-white pl-9 pr-3 text-sm text-foreground placeholder:text-muted/60 focus:border-pine focus:outline-pine"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Tab 1: Cash Turnover Review */}
        {activeTab === 'turnovers' && (
          <div className="overflow-x-auto">
            {filteredTurnovers.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  icon={<ReceiptIcon />}
                  title="No cash turnovers found"
                  sub="Completed cashier turnovers will appear here for verification."
                />
              </div>
            ) : (
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-border/80 bg-mist/40 text-muted">
                    <th
                      scope="col"
                      onClick={() => handleTurnoverSort('cashier_name')}
                      className="cursor-pointer select-none px-4 py-3 font-semibold hover:text-foreground"
                    >
                      <div className="flex items-center gap-1">
                        <span>Cashier</span>
                        {turnoverSortField === 'cashier_name' ? (
                          turnoverSortOrder === 'asc' ? (
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
                      onClick={() => handleTurnoverSort('submitted_at')}
                      className="cursor-pointer select-none px-4 py-3 font-semibold hover:text-foreground"
                    >
                      <div className="flex items-center gap-1">
                        <span>Submitted Time</span>
                        {turnoverSortField === 'submitted_at' ? (
                          turnoverSortOrder === 'asc' ? (
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
                      className="px-4 py-3 text-right font-semibold"
                    >
                      Starting Cash
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-right font-semibold"
                    >
                      Cash Sales
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-right font-semibold"
                    >
                      Expected Cash
                    </th>
                    <th
                      scope="col"
                      onClick={() => handleTurnoverSort('counted_cash')}
                      className="cursor-pointer select-none px-4 py-3 text-right font-semibold hover:text-foreground"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Counted Cash</span>
                        {turnoverSortField === 'counted_cash' ? (
                          turnoverSortOrder === 'asc' ? (
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
                      onClick={() => handleTurnoverSort('variance')}
                      className="cursor-pointer select-none px-4 py-3 text-center font-semibold hover:text-foreground"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>Variance</span>
                        {turnoverSortField === 'variance' ? (
                          turnoverSortOrder === 'asc' ? (
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
                      onClick={() => handleTurnoverSort('status')}
                      className="cursor-pointer select-none px-4 py-3 text-center font-semibold hover:text-foreground"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>Status</span>
                        {turnoverSortField === 'status' ? (
                          turnoverSortOrder === 'asc' ? (
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
                      className="px-4 py-3 text-right font-semibold"
                    >
                      Admin Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredTurnovers.map((item) => {
                    const isPending = item.status === 'pending';
                    const isVerified = item.status === 'verified';
                    const isFlagged = item.status === 'flagged';
                    const isBalanced = Math.abs(item.variance) < 0.01;
                    const dateObj = new Date(item.submitted_at);
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
                        key={item.turnover_id}
                        className={cn(
                          'transition-colors hover:bg-mist/40',
                          isPending && 'bg-amber-500/5',
                        )}
                      >
                        {/* Cashier */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-pine/10 text-xs font-bold text-pine">
                              {item.cashier_name.charAt(0).toUpperCase()}
                            </span>
                            <div>
                              <div className="font-bold text-foreground">
                                {item.cashier_name}
                              </div>
                              {item.notes && (
                                <div className="max-w-xs truncate text-[11px] text-muted italic">
                                  &ldquo;{item.notes}&rdquo;
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Submitted Time */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="font-medium text-foreground">
                            {formattedDate}
                          </div>
                          <div className="text-[11px] text-muted">
                            {formattedTime}
                          </div>
                        </td>

                        {/* Starting Cash */}
                        <td className="px-4 py-3 text-right whitespace-nowrap text-muted">
                          ₱{item.starting_cash.toFixed(2)}
                        </td>

                        {/* Cash Sales */}
                        <td className="px-4 py-3 text-right whitespace-nowrap font-medium text-foreground">
                          ₱{item.cash_sales.toFixed(2)}
                        </td>

                        {/* Expected Cash */}
                        <td className="px-4 py-3 text-right whitespace-nowrap font-semibold text-foreground">
                          ₱{item.expected_cash.toFixed(2)}
                        </td>

                        {/* Counted Cash */}
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <span className="text-sm font-black text-foreground">
                            ₱{item.counted_cash.toFixed(2)}
                          </span>
                        </td>

                        {/* Variance */}
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          {isBalanced ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                              <CheckCircleIcon className="h-3 w-3" />
                              Balanced
                            </span>
                          ) : item.variance < 0 ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-danger/10 px-2 py-0.5 text-[11px] font-bold text-danger">
                              <ExclamationTriangleIcon className="h-3 w-3" />
                              -₱{Math.abs(item.variance).toFixed(2)} Short
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-400">
                              +₱{item.variance.toFixed(2)} Over
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          {isPending && (
                            <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-400">
                              Pending
                            </span>
                          )}
                          {isVerified && (
                            <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                              Verified
                            </span>
                          )}
                          {isFlagged && (
                            <div className="flex flex-col items-center">
                              <span className="inline-flex items-center rounded-full bg-danger/10 px-2.5 py-0.5 text-[11px] font-bold text-danger">
                                Flagged
                              </span>
                              {item.verification_note && (
                                <span className="mt-0.5 max-w-28 truncate text-[10px] text-muted">
                                  {item.verification_note}
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          {isPending ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                disabled={busyTurnoverId === item.turnover_id}
                                onClick={() => handleVerify(item)}
                                className="action-focus inline-flex h-8 items-center rounded-lg bg-pine px-3 text-xs font-bold text-surface shadow-xs transition-colors hover:bg-pine-deep disabled:opacity-50"
                              >
                                {busyTurnoverId === item.turnover_id
                                  ? 'Verifying...'
                                  : 'Verify'}
                              </button>
                              <button
                                type="button"
                                disabled={busyTurnoverId === item.turnover_id}
                                onClick={() => openFlagModal(item)}
                                className="inline-flex h-8 items-center rounded-lg border border-border bg-surface px-2.5 text-xs font-semibold text-danger transition-colors hover:border-danger/30 hover:bg-danger/5 disabled:opacity-50"
                              >
                                Flag
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-muted">
                              {isVerified ? 'Approved' : 'Under Review'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Tab 2: Cashier Shifts History */}
        {activeTab === 'shifts' && (
          <div className="overflow-x-auto">
            {filteredShifts.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  icon={<ChartIcon />}
                  title="No shifts found"
                  sub="Cashier shift records will appear here as registers are opened."
                />
              </div>
            ) : (
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-border/80 bg-mist/40 text-muted">
                    <th
                      scope="col"
                      onClick={() => handleShiftSort('cashier_name')}
                      className="cursor-pointer select-none px-4 py-3 font-semibold hover:text-foreground"
                    >
                      <div className="flex items-center gap-1">
                        <span>Cashier</span>
                        {shiftSortField === 'cashier_name' ? (
                          shiftSortOrder === 'asc' ? (
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
                      Business Date
                    </th>
                    <th
                      scope="col"
                      onClick={() => handleShiftSort('started_at')}
                      className="cursor-pointer select-none px-4 py-3 font-semibold hover:text-foreground"
                    >
                      <div className="flex items-center gap-1">
                        <span>Shift Duration</span>
                        {shiftSortField === 'started_at' ? (
                          shiftSortOrder === 'asc' ? (
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
                      onClick={() => handleShiftSort('starting_cash')}
                      className="cursor-pointer select-none px-4 py-3 text-right font-semibold hover:text-foreground"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Starting Cash</span>
                        {shiftSortField === 'starting_cash' ? (
                          shiftSortOrder === 'asc' ? (
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
                      onClick={() => handleShiftSort('status')}
                      className="cursor-pointer select-none px-4 py-3 text-center font-semibold hover:text-foreground"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>Status</span>
                        {shiftSortField === 'status' ? (
                          shiftSortOrder === 'asc' ? (
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
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredShifts.map((shift) => {
                    const isOpen = shift.status === 'open';
                    const startDate = new Date(shift.started_at);
                    const endDate = shift.ended_at
                      ? new Date(shift.ended_at)
                      : null;

                    return (
                      <tr
                        key={shift.shift_id}
                        className={cn(
                          'transition-colors hover:bg-mist/40',
                          isOpen && 'bg-emerald-500/5',
                        )}
                      >
                        {/* Cashier */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-pine/10 text-xs font-bold text-pine">
                              {shift.cashier_name.charAt(0).toUpperCase()}
                            </span>
                            <span className="font-bold text-foreground">
                              {shift.cashier_name}
                            </span>
                          </div>
                        </td>

                        {/* Business Date */}
                        <td className="px-4 py-3 whitespace-nowrap font-medium text-foreground">
                          {shift.business_date}
                        </td>

                        {/* Duration */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="font-medium text-foreground">
                            Started:{' '}
                            {startDate.toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </div>
                          <div className="text-[11px] text-muted">
                            {endDate ? (
                              `Ended: ${endDate.toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                              })}`
                            ) : (
                              <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Currently In Progress
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Starting Cash */}
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <span className="text-sm font-bold text-foreground">
                            ₱{shift.starting_cash.toFixed(2)}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          {isOpen ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Open
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full bg-mist px-2.5 py-0.5 text-[11px] font-semibold text-muted">
                              Closed
                            </span>
                          )}
                        </td>

                        {/* Notes */}
                        <td className="px-4 py-3 text-muted">
                          {shift.notes ? (
                            <span className="max-w-xs truncate block">
                              {shift.notes}
                            </span>
                          ) : (
                            <span className="text-muted/60">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Footer info bar */}
        <div className="flex items-center justify-between border-t border-border/70 p-3 text-xs text-muted">
          <span>
            {activeTab === 'turnovers'
              ? `Showing ${filteredTurnovers.length} of ${turnovers.length} turnover submissions`
              : `Showing ${filteredShifts.length} of ${shifts.length} shift logs`}
          </span>
          <span className="text-[11px]">Manila Timezone (UTC+8)</span>
        </div>
      </div>

      {/* Flag Turnover Modal (No Browser Prompts!) */}
      {targetTurnover && (
        <Modal
          isOpen={flagModalOpen}
          onOpenChange={(open) => !flagSubmitting && setFlagModalOpen(open)}
          isDismissDisabled={flagSubmitting}
          title="Flag Turnover Discrepancy"
        >
          <div className="space-y-4">
            {/* Warning banner */}
            <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-amber-900 dark:text-amber-200">
              <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
              <div className="text-xs">
                <span className="font-bold">Audit Alert:</span> Flagging this
                turnover marks it for supervisor review and notifies management
                of the drawer cash variance.
              </div>
            </div>

            {/* Turnover recap */}
            <div className="rounded-xl border border-border bg-mist/40 p-3 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-muted">Cashier:</span>
                <span className="font-bold text-foreground">
                  {targetTurnover.cashier_name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Expected Cash:</span>
                <span className="font-bold text-foreground">
                  ₱{targetTurnover.expected_cash.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Counted Cash:</span>
                <span className="font-bold text-foreground">
                  ₱{targetTurnover.counted_cash.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Variance:</span>
                <span
                  className={cn(
                    'font-bold',
                    targetTurnover.variance < 0
                      ? 'text-danger'
                      : 'text-amber-600',
                  )}
                >
                  {targetTurnover.variance < 0
                    ? `-₱${Math.abs(targetTurnover.variance).toFixed(2)} Shortage`
                    : `+₱${targetTurnover.variance.toFixed(2)} Overage`}
                </span>
              </div>
              {targetTurnover.notes && (
                <div className="border-t border-border/50 pt-1.5 mt-1.5">
                  <span className="text-muted block text-[11px]">
                    Cashier&apos;s reason:
                  </span>
                  <span className="font-medium text-foreground italic">
                    &ldquo;{targetTurnover.notes}&rdquo;
                  </span>
                </div>
              )}
            </div>

            {/* Reason input */}
            <div>
              <label
                htmlFor="flag-note"
                className="block text-xs font-semibold text-foreground mb-1"
              >
                Admin Flag Note <span className="text-danger">*</span>
              </label>
              <textarea
                id="flag-note"
                rows={3}
                value={flagNote}
                onChange={(e) => setFlagNote(e.target.value)}
                placeholder="Reason for flagging (e.g. Unexplained shortage, bill denomination mismatch...)"
                className="w-full rounded-md border border-border bg-white p-3 text-sm text-foreground placeholder:text-muted/60 focus:border-danger focus:outline-2 focus:outline-danger"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
              <button
                type="button"
                disabled={flagSubmitting}
                onClick={() => setFlagModalOpen(false)}
                className="h-10 rounded-md border border-border bg-white px-4 text-sm font-semibold text-foreground hover:bg-mist disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={flagSubmitting || !flagNote.trim()}
                onClick={handleConfirmFlag}
                className="action-focus inline-flex h-10 items-center rounded-md bg-danger px-4 text-sm font-semibold text-surface shadow-xs hover:bg-danger/90 disabled:opacity-50"
              >
                {flagSubmitting ? 'Flagging...' : 'Confirm Flag'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
