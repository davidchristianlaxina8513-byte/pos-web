'use client';

import { cn } from '@/lib/cn';

export type ToastType = 'success' | 'error' | 'warn' | 'info';

export interface ToastItem {
  id: string;
  title: string;
  message?: string;
  type: ToastType;
  duration?: number;
}

const TOAST_THEMES: Record<
  ToastType,
  {
    bg: string;
    border: string;
  }
> = {
  success: {
    bg: 'bg-[#68cd86]',
    border: 'border-l-[#42a85f]',
  },
  error: {
    bg: 'bg-[#e54d42]',
    border: 'border-l-[#b82e24]',
  },
  warn: {
    bg: 'bg-[#ffb648]',
    border: 'border-l-[#f48a06]',
  },
  info: {
    bg: 'bg-[#44a4fc]',
    border: 'border-l-[#187fe7]',
  },
};

/**
 * Toast notification container copied directly from the DCASIS (@kyvg/vue3-notification) design:
 * Solid background (#68cd86 success, #e54d42 error, #ffb648 warn, #44a4fc info),
 * 5px darker solid left border stripe, white typography, compact 10px padding,
 * and click-to-dismiss behavior without artificial AI styling.
 */
export function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed top-6 right-6 z-[9999] flex w-[320px] max-w-[calc(100vw-2rem)] flex-col gap-1.5 print:hidden"
    >
      {toasts.map((toast) => {
        const theme = TOAST_THEMES[toast.type] || TOAST_THEMES.info;

        return (
          <div
            key={toast.id}
            role="alert"
            onClick={() => onDismiss(toast.id)}
            title="Click to dismiss"
            className={cn(
              'pointer-events-auto cursor-pointer border-l-[5px] p-2.5 text-left text-white shadow-md transition-all duration-300 animate-toast-slide-in select-none',
              theme.bg,
              theme.border,
            )}
          >
            <div className="text-[13px] font-semibold leading-snug">
              {toast.title}
            </div>
            {toast.message ? (
              <div className="mt-0.5 text-[12px] leading-tight text-white/95">
                {toast.message}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
