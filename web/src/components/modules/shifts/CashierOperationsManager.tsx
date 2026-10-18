'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type {
  AdminShift,
  CashierShift,
  CashTurnover,
} from '@/features/shifts/queries';
import { ShiftPanel } from './ShiftPanel';
import { Modal } from '@/components/modal/Modal';
import { EmptyState } from '@/components/error/EmptyState';
import {
  BanknotesIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronUpDownIcon,
  ChevronUpIcon,
  ClipboardDocumentCheckIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  InformationCircleIcon,
  MagnifyingGlassIcon,
  NoSymbolIcon,
  ShoppingCartIcon,
} from '@/components/common/hero-icons';
import { ChartIcon, ReceiptIcon } from '@/components/common/icons';
import { cn } from '@/lib/cn';

interface CashierOperationsManagerProps {
  cashierEmail: string;
  shift: CashierShift | null;
  shifts: AdminShift[];
  turnovers: CashTurnover[];
}

type TabKey =
  | 'shift'
  | 'turnover'
  | 'shifts-history'
  | 'turnovers-history'
  | 'role-permissions';
type TurnoverSortField =
  | 'submitted_at'
  | 'counted_cash'
  | 'variance'
  | 'status';
type ShiftSortField = 'started_at' | 'starting_cash' | 'status';
type SortOrder = 'asc' | 'desc';

export function CashierOperationsManager({
  cashierEmail,
  shift,
  shifts,
  turnovers,
}: CashierOperationsManagerProps) {
  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (hash === '#turnover') return 'turnover';
      if (hash === '#shift') return 'shift';
      if (hash === '#shifts-history') return 'shifts-history';
      if (hash === '#turnovers-history') return 'turnovers-history';
      if (hash === '#role-permissions') return 'role-permissions';
    }
    return 'shift';
  });

  // Listen to URL hash changes
  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash;
      if (hash === '#turnover') setActiveTab('turnover');
      else if (hash === '#shift') setActiveTab('shift');
      else if (hash === '#shifts-history') setActiveTab('shifts-history');
      else if (hash === '#turnovers-history') setActiveTab('turnovers-history');
      else if (hash === '#role-permissions') setActiveTab('role-permissions');
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Filters for Turnovers
  const [turnoverStatusFilter, setTurnoverStatusFilter] = useState<
    'all' | 'pending' | 'verified' | 'flagged' | 'discrepancy'
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

  // Details Modal States
  const [selectedTurnover, setSelectedTurnover] = useState<CashTurnover | null>(
    null,
  );
  const [selectedShift, setSelectedShift] = useState<AdminShift | null>(null);

  const isOpen = shift?.status === 'open';

  // Summary Metrics calculations
  const pendingTurnoversCount = useMemo(
    () => turnovers.filter((t) => t.status === 'pending').length,
    [turnovers],
  );
  const discrepancyTurnoversCount = useMemo(
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
        if (turnoverStatusFilter === 'discrepancy') {
          if (Math.abs(t.variance) < 0.01) return false;
        } else if (
          turnoverStatusFilter !== 'all' &&
          t.status !== turnoverStatusFilter
        ) {
          return false;
        }
        if (turnoverSearch.trim()) {
          const q = turnoverSearch.toLowerCase();
          const matchNotes = t.notes?.toLowerCase().includes(q) ?? false;
          const matchAdmin =
            t.verification_note?.toLowerCase().includes(q) ?? false;
          return matchNotes || matchAdmin;
        }
        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (turnoverSortField === 'submitted_at') {
          cmp =
            new Date(a.submitted_at).getTime() -
            new Date(b.submitted_at).getTime();
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
        if (shiftStatusFilter !== 'all' && s.status !== shiftStatusFilter) {
          return false;
        }
        if (shiftSearch.trim()) {
          const q = shiftSearch.toLowerCase();
          const matchDate = s.business_date.toLowerCase().includes(q);
          const matchNotes = s.notes?.toLowerCase().includes(q) ?? false;
          return matchDate || matchNotes;
        }
        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (shiftSortField === 'started_at') {
          cmp =
            new Date(a.started_at).getTime() - new Date(b.started_at).getTime();
        } else if (shiftSortField === 'starting_cash') {
          cmp = a.starting_cash - b.starting_cash;
        } else if (shiftSortField === 'status') {
          cmp = a.status.localeCompare(b.status);
        }
        return shiftSortOrder === 'asc' ? cmp : -cmp;
      });
  }, [shifts, shiftStatusFilter, shiftSearch, shiftSortField, shiftSortOrder]);

  return (
    <div className="space-y-6">
      {/* 4 Summary Operational KPI Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Shift Status */}
        <button
          type="button"
          onClick={() => setActiveTab('shift')}
          className="relative text-left overflow-hidden rounded-xl border border-border bg-surface p-5 sm:p-6 shadow-sm transition hover:border-pine/40 hover:shadow"
        >
          <div className="absolute right-3 top-3 rounded-lg bg-mist p-2 text-foreground">
            <ClockIcon className="h-5 w-5" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted">
            Shift Status
          </span>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-2xl font-black text-foreground">
              {isOpen ? 'Active' : 'Closed'}
            </span>
            {isOpen ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Shift
              </span>
            ) : (
              <span className="inline-flex rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-400">
                Not Started
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-muted">
            {isOpen
              ? `Started at ${new Date(shift.started_at).toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit' })}`
              : 'Open shift before taking cash sales'}
          </p>
        </button>

        {/* Starting Cash */}
        <button
          type="button"
          onClick={() => setActiveTab('shift')}
          className="relative text-left overflow-hidden rounded-xl border border-border bg-surface p-5 sm:p-6 shadow-sm transition hover:border-pine/40 hover:shadow"
        >
          <div className="absolute right-3 top-3 rounded-lg bg-mist p-2 text-foreground">
            <BanknotesIcon className="h-5 w-5" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted">
            Starting Cash Float
          </span>
          <div className="mt-2 text-2xl font-black text-foreground">
            ₱{isOpen ? shift.starting_cash.toFixed(2) : '0.00'}
          </div>
          <p className="mt-1 text-xs text-muted">Opening drawer float</p>
        </button>

        {/* Cash Sales */}
        <button
          type="button"
          onClick={() => setActiveTab('turnover')}
          className="relative text-left overflow-hidden rounded-xl border border-border bg-surface p-5 sm:p-6 shadow-sm transition hover:border-pine/40 hover:shadow"
        >
          <div className="absolute right-3 top-3 rounded-lg bg-mist p-2 text-foreground">
            <CheckCircleIcon className="h-5 w-5" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted">
            Cash Sales Collected
          </span>
          <div className="mt-2 text-2xl font-black text-foreground">
            ₱{isOpen ? shift.cash_sales.toFixed(2) : '0.00'}
          </div>
          <p className="mt-1 text-xs text-muted">
            Active physical cash transactions
          </p>
        </button>

        {/* Expected Cash in Drawer */}
        <button
          type="button"
          onClick={() => setActiveTab('turnover')}
          className="relative text-left overflow-hidden rounded-xl border border-border bg-surface p-5 sm:p-6 shadow-sm transition hover:border-pine/40 hover:shadow"
        >
          <div className="absolute right-3 top-3 rounded-lg bg-mist p-2 text-foreground">
            <ExclamationTriangleIcon className="h-5 w-5" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted">
            Expected in Drawer
          </span>
          <div className="mt-2 text-2xl font-black text-foreground">
            ₱{isOpen ? shift.expected_cash.toFixed(2) : '0.00'}
          </div>
          <p className="mt-1 text-xs text-muted">Starting float + cash sales</p>
        </button>
      </div>

      {/* Main Operations Container */}
      <div className="rounded-xl border border-border bg-surface shadow-sm">
        {/* Navigation Tabs Header */}
        <div className="flex flex-col gap-3 border-b border-border/70 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-slate-50/70 p-1">
            <button
              type="button"
              onClick={() => setActiveTab('shift')}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all',
                activeTab === 'shift'
                  ? 'bg-surface text-foreground shadow-xs'
                  : 'text-muted hover:text-foreground',
              )}
            >
              <ClockIcon className="h-4 w-4" />
              Cashier Shift
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                  isOpen ? 'bg-emerald-500 text-surface' : 'bg-mist text-muted',
                )}
              >
                {isOpen ? 'Open' : 'Closed'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('turnover')}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all',
                activeTab === 'turnover'
                  ? 'bg-surface text-foreground shadow-xs'
                  : 'text-muted hover:text-foreground',
              )}
            >
              <BanknotesIcon className="h-4 w-4" />
              Cash Turnover &amp; Drawer Count
              {pendingTurnoversCount > 0 && (
                <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-semibold text-surface">
                  {pendingTurnoversCount} pending
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('shifts-history')}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all',
                activeTab === 'shifts-history'
                  ? 'bg-surface text-foreground shadow-xs'
                  : 'text-muted hover:text-foreground',
              )}
            >
              <ChartIcon className="h-4 w-4" />
              Shift History
              <span className="rounded-full bg-mist px-1.5 py-0.5 text-[10px] font-semibold text-muted">
                {shifts.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('turnovers-history')}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all',
                activeTab === 'turnovers-history'
                  ? 'bg-surface text-foreground shadow-xs'
                  : 'text-muted hover:text-foreground',
              )}
            >
              <ReceiptIcon className="h-4 w-4" />
              Turnover History
              <span className="rounded-full bg-mist px-1.5 py-0.5 text-[10px] font-semibold text-muted">
                {turnovers.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('role-permissions')}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all',
                activeTab === 'role-permissions'
                  ? 'bg-surface text-foreground shadow-xs'
                  : 'text-muted hover:text-foreground',
              )}
            >
              <ClipboardDocumentCheckIcon className="h-4 w-4" />
              Role Scope &amp; Permissions
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-pine/10 px-2 py-0.5 text-[11px] font-bold text-pine">
              Role: Cashier
            </span>
            <span className="text-muted">
              Logged in as:{' '}
              <strong className="text-foreground">{cashierEmail}</strong>
            </span>
            <button
              type="button"
              onClick={() => setActiveTab('role-permissions')}
              className="action-focus inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5 text-[11px] font-semibold text-muted hover:border-pine/40 hover:bg-pine/5 hover:text-pine transition"
              title="Review Cashier Role Capabilities and Security Boundaries"
            >
              <InformationCircleIcon className="h-3 w-3" />
              <span>What Cashiers Can Do</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Cashier Shift */}
        {activeTab === 'shift' && (
          <div className="p-5 sm:p-6 space-y-8">
            <ShiftPanel
              shift={shift}
              cashierEmail={cashierEmail}
              onSwitchToTurnover={() => setActiveTab('turnover')}
            />

            {/* Quick Recent Shifts preview */}
            {shifts.length > 0 && (
              <div className="pt-4 border-t border-border/70 flex items-center justify-between">
                <span className="text-xs text-muted">
                  Recorded <strong>{shifts.length}</strong> previous cashier
                  shift{shifts.length > 1 ? 's' : ''}.
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('shifts-history')}
                  className="action-focus inline-flex items-center gap-1.5 text-xs font-bold text-pine hover:underline"
                >
                  <span>View Shift History Ledger</span>
                  <span>&rarr;</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Cash Turnover & Drawer Count */}
        {activeTab === 'turnover' && (
          <div className="p-5 sm:p-6 space-y-8">
            <ShiftPanel
              shift={shift}
              turnoverMode
              cashierEmail={cashierEmail}
              onSwitchToTurnover={() => setActiveTab('shift')}
            />

            {/* Quick Recent Turnovers preview */}
            {turnovers.length > 0 && (
              <div className="pt-4 border-t border-border/70 flex items-center justify-between">
                <span className="text-xs text-muted">
                  Recorded <strong>{turnovers.length}</strong> past cash
                  turnover submission{turnovers.length > 1 ? 's' : ''}.
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('turnovers-history')}
                  className="action-focus inline-flex items-center gap-1.5 text-xs font-bold text-pine hover:underline"
                >
                  <span>View Turnover History Ledger</span>
                  <span>&rarr;</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Shift History Ledger Table (Admin Parity) */}
        {activeTab === 'shifts-history' && (
          <div>
            {/* Toolbar: Filters & Search */}
            <div className="flex flex-col gap-3 border-b border-border/70 p-4 sm:flex-row sm:items-center sm:justify-between bg-mist/20">
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
                  All ({shifts.length})
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
                  Open ({shifts.filter((s) => s.status === 'open').length})
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
                  Closed ({shifts.filter((s) => s.status === 'closed').length})
                </button>
              </div>

              <div className="relative min-w-44 flex-1 sm:w-64">
                <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted" />
                <input
                  type="text"
                  value={shiftSearch}
                  onChange={(e) => setShiftSearch(e.target.value)}
                  placeholder="Search date or notes..."
                  className="h-10 w-full rounded-md border border-border bg-white pl-9 pr-3 text-sm text-foreground placeholder:text-muted/60 focus:border-pine focus:outline-pine"
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              {filteredShifts.length === 0 ? (
                <div className="p-8">
                  <EmptyState
                    icon={<ChartIcon />}
                    title="No shift records found"
                    sub="Previous shifts opened at this register will appear here."
                  />
                </div>
              ) : (
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-border/80 bg-mist/40 text-muted">
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
                      <th
                        scope="col"
                        className="px-4 py-3 text-right font-semibold"
                      >
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredShifts.map((s) => {
                      const isShiftOpen = s.status === 'open';
                      const startDate = new Date(s.started_at);
                      const endDate = s.ended_at ? new Date(s.ended_at) : null;

                      return (
                        <tr
                          key={s.shift_id}
                          className={cn(
                            'transition-colors hover:bg-mist/40',
                            isShiftOpen && 'bg-emerald-500/5',
                          )}
                        >
                          {/* Business Date */}
                          <td className="px-4 py-3 whitespace-nowrap font-medium text-foreground">
                            {s.business_date}
                          </td>

                          {/* Duration */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="font-medium text-foreground">
                              Started:{' '}
                              {startDate.toLocaleTimeString('en-PH', {
                                timeZone: 'Asia/Manila',
                                hour: 'numeric',
                                minute: '2-digit',
                              })}
                            </div>
                            <div className="text-[11px] text-muted">
                              {endDate ? (
                                `Ended: ${endDate.toLocaleTimeString('en-PH', {
                                  timeZone: 'Asia/Manila',
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
                              ₱{s.starting_cash.toFixed(2)}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            {isShiftOpen ? (
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
                            {s.notes ? (
                              <span className="max-w-xs truncate block italic">
                                &ldquo;{s.notes}&rdquo;
                              </span>
                            ) : (
                              <span className="text-muted/60">—</span>
                            )}
                          </td>

                          {/* Action */}
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => setSelectedShift(s)}
                              className="action-focus inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs font-semibold text-muted hover:border-pine/40 hover:bg-pine/5 hover:text-pine transition"
                            >
                              <EyeIcon className="h-3 w-3" />
                              <span>Details</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Turnover History Ledger Table (Admin Parity) */}
        {activeTab === 'turnovers-history' && (
          <div>
            {/* Toolbar: Filters & Search */}
            <div className="flex flex-col gap-3 border-b border-border/70 p-4 sm:flex-row sm:items-center sm:justify-between bg-mist/20">
              <div className="flex flex-wrap items-center rounded-md border border-border bg-surface p-0.5 text-xs font-semibold">
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
                  All ({turnovers.length})
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
                <button
                  type="button"
                  onClick={() => setTurnoverStatusFilter('discrepancy')}
                  className={cn(
                    'rounded px-2.5 py-1.5 transition-colors',
                    turnoverStatusFilter === 'discrepancy'
                      ? 'bg-rose-600 text-surface font-semibold'
                      : 'text-muted hover:text-foreground',
                  )}
                >
                  Discrepancies ({discrepancyTurnoversCount})
                </button>
              </div>

              <div className="relative min-w-44 flex-1 sm:w-64">
                <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted" />
                <input
                  type="text"
                  value={turnoverSearch}
                  onChange={(e) => setTurnoverSearch(e.target.value)}
                  placeholder="Search notes or admin notes..."
                  className="h-10 w-full rounded-md border border-border bg-white pl-9 pr-3 text-sm text-foreground placeholder:text-muted/60 focus:border-pine focus:outline-pine"
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              {filteredTurnovers.length === 0 ? (
                <div className="p-8">
                  <EmptyState
                    icon={<ReceiptIcon />}
                    title="No cash turnovers found"
                    sub="Submitted drawer turnovers will appear here with verification status."
                  />
                </div>
              ) : (
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-border/80 bg-mist/40 text-muted">
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
                        Starting Float
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
                          <span>Review Status</span>
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
                        Action
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
                      const formattedDate = dateObj.toLocaleDateString(
                        'en-PH',
                        {
                          timeZone: 'Asia/Manila',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        },
                      );
                      const formattedTime = dateObj.toLocaleTimeString(
                        'en-PH',
                        {
                          timeZone: 'Asia/Manila',
                          hour: 'numeric',
                          minute: '2-digit',
                        },
                      );

                      return (
                        <tr
                          key={item.turnover_id}
                          className={cn(
                            'transition-colors hover:bg-mist/40',
                            isPending && 'bg-amber-500/5',
                          )}
                        >
                          {/* Submitted Time */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="font-medium text-foreground">
                              {formattedDate}
                            </div>
                            <div className="text-[11px] text-muted">
                              {formattedTime}
                            </div>
                          </td>

                          {/* Starting Float */}
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

                          {/* Review Status */}
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            {isPending && (
                              <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-400">
                                Pending Review
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

                          {/* Action */}
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => setSelectedTurnover(item)}
                              className="action-focus inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs font-semibold text-muted hover:border-pine/40 hover:bg-pine/5 hover:text-pine transition"
                            >
                              <EyeIcon className="h-3 w-3" />
                              <span>Details</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Tab 5: Role Scope & Permissions (What Cashiers Can Do) */}
        {activeTab === 'role-permissions' && (
          <div className="p-5 sm:p-6 space-y-6">
            {/* Header Banner */}
            <div className="rounded-xl border border-border bg-mist/30 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="rounded-xl bg-pine/10 p-2.5 text-pine shrink-0">
                  <ClipboardDocumentCheckIcon className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-foreground">
                      Cashier Role Scope &amp; Security Policy
                    </h2>
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                      Standard Counter Staff
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted leading-relaxed">
                    Operational breakdown of authorized counter point-of-sale
                    activities versus manager-restricted security boundaries
                    under Cafe Elvira RBAC.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href="/pos"
                  className="action-focus inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-pine px-3 text-xs font-semibold text-surface shadow-xs transition hover:bg-pine-deep"
                >
                  <ShoppingCartIcon className="h-3.5 w-3.5" />
                  <span>Open Register</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setActiveTab('shift')}
                  className="action-focus inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-border bg-surface px-3 text-xs font-semibold text-foreground hover:bg-mist transition"
                >
                  <ClockIcon className="h-3.5 w-3.5" />
                  <span>My Active Shift</span>
                </button>
              </div>
            </div>

            {/* 2-Column Capability Matrix */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Left Column: Authorized Capabilities */}
              <div className="rounded-xl border border-emerald-500/30 bg-surface shadow-xs overflow-hidden">
                <div className="border-b border-emerald-500/20 bg-emerald-500/5 px-5 py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircleIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    <h3 className="text-sm font-bold text-foreground">
                      What Cashiers Can Do
                    </h3>
                  </div>
                  <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-300">
                    Full Access Granted
                  </span>
                </div>

                <ul className="divide-y divide-border/60 p-2 text-xs">
                  <li className="p-3 hover:bg-mist/30 transition-colors rounded-lg">
                    <div className="flex items-start gap-2.5">
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] font-bold text-emerald-700">
                        ✓
                      </span>
                      <div>
                        <strong className="block text-foreground text-xs font-bold">
                          Register Shifts &amp; Float Allocation
                        </strong>
                        <p className="mt-0.5 text-muted leading-relaxed">
                          Open register shift sessions, declare starting drawer
                          cash using standard denomination presets (₱500,
                          ₱1,000, ₱1,500, ₱2,000, ₱3,000, ₱5,000), and track
                          expected in-drawer totals.
                        </p>
                      </div>
                    </div>
                  </li>

                  <li className="p-3 hover:bg-mist/30 transition-colors rounded-lg">
                    <div className="flex items-start gap-2.5">
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] font-bold text-emerald-700">
                        ✓
                      </span>
                      <div>
                        <strong className="block text-foreground text-xs font-bold">
                          Counter POS Checkout &amp; Payments
                        </strong>
                        <p className="mt-0.5 text-muted leading-relaxed">
                          Take customer orders, adjust item quantities, accept
                          physical Cash with real-time change calculation, and
                          generate dynamic PayMongo GCash &amp; Maya QR Ph
                          codes.
                        </p>
                      </div>
                    </div>
                  </li>

                  <li className="p-3 hover:bg-mist/30 transition-colors rounded-lg">
                    <div className="flex items-start gap-2.5">
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] font-bold text-emerald-700">
                        ✓
                      </span>
                      <div>
                        <strong className="block text-foreground text-xs font-bold">
                          Order Fulfillment Queue Progression
                        </strong>
                        <p className="mt-0.5 text-muted leading-relaxed">
                          Track and progress kitchen orders in real-time through
                          fulfillment stages:{' '}
                          <span className="font-semibold text-yellow-800 bg-yellow-50 px-1 py-0.5 rounded">
                            Pending
                          </span>{' '}
                          &rarr;{' '}
                          <span className="font-semibold text-amber-700 bg-amber-50 px-1 py-0.5 rounded">
                            Preparing
                          </span>{' '}
                          &rarr;{' '}
                          <span className="font-semibold text-blue-700 bg-blue-50 px-1 py-0.5 rounded">
                            Ready for Pickup
                          </span>{' '}
                          &rarr;{' '}
                          <span className="font-semibold text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded">
                            Completed / Served
                          </span>
                          .
                        </p>
                      </div>
                    </div>
                  </li>

                  <li className="p-3 hover:bg-mist/30 transition-colors rounded-lg">
                    <div className="flex items-start gap-2.5">
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] font-bold text-emerald-700">
                        ✓
                      </span>
                      <div>
                        <strong className="block text-foreground text-xs font-bold">
                          Daily Register Sales &amp; Receipt Printing
                        </strong>
                        <p className="mt-0.5 text-muted leading-relaxed">
                          Inspect today&apos;s read-only transactions ledger,
                          view individual receipt breakdowns, and print or
                          reprint customer receipts.
                        </p>
                      </div>
                    </div>
                  </li>

                  <li className="p-3 hover:bg-mist/30 transition-colors rounded-lg">
                    <div className="flex items-start gap-2.5">
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] font-bold text-emerald-700">
                        ✓
                      </span>
                      <div>
                        <strong className="block text-foreground text-xs font-bold">
                          Cash Drawer Reconciliation &amp; Turnover
                        </strong>
                        <p className="mt-0.5 text-muted leading-relaxed">
                          Count physical cash at shift closing, compute drawer
                          variance (balanced, shortage, or overage), record
                          mandatory discrepancy explanations, and submit
                          turnover for manager review.
                        </p>
                      </div>
                    </div>
                  </li>

                  <li className="p-3 hover:bg-mist/30 transition-colors rounded-lg">
                    <div className="flex items-start gap-2.5">
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] font-bold text-emerald-700">
                        ✓
                      </span>
                      <div>
                        <strong className="block text-foreground text-xs font-bold">
                          Daily Quota Reference &amp; Catalog Inspection
                        </strong>
                        <p className="mt-0.5 text-muted leading-relaxed">
                          Review today&apos;s live portion quotas, stock
                          availability warnings (Low Stock &lt;25%, Sold Out),
                          and browse product catalog recipes and pricing.
                        </p>
                      </div>
                    </div>
                  </li>
                </ul>
              </div>

              {/* Right Column: Protected Security Boundaries */}
              <div className="rounded-xl border border-border bg-surface shadow-xs overflow-hidden">
                <div className="border-b border-border/80 bg-mist/50 px-5 py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <NoSymbolIcon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    <h3 className="text-sm font-bold text-foreground">
                      Protected Manager Boundaries
                    </h3>
                  </div>
                  <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-300">
                    Requires Manager / Admin Auth
                  </span>
                </div>

                <ul className="divide-y divide-border/60 p-2 text-xs">
                  <li className="p-3 hover:bg-mist/30 transition-colors rounded-lg">
                    <div className="flex items-start gap-2.5">
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-rose-500/10 text-[10px] font-bold text-rose-600">
                        ✕
                      </span>
                      <div>
                        <strong className="block text-foreground text-xs font-bold">
                          Transaction Voiding &amp; Reversals
                        </strong>
                        <p className="mt-0.5 text-muted leading-relaxed">
                          Cashiers CANNOT void completed sales independently.
                          Voiding permanently reverses revenue and stock quota;
                          it strictly requires manager step-up credentials (
                          <code className="text-[11px] font-semibold">
                            admin@elvira.cafe
                          </code>
                          ) and an audited reason code.
                        </p>
                      </div>
                    </div>
                  </li>

                  <li className="p-3 hover:bg-mist/30 transition-colors rounded-lg">
                    <div className="flex items-start gap-2.5">
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-rose-500/10 text-[10px] font-bold text-rose-600">
                        ✕
                      </span>
                      <div>
                        <strong className="block text-foreground text-xs font-bold">
                          Turnover Verification &amp; Discrepancy Auditing
                        </strong>
                        <p className="mt-0.5 text-muted leading-relaxed">
                          Cashiers submit physical drawer cash, but only
                          managers and administrators have the authority to
                          officially approve, verify, or flag cash variance for
                          audit.
                        </p>
                      </div>
                    </div>
                  </li>

                  <li className="p-3 hover:bg-mist/30 transition-colors rounded-lg">
                    <div className="flex items-start gap-2.5">
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-rose-500/10 text-[10px] font-bold text-rose-600">
                        ✕
                      </span>
                      <div>
                        <strong className="block text-foreground text-xs font-bold">
                          Product Catalog &amp; Recipe Editing
                        </strong>
                        <p className="mt-0.5 text-muted leading-relaxed">
                          Adding new items to the menu, editing prices,
                          modifying recipe ingredients, and hiding/showing
                          products from the catalog is strictly restricted to
                          Administrators.
                        </p>
                      </div>
                    </div>
                  </li>

                  <li className="p-3 hover:bg-mist/30 transition-colors rounded-lg">
                    <div className="flex items-start gap-2.5">
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-rose-500/10 text-[10px] font-bold text-rose-600">
                        ✕
                      </span>
                      <div>
                        <strong className="block text-foreground text-xs font-bold">
                          Daily Production Quota Configuration
                        </strong>
                        <p className="mt-0.5 text-muted leading-relaxed">
                          Setting, modifying, or resetting daily batch portion
                          limits is reserved for Administrators based on kitchen
                          prep and supply availability.
                        </p>
                      </div>
                    </div>
                  </li>

                  <li className="p-3 hover:bg-mist/30 transition-colors rounded-lg">
                    <div className="flex items-start gap-2.5">
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-rose-500/10 text-[10px] font-bold text-rose-600">
                        ✕
                      </span>
                      <div>
                        <strong className="block text-foreground text-xs font-bold">
                          Staff Account Management &amp; Passwords
                        </strong>
                        <p className="mt-0.5 text-muted leading-relaxed">
                          Creating staff credentials, modifying user roles,
                          resetting passwords, and enabling/disabling employee
                          accounts is restricted to Administrators.
                        </p>
                      </div>
                    </div>
                  </li>

                  <li className="p-3 hover:bg-mist/30 transition-colors rounded-lg">
                    <div className="flex items-start gap-2.5">
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-rose-500/10 text-[10px] font-bold text-rose-600">
                        ✕
                      </span>
                      <div>
                        <strong className="block text-foreground text-xs font-bold">
                          Financial Reports &amp; Immutable Audit Logs
                        </strong>
                        <p className="mt-0.5 text-muted leading-relaxed">
                          Accessing multi-day historical revenue analytics,
                          financial statements, and system-wide security audit
                          trails is restricted to Administrators.
                        </p>
                      </div>
                    </div>
                  </li>
                </ul>
              </div>
            </div>

            {/* Quick Summary Note */}
            <div className="rounded-xl border border-border bg-mist/20 p-4 text-xs text-muted flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2">
                <InformationCircleIcon className="h-4 w-4 text-pine shrink-0" />
                <span>
                  <strong>Need elevated authorization?</strong> Request an
                  on-duty Administrator or Manager to authorize actions
                  requiring manager credentials.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('shift')}
                className="action-focus font-bold text-pine hover:underline shrink-0"
              >
                Return to Shift Operations &rarr;
              </button>
            </div>
          </div>
        )}

        {/* Footer info bar */}
        <div className="flex items-center justify-between border-t border-border/70 p-3 text-xs text-muted">
          <span>
            {activeTab === 'shifts-history'
              ? `Showing ${filteredShifts.length} of ${shifts.length} shift logs`
              : activeTab === 'turnovers-history'
                ? `Showing ${filteredTurnovers.length} of ${turnovers.length} turnover submissions`
                : activeTab === 'role-permissions'
                  ? 'Role Permissions & Access Control Reference'
                  : 'Cashier Register Session Management'}
          </span>
          <span className="text-[11px]">Manila Timezone (UTC+8)</span>
        </div>
      </div>

      {/* Shift Details Modal */}
      {selectedShift && (
        <Modal
          isOpen={Boolean(selectedShift)}
          onOpenChange={(open) => !open && setSelectedShift(null)}
          title="Shift Session Record"
          size="md"
        >
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-mist/30 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">Business Date</span>
                <span className="text-sm font-bold text-foreground">
                  {selectedShift.business_date}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">Shift Status</span>
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-xs font-bold',
                    selectedShift.status === 'open'
                      ? 'bg-emerald-500/10 text-emerald-700'
                      : 'bg-mist text-muted',
                  )}
                >
                  {selectedShift.status === 'open' ? 'Open' : 'Closed'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">Started At</span>
                <span className="text-xs font-semibold text-foreground">
                  {new Date(selectedShift.started_at).toLocaleString('en-PH', {
                    timeZone: 'Asia/Manila',
                  })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">Ended At</span>
                <span className="text-xs font-semibold text-foreground">
                  {selectedShift.ended_at
                    ? new Date(selectedShift.ended_at).toLocaleString('en-PH', {
                        timeZone: 'Asia/Manila',
                      })
                    : 'Currently In Progress'}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <span className="text-xs text-muted">Starting Cash Float</span>
                <span className="text-sm font-bold text-foreground">
                  ₱{selectedShift.starting_cash.toFixed(2)}
                </span>
              </div>
            </div>

            {selectedShift.notes && (
              <div className="rounded-xl border border-border bg-surface p-3 text-xs space-y-1">
                <span className="font-bold text-foreground">Notes:</span>
                <p className="text-muted leading-relaxed">
                  {selectedShift.notes}
                </p>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedShift(null)}
                className="h-9 rounded-md border border-border bg-surface px-4 text-xs font-semibold text-foreground hover:bg-mist"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Turnover Details Modal */}
      {selectedTurnover && (
        <Modal
          isOpen={Boolean(selectedTurnover)}
          onOpenChange={(open) => !open && setSelectedTurnover(null)}
          title="Turnover Submission Record"
          size="lg"
        >
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-mist/30 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">Submitted At</span>
                <span className="text-xs font-semibold text-foreground">
                  {new Date(selectedTurnover.submitted_at).toLocaleString(
                    'en-PH',
                    { timeZone: 'Asia/Manila' },
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">
                  Manager Review Status
                </span>
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-xs font-bold uppercase',
                    selectedTurnover.status === 'pending' &&
                      'bg-amber-500/10 text-amber-700',
                    selectedTurnover.status === 'verified' &&
                      'bg-emerald-500/10 text-emerald-700',
                    selectedTurnover.status === 'flagged' &&
                      'bg-danger/10 text-danger',
                  )}
                >
                  {selectedTurnover.status}
                </span>
              </div>
            </div>

            {/* Reconciliation Breakdown */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-border bg-surface p-3 text-center">
                <span className="text-[11px] text-muted block">
                  Starting Float
                </span>
                <strong className="text-sm text-foreground">
                  ₱{selectedTurnover.starting_cash.toFixed(2)}
                </strong>
              </div>
              <div className="rounded-xl border border-border bg-surface p-3 text-center">
                <span className="text-[11px] text-muted block">Cash Sales</span>
                <strong className="text-sm text-foreground">
                  ₱{selectedTurnover.cash_sales.toFixed(2)}
                </strong>
              </div>
              <div className="rounded-xl border border-border bg-surface p-3 text-center">
                <span className="text-[11px] text-muted block">Expected</span>
                <strong className="text-sm text-foreground">
                  ₱{selectedTurnover.expected_cash.toFixed(2)}
                </strong>
              </div>
              <div className="rounded-xl border border-border bg-surface p-3 text-center">
                <span className="text-[11px] text-muted block">
                  Counted Cash
                </span>
                <strong className="text-sm font-black text-foreground">
                  ₱{selectedTurnover.counted_cash.toFixed(2)}
                </strong>
              </div>
            </div>

            {/* Variance indicator banner */}
            <div
              className={cn(
                'rounded-xl border p-3.5 text-xs flex items-center justify-between',
                Math.abs(selectedTurnover.variance) < 0.01
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
                  : selectedTurnover.variance < 0
                    ? 'border-danger/30 bg-danger/10 text-danger'
                    : 'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300',
              )}
            >
              <div className="flex items-center gap-2">
                {Math.abs(selectedTurnover.variance) < 0.01 ? (
                  <CheckCircleIcon className="h-4 w-4" />
                ) : (
                  <ExclamationTriangleIcon className="h-4 w-4" />
                )}
                <span className="font-bold">
                  {Math.abs(selectedTurnover.variance) < 0.01
                    ? 'Drawer Balanced Perfectly'
                    : selectedTurnover.variance < 0
                      ? 'Drawer Shortage Detected'
                      : 'Drawer Overage Detected'}
                </span>
              </div>
              <span className="font-black text-sm">
                {Math.abs(selectedTurnover.variance) < 0.01
                  ? '₱0.00'
                  : `${selectedTurnover.variance < 0 ? '-' : '+'}₱${Math.abs(selectedTurnover.variance).toFixed(2)}`}
              </span>
            </div>

            {selectedTurnover.notes && (
              <div className="rounded-xl border border-border bg-surface p-3 text-xs space-y-1">
                <span className="font-bold text-foreground">
                  Cashier Discrepancy Explanation:
                </span>
                <p className="text-muted leading-relaxed">
                  {selectedTurnover.notes}
                </p>
              </div>
            )}

            {selectedTurnover.verification_note && (
              <div className="rounded-xl border border-border bg-mist/50 p-3 text-xs space-y-1">
                <span className="font-bold text-foreground">
                  Manager Review Note:
                </span>
                <p className="text-muted leading-relaxed">
                  {selectedTurnover.verification_note}
                </p>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedTurnover(null)}
                className="h-9 rounded-md border border-border bg-surface px-4 text-xs font-semibold text-foreground hover:bg-mist"
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
