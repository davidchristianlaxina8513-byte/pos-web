/** Admin loading skeleton: tiles + metric cards + chart block. */
export default function AdminLoading() {
  return (
    <div aria-hidden="true" className="flex animate-pulse flex-col gap-3">
      <div className="h-24 rounded-card bg-sage-200" />
      <div className="grid grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((key) => (
          <div
            key={key}
            className="h-28 rounded-card border border-border bg-surface shadow-soft"
          />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[0, 1].map((key) => (
          <div
            key={key}
            className="h-20 rounded-card border border-border bg-surface shadow-soft"
          />
        ))}
      </div>
      <div className="h-48 rounded-card border border-border bg-surface shadow-soft" />
    </div>
  );
}
