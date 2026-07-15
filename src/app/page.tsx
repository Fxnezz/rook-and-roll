import Link from "next/link";
import { Piece } from "@/lib/pieces";
import { IconUsers, IconRobot, IconPuzzle, IconSparkles, IconTarget, IconGrid, IconChevronRight } from "@/components/ui/icons";
import { HowToPlayChessLink } from "@/components/home/HowToPlayChessLink";
import { BotAvatar } from "@/components/bot/BotAvatar";
import { ResumeGameCard } from "@/components/ui/ResumeGameCard";

const FEATURES = [
  { title: "Play online", body: "Get matched with a live opponent, with clocks, chat, and rated ladders." },
  { title: "Play the bots", body: "Stockfish-powered opponents from total beginner to expert, with post-game analysis." },
  { title: "Puzzles & more", body: "Sharpen tactics with rated puzzles, or pass-and-play a friend on one screen." },
];

const QUICK_LINKS = [
  { href: "/puzzles", label: "Puzzles", icon: IconPuzzle },
  { href: "/analysis", label: "Analysis", icon: IconSparkles },
  { href: "/training", label: "Training", icon: IconTarget },
  { href: "/play", label: "Games Hub", icon: IconGrid },
];

const HERO_BOTS = ["pip", "nell", "rosa", "ilsa", "omen"] as const;

// A recognizable, legal middlegame position (Ruy Lopez, after 3.Bb5) — rich
// enough to read as "a real game in progress" rather than the bare starting
// array, while still instantly familiar to anyone who's played a few games.
const HERO_FEN_ROWS = ["r1bqkbnr", "pppp1ppp", "2n5", "1B2p3", "4P3", "5N2", "PPPP1PPP", "RNBQK2R"];

function expandFenRow(row: string): (string | null)[] {
  const cells: (string | null)[] = [];
  for (const ch of row) {
    if (/\d/.test(ch)) for (let i = 0; i < Number(ch); i++) cells.push(null);
    else cells.push(ch);
  }
  return cells;
}

function HeroBoard() {
  const light = "#ebecd0";
  const dark = "#6f8f5a";
  const grid = HERO_FEN_ROWS.flatMap(expandFenRow);
  return (
    <div
      aria-hidden="true"
      className="grid aspect-square w-full max-w-[440px] grid-cols-8 grid-rows-8 overflow-hidden rounded-2xl shadow-[0_24px_70px_rgba(0,0,0,0.55)] ring-1 ring-[var(--border)]"
    >
      {grid.map((cell, i) => {
        const row = Math.floor(i / 8);
        const col = i % 8;
        const isLight = (row + col) % 2 === 0;
        return (
          <div key={i} className="relative" style={{ background: isLight ? light : dark }}>
            {cell && (
              <div className="absolute inset-[6%]">
                <Piece type={cell.toLowerCase() as "p" | "r" | "n" | "b" | "q" | "k"} color={cell === cell.toUpperCase() ? "w" : "b"} set="monarch" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl px-4">
      <div className="pt-6">
        <ResumeGameCard />
      </div>

      <section className="grid items-center gap-12 py-12 md:grid-cols-2 md:py-16">
        <div className="flex justify-center md:order-2 md:justify-end">
          <HeroBoard />
        </div>

        <div className="animate-fade md:order-1">
          <span className="chip mb-4">♜ Original board · Original pieces</span>
          <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">
            Chess, without the clutter.
          </h1>
          <p className="mt-4 max-w-md text-lg text-[var(--text-muted)]">
            A fast, modern place to play. Rated online matches, Stockfish bots of every
            strength, puzzles, and pass-and-play — built from scratch, no borrowed art.
          </p>

          <div className="mt-7 flex flex-col gap-3">
            <Link href="/play/online" className="btn btn-primary btn-cta w-full sm:w-auto">
              <IconUsers width={20} height={20} /> Play online
            </Link>

            <Link
              href="/play/bot"
              className="btn btn-secondary btn-cta group flex w-full items-center justify-between gap-3 sm:w-auto"
            >
              <span className="flex items-center gap-2.5">
                <IconRobot width={20} height={20} /> Play the bots
              </span>
              <span className="flex items-center -space-x-2.5">
                {HERO_BOTS.map((id) => (
                  <BotAvatar key={id} tierId={id} size={26} rounded="full" className="ring-2 ring-[#6dd390] transition-transform duration-150 group-hover:translate-x-0" />
                ))}
              </span>
            </Link>
          </div>

          <div className="mt-5">
            <HowToPlayChessLink />
          </div>

          <div className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {QUICK_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="hover-lift flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2.5 text-sm font-semibold text-[var(--text-muted)] transition-colors hover:border-[var(--accent-dim)] hover:text-[var(--text)]"
              >
                <l.icon width={16} height={16} />
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 pb-8 sm:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.title} className="panel p-5">
            <h3 className="font-bold">{f.title}</h3>
            <p className="mt-1.5 text-sm text-[var(--text-muted)]">{f.body}</p>
          </div>
        ))}
      </section>

      <section className="panel mb-16 flex flex-col items-center gap-4 p-6 text-center sm:flex-row sm:justify-between sm:text-left">
        <div>
          <span className="chip mb-2">🎲 70+ games</span>
          <h2 className="text-xl font-bold">More than chess</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Othello, Quoridor, Wordle, Solitaire, and dozens more — all under one account, one theme.
          </p>
        </div>
        <Link href="/play" className="btn btn-primary shrink-0 !px-5 !py-3 text-base">
          Browse the Games Hub <IconChevronRight width={16} height={16} />
        </Link>
      </section>
    </div>
  );
}
