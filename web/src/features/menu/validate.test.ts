import { expect, test } from 'vitest';
import { validateCategoryName, validateProduct } from './validate';

const BASE = {
  name: 'Latte',
  category_id: 'cat-1',
  priceText: '120',
  parText: '',
};

test('valid product passes with null par by default', () => {
  expect(validateProduct(BASE)).toEqual({
    ok: true,
    value: {
      name: 'Latte',
      category_id: 'cat-1',
      price: 120,
      parLevel: null,
    },
  });
});

test('valid integer par passes', () => {
  const result = validateProduct({ ...BASE, parText: '60' });
  expect(result.ok).toBe(true);
  if (result.ok) expect(result.value.parLevel).toBe(60);
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

test('par must be a whole number when present', () => {
  expect(validateProduct({ ...BASE, parText: '1.5' })).toEqual({
    ok: false,
    error: 'Par level must be a whole number greater than or equal to zero.',
  });
  expect(validateProduct({ ...BASE, parText: '-1' })).toEqual({
    ok: false,
    error: 'Par level must be a whole number greater than or equal to zero.',
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
