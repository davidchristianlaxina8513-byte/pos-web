'use client';

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="print:hidden"
    >
      Print supplier list
    </button>
  );
}
