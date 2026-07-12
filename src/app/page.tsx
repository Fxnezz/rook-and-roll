import Link from "next/link";
import { Piece } from "@/lib/pieces";
import { IconUsers, IconRobot } from "@/components/ui/icons";
import { HowToPlayChessLink } from "@/components/home/HowToPlayChessLink";

const FEATURES = [
  { title: "Play online", body: "Get matched with a live opponent, with clocks, chat, and rated ladders." },
  { title: "Play the bots", body: "Stockfish-powered opponents from total beginner to expert, with post-game analysis." },
  { title: "Puzzles & more", body: "Sharpen tactics with rated puzzles, or pass-and-play a friend on one screen." },
];

function HeroBoard() {
  // Decorative 4x4 corner of a board with a few pieces.
  const light = "#ebecd0";
  const dark = "#6f8f5a";
  const layout: ({ t: "p" | "r" | "n" | "b" | "q" | "k"; c: "w" | "b" } | null)[] = [
    { t: "r", c: "b" }, { t: "q", c: "b" }, null, { t: "n", c: "b" },
    null, { t: "p", c: "b" }, null, null,
    null, null, { t: "p", c: "w" }, null,
    { t: "b", c: "w" }, null, { t: "k", c: "w" }, { t: "r", c: "w" },
  ];
  return (
    <div
      aria-hidden="true"
      className="grid aspect-square w-full max-w-[360px] grid-cols-4 grid-rows-4 overflow-hidden rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.5)] ring-1 ring-[var(--border)]"
    >
      {layout.map((p, i) => {
        const row = Math.floor(i / 4);
        const col = i % 4;
        const isLight = (row + col) % 2 === 0;
        return (
          <div key={i} className="relative" style={{ background: isLight ? light : dark }}>
            {p && (
              <div className="absolute inset-[8%]">
                <Piece type={p.t} color={p.c} set="monarch" />
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
      <section className="grid items-center gap-10 py-14 md:grid-cols-2 md:py-20">
        <div className="animate-fade">
          <span className="chip mb-4">♜ Original board · Original pieces</span>
          <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl">
            Chess, without the clutter.
          </h1>
          <p className="mt-4 max-w-md text-lg text-[var(--text-muted)]">
            A fast, modern place to play. Pass-and-play today; bots and online multiplayer
            rolling out. Built from scratch — no borrowed art, no noise.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/play/online" className="btn btn-primary text-base !px-5 !py-3">
              <IconUsers width={18} height={18} /> Play online
            </Link>
            <Link href="/play/bot" className="btn text-base !px-5 !py-3">
              <IconRobot width={18} height={18} /> Play a bot
            </Link>
            <HowToPlayChessLink />
          </div>
        </div>
        <div className="flex justify-center md:justify-end">
          <HeroBoard />
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
          Browse the Games Hub
        </Link>
      </section>
    </div>
  );
}
