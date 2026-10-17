'use client';

import { ArrowRightIcon, CartIcon, TrashIcon } from '@/components/common/icons';
import { EmptyState } from '@/components/error/EmptyState';
import { Button } from '@/components/form/Button';
import { cartTotal, type CartLine } from '@/features/pos/types';
import { cn } from '@/lib/cn';

export interface CartPanelProps {
  lines: CartLine[];
  onIncrement: (product_id: number) => void;
  onDecrement: (product_id: number) => void;
  onRemove: (product_id: number) => void;
  onClear?: () => void;
  onCheckout: () => void;
}

/** Modern POS sidebar: sticky order summary, scrollable item list, and checkout CTA. */
export function CartPanel({
  lines,
  onIncrement,
  onDecrement,
  onRemove,
  onClear,
  onCheckout,
}: CartPanelProps) {
  const total = cartTotal(lines);
  const count = lines.reduce((sum, line) => sum + line.qty, 0);

  return (
    <div className="flex flex-col gap-3 lg:sticky lg:top-4">
      {/* Order Panel Card */}
      <div className="overflow-hidden rounded-2xl border border-border/80 bg-surface shadow-soft">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3.5">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-extrabold tracking-tight text-foreground">
              Current Order
            </h2>
            <span className="rounded-full bg-mist px-2.5 py-0.5 text-xs font-bold text-muted">
              {count} {count === 1 ? 'item' : 'items'}
            </span>
          </div>
          {lines.length > 0 && onClear ? (
            <button
              type="button"
              onClick={onClear}
              className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold text-muted transition-colors hover:bg-danger-surface hover:text-danger"
              title="Clear entire order"
            >
              <TrashIcon className="h-3.5 w-3.5" />
              <span>Clear</span>
            </button>
          ) : null}
        </div>

        {/* Order Items List */}
        <div className="p-3">
          {lines.length === 0 ? (
            <div className="py-8">
              <EmptyState
                icon={<CartIcon className="h-8 w-8 text-muted/60" />}
                title="Your order is empty"
                sub="Select items from the menu to start an order."
              />
            </div>
          ) : (
            <ul className="max-h-[calc(100vh-360px)] min-h-[140px] space-y-2.5 overflow-y-auto pr-1">
              {lines.map((line) => (
                <li
                  key={line.product_id}
                  className="flex items-center justify-between gap-2.5 rounded-xl border border-border/70 bg-mist/30 p-2.5 transition-colors hover:border-border"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-foreground">
                      {line.name}
                    </p>
                    <p className="text-xs text-muted">
                      ₱{line.price.toFixed(2)} × {line.qty}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {/* Stepper */}
                    <div className="flex items-center rounded-lg border border-border/80 bg-surface p-0.5 shadow-xs">
                      <button
                        type="button"
                        onClick={() => onDecrement(line.product_id)}
                        className={cn(
                          'flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold transition-colors',
                          line.qty === 1
                            ? 'text-danger hover:bg-danger-surface'
                            : 'text-pine-deep hover:bg-mist',
                        )}
                        aria-label={
                          line.qty === 1
                            ? `Remove ${line.name}`
                            : `Decrease ${line.name}`
                        }
                      >
                        {line.qty === 1 ? (
                          <TrashIcon className="h-3 w-3" />
                        ) : (
                          '−'
                        )}
                      </button>
                      <span className="w-5 text-center text-xs font-bold text-foreground">
                        {line.qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => onIncrement(line.product_id)}
                        className="flex h-6 w-6 items-center justify-center rounded-md bg-pine text-xs font-bold text-surface transition-colors hover:bg-pine-deep"
                        aria-label={`Increase ${line.name}`}
                      >
                        +
                      </button>
                    </div>

                    {/* Line total */}
                    <span className="w-16 text-right text-xs font-extrabold text-foreground">
                      ₱{(line.price * line.qty).toFixed(2)}
                    </span>

                    {/* Delete Action Icon */}
                    <button
                      type="button"
                      onClick={() => onRemove(line.product_id)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-muted transition-colors hover:bg-danger-surface hover:text-danger"
                      aria-label={`Delete ${line.name}`}
                      title={`Delete ${line.name}`}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Pricing Summary Footer */}
        {lines.length > 0 ? (
          <div className="border-t border-border/60 bg-mist/20 px-4 py-3">
            <div className="flex items-center justify-between text-xs text-muted">
              <span>Subtotal ({count} items)</span>
              <span className="font-semibold text-foreground">
                ₱{total.toFixed(2)}
              </span>
            </div>
            <div className="mt-2 flex items-baseline justify-between border-t border-border/40 pt-2">
              <span className="text-sm font-bold text-foreground">Total</span>
              <span className="text-lg font-extrabold text-leaf">
                ₱{total.toFixed(2)}
              </span>
            </div>
          </div>
        ) : null}
      </div>

      {/* Checkout CTA Button */}
      <Button
        onClick={onCheckout}
        disabled={lines.length === 0}
        aria-label="Proceed to checkout"
        className="flex h-14 w-full items-center justify-between rounded-xl bg-pine px-4 text-surface shadow-sm transition-all duration-150 hover:bg-pine-deep disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="flex items-center gap-2 text-sm font-bold">
          <span>Charge Order</span>
          <ArrowRightIcon className="h-4 w-4" />
        </span>
        <span
          aria-hidden="true"
          className="rounded-full bg-white/20 px-3 py-1 text-sm font-extrabold text-white"
        >
          ₱{total.toFixed(2)}
        </span>
      </Button>
    </div>
  );
}
