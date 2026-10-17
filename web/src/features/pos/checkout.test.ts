import { expect, test } from 'vitest';
import {
  formatOnlineReference,
  parsePaymentMode,
  parsePaymentStatus,
  validateCheckout,
  validateOnlinePayment,
} from './checkout';
import type { CartLine } from './types';

const LINES: CartLine[] = [
  { product_id: 1, name: 'Latte', price: 120, qty: 2, image_url: null },
  { product_id: 2, name: 'Muffin', price: 65.5, qty: 1, image_url: null },
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

test('online payment requires a safe reference and evidence is optional', () => {
  expect(validateOnlinePayment('gcash', '')).toContain('reference');
  expect(validateOnlinePayment('maya', 'bad ref')).toContain('reference');
  expect(validateOnlinePayment('gcash', '12')).toContain('reference');
  expect(validateOnlinePayment('gcash', '7182')).toBeNull();
  expect(validateOnlinePayment('gcash', 'REF-123456')).toBeNull();
  expect(validateOnlinePayment('maya', 'REF_123456')).toBeNull();
  expect(validateOnlinePayment('cash', '')).toBeNull();
});

test('formatOnlineReference pads short 4-5 digit references for database compatibility', () => {
  expect(formatOnlineReference('7182')).toBe('REF-7182');
  expect(formatOnlineReference('12345')).toBe('REF-12345');
  expect(formatOnlineReference('REF-7182')).toBe('REF-7182');
  expect(formatOnlineReference('100293847182')).toBe('100293847182');
});

test('payment status parser accepts the supported workflow states', () => {
  expect(parsePaymentStatus('paid')).toBe('paid');
  expect(parsePaymentStatus('pending_verification')).toBe(
    'pending_verification',
  );
  expect(parsePaymentStatus('verified')).toBe('verified');
  expect(parsePaymentStatus('rejected')).toBe('rejected');
  expect(parsePaymentStatus('uploaded')).toBeNull();
});

test('empty cart and bad quantities fail', () => {
  expect(validateCheckout([], 'cash', 100)).toEqual({
    ok: false,
    error: 'Cart is empty.',
  });
  expect(
    validateCheckout(
      [{ product_id: 1, name: 'Latte', price: 120, qty: 0, image_url: null }],
      'gcash',
      null,
    ),
  ).toEqual({ ok: false, error: 'Cart has an invalid quantity.' });
});
