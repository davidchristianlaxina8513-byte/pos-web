'use client';

import { cn } from '@/lib/cn';
import { LANGUAGE_OPTIONS, type AppPreferences } from '../preferences';
import { usePreferences } from './PreferencesProvider';

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-mist p-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">{label}</p>
        <p className="text-sm text-muted">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          'action-focus relative h-8 w-14 shrink-0 rounded-full border transition-colors',
          checked ? 'border-pine bg-pine' : 'border-border bg-surface',
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'absolute top-1 h-6 w-6 rounded-full bg-[#ffffff] shadow-sm transition-transform',
            checked ? 'translate-x-6' : 'translate-x-1',
          )}
        />
      </button>
    </div>
  );
}

export function PreferencesPanel() {
  const { preferences, updatePreferences } = usePreferences();
  const set = <Key extends keyof AppPreferences>(
    key: Key,
    value: AppPreferences[Key],
  ) => updatePreferences({ [key]: value });

  return (
    <div className="space-y-4">
      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-extrabold">
          Notification preferences
        </legend>
        <Toggle
          label="Order notifications"
          description="Show cart and order confirmations in the POS."
          checked={preferences.orderNotifications}
          onChange={(checked) => set('orderNotifications', checked)}
        />
        <Toggle
          label="Product quota alerts"
          description="Highlight products that are almost sold out in the POS."
          checked={preferences.quotaAlerts}
          onChange={(checked) => set('quotaAlerts', checked)}
        />
      </fieldset>

      <label className="block max-w-md">
        <span className="text-sm font-extrabold">Language</span>
        <select
          aria-label="Language"
          value={preferences.language}
          onChange={(event) =>
            set('language', event.target.value as AppPreferences['language'])
          }
          className="mt-2 block h-[52px] w-full rounded-2xl border border-border bg-mist px-3.5 text-foreground"
        >
          {LANGUAGE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="mt-1 block text-sm text-muted">
          English remains the complete interface language. Your saved locale
          prepares the app for additional translations.
        </span>
      </label>

      <fieldset>
        <legend className="text-sm font-extrabold">Appearance</legend>
        <div className="mt-2 grid grid-cols-3 gap-2" role="radiogroup">
          {(['light', 'dark', 'system'] as const).map((appearance) => (
            <button
              key={appearance}
              type="button"
              role="radio"
              aria-checked={preferences.appearance === appearance}
              onClick={() => set('appearance', appearance)}
              className={cn(
                'action-focus min-h-11 rounded-2xl border px-3 py-2 text-sm font-semibold capitalize',
                preferences.appearance === appearance
                  ? 'border-pine bg-pine text-surface'
                  : 'border-border bg-surface text-foreground',
              )}
            >
              {appearance}
            </button>
          ))}
        </div>
      </fieldset>

      <p aria-live="polite" className="text-xs text-muted">
        Preferences are saved for this account on this browser.
      </p>
    </div>
  );
}
