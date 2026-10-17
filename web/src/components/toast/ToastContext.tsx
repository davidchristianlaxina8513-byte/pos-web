'use client';

import React, { createContext, useCallback, useContext, useState } from 'react';
import {
  ToastContainer,
  type ToastItem,
  type ToastType,
} from './ToastContainer';

interface NotifyOptions {
  title: string;
  message?: string;
  type?: ToastType;
  duration?: number;
}

interface ToastContextValue {
  toasts: ToastItem[];
  notify: (opts: NotifyOptions) => string;
  dismiss: (id: string) => void;
  successAlert: (title: string, message?: string) => void;
  errorAlert: (title: string, message?: string) => void;
  warningAlert: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback(
    ({ title, message, type = 'info', duration = 3500 }: NotifyOptions) => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const item: ToastItem = { id, title, message, type, duration };

      setToasts((prev) => [...prev, item]);

      if (duration > 0) {
        setTimeout(() => {
          dismiss(id);
        }, duration);
      }

      return id;
    },
    [dismiss],
  );

  const successAlert = useCallback(
    (title: string, message?: string) => {
      notify({ title, message, type: 'success' });
    },
    [notify],
  );

  const errorAlert = useCallback(
    (title: string, message?: string) => {
      notify({
        title,
        message: message || 'An unknown error occurred.',
        type: 'error',
      });
    },
    [notify],
  );

  const warningAlert = useCallback(
    (title: string, message?: string) => {
      notify({ title, message, type: 'warn' });
    },
    [notify],
  );

  return (
    <ToastContext.Provider
      value={{
        toasts,
        notify,
        dismiss,
        successAlert,
        errorAlert,
        warningAlert,
      }}
    >
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

/**
 * Shared alert hook mirroring sports-client's useAlert composable:
 * `const { successAlert, errorAlert, warningAlert } = useAlert()`
 */
export function useAlert() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Graceful fallback if invoked outside provider during SSR/unit tests
    return {
      successAlert: (title: string, message?: string) => {
        if (typeof window !== 'undefined')
          console.log('[Success]', title, message);
      },
      errorAlert: (title: string, message?: string) => {
        if (typeof window !== 'undefined')
          console.error('[Error]', title, message);
      },
      warningAlert: (title: string, message?: string) => {
        if (typeof window !== 'undefined')
          console.warn('[Warning]', title, message);
      },
    };
  }
  return {
    successAlert: ctx.successAlert,
    errorAlert: ctx.errorAlert,
    warningAlert: ctx.warningAlert,
  };
}
