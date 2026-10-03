/**
 * Shared loading skeletons for staff routes (v2 tokens, pulse only).
 * Each route's `loading.tsx` picks the variant matching its page shape so
 * drill-down navigation shows instant feedback instead of a generic wait.
 */
export function CardsSkeleton() {
  return (
    <div aria-hidden="true" className="flex animate-pulse flex-col gap-3">
      <div className="h-24 rounded-card bg-sage-200" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {[0, 1].map((key) => (
          <div
            key={key}
            className="h-20 rounded-card border border-border bg-surface shadow-soft"
          />
        ))}
      </div>
      <div className="h-48 rounded-card border border-border bg-surface shadow-soft" />
      <div className="h-32 rounded-card border border-border bg-surface shadow-soft" />
    </div>
  );
}

/** List pages: menu manager, quota history, transactions, and users. */
export function ListSkeleton() {
  return (
    <div aria-hidden="true" className="flex animate-pulse flex-col gap-3">
      <div className="flex gap-2 overflow-hidden">
        {[0, 1, 2].map((key) => (
          <div
            key={key}
            className="h-9 w-24 shrink-0 rounded-full bg-sage-200"
          />
        ))}
      </div>
      <div className="rounded-card border border-border bg-surface shadow-soft">
        {[0, 1, 2, 3].map((key) => (
          <div
            key={key}
            className="h-16 border-b border-border last:border-b-0"
          />
        ))}
      </div>
    </div>
  );
}

/** Product create/edit form loading state. */
export function FormSkeleton() {
  return (
    <div aria-hidden="true" className="flex animate-pulse flex-col gap-3">
      <div className="rounded-card border border-border bg-surface p-4 shadow-soft">
        {[0, 1, 2].map((key) => (
          <div key={key} className="mb-4 last:mb-0">
            <div className="h-4 w-24 rounded-full bg-sage-200" />
            <div className="mt-2 h-[52px] rounded-2xl bg-mist" />
          </div>
        ))}
      </div>
      <div className="h-11 rounded-full bg-sage-200" />
    </div>
  );
}
