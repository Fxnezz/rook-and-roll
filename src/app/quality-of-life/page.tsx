import Link from "next/link";

export const metadata = {
  title: "Patch Notes",
  description: "A compact history of the latest Sam's Arcade updates.",
};

export default function QualityOfLifePage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="chip !border-[var(--accent)]/30 !bg-[var(--accent)]/10 !text-[var(--accent)]">✦ Patch Notes</span>
          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">What changed in Sam&apos;s Arcade</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">A short release history. Adjustable QOL features have moved into Settings so this page stays easy to scan.</p>
        </div>
        <Link href="/" className="btn shrink-0">Back to arcade</Link>
      </header>

      <section className="overflow-hidden rounded-2xl border border-[var(--accent)]/30 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--accent)_12%,var(--panel)),var(--panel))] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-black uppercase tracking-[0.14em] text-[var(--accent)]">Latest · July 2026</span>
          <span className="chip !border-[var(--good)]/30 !bg-[var(--good)]/10 !text-[var(--good)]">Live</span>
        </div>
        <h2 className="mt-3 text-xl font-black">Unified settings and smoother motion</h2>
        <ul className="mt-3 grid gap-2 text-sm leading-6 text-[var(--text-muted)] sm:grid-cols-2">
          <li>◇ All adjustable website and QOL controls now live in Settings.</li>
          <li>✦ Motion Studio adds profiles, transitions and effect controls.</li>
          <li>▦ Player Tools now focuses on goals, activity, collections and focus.</li>
          <li>⌘ Keyboard shortcuts can open the new QOL settings directly.</li>
          <li>⚡ Sam Engine S1 adds adjustable depth, skill and playing style.</li>
          <li>♟ Engine Arena supports custom-position bot-vs-bot matches.</li>
        </ul>
      </section>

      <details className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-4">
        <summary className="cursor-pointer text-sm font-extrabold">Earlier updates</summary>
        <div className="mt-4 grid gap-4 border-t border-[var(--border)] pt-4 text-sm sm:grid-cols-2">
          <article><p className="text-xs font-black uppercase tracking-wider text-[var(--text-faint)]">QOL expansion</p><h3 className="mt-1 font-extrabold">Website comfort suite</h3><p className="mt-1 leading-6 text-[var(--text-muted)]">Added reading tools, navigation helpers, data-saving options, private notes, focus tools and local personalization.</p></article>
          <article><p className="text-xs font-black uppercase tracking-wider text-[var(--text-faint)]">Sam&apos;s Arcade launch</p><h3 className="mt-1 font-extrabold">Rook &amp; Roll became Sam&apos;s Arcade</h3><p className="mt-1 leading-6 text-[var(--text-muted)]">Introduced the games hub, chess modes, accounts, owner Shield controls and the new arcade identity.</p></article>
        </div>
      </details>
    </main>
  );
}
