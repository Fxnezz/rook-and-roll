import Link from "next/link";

export const metadata = { title: "Games Hub" };

interface GameCard {
  title: string;
  blurb: string;
  emoji: string;
  links: { href: string; label: string }[];
}

const CHESS_GAMES: GameCard[] = [
  {
    title: "Chess",
    blurb: "Play online with live matchmaking, ratings, chat, and spectating.",
    emoji: "♟️",
    links: [
      { href: "/play/online", label: "Play Online" },
      { href: "/play/bot", label: "vs Bot" },
    ],
  },
  {
    title: "Pass & Play",
    blurb: "Two players, one screen — no account needed.",
    emoji: "🪑",
    links: [{ href: "/play/local", label: "Play" }],
  },
  {
    title: "Puzzles",
    blurb: "Daily tactics puzzle plus unlimited practice, with streaks.",
    emoji: "🧩",
    links: [{ href: "/puzzles", label: "Solve" }],
  },
];

const MULTIPLAYER_GAMES: GameCard[] = [
  {
    title: "Connect Four",
    blurb: "Four in a row, any direction. Rated matchmaking, vs bot, or pass & play.",
    emoji: "🔴",
    links: [
      { href: "/play/connect-four", label: "Play Online" },
      { href: "/play/connect-four/bot", label: "vs Bot" },
      { href: "/play/connect-four/local", label: "Pass & Play" },
    ],
  },
  {
    title: "Tic-Tac-Toe",
    blurb: "Quick and casual — matchmaking, an unbeatable bot, or pass & play.",
    emoji: "✕⭕",
    links: [
      { href: "/play/tic-tac-toe", label: "Play Online" },
      { href: "/play/tic-tac-toe/bot", label: "vs Bot" },
      { href: "/play/tic-tac-toe/local", label: "Pass & Play" },
    ],
  },
  {
    title: "Checkers",
    blurb: "Standard rules — forced capture, kings, multi-jumps. Rated, vs bot, or pass & play.",
    emoji: "⚫",
    links: [
      { href: "/play/checkers", label: "Play Online" },
      { href: "/play/checkers/bot", label: "vs Bot" },
      { href: "/play/checkers/local", label: "Pass & Play" },
    ],
  },
  {
    title: "Othello",
    blurb: "Flank a line of discs to flip them — most discs when the board settles wins. Rated, vs bot, or pass & play.",
    emoji: "🟢",
    links: [
      { href: "/play/othello", label: "Play Online" },
      { href: "/play/othello/bot", label: "vs Bot" },
      { href: "/play/othello/local", label: "Pass & Play" },
    ],
  },
  {
    title: "Gomoku",
    blurb: "Five in a row, any direction, on a 15x15 board. Rated, vs bot, or pass & play.",
    emoji: "⚪",
    links: [
      { href: "/play/gomoku", label: "Play Online" },
      { href: "/play/gomoku/bot", label: "vs Bot" },
      { href: "/play/gomoku/local", label: "Pass & Play" },
    ],
  },
  {
    title: "Mancala",
    blurb: "Standard Kalah rules — sow seeds, chain extra turns, capture across the board.",
    emoji: "🟤",
    links: [
      { href: "/play/mancala", label: "Play Online" },
      { href: "/play/mancala/bot", label: "vs Bot" },
      { href: "/play/mancala/local", label: "Pass & Play" },
    ],
  },
];

const ARCADE_GAMES: GameCard[] = [
  {
    title: "Snake",
    blurb: "Classic grid snake with a rising speed curve.",
    emoji: "🐍",
    links: [{ href: "/play/snake", label: "Play" }],
  },
  {
    title: "Tetris",
    blurb: "7-bag randomizer, hold, next preview, level curve.",
    emoji: "🧱",
    links: [{ href: "/play/tetris", label: "Play" }],
  },
  {
    title: "2048",
    blurb: "Merge tiles to 2048 — and keep going if you want more.",
    emoji: "🔢",
    links: [{ href: "/play/2048", label: "Play" }],
  },
  {
    title: "Word Game",
    blurb: "Five letters, six guesses. One daily word for everyone.",
    emoji: "🔤",
    links: [{ href: "/play/wordle", label: "Play" }],
  },
  {
    title: "Minesweeper",
    blurb: "Clear the board without hitting a mine. First click is always safe.",
    emoji: "💣",
    links: [{ href: "/play/minesweeper", label: "Play" }],
  },
  {
    title: "Memory Match",
    blurb: "Flip two cards at a time — find every pair as fast as you can.",
    emoji: "🃏",
    links: [{ href: "/play/memory", label: "Play" }],
  },
  {
    title: "15 Puzzle",
    blurb: "Slide tiles into the blank space to put them back in order.",
    emoji: "🔲",
    links: [{ href: "/play/15puzzle", label: "Play" }],
  },
  {
    title: "Simon",
    blurb: "Repeat the growing sequence of colors and sounds.",
    emoji: "🔴",
    links: [{ href: "/play/simon", label: "Play" }],
  },
  {
    title: "Sudoku",
    blurb: "Every puzzle is generated fresh with a guaranteed unique solution.",
    emoji: "9️⃣",
    links: [{ href: "/play/sudoku", label: "Play" }],
  },
  {
    title: "Solitaire",
    blurb: "Classic Klondike, draw-1, with an auto-complete button.",
    emoji: "♠️",
    links: [{ href: "/play/solitaire", label: "Play" }],
  },
  {
    title: "Breakout",
    blurb: "Clear every brick without letting the ball fall past your paddle.",
    emoji: "🧱",
    links: [{ href: "/play/breakout", label: "Play" }],
  },
  {
    title: "Whack-a-Mole",
    blurb: "30 seconds on the clock — whack moles the instant they pop up.",
    emoji: "🔨",
    links: [{ href: "/play/whackamole", label: "Play" }],
  },
];

const ORIGINAL_GAMES: GameCard[] = [
  {
    title: "Circuit Dash",
    blurb: "An original 3D arcade racer — pick a track, drift for the best lap.",
    emoji: "🏎️",
    links: [{ href: "/play/racing", label: "Race" }],
  },
  {
    title: "Spark's Climb",
    blurb: "An original platformer — run, double-jump, grab gems, reach the flag.",
    emoji: "✨",
    links: [{ href: "/play/platformer", label: "Play" }],
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
            <div className="flex flex-wrap gap-2">
              {g.links.map((link, i) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`btn flex-1 !py-2 text-sm ${i === 0 ? "btn-primary" : ""}`}
                >
                  {link.label}
                </Link>
              ))}
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
