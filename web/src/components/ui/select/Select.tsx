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
 * Shared single-value select. Trigger mirrors the Field pill
 * (`h-[52px] rounded-2xl border-border bg-mist`); popover matches the
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
        <Label className={cn('text-foreground', labelClassName)}>{label}</Label>
      ) : null}
      <RACButton
        className={cn(
          'action-focus mt-1 flex h-[52px] w-full items-center gap-2 rounded-2xl border border-border bg-mist px-3.5 text-left text-foreground',
          'disabled:cursor-not-allowed disabled:opacity-50',
        )}
      >
        <SelectValue className="min-w-0 flex-1 truncate data-[placeholder]:text-muted" />
        <ChevronDownIcon className="h-5 w-5 shrink-0 text-muted" />
      </RACButton>
      <Popover className="max-h-64 w-[var(--trigger-width)] overflow-y-auto rounded-card border border-border bg-surface p-1 shadow-soft">
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
                  'flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-[15px] text-foreground outline-none',
                  isFocused && 'bg-mist',
                  isSelected && 'bg-sage-100 font-bold text-pine-deep',
                  isItemDisabled && 'opacity-50',
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
