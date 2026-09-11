import { expect, test } from 'vitest';
import { parsePaymentMode, validateCheckout } from './checkout';
import type { CartLine } from './types';

const LINES: CartLine[] = [
  { product_id: 1, name: 'Latte', price: 120, qty: 2 },
  { product_id: 2, name: 'Muffin', price: 65.5, qty: 1 },
];

test('parsePaymentMode accepts the three modes only', () => {
  expect(parsePaymentMode('cash')).toBe('cash');
  expect(parsePaymentMode('gcash')).toBe('gcash');
  expect(parsePaymentMode('maya')).toBe('maya');
  expect(parsePaymentMode('card')).toBeNull();
  expect(parsePaymentMode('')).toBeNull();
  expect(parsePaymentMode(null)).toBeNull();
});

test('cash checkout computes change when covered', () => {
  const result = validateCheckout(LINES, 'cash', 400);
  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.value.total).toBeCloseTo(305.5, 5);
    expect(result.value.changeGiven).toBeCloseTo(94.5, 5);
    expect(result.value.items).toEqual([
      { product_id: 1, quantity: 2 },
      { product_id: 2, quantity: 1 },
    ]);
  }
});

test('cash checkout rejects short payment', () => {
  const result = validateCheckout(LINES, 'cash', 300);
  expect(result).toEqual({
    ok: false,
    error: 'Amount received is less than the total.',
  });
});

test('cash checkout requires an amount', () => {
  expect(validateCheckout(LINES, 'cash', null)).toEqual({
    ok: false,
    error: 'Enter the amount received.',
  });
  expect(validateCheckout(LINES, 'cash', NaN)).toEqual({
    ok: false,
    error: 'Enter the amount received.',
  });
});

test('wallet checkout posts the total with no change', () => {
  for (const mode of ['gcash', 'maya'] as const) {
    const result = validateCheckout(LINES, mode, null);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.amountReceived).toBeCloseTo(305.5, 5);
      expect(result.value.changeGiven).toBeNull();
    }
  }
});

test('empty cart and bad quantities fail', () => {
  expect(validateCheckout([], 'cash', 100)).toEqual({
    ok: false,
    error: 'Cart is empty.',
  });
  expect(
    validateCheckout(
      [{ product_id: 1, name: 'Latte', price: 120, qty: 0 }],
      'gcash',
      null,
    ),
  ).toEqual({ ok: false, error: 'Cart has an invalid quantity.' });
});
