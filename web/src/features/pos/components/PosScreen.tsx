'use client';

import { useEffect, useReducer, useRef, useState } from 'react';
import { cartReducer } from '../cart';
import { cartTotal, type Menu, type MenuItem } from '../types';
import { CartPanel } from './CartPanel';
import { CartToast, type CartToastData } from './CartToast';
import { CheckoutDialog } from './CheckoutDialog';
import { MenuGrid } from './MenuGrid';
import { usePreferences } from '@/features/settings/components/PreferencesProvider';

export interface PosScreenProps {
  menu: Menu;
}

/** Client shell: menu browsing + session-only cart + checkout dialog. */
export function PosScreen({ menu }: PosScreenProps) {
  const { preferences } = usePreferences();
  const [lines, dispatch] = useReducer(cartReducer, []);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [toast, setToast] = useState<CartToastData | null>(null);
  const toastId = useRef(0);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );

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

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[1fr_360px]">
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
        onCheckout={() => setCheckoutOpen(true)}
      />
      <CartToast toast={toast} />
      {checkoutOpen ? (
        <CheckoutDialog
          lines={lines}
          onIncrement={handleIncrement}
          onDecrement={handleDecrement}
          onClose={() => setCheckoutOpen(false)}
          onSuccess={() => {
            dispatch({ type: 'clear' });
            setCheckoutOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}
