import { expect, test } from 'vitest';
import { validateCategoryName, validateProduct } from './validate';

const BASE = {
  name: 'Latte',
  category_id: 'cat-1',
  priceText: '120',
  defaultQuotaText: '30',
};

test('valid product includes its default daily quota', () => {
  expect(validateProduct(BASE)).toEqual({
    ok: true,
    value: {
      name: 'Latte',
      category_id: 'cat-1',
      price: 120,
      dailyQuotaLimit: 30,
    },
  });
});

test('valid integer default quota passes', () => {
  const result = validateProduct({ ...BASE, defaultQuotaText: '60' });
  expect(result.ok).toBe(true);
  if (result.ok) expect(result.value.dailyQuotaLimit).toBe(60);
});

test('name, category, and price are required and sane', () => {
  expect(validateProduct({ ...BASE, name: '  ' })).toEqual({
    ok: false,
    error: 'Product name is required.',
  });
  expect(validateProduct({ ...BASE, category_id: '' })).toEqual({
    ok: false,
    error: 'Product category is required.',
  });
  expect(validateProduct({ ...BASE, priceText: '-5' })).toEqual({
    ok: false,
    error: 'Price must be a number greater than or equal to zero.',
  });
  expect(validateProduct({ ...BASE, priceText: 'n/a' })).toEqual({
    ok: false,
    error: 'Price must be a number greater than or equal to zero.',
  });
});

test('daily quota may be unlimited or a nonnegative whole number', () => {
  const unlimited = validateProduct({ ...BASE, defaultQuotaText: '' });
  expect(unlimited.ok).toBe(true);
  if (unlimited.ok) expect(unlimited.value.dailyQuotaLimit).toBeNull();
  expect(validateProduct({ ...BASE, defaultQuotaText: '1.5' })).toEqual({
    ok: false,
    error:
      'Daily quota must be blank or a whole number greater than or equal to zero.',
  });
  expect(validateProduct({ ...BASE, defaultQuotaText: '-1' })).toEqual({
    ok: false,
    error:
      'Daily quota must be blank or a whole number greater than or equal to zero.',
  });
});

test('category names trim and reject blanks', () => {
  expect(validateCategoryName('  Hot Drinks ')).toEqual({
    ok: true,
    value: 'Hot Drinks',
  });
  expect(validateCategoryName('   ')).toEqual({
    ok: false,
    error: 'Category name is required.',
  });
});
