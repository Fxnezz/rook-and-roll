export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:py-14" role="status" aria-label="Preparing the next screen">
      <div className="loading-stage overflow-hidden rounded-[1.5rem] border border-[var(--border)] bg-[var(--panel)] p-5 sm:p-8">
        <div className="flex items-center gap-3">
          <span className="loading-rook grid h-11 w-11 place-items-center rounded-xl bg-[var(--accent)] text-xl text-[var(--accent-contrast)]">♜</span>
          <div>
            <p className="font-black">Setting up your next move</p>
            <p className="text-xs text-[var(--text-faint)]">Loading the board, controls and player tools…</p>
          </div>
        </div>
        <div className="mt-7 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="loading-shimmer aspect-[16/9] rounded-2xl bg-[var(--bg-elev)]" />
          <div className="grid content-start gap-3">
            <div className="loading-shimmer h-9 w-3/4 rounded-lg bg-[var(--bg-elev)]" />
            <div className="loading-shimmer h-4 w-full rounded bg-[var(--bg-elev)]" />
            <div className="loading-shimmer h-4 w-5/6 rounded bg-[var(--bg-elev)]" />
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="loading-shimmer h-20 rounded-xl bg-[var(--bg-elev)]" />
              <div className="loading-shimmer h-20 rounded-xl bg-[var(--bg-elev)]" />
            </div>
          </div>
        </div>
        <span className="sr-only">Loading</span>
      </div>
    </div>
  );
}
