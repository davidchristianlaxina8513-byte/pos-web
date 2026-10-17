'use client';

import {
  Button as RACButton,
  Label,
  ListBox,
  ListBoxItem,
  Popover,
  Select as RACSelect,
  SelectValue,
} from 'react-aria-components';
import { CheckIcon, ChevronDownIcon } from '@/components/common/icons';
import { cn } from '@/lib/cn';

export interface SelectOption {
  id: string;
  label: string;
  isDisabled?: boolean;
}

export interface SelectProps {
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  /** Visible label (React Aria associated). Omit and pass `ariaLabel` instead. */
  label?: string;
  /** Extra classes for the label (mirrors Field's `labelClassName`). */
  labelClassName?: string;
  /** Accessible name when no visible `label` is rendered. */
  ariaLabel?: string;
  onChange?: (value: string) => void;
  isDisabled?: boolean;
  className?: string;
}

/**
 * Shared single-value select. Trigger mirrors the Field standard input
 * (`h-10 rounded-md border-border bg-white text-sm`); popover matches the
 * trigger width with a scrolling list. Data stays in the feature — this
 * file owns presentation + interaction only.
 */
export function Select({
  options,
  value,
  defaultValue,
  placeholder,
  label,
  labelClassName,
  ariaLabel,
  onChange,
  isDisabled = false,
  className,
}: SelectProps) {
  return (
    <RACSelect
      selectedKey={value}
      defaultSelectedKey={defaultValue}
      onSelectionChange={(key) => onChange?.(String(key))}
      isDisabled={isDisabled}
      placeholder={placeholder}
      aria-label={label ?? ariaLabel}
      className={cn('block', className)}
    >
      {label ? (
        <Label
          className={cn(
            'block text-xs font-semibold text-foreground mb-1',
            labelClassName,
          )}
        >
          {label}
        </Label>
      ) : null}
      <RACButton
        className={cn(
          'action-focus flex h-10 w-full items-center gap-2 rounded-md border border-border bg-white px-3 text-left text-sm text-foreground shadow-2xs transition-colors',
          'focus:border-pine focus:outline-2 focus:outline-pine',
          'disabled:cursor-not-allowed disabled:bg-gray-100 disabled:opacity-50',
        )}
      >
        <SelectValue className="min-w-0 flex-1 truncate data-[placeholder]:text-muted" />
        <ChevronDownIcon className="h-4 w-4 shrink-0 text-muted" />
      </RACButton>
      <Popover className="max-h-64 w-[var(--trigger-width)] overflow-y-auto rounded-md border border-border bg-surface p-1 shadow-md">
        <ListBox className="outline-none">
          {options.map((option) => (
            <ListBoxItem
              key={option.id}
              id={option.id}
              textValue={option.label}
              isDisabled={option.isDisabled}
              className={({
                isFocused,
                isSelected,
                isDisabled: isItemDisabled,
              }) =>
                cn(
                  'flex items-center gap-2 rounded px-3 py-2 text-sm text-foreground outline-none cursor-pointer',
                  isFocused && 'bg-mist',
                  isSelected && 'bg-pine/10 font-bold text-pine',
                  isItemDisabled && 'opacity-50 cursor-not-allowed',
                )
              }
            >
              {({ isSelected }) => (
                <>
                  <span className="min-w-0 flex-1 truncate">
                    {option.label}
                  </span>
                  {isSelected ? (
                    <CheckIcon className="h-5 w-5 shrink-0" />
                  ) : null}
                </>
              )}
            </ListBoxItem>
          ))}
        </ListBox>
      </Popover>
    </RACSelect>
  );
}
