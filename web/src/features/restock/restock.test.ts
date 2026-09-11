import { expect, test } from 'vitest';
import {
  groupBySupplier,
  parseRestockStatus,
  type RestockRow,
} from './queries';

function row(
  overrides: Partial<RestockRow> & { request_id: number },
): RestockRow {
  return {
    product_id: 1,
    product_name: 'Latte',
    current_stock_snapshot: 5,
    reorder_point_snapshot: 8,
    par_level_snapshot: 60,
    suggested_quantity: 55,
    status: 'pending',
    supplier: null,
    created_at: '2026-09-11T00:00:00Z',
    ...overrides,
  };
}

test('groupBySupplier groups by supplier, blanks go to Unassigned', () => {
  const groups = groupBySupplier([
    row({ request_id: 1, supplier: 'Fresh Provisions' }),
    row({ request_id: 2, supplier: null }),
    row({ request_id: 3, supplier: '  ' }),
    row({ request_id: 4, supplier: 'Fresh Provisions' }),
  ]);
  expect(groups.map((g) => g.supplier)).toEqual([
    'Fresh Provisions',
    'Unassigned',
  ]);
  expect(groups[0]?.rows.map((r) => r.request_id)).toEqual([1, 4]);
  expect(groups[1]?.rows.map((r) => r.request_id)).toEqual([2, 3]);
});

test('groupBySupplier preserves first-seen supplier order', () => {
  const groups = groupBySupplier([
    row({ request_id: 1, supplier: 'Bravo' }),
    row({ request_id: 2, supplier: 'Alpha' }),
  ]);
  expect(groups.map((g) => g.supplier)).toEqual(['Bravo', 'Alpha']);
});

test('parseRestockStatus accepts the four statuses only', () => {
  expect(parseRestockStatus('pending')).toBe('pending');
  expect(parseRestockStatus('ordered')).toBe('ordered');
  expect(parseRestockStatus('received')).toBe('received');
  expect(parseRestockStatus('cancelled')).toBe('cancelled');
  expect(parseRestockStatus('shipped')).toBeNull();
  expect(parseRestockStatus('')).toBeNull();
  expect(parseRestockStatus(null)).toBeNull();
});
