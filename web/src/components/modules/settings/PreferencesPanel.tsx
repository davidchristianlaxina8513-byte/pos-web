'use client';

import { cn } from '@/lib/cn';
import { type AppPreferences } from '@/features/settings/preferences';
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
    <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-200/80 bg-gray-50/50 p-4">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-900">{label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          'action-focus relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out',
          checked ? 'bg-pine' : 'bg-gray-200',
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out',
            checked ? 'translate-x-5' : 'translate-x-0',
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
    <div className="space-y-6">
      {/* 1. Notification Preferences */}
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            Order &amp; Inventory Alerts
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Choose which live alerts and confirmation banners appear while
            operating the POS register.
          </p>
        </div>
        <div className="space-y-2.5 pt-1">
          <Toggle
            label="Order notifications"
            description="Show cart item updates and checkout order confirmations in the POS register."
            checked={preferences.orderNotifications}
            onChange={(checked) => set('orderNotifications', checked)}
          />
          <Toggle
            label="Product quota alerts"
            description="Highlight low-stock items and alert cashiers when products are almost sold out."
            checked={preferences.quotaAlerts}
            onChange={(checked) => set('quotaAlerts', checked)}
          />
        </div>
      </div>

      {/* 2. Appearance Theme */}
      <div className="space-y-3 pt-2 border-t border-gray-100 max-w-md">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            Appearance Theme
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Select your preferred display theme for the management portal.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 pt-1" role="radiogroup">
          {(['light', 'dark', 'system'] as const).map((appearance) => {
            const isSelected = preferences.appearance === appearance;
            return (
              <button
                key={appearance}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => set('appearance', appearance)}
                className={cn(
                  'action-focus flex items-center justify-center h-11 rounded-md border px-3 py-2 text-sm font-semibold capitalize transition-all cursor-pointer',
                  isSelected
                    ? 'border-pine bg-pine text-white shadow-xs'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
                )}
              >
                {appearance}
              </button>
            );
          })}
        </div>
      </div>

      <p aria-live="polite" className="text-xs text-gray-400 pt-1">
        Preferences are saved for this account on this browser.
      </p>
    </div>
  );
}
