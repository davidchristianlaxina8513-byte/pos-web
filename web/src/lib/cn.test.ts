import { expect, test } from 'vitest';
import { cn } from './cn';

test('cn joins static class names', () => {
  expect(cn('bg-surface', 'text-foreground')).toBe(
    'bg-surface text-foreground',
  );
});

test('cn skips falsy conditional classes', () => {
  expect(cn('bg-surface', false && 'bg-disabled', undefined, 'p-4')).toBe(
    'bg-surface p-4',
  );
});

test('cn dedupes conflicting Tailwind utilities, last wins', () => {
  expect(cn('bg-surface', 'bg-disabled')).toBe('bg-disabled');
  expect(cn('px-2', 'px-4')).toBe('px-4');
});

test('cn merges caller overrides after base classes', () => {
  expect(cn('rounded border-border', 'border-danger')).toBe(
    'rounded border-danger',
  );
});
