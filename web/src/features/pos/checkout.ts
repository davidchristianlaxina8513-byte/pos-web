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

export const ONLINE_REFERENCE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{5,63}$/;

export function validateOnlinePayment(
  paymentMode: PaymentMode,
  reference: string,
  hasEvidence: boolean,
): string | null {
  if (paymentMode === 'cash') return null;
  if (!ONLINE_REFERENCE_PATTERN.test(reference.trim())) {
    return 'Enter a valid 6 to 64 character online transaction reference.';
  }
  if (!hasEvidence) return 'Confirm a payment evidence photo.';
  return null;
}

/**
 * Maps `review_online_payment` database failures to user-safe messages.
 * Unknown failures keep the generic message; callers log the original.
 */
export function reviewErrorMessage(message: string): string {
  if (message.includes('Voided transactions cannot be reviewed')) {
    return 'This sale was voided and can no longer be reviewed.';
  }
  if (message.includes('Online payment has already been reviewed')) {
    return 'This payment was already reviewed.';
  }
  if (message.includes('Transaction not found')) {
    return 'Transaction not found.';
  }
  if (message.includes('Cash payments do not require review')) {
    return 'Cash payments do not require review.';
  }
  if (message.includes('Admin only')) {
    return 'Only admins can review payments.';
  }
  if (message.includes('A rejection reason is required')) {
    return 'Enter a rejection reason.';
  }
  return 'Payment review could not be saved.';
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
