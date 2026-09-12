'use client';

import { useReducer, useState } from 'react';
import { cartReducer } from '../cart';
import type { Menu, MenuItem } from '../types';
import { CartPanel } from './CartPanel';
import { CheckoutDialog } from './CheckoutDialog';
import { MenuGrid } from './MenuGrid';

export interface PosScreenProps {
  menu: Menu;
}

/** Client shell: menu browsing + session-only cart + checkout dialog. */
export function PosScreen({ menu }: PosScreenProps) {
  const [lines, dispatch] = useReducer(cartReducer, []);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const handleAdd = (item: MenuItem) => dispatch({ type: 'add', item });
  const handleIncrement = (product_id: number) =>
    dispatch({ type: 'increment', product_id });
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
      />
      <CartPanel
        lines={lines}
        onIncrement={handleIncrement}
        onDecrement={handleDecrement}
        onRemove={(product_id) => dispatch({ type: 'remove', product_id })}
        onCheckout={() => setCheckoutOpen(true)}
      />
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
