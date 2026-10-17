import {
  cartTotal,
  type CartLine,
  type CheckoutItemInput,
  type PaymentMode,
} from './types';
import type { PaymentStatus } from './types';

export function parsePaymentMode(value: unknown): PaymentMode | null {
  return value === 'cash' || value === 'gcash' || value === 'maya'
    ? value
    : null;
}

export function parsePaymentStatus(value: unknown): PaymentStatus | null {
  return value === 'paid' ||
    value === 'pending_verification' ||
    value === 'verified' ||
    value === 'rejected'
    ? value
    : null;
}

export const ONLINE_REFERENCE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{3,63}$/;

/**
 * Normalizes online references. If the cashier enters 4-5 digits (e.g. '7182'),
 * formats as 'REF-7182' so it satisfies the database schema minimum length while
 * keeping counter checkouts under 2 seconds.
 */
export function formatOnlineReference(reference: string): string {
  const trimmed = reference.trim();
  if (trimmed.length >= 4 && trimmed.length < 6) {
    return `REF-${trimmed.toUpperCase()}`;
  }
  return trimmed;
}

export function validateOnlinePayment(
  paymentMode: PaymentMode,
  reference: string,
): string | null {
  if (paymentMode === 'cash') return null;
  const trimmed = reference.trim();
  if (trimmed.length < 4 || trimmed.length > 64) {
    return 'Enter at least the last 4 digits of the transaction reference.';
  }
  if (!ONLINE_REFERENCE_PATTERN.test(trimmed)) {
    return 'Enter a valid reference (letters, numbers, and dashes with no spaces).';
  }
  return null;
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
 * Checkout rules: non-empty cart, positive
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
