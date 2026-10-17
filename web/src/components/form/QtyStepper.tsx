'use client';

import { Button } from './Button';
import { TrashIcon } from '@/components/common/icons';
import { cn } from '@/lib/cn';

export interface QtyStepperProps {
  value: number;
  onIncrement: () => void;
  onDecrement: () => void;
  /** Used for the accessible stepper names, e.g. item name. */
  itemName: string;
  className?: string;
}

/** Minus/plus quantity stepper in the v2 pill language. */
export function QtyStepper({
  value,
  onIncrement,
  onDecrement,
  itemName,
  className,
}: QtyStepperProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Button
        variant="secondary"
        size="sm"
        className={cn(
          'h-9 w-9 rounded-full border-pine/40 bg-surface px-0 text-base',
          value === 1
            ? 'border-danger/40 text-danger hover:bg-danger-surface'
            : 'text-pine-deep',
        )}
        onClick={onDecrement}
        aria-label={value === 1 ? `Remove ${itemName}` : `Decrease ${itemName}`}
      >
        {value === 1 ? <TrashIcon className="h-4 w-4" /> : '−'}
      </Button>
      <span className="w-5 text-center text-sm font-semibold text-foreground">
        {value}
      </span>
      <Button
        size="sm"
        className="h-9 w-9 rounded-full bg-pine px-0 text-base text-surface"
        onClick={onIncrement}
        aria-label={`Increase ${itemName}`}
      >
        +
      </Button>
    </div>
  );
}
