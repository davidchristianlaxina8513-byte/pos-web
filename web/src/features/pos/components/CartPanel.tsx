'use client';

import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { EmptyState } from '@/components/common/EmptyState';
import { QtyStepper } from '@/components/common/QtyStepper';
import { ArrowRightIcon, CartIcon } from '@/components/common/icons';
import { cartTotal, type CartLine } from '../types';

export interface CartPanelProps {
  lines: CartLine[];
  onIncrement: (product_id: number) => void;
  onDecrement: (product_id: number) => void;
  onRemove: (product_id: number) => void;
  onCheckout: () => void;
}

/** v2 cart: order list card plus a sticky total pill bar. */
export function CartPanel({
  lines,
  onIncrement,
  onDecrement,
  onRemove,
  onCheckout,
}: CartPanelProps) {
  const total = cartTotal(lines);
  const count = lines.reduce((sum, line) => sum + line.qty, 0);
  return (
    <div className="flex flex-col gap-3">
      <Card
        title={`Your order (${count})`}
        className="rounded-card border-border shadow-soft"
      >
        {lines.length === 0 ? (
          <EmptyState
            icon={<CartIcon />}
            title="Cart is empty"
            sub="Add items from the menu."
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {lines.map((line) => (
              <li
                key={line.product_id}
                className="flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-foreground">
                    {line.name}
                  </p>
                  <p className="text-sm text-muted">
                    ₱{line.price.toFixed(2)} × {line.qty} = ₱
                    {(line.price * line.qty).toFixed(2)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <QtyStepper
                    value={line.qty}
                    itemName={line.name}
                    onIncrement={() => onIncrement(line.product_id)}
                    onDecrement={() => onDecrement(line.product_id)}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="px-2 text-muted"
                    onClick={() => onRemove(line.product_id)}
                    aria-label={`Remove ${line.name}`}
                  >
                    ✕
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <div className="sticky bottom-4">
        <Button
          onClick={onCheckout}
          disabled={lines.length === 0}
          aria-label="Checkout"
          className="flex h-16 w-full items-center justify-between rounded-full bg-sage-300 px-2 py-2 pl-6 text-pine-deep shadow-soft disabled:opacity-60"
        >
          <span className="flex items-center gap-1 text-base font-semibold">
            Total <ArrowRightIcon className="h-5 w-5" />
          </span>
          <span className="sr-only">Total: ₱{total.toFixed(2)}</span>
          <span
            aria-hidden="true"
            className="flex h-12 items-center rounded-full bg-pine px-5 text-base font-bold text-surface"
          >
            ₱{total.toFixed(2)}
          </span>
        </Button>
      </div>
    </div>
  );
}
