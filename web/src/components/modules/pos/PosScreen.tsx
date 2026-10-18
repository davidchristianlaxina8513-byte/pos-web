'use client';

import { useEffect, useReducer, useRef, useState } from 'react';
import Link from 'next/link';
import { cartReducer } from '@/features/pos/cart';
import {
  cartTotal,
  type CartLine,
  type Menu,
  type MenuItem,
} from '@/features/pos/types';
import {
  clearCartDraft,
  getCartDraft,
  saveCartDraft,
} from '@/features/pos/actions';
import type { CashierShift } from '@/features/shifts/queries';
import type { UserRole } from '@/features/auth/roles';
import { CartPanel } from './CartPanel';
import { CartToast, type CartToastData } from './CartToast';
import { CheckoutDialog } from './CheckoutDialog';
import { MenuGrid } from './MenuGrid';
import { ActiveOrdersModal } from './ActiveOrdersModal';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/form/Button';
import { ClockIcon } from '@/components/common/icons';
import { usePreferences } from '@/components/modules/settings/PreferencesProvider';
import { useAlert } from '@/components/toast';

export interface PosScreenProps {
  menu: Menu;
  userRole?: UserRole;
  openShift?: CashierShift | null;
  initialActiveCount?: number;
}

const LOCAL_STORAGE_CART_KEY = 'cafe_elvira_pos_cart';
const LOCAL_STORAGE_DRAFT_KEY = 'cafe_elvira_pos_draft_id';

/** Client shell: menu browsing + resilient autosaved cart + checkout + active orders + shift recovery. */
export function PosScreen({
  menu,
  userRole,
  openShift,
  initialActiveCount = 0,
}: PosScreenProps) {
  const { preferences } = usePreferences();
  const { successAlert, warningAlert } = useAlert();
  const [lines, dispatch] = useReducer(cartReducer, []);

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [activeOrdersOpen, setActiveOrdersOpen] = useState(false);
  const [activeCount, setActiveCount] = useState(initialActiveCount);
  const [saveStatus, setSaveStatus] = useState<
    'saved' | 'saving' | 'failed' | null
  >(null);

  const [toast, setToast] = useState<CartToastData | null>(null);
  const toastId = useRef(0);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftIdRef = useRef<string>('');
  const isHydratedRef = useRef(false);

  // Initialize draft ID and restore saved cart post-hydration
  useEffect(() => {
    let draftId = localStorage.getItem(LOCAL_STORAGE_DRAFT_KEY);
    if (!draftId) {
      draftId = crypto.randomUUID();
      localStorage.setItem(LOCAL_STORAGE_DRAFT_KEY, draftId);
    }
    draftIdRef.current = draftId;

    // Run post-hydration so server HTML and initial client render match exactly
    const restoreTimer = setTimeout(() => {
      const localCartRaw = localStorage.getItem(LOCAL_STORAGE_CART_KEY);
      if (localCartRaw) {
        try {
          const parsed = JSON.parse(localCartRaw) as CartLine[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            dispatch({ type: 'restore', lines: parsed });
            setSaveStatus('saved');
            isHydratedRef.current = true;
            return;
          }
        } catch {
          // Fall through
        }
      }

      // Check server draft if local storage was empty
      void getCartDraft(draftId).then((serverLines) => {
        if (serverLines && serverLines.length > 0) {
          dispatch({ type: 'restore', lines: serverLines });
          localStorage.setItem(
            LOCAL_STORAGE_CART_KEY,
            JSON.stringify(serverLines),
          );
          setSaveStatus('saved');
        }
        isHydratedRef.current = true;
      });
    }, 0);

    return () => {
      clearTimeout(restoreTimer);
      if (toastTimer.current) clearTimeout(toastTimer.current);
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  // Autosave when lines change (only after initial hydration)
  useEffect(() => {
    if (!isHydratedRef.current) {
      isHydratedRef.current = true;
      return;
    }

    // Always mirror to localStorage immediately for instant local resilience
    localStorage.setItem(LOCAL_STORAGE_CART_KEY, JSON.stringify(lines));

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(async () => {
      if (!draftIdRef.current) return;
      if (lines.length === 0) {
        setSaveStatus(null);
        void clearCartDraft(draftIdRef.current);
        return;
      }
      setSaveStatus('saving');
      const res = await saveCartDraft(draftIdRef.current, lines);
      if (res.ok) {
        setSaveStatus('saved');
      } else {
        // Retain local fallback on network failure
        setSaveStatus('failed');
      }
    }, 400);
  }, [lines]);

  const handleAdd = (item: MenuItem) => {
    const action = { type: 'add' as const, item };
    const next = cartReducer(lines, action);
    dispatch(action);
    if (preferences.orderNotifications) {
      toastId.current += 1;
      setToast({
        id: toastId.current,
        name: item.name,
        total: cartTotal(next),
      });
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(null), 1800);
    }
  };

  const handleIncrement = (product_id: number) => {
    const item = menu.items.find((entry) => entry.product_id === product_id);
    const line = lines.find((entry) => entry.product_id === product_id);
    if (
      !item ||
      (item.remaining_quantity !== null &&
        (line?.qty ?? 0) >= item.remaining_quantity)
    )
      return;
    dispatch({ type: 'increment', product_id });
  };

  const handleDecrement = (product_id: number) =>
    dispatch({ type: 'decrement', product_id });

  const handleClear = () => {
    dispatch({ type: 'clear' });
    localStorage.removeItem(LOCAL_STORAGE_CART_KEY);
    if (draftIdRef.current) {
      void clearCartDraft(draftIdRef.current);
    }
    setSaveStatus(null);
    warningAlert(
      'Order Cleared',
      'All items have been removed from current order.',
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Top Status & Quick Navigation Bar */}
      <Card className="rounded-xl border border-border/80 bg-surface shadow-xs [&>div]:p-3 [&>div]:sm:p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Shift Recovery / Status Indicator */}
          <div className="flex items-center gap-2">
            {openShift && openShift.status === 'open' ? (
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" />
                <span className="font-bold text-foreground">
                  Active Shift Open
                </span>
                <span suppressHydrationWarning className="text-muted">
                  Started{' '}
                  {new Date(openShift.started_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}{' '}
                  • Starting Cash ₱{openShift.starting_cash.toFixed(2)}
                </span>
              </div>
            ) : userRole === 'admin' ? (
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-slate-400" />
                <span className="font-semibold text-muted">
                  Admin Register (No active cashier shift).
                </span>
                <Link
                  href="/admin/cashier-operations"
                  className="font-bold text-pine hover:underline"
                >
                  Cashier Operations →
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-amber-500" />
                <span className="font-semibold text-muted">
                  No active shift open.
                </span>
                <Link
                  href="/cashier-operations"
                  className="font-bold text-pine hover:underline"
                >
                  Start Shift →
                </Link>
              </div>
            )}
          </div>

          {/* Active Orders Navigation Trigger */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setActiveOrdersOpen(true)}
            className="flex items-center gap-2"
          >
            <ClockIcon className="h-3.5 w-3.5 text-pine" />
            <span>Active Orders</span>
            <span className="rounded-full bg-pine/10 px-2 py-0.5 text-[11px] font-black text-pine-deep">
              {activeCount}
            </span>
          </Button>
        </div>
      </Card>

      <div className="grid items-start gap-5 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_380px] 2xl:grid-cols-[1fr_400px]">
        <MenuGrid
          categories={menu.categories}
          items={menu.items}
          lines={lines}
          onAdd={handleAdd}
          onIncrement={handleIncrement}
          onDecrement={handleDecrement}
          quotaAlerts={preferences.quotaAlerts}
        />
        <CartPanel
          lines={lines}
          onIncrement={handleIncrement}
          onDecrement={handleDecrement}
          onRemove={(product_id) => dispatch({ type: 'remove', product_id })}
          onClear={handleClear}
          onCheckout={() => setCheckoutOpen(true)}
          saveStatus={saveStatus}
        />
        <CartToast toast={toast} />
        {checkoutOpen ? (
          <CheckoutDialog
            lines={lines}
            onIncrement={handleIncrement}
            onDecrement={handleDecrement}
            onClose={() => setCheckoutOpen(false)}
            onSuccess={() => {
              // Order completed: clear autosave draft
              localStorage.removeItem(LOCAL_STORAGE_CART_KEY);
              if (draftIdRef.current) {
                void clearCartDraft(draftIdRef.current);
                // Cycle draft ID for the subsequent order
                draftIdRef.current = crypto.randomUUID();
                localStorage.setItem(
                  LOCAL_STORAGE_DRAFT_KEY,
                  draftIdRef.current,
                );
              }
              dispatch({ type: 'clear' });
              setSaveStatus(null);
              setCheckoutOpen(false);
              setActiveCount((c) => c + 1);
              successAlert(
                'Order Placed',
                'Order placed as pending. Kitchen can fulfill.',
              );
            }}
          />
        ) : null}

        {/* Active / Pending Orders Modal */}
        <ActiveOrdersModal
          isOpen={activeOrdersOpen}
          onClose={() => setActiveOrdersOpen(false)}
          onCountChange={(count) => setActiveCount(count)}
        />
      </div>
    </div>
  );
}
