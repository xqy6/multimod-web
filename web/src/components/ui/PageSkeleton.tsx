export function PageSkeleton() {
  return (
    <div
      className="min-h-screen bg-ink-950 p-5 lg:p-8"
      role="status"
      aria-label="正在加载页面"
    >
      <div className="mx-auto max-w-7xl">
        <div className="h-4 w-28 animate-pulse rounded-full bg-white/10" />
        <div className="mt-4 h-9 w-64 animate-pulse rounded-xl bg-white/10" />
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-32 animate-pulse rounded-panel border border-white/10 bg-white/[0.03]"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
