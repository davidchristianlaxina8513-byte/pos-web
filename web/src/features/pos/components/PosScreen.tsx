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

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <MenuGrid
        categories={menu.categories}
        items={menu.items}
        onAdd={handleAdd}
      />
      <CartPanel
        lines={lines}
        onIncrement={(product_id) =>
          dispatch({ type: 'increment', product_id })
        }
        onDecrement={(product_id) =>
          dispatch({ type: 'decrement', product_id })
        }
        onRemove={(product_id) => dispatch({ type: 'remove', product_id })}
        onCheckout={() => setCheckoutOpen(true)}
      />
      {checkoutOpen ? (
        <CheckoutDialog
          lines={lines}
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
