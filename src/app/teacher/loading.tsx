export default function Loading() {
  return (
    <div className="space-y-6" aria-live="polite" aria-busy="true">
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm">
        <div className="h-8 w-52 animate-pulse rounded-md bg-zinc-200" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={`teacher-loading-stat-${index}`}
            className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm"
          >
            <div className="h-3 w-24 animate-pulse rounded bg-zinc-200" />
            <div className="mt-3 h-8 w-14 animate-pulse rounded bg-zinc-200" />
          </div>
        ))}
      </div>

      <div className="grid gap-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={`teacher-loading-card-${index}`}
            className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm"
          >
            <div className="h-6 w-56 animate-pulse rounded bg-zinc-200" />
            <div className="mt-4 h-4 w-full animate-pulse rounded bg-zinc-100" />
            <div className="mt-2 h-4 w-10/12 animate-pulse rounded bg-zinc-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
