import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PREFERENCES,
  parsePreferences,
  preferenceStorageKey,
  resolveAppearance,
} from './preferences';

describe('preferences', () => {
  it('uses defaults for missing or malformed stored data', () => {
    expect(parsePreferences(null)).toEqual(DEFAULT_PREFERENCES);
    expect(parsePreferences('{broken')).toEqual(DEFAULT_PREFERENCES);
  });

  it('keeps valid settings and repairs invalid fields', () => {
    expect(
      parsePreferences(
        JSON.stringify({
          orderNotifications: false,
          quotaAlerts: false,
          language: 'fil',
          appearance: 'dark',
        }),
      ),
    ).toEqual({
      orderNotifications: false,
      quotaAlerts: false,
      language: 'fil',
      appearance: 'dark',
    });
    expect(parsePreferences(JSON.stringify({ appearance: 'neon' }))).toEqual(
      DEFAULT_PREFERENCES,
    );
  });

  it('scopes storage and resolves system appearance', () => {
    expect(preferenceStorageKey(' Staff@Elvira.Cafe ')).toBe(
      'cafe-elvira:preferences:staff@elvira.cafe',
    );
    expect(resolveAppearance('system', true)).toBe('dark');
    expect(resolveAppearance('system', false)).toBe('light');
    expect(resolveAppearance('light', true)).toBe('light');
  });
});
