/** POS loading skeleton: pill row + product cards + cart card. */
export default function PosLoading() {
  return (
    <div aria-hidden="true" className="flex animate-pulse flex-col gap-3">
      <div className="flex gap-2 overflow-hidden">
        {[0, 1, 2, 3].map((key) => (
          <div
            key={key}
            className="h-9 w-24 shrink-0 rounded-full bg-sage-200"
          />
        ))}
      </div>
      <div className="h-[52px] rounded-full bg-surface shadow-soft" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {[0, 1, 2, 3].map((key) => (
          <div
            key={key}
            className="h-32 rounded-card border border-border bg-surface shadow-soft"
          />
        ))}
      </div>
      <div className="h-40 rounded-card border border-border bg-surface shadow-soft" />
    </div>
  );
}
