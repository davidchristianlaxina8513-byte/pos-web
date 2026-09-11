import { expect, test } from 'vitest';
import { cartReducer } from './cart';
import type { CartLine } from './types';
import type { MenuItem } from './types';

function menuItem(overrides: Partial<MenuItem> = {}): MenuItem {
  return {
    product_id: 1,
    name: 'Latte',
    price: 120,
    is_available: true,
    image_url: null,
    category_id: 'cat-1',
    category_name: 'Hot Drinks',
    stock_quantity: 5,
    ...overrides,
  };
}

function line(overrides: Partial<CartLine> = {}): CartLine {
  return { product_id: 1, name: 'Latte', price: 120, qty: 1, ...overrides };
}

test('add pushes a new line, then bumps qty', () => {
  const once = cartReducer([], { type: 'add', item: menuItem() });
  expect(once).toEqual([line({ qty: 1 })]);
  const twice = cartReducer(once, { type: 'add', item: menuItem() });
  expect(twice).toEqual([line({ qty: 2 })]);
});

test('increment and decrement adjust qty; zero-qty lines drop', () => {
  const start = [line({ qty: 1 })];
  expect(cartReducer(start, { type: 'increment', product_id: 1 })).toEqual([
    line({ qty: 2 }),
  ]);
  expect(cartReducer(start, { type: 'decrement', product_id: 1 })).toEqual([]);
});

test('remove drops the line, clear empties the cart', () => {
  const start = [line({ product_id: 1 }), line({ product_id: 2, qty: 3 })];
  expect(cartReducer(start, { type: 'remove', product_id: 1 })).toEqual([
    line({ product_id: 2, qty: 3 }),
  ]);
  expect(cartReducer(start, { type: 'clear' })).toEqual([]);
});

test('unknown product ids leave other lines untouched', () => {
  const start = [line({ qty: 2 })];
  expect(cartReducer(start, { type: 'increment', product_id: 9 })).toEqual(
    start,
  );
  expect(cartReducer(start, { type: 'decrement', product_id: 9 })).toEqual(
    start,
  );
});
