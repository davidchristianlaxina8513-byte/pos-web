'use client';

import type { ReactNode } from 'react';
import { Dialog, Modal as RACModal, ModalOverlay } from 'react-aria-components';
import { CloseIcon } from '@/components/common/icons';

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
}

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
}: ModalProps) {
  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      isDismissable={!isDismissDisabled}
      isKeyboardDismissDisabled={isDismissDisabled}
      className="fixed inset-0 z-50 flex items-end justify-center bg-pine-deep/50 sm:items-center sm:p-4"
    >
      <RACModal className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-card bg-surface p-4 shadow-soft outline-none sm:rounded-card">
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
