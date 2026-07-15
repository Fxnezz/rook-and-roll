export default function ChessHomeLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8" role="status" aria-label="Preparing Chess Home">
      <div className="loading-shimmer h-8 w-44 rounded-lg bg-[var(--bg-elev)]" />
      <div className="mt-6 grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="loading-shimmer min-h-[30rem] rounded-[1.75rem] bg-[var(--panel)]" />
        <div className="grid gap-4">
          <div className="loading-shimmer h-56 rounded-[1.5rem] bg-[var(--panel)]" />
          <div className="loading-shimmer h-52 rounded-[1.5rem] bg-[var(--panel)]" />
        </div>
      </div>
      <span className="sr-only">Loading Chess Home</span>
    </div>
  );
}
