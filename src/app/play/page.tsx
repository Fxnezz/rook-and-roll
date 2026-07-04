import Link from "next/link";

export const metadata = { title: "Games Hub" };

interface GameCard {
  title: string;
  blurb: string;
  emoji: string;
  primary: { href: string; label: string };
  secondary?: { href: string; label: string };
}

const CHESS_GAMES: GameCard[] = [
  {
    title: "Chess",
    blurb: "Play online with live matchmaking, ratings, chat, and spectating.",
    emoji: "♟️",
    primary: { href: "/play/online", label: "Play Online" },
    secondary: { href: "/play/bot", label: "vs Bot" },
  },
  {
    title: "Pass & Play",
    blurb: "Two players, one screen — no account needed.",
    emoji: "🪑",
    primary: { href: "/play/local", label: "Play" },
  },
  {
    title: "Puzzles",
    blurb: "Daily tactics puzzle plus unlimited practice, with streaks.",
    emoji: "🧩",
    primary: { href: "/puzzles", label: "Solve" },
  },
];

const MULTIPLAYER_GAMES: GameCard[] = [
  {
    title: "Connect Four",
    blurb: "Four in a row, any direction. Rated matchmaking + invite links.",
    emoji: "🔴",
    primary: { href: "/play/connect-four", label: "Play Online" },
  },
  {
    title: "Tic-Tac-Toe",
    blurb: "Quick and casual — matchmaking or a friend invite link.",
    emoji: "✕⭕",
    primary: { href: "/play/tic-tac-toe", label: "Play Online" },
  },
  {
    title: "Checkers",
    blurb: "Standard rules — forced capture, kings, multi-jumps. Rated.",
    emoji: "⚫",
    primary: { href: "/play/checkers", label: "Play Online" },
  },
];

const ARCADE_GAMES: GameCard[] = [
  {
    title: "Snake",
    blurb: "Classic grid snake with a rising speed curve.",
    emoji: "🐍",
    primary: { href: "/play/snake", label: "Play" },
  },
  {
    title: "Tetris",
    blurb: "7-bag randomizer, hold, next preview, level curve.",
    emoji: "🧱",
    primary: { href: "/play/tetris", label: "Play" },
  },
  {
    title: "2048",
    blurb: "Merge tiles to 2048 — and keep going if you want more.",
    emoji: "🔢",
    primary: { href: "/play/2048", label: "Play" },
  },
  {
    title: "Word Game",
    blurb: "Five letters, six guesses. One daily word for everyone.",
    emoji: "🔤",
    primary: { href: "/play/wordle", label: "Play" },
  },
];

const ORIGINAL_GAMES: GameCard[] = [
  {
    title: "Circuit Dash",
    blurb: "An original 3D arcade racer — drift an original circuit for the best lap.",
    emoji: "🏎️",
    primary: { href: "/play/racing", label: "Race" },
  },
  {
    title: "Spark's Climb",
    blurb: "An original platformer — run, double-jump, grab gems, reach the flag.",
    emoji: "✨",
    primary: { href: "/play/platformer", label: "Play" },
  },
];

function Section({ title, games }: { title: string; games: GameCard[] }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-[var(--text-faint)]">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {games.map((g) => (
          <div key={g.title} className="panel flex flex-col gap-2 p-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{g.emoji}</span>
              <h3 className="font-bold">{g.title}</h3>
            </div>
            <p className="flex-1 text-sm text-[var(--text-muted)]">{g.blurb}</p>
            <div className="flex gap-2">
              <Link href={g.primary.href} className="btn btn-primary flex-1 !py-2 text-sm">
                {g.primary.label}
              </Link>
              {g.secondary && (
                <Link href={g.secondary.href} className="btn flex-1 !py-2 text-sm">
                  {g.secondary.label}
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function GamesHubPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-1 text-3xl font-extrabold tracking-tight">Games Hub</h1>
      <p className="mb-8 text-[var(--text-muted)]">
        One account, one theme, every game — chess, classic board games, arcade favorites, and two
        original games built for this platform.
      </p>
      <Section title="Chess" games={CHESS_GAMES} />
      <Section title="Multiplayer board games" games={MULTIPLAYER_GAMES} />
      <Section title="Arcade" games={ARCADE_GAMES} />
      <Section title="Original games" games={ORIGINAL_GAMES} />
    </div>
  );
}
