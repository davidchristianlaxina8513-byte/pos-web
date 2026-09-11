import { expect, test } from 'vitest';
import { getStockStatus } from './status';

test('zero or negative stock is critical', () => {
  expect(getStockStatus(0, 10)).toBe('critical');
  expect(getStockStatus(-2, 10)).toBe('critical');
});

test('stock at or below the reorder level is low', () => {
  expect(getStockStatus(10, 10)).toBe('low');
  expect(getStockStatus(3, 10)).toBe('low');
});

test('stock above the reorder level is ok', () => {
  expect(getStockStatus(11, 10)).toBe('ok');
});
