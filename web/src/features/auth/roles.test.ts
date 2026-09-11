import { expect, test } from 'vitest';
import {
  isAppRelativeDestination,
  landingForRole,
  parseRole,
  resolveCallbackDestination,
} from './roles';

test('landingForRole routes by role', () => {
  expect(landingForRole('cashier')).toBe('/pos');
  expect(landingForRole('admin')).toBe('/admin');
});

test('parseRole accepts known roles only', () => {
  expect(parseRole('admin')).toBe('admin');
  expect(parseRole('cashier')).toBe('cashier');
  expect(parseRole('owner')).toBeNull();
  expect(parseRole('')).toBeNull();
  expect(parseRole(null)).toBeNull();
  expect(parseRole(undefined)).toBeNull();
});

test('resolveCallbackDestination keeps allow-listed paths', () => {
  expect(resolveCallbackDestination('/pos')).toBe('/pos');
  expect(resolveCallbackDestination('/admin')).toBe('/admin');
  expect(resolveCallbackDestination('/')).toBe('/');
});

test('resolveCallbackDestination rejects open redirects', () => {
  expect(resolveCallbackDestination('https://evil.example/')).toBe('/');
  expect(resolveCallbackDestination('//evil.example/pos')).toBe('/');
  expect(resolveCallbackDestination('/pos?next=https://evil.example/')).toBe(
    '/',
  );
  expect(resolveCallbackDestination('/secret')).toBe('/');
  expect(resolveCallbackDestination(null)).toBe('/');
});

test('isAppRelativeDestination narrows correctly', () => {
  expect(isAppRelativeDestination('/pos')).toBe(true);
  expect(isAppRelativeDestination('/elsewhere')).toBe(false);
});
