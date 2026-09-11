import {
  cartTotal,
  type CartLine,
  type CheckoutItemInput,
  type PaymentMode,
} from './types';

export function parsePaymentMode(value: unknown): PaymentMode | null {
  return value === 'cash' || value === 'gcash' || value === 'maya'
    ? value
    : null;
}

export interface ValidCheckout {
  items: CheckoutItemInput[];
  total: number;
  amountReceived: number;
  changeGiven: number | null;
}

export type CheckoutValidation =
  | { ok: true; value: ValidCheckout }
  | { ok: false; error: string };

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Checkout rules, mirroring Expo `Payment.tsx`: non-empty cart, positive
 * integer quantities, cash must cover the total. Pure so both the dialog
 * (button enabling) and the Server Action (enforcement) share it.
 */
export function validateCheckout(
  lines: CartLine[],
  paymentMode: PaymentMode,
  amountReceived: number | null,
): CheckoutValidation {
  if (lines.length === 0) {
    return { ok: false, error: 'Cart is empty.' };
  }
  const items: CheckoutItemInput[] = [];
  for (const line of lines) {
    if (
      typeof line.product_id !== 'number' ||
      !Number.isInteger(line.qty) ||
      line.qty <= 0
    ) {
      return { ok: false, error: 'Cart has an invalid quantity.' };
    }
    items.push({ product_id: line.product_id, quantity: line.qty });
  }
  const total = round2(cartTotal(lines));
  if (paymentMode !== 'cash') {
    return {
      ok: true,
      value: { items, total, amountReceived: total, changeGiven: null },
    };
  }
  if (
    amountReceived === null ||
    !Number.isFinite(amountReceived) ||
    amountReceived <= 0
  ) {
    return { ok: false, error: 'Enter the amount received.' };
  }
  if (round2(amountReceived) < total) {
    return { ok: false, error: 'Amount received is less than the total.' };
  }
  return {
    ok: true,
    value: {
      items,
      total,
      amountReceived: round2(amountReceived),
      changeGiven: round2(amountReceived - total),
    },
  };
}
