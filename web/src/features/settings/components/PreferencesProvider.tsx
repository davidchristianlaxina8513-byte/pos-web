'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  APPEARANCE_STORAGE_KEY,
  DEFAULT_PREFERENCES,
  parsePreferences,
  preferenceStorageKey,
  resolveAppearance,
  type AppPreferences,
} from '../preferences';

interface PreferencesContextValue {
  preferences: AppPreferences;
  updatePreferences: (changes: Partial<AppPreferences>) => void;
}

const PreferencesContext = createContext<PreferencesContextValue>({
  preferences: DEFAULT_PREFERENCES,
  updatePreferences: () => undefined,
});

function applyDocumentPreferences(preferences: AppPreferences): void {
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  document.documentElement.dataset.theme = resolveAppearance(
    preferences.appearance,
    media.matches,
  );
  document.documentElement.lang = preferences.language;
}

export function PreferencesProvider({
  identity,
  children,
}: {
  identity: string;
  children: ReactNode;
}) {
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const storageKey = preferenceStorageKey(identity);

  useEffect(() => {
    const stored = parsePreferences(window.localStorage.getItem(storageKey));
    window.localStorage.setItem(APPEARANCE_STORAGE_KEY, stored.appearance);
    applyDocumentPreferences(stored);
    const frame = window.requestAnimationFrame(() => setPreferences(stored));
    return () => window.cancelAnimationFrame(frame);
  }, [storageKey]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onSystemAppearance = () => {
      if (preferences.appearance === 'system') {
        applyDocumentPreferences(preferences);
      }
    };
    media.addEventListener('change', onSystemAppearance);
    return () => media.removeEventListener('change', onSystemAppearance);
  }, [preferences]);

  const updatePreferences = useCallback(
    (changes: Partial<AppPreferences>) => {
      setPreferences((current) => {
        const next = { ...current, ...changes };
        window.localStorage.setItem(storageKey, JSON.stringify(next));
        window.localStorage.setItem(APPEARANCE_STORAGE_KEY, next.appearance);
        applyDocumentPreferences(next);
        return next;
      });
    },
    [storageKey],
  );

  const value = useMemo(
    () => ({ preferences, updatePreferences }),
    [preferences, updatePreferences],
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences(): PreferencesContextValue {
  return useContext(PreferencesContext);
}
