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
        <div className="flex flex-wrap gap-2"><Link href="/improvements" className="btn btn-primary shrink-0">View all 300 improvements</Link><Link href="/" className="btn shrink-0">Back to arcade</Link></div>
      </header>

      <section className="overflow-hidden rounded-2xl border border-[var(--accent)]/30 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--accent)_12%,var(--panel)),var(--panel))] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-black uppercase tracking-[0.14em] text-[var(--accent)]">Latest · July 2026</span>
          <span className="chip !border-[var(--good)]/30 !bg-[var(--good)]/10 !text-[var(--good)]">Live</span>
        </div>
        <h2 className="mt-3 text-xl font-black">Page Guide, accessibility and recovery upgrade</h2>
        <ul className="mt-3 grid gap-2 text-sm leading-6 text-[var(--text-muted)] sm:grid-cols-2">
          <li>◇ All adjustable website and QOL controls now live in Settings.</li>
          <li>☰ Page Guide adds live outlines, section links, reading insights and recent-page navigation.</li>
          <li>↗ Universal sharing supports native share, clean links and Markdown format.</li>
          <li>◉ Distraction-free view hides shared chrome without resetting the current activity.</li>
          <li>◐ New visual controls cover text scale, contrast, readable fonts, cursors and image comfort.</li>
          <li>↻ Session drafts, unsaved-work warnings and support snapshots improve recovery.</li>
          <li>⚡ Hidden-tab pausing, safe areas, touch feedback and clean printing improve every device.</li>
          <li>✦ Motion Studio adds profiles, transitions and effect controls.</li>
          <li>▦ Player Tools now focuses on goals, activity, collections and focus.</li>
          <li>⌘ Keyboard shortcuts can open the new QOL settings directly.</li>
          <li>⚡ Sam Engine S1 now defaults to depth 26, reaches depth 40, and uses a maximum-strength browser profile.</li>
          <li>🤖 Engine Arena now supports every bot-vs-bot pairing, including Pip vs Omen and Sam vs Sam.</li>
          <li>🧠 Sam Core X1 is a new original chess engine with independent search and evaluation—no Stockfish move calls.</li>
          <li>✨ Motion Studio 2 adds ambient worlds, cursor lighting, scroll reveals, perspective cards, particles, richer route transitions, and redesigned surfaces.</li>
          <li>♟ Engine Arena supports custom-position bot-vs-bot matches.</li>
          <li>🧬 Ten engine-style bot families add 40 Academy-to-Elite sub-bots.</li>
          <li>🧠 Sam Core gains deeper search, check extensions, late-move reductions, richer evaluation, and a larger opening book.</li>
          <li>🐉 Variant Workshop adds playable Chess960, Dragon Chess, Archon Guard, Knightmare, and asymmetric Custom Forge armies.</li>
          <li>⚒ Dragons, Archbishops, Chancellors, and Wizards have original artwork and complete movement rules.</li>
          <li>🎮 Every playable route now has an immersive scene with responsive lighting, depth, materials, fullscreen controls, and reduced-motion support.</li>
          <li>🃏 Card games now use detailed linen cards with dimensional faces, embossed Sam&apos;s Arcade backs, selection lift, and light reflections.</li>
          <li>🎲 Craps, Farkle, and Yahtzee now use physical ivory dice with recessed pips, shadows, held states, and tactile motion.</li>
          <li>🕹 Canvas games now sit inside realistic illuminated cabinet bezels, while board games receive tournament-table framing.</li>
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
