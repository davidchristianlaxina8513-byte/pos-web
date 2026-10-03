import { expect, test } from 'vitest';
import { mapMenuItems } from './queries';
import { cartTotal, isSellable, type MenuItem } from './types';

function item(overrides: Partial<MenuItem> = {}): MenuItem {
  return {
    product_id: 1,
    name: 'Latte',
    price: 120,
    is_available: true,
    image_url: null,
    category_id: 'cat-1',
    category_name: 'Hot Drinks',
    today_quota_limit: 10,
    sold_quantity: 5,
    remaining_quantity: 5,
    ...overrides,
  };
}

test('mapMenuItems joins quota snapshots onto products', () => {
  const items = mapMenuItems(
    [
      {
        product_id: 1,
        name: 'Latte',
        price: 120,
        is_available: true,
        image_url: null,
        category_id: 'cat-1',
        category: { name: 'Hot Drinks' },
      },
      {
        product_id: 2,
        name: 'Muffin',
        price: '65.5',
        is_available: true,
        image_url: null,
        category_id: 'cat-2',
        category: { name: 'Pastries' },
      },
    ],
    [
      {
        product_id: 1,
        today_quota_limit: 10,
        sold_quantity: 2,
        remaining_quantity: 8,
      },
    ],
  );
  expect(items).toHaveLength(2);
  expect(items[0]).toMatchObject({
    product_id: 1,
    price: 120,
    category_name: 'Hot Drinks',
    remaining_quantity: 8,
  });
  // Numeric columns may arrive as strings; price is coerced.
  expect(items[1]).toMatchObject({
    product_id: 2,
    price: 65.5,
    remaining_quantity: 0,
  });
});

test('mapMenuItems drops malformed rows', () => {
  const items = mapMenuItems(
    [
      {
        product_id: 'x',
        name: 'Bad',
        price: 10,
        is_available: true,
        image_url: null,
        category_id: 'cat-1',
        category: { name: 'Hot Drinks' },
      },
      {
        product_id: 3,
        name: 'Priceless',
        price: 'n/a',
        is_available: true,
        image_url: null,
        category_id: 'cat-1',
        category: { name: 'Hot Drinks' },
      },
    ],
    [],
  );
  expect(items).toEqual([]);
});

test('isSellable requires availability and remaining daily quota', () => {
  expect(isSellable(item())).toBe(true);
  expect(
    isSellable(item({ today_quota_limit: null, remaining_quantity: null })),
  ).toBe(true);
  expect(isSellable(item({ is_available: false }))).toBe(false);
  expect(isSellable(item({ remaining_quantity: 0 }))).toBe(false);
});

test('cartTotal sums price times qty', () => {
  expect(
    cartTotal([
      { product_id: 1, name: 'Latte', price: 120, qty: 2, image_url: null },
      {
        product_id: 2,
        name: 'Muffin',
        price: 65.5,
        qty: 1,
        image_url: null,
      },
    ]),
  ).toBeCloseTo(305.5, 5);
  expect(cartTotal([])).toBe(0);
});
