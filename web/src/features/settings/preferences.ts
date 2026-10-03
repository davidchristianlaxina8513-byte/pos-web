export const APPEARANCE_STORAGE_KEY = 'cafe-elvira:appearance';

export type AppearancePreference = 'light' | 'dark' | 'system';
export type LanguagePreference = 'en' | 'fil';

export interface AppPreferences {
  orderNotifications: boolean;
  quotaAlerts: boolean;
  language: LanguagePreference;
  appearance: AppearancePreference;
}

export const DEFAULT_PREFERENCES: AppPreferences = {
  orderNotifications: true,
  quotaAlerts: true,
  language: 'en',
  appearance: 'system',
};

export const LANGUAGE_OPTIONS: ReadonlyArray<{
  value: LanguagePreference;
  label: string;
}> = [
  { value: 'en', label: 'English' },
  { value: 'fil', label: 'Filipino' },
];

export function preferenceStorageKey(identity: string): string {
  return `cafe-elvira:preferences:${identity.trim().toLowerCase()}`;
}

/** Safely upgrades missing or malformed browser preference data. */
export function parsePreferences(value: string | null): AppPreferences {
  if (!value) return { ...DEFAULT_PREFERENCES };
  try {
    const parsed = JSON.parse(value) as Partial<AppPreferences>;
    return {
      orderNotifications:
        typeof parsed.orderNotifications === 'boolean'
          ? parsed.orderNotifications
          : DEFAULT_PREFERENCES.orderNotifications,
      quotaAlerts:
        typeof parsed.quotaAlerts === 'boolean'
          ? parsed.quotaAlerts
          : DEFAULT_PREFERENCES.quotaAlerts,
      language:
        parsed.language === 'fil' || parsed.language === 'en'
          ? parsed.language
          : DEFAULT_PREFERENCES.language,
      appearance:
        parsed.appearance === 'light' ||
        parsed.appearance === 'dark' ||
        parsed.appearance === 'system'
          ? parsed.appearance
          : DEFAULT_PREFERENCES.appearance,
    };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export function resolveAppearance(
  preference: AppearancePreference,
  systemIsDark: boolean,
): 'light' | 'dark' {
  return preference === 'system'
    ? systemIsDark
      ? 'dark'
      : 'light'
    : preference;
}
