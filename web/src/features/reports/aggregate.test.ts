import { expect, test } from 'vitest';
import {
  activeSales,
  aggregateTopProducts,
  buildDaySales,
  buildReceiptLedger,
  manilaDayKey,
  resolveRange,
  summarizeSales,
  type LedgerItem,
  type LedgerTransaction,
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

const LEDGER_TXNS: LedgerTransaction[] = [
  {
    id: 'txn-new',
    order_number: 42,
    date: '2026-09-12T02:00:00Z',
    total_amount: 310,
    payment_mode: 'cash',
    status: 'completed',
  },
  {
    id: 'txn-void',
    order_number: 41,
    date: '2026-09-12T01:00:00Z',
    total_amount: 999,
    payment_mode: 'gcash',
    status: 'voided',
  },
  {
    id: 'txn-old',
    order_number: null,
    date: '2026-09-11T02:00:00Z',
    total_amount: 150,
    payment_mode: 'maya',
    status: 'completed',
  },
];

const LEDGER_ITEMS: LedgerItem[] = [
  { transaction_id: 'txn-new', product_id: 1, quantity: 2, subtotal: 310 },
  { transaction_id: 'txn-void', product_id: 1, quantity: 9, subtotal: 999 },
  { transaction_id: 'txn-old', product_id: 7, quantity: 1, subtotal: 150 },
];

test('buildReceiptLedger drops voided, sorts newest first, caps lists', () => {
  const names = new Map([[1, 'Latte']]);
  const ledger = buildReceiptLedger(LEDGER_TXNS, LEDGER_ITEMS, names, 1, 10);
  expect(ledger.receiptsTruncated).toBe(true);
  expect(ledger.receipts.map((r) => r.transaction_id)).toEqual(['txn-new']);
  expect(ledger.receipts[0]).toMatchObject({
    order_number: 42,
    total_amount: 310,
    payment_mode: 'cash',
  });
  expect(ledger.receipts[0]?.items).toEqual([
    {
      product_id: 1,
      product_name: 'Latte',
      quantity: 2,
      unit_price: 155,
      subtotal: 310,
    },
  ]);
  expect(ledger.linesTruncated).toBe(false);
  expect(ledger.lines).toHaveLength(1);
  expect(ledger.lines[0]).toMatchObject({
    product_name: 'Latte',
    order_number: 42,
  });
});

test('buildReceiptLedger falls back to Product #id and caps lines', () => {
  const ledger = buildReceiptLedger(
    LEDGER_TXNS,
    LEDGER_ITEMS,
    new Map(),
    10,
    1,
  );
  expect(ledger.receipts).toHaveLength(2);
  expect(ledger.linesTruncated).toBe(true);
  expect(ledger.lines).toEqual([
    {
      transaction_id: 'txn-new',
      order_number: 42,
      date: '2026-09-12T02:00:00Z',
      product_name: 'Product #1',
      quantity: 2,
      unit_price: 155,
      subtotal: 310,
    },
  ]);
});
