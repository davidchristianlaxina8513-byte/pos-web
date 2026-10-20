'use client';

import type { ReactNode } from 'react';
import { Dialog, Modal as RACModal, ModalOverlay } from 'react-aria-components';
import { CloseIcon } from '@/components/common/icons';

import { cn } from '@/lib/cn';

export type ModalSize =
  | 'sm'
  | 'md'
  | 'lg'
  | 'xl'
  | '2xl'
  | '3xl'
  | '4xl'
  | '5xl'
  | '6xl'
  | '7xl'
  | 'full';

export interface ModalProps {
  title: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  /**
   * Blocks overlay-click + Escape dismissal (e.g. while a form inside is
   * submitting — the inner close button honors this too).
   */
  isDismissDisabled?: boolean;
  /** Size variant controlling maximum dialog width. Defaults to 'md'. */
  size?: ModalSize;
}

const SIZE_CLASSES: Record<ModalSize, string> = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
  xl: 'sm:max-w-xl',
  '2xl': 'sm:max-w-2xl',
  '3xl': 'sm:max-w-3xl',
  '4xl': 'sm:max-w-4xl',
  '5xl': 'sm:max-w-5xl',
  '6xl': 'sm:max-w-6xl',
  '7xl': 'sm:max-w-7xl',
  full: 'sm:max-w-[95vw] xl:max-w-[1450px]',
};

/**
 * Shared dialog: dimmed overlay, focus trap + restore, scroll lock, and a
 * title-left / X-right header. Feature content goes in `children`; this
 * file owns no feature logic. Responsive bottom sheet on phones, centered
 * card from `sm:` up (the established dialog pattern).
 */
export function Modal({
  title,
  isOpen,
  onOpenChange,
  children,
  isDismissDisabled = false,
  size = 'md',
}: ModalProps) {
  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      isDismissable={!isDismissDisabled}
      isKeyboardDismissDisabled={isDismissDisabled}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center sm:p-4"
    >
      <RACModal
        className={cn(
          'max-h-[92vh] w-full overflow-y-auto rounded-t-card bg-surface p-5 sm:p-6 shadow-soft outline-none sm:rounded-card',
          SIZE_CLASSES[size] ?? 'sm:max-w-md',
        )}
      >
        <Dialog aria-label={title} className="outline-none">
          {({ close }) => (
            <>
              <div className="flex items-center gap-3">
                <h2 className="min-w-0 flex-1 truncate text-lg font-extrabold tracking-tight text-foreground">
                  {title}
                </h2>
                <button
                  type="button"
                  onClick={close}
                  disabled={isDismissDisabled}
                  aria-label="Close"
                  className="action-focus flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-foreground hover:bg-mist disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <CloseIcon />
                </button>
              </div>
              <div className="mt-4">{children}</div>
            </>
          )}
        </Dialog>
      </RACModal>
    </ModalOverlay>
  );
}
