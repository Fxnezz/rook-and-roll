import Link from "next/link";

const CARDS = [
  { href: "/training/checkmates", title: "Checkmate patterns", blurb: "Drill back-rank, smothered, Arabian, and 6 more classic mating patterns." },
  { href: "/training/endgames", title: "Endgame trainer", blurb: "Play out Lucena, Philidor, and the basic mates against the engine." },
  { href: "/training/coordinates", title: "Coordinates trainer", blurb: "Find the named square as fast as you can — 30 second rounds." },
  { href: "/training/guess", title: "Guess the move", blurb: "Quiz yourself on your own past games — what did you actually play here?" },
  { href: "/training/editor", title: "Board editor", blurb: "Set up any position and play it out vs a bot, locally, or against a friend." },
  { href: "/openings", title: "Opening drills", blurb: "Practice book lines against a bot that plays straight theory." },
  { href: "/puzzles", title: "Tactics puzzles", blurb: "Daily puzzle, rated practice, and timed Puzzle Rush." },
  { href: "/training/exhibition", title: "Engine exhibition", blurb: "Sit back and watch two engines play each other, with a live eval bar." },
];

export default function TrainingHubPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="mb-1 text-2xl font-bold">Training</h1>
      <p className="mb-5 text-sm text-[var(--text-muted)]">Sharpen a specific skill instead of just playing games.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {CARDS.map((c) => (
          <Link key={c.href} href={c.href} className="panel hover-lift p-4 transition-colors hover:bg-[var(--bg-elev)]">
            <h2 className="font-semibold">{c.title}</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">{c.blurb}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
