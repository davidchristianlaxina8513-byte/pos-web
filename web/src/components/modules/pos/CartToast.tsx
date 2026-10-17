export interface CartToastData {
  id: number;
  name: string;
  total: number;
}

/**
 * Brief add-to-cart confirmation. Presentational only: the parent shows it
 * on every add and clears it after ~1.8s. `role="status"` announces the
 * confirmation politely; `key` re-mounts (re-animates + re-announces) when
 * items are added in quick succession. Never intercepts taps.
 */
export function CartToast({ toast }: { toast: CartToastData | null }) {
  if (!toast) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4">
      <p
        key={toast.id}
        role="status"
        className="animate-toast-in rounded-full bg-pine-deep px-4 py-2.5 text-sm font-semibold text-surface shadow-active"
      >
        Added {toast.name} — Total: ₱{toast.total.toFixed(2)}
      </p>
    </div>
  );
}
