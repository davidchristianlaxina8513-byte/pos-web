'use client';

import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { cartTotal, type CartLine } from '../types';

export interface CartPanelProps {
  lines: CartLine[];
  onIncrement: (product_id: number) => void;
  onDecrement: (product_id: number) => void;
  onRemove: (product_id: number) => void;
  onCheckout: () => void;
}

/** Running cart with qty steppers and a checkout entry point. */
export function CartPanel({
  lines,
  onIncrement,
  onDecrement,
  onRemove,
  onCheckout,
}: CartPanelProps) {
  const total = cartTotal(lines);
  return (
    <Card
      title={`Cart (${lines.reduce((sum, line) => sum + line.qty, 0)})`}
      actions={
        <Button size="sm" disabled={lines.length === 0} onClick={onCheckout}>
          Checkout
        </Button>
      }
    >
      {lines.length === 0 ? (
        <p className="text-muted">Cart is empty. Add items from the menu.</p>
      ) : (
        <>
          <ul className="flex flex-col gap-2">
            {lines.map((line) => (
              <li
                key={line.product_id}
                className="flex items-center justify-between gap-2"
              >
                <div>
                  <p className="text-foreground">{line.name}</p>
                  <p className="text-muted">
                    ₱{line.price.toFixed(2)} × {line.qty} = ₱
                    {(line.price * line.qty).toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onDecrement(line.product_id)}
                    aria-label={`Decrease ${line.name}`}
                  >
                    −
                  </Button>
                  <span className="w-6 text-center text-foreground">
                    {line.qty}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onIncrement(line.product_id)}
                    aria-label={`Increase ${line.name}`}
                  >
                    +
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemove(line.product_id)}
                    aria-label={`Remove ${line.name}`}
                  >
                    ✕
                  </Button>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-3 border-t border-border pt-2 text-foreground">
            Total: ₱{total.toFixed(2)}
          </p>
        </>
      )}
    </Card>
  );
}
