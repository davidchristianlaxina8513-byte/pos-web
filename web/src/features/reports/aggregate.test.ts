import { expect, test } from 'vitest';
import {
  activeSales,
  aggregateTopProducts,
  buildDaySales,
  manilaDayKey,
  resolveRange,
  summarizeSales,
  type SaleRow,
} from './aggregate';

const ROWS: SaleRow[] = [
  { date: '2026-09-11T02:00:00Z', total_amount: 100, payment_mode: 'cash' },
  { date: '2026-09-11T03:00:00Z', total_amount: 50, payment_mode: 'gcash' },
  {
    date: '2026-09-11T04:00:00Z',
    total_amount: 999,
    payment_mode: 'cash',
    status: 'voided',
  },
  { date: '2026-09-10T02:00:00Z', total_amount: 75, payment_mode: 'maya' },
];

test('manilaDayKey buckets by Manila calendar day', () => {
  // 2026-09-11T02:00:00Z is 10:00 Manila, same day.
  expect(manilaDayKey('2026-09-11T02:00:00Z')).toBe('2026-09-11');
  // 2026-09-10T17:00:00Z is 01:00 Manila next day.
  expect(manilaDayKey('2026-09-10T17:00:00Z')).toBe('2026-09-11');
});

test('activeSales drops voided rows', () => {
  expect(activeSales(ROWS)).toHaveLength(3);
});

test('resolveRange aligns presets to Manila midnights', () => {
  const now = new Date('2026-09-11T12:00:00+08:00');
  const today = resolveRange('today', null, null, now);
  expect(today.from?.toISOString()).toBe('2026-09-10T16:00:00.000Z');
  expect(today.to?.toISOString()).toBe('2026-09-11T16:00:00.000Z');
  const week = resolveRange('7d', null, null, now);
  expect(week.from?.toISOString()).toBe('2026-09-04T16:00:00.000Z');
  const all = resolveRange('all', null, null, now);
  expect(all.from).toBeNull();
  expect(all.to).toBeNull();
});

test('resolveRange honors custom dates', () => {
  const custom = resolveRange('7d', '2026-09-01', '2026-09-05');
  expect(custom.from?.toISOString()).toBe('2026-08-31T16:00:00.000Z');
  expect(custom.to?.toISOString()).toBe('2026-09-05T16:00:00.000Z');
});

test('activeSales drops voided rows', () => {
  expect(activeSales(ROWS)).toHaveLength(3);
});

test('buildDaySales buckets revenue and orders per Manila day', () => {
  const days = buildDaySales(
    activeSales(ROWS),
    2,
    new Date('2026-09-11T12:00:00+08:00'),
  );
  expect(days.map((day) => day.date)).toEqual(['2026-09-10', '2026-09-11']);
  expect(days[1]).toMatchObject({ revenue: 150, orders: 2 });
  expect(days[0]).toMatchObject({ revenue: 75, orders: 1 });
});

test('summarizeSales totals and splits by payment mode', () => {
  const summary = summarizeSales(activeSales(ROWS));
  expect(summary.revenue).toBe(225);
  expect(summary.orders).toBe(3);
  expect(summary.averageOrderValue).toBe(75);
  expect(summary.breakdown).toEqual([
    { mode: 'cash', revenue: 100, orders: 1 },
    { mode: 'gcash', revenue: 50, orders: 1 },
    { mode: 'maya', revenue: 75, orders: 1 },
  ]);
});

test('aggregateTopProducts ranks by revenue with name fallback', () => {
  const ranked = aggregateTopProducts(
    [
      { product_id: 1, quantity: 2, subtotal: 240 },
      { product_id: 2, quantity: 5, subtotal: 100 },
      { product_id: 1, quantity: 1, subtotal: 120 },
    ],
    new Map([[1, 'Latte']]),
  );
  expect(ranked).toEqual([
    { product_id: 1, product_name: 'Latte', quantity_sold: 3, revenue: 360 },
    {
      product_id: 2,
      product_name: 'Product #2',
      quantity_sold: 5,
      revenue: 100,
    },
  ]);
});
