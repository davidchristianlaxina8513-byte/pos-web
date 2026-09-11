import { expect, test } from 'vitest';
import { validateNewStaff } from './validate';

test('valid staff passes with trimmed email', () => {
  expect(
    validateNewStaff({
      username: '  new@elvira.cafe ',
      password: 'secret1',
      role: 'cashier',
    }),
  ).toEqual({
    ok: true,
    value: {
      username: 'new@elvira.cafe',
      password: 'secret1',
      role: 'cashier',
    },
  });
});

test('email, password, and role are enforced', () => {
  expect(
    validateNewStaff({
      username: 'not-an-email',
      password: 'secret1',
      role: 'cashier',
    }),
  ).toEqual({ ok: false, error: 'Enter a valid email address.' });
  expect(
    validateNewStaff({
      username: 'a@elvira.cafe',
      password: 'short',
      role: 'cashier',
    }),
  ).toEqual({ ok: false, error: 'Password must be at least 6 characters.' });
  expect(
    validateNewStaff({
      username: 'a@elvira.cafe',
      password: 'secret1',
      role: 'owner',
    }),
  ).toEqual({ ok: false, error: 'Choose a role.' });
});
