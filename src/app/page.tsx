import Link from "next/link";
import { BotAvatar } from "@/components/bot/BotAvatar";
import {
  IconChevronRight,
  IconGrid,
  IconPuzzle,
  IconRobot,
  IconSparkles,
  IconTraining,
  IconUsers,
} from "@/components/ui/icons";
import { Piece } from "@/lib/pieces";
import { getTheme } from "@/lib/chess/themes";
import type { BotTierId } from "@/lib/engine/bots";
import { HomeQolRail } from "@/components/qol/HomeQolRail";

type BoardPiece = { t: "p" | "r" | "n" | "b" | "q" | "k"; c: "w" | "b" };

const BOT_PREVIEW: BotTierId[] = ["pip", "cass", "wren", "ilsa"];

const QUICK_LINKS = [
  { href: "/puzzles", label: "Puzzles", detail: "Daily tactics", icon: IconPuzzle },
  { href: "/analysis", label: "Analysis", detail: "Review any game", icon: IconSparkles },
  { href: "/training", label: "Training", detail: "Build real skills", icon: IconTraining },
  { href: "/play", label: "Games Hub", detail: "73 games", icon: IconGrid },
];

const PLAYER_PATHS = [
  {
    eyebrow: "Compete",
    title: "Find your next chess game.",
    detail: "Fast matchmaking, flexible time controls, spectating and rematches in a focused live arena.",
    href: "/play/online",
    action: "Enter online play",
    icon: IconUsers,
    tone: "good",
    metric: "Live chess",
  },
  {
    eyebrow: "Experiment",
    title: "Build the exact opponent you want.",
    detail: "Challenge 25 bot families, tune strength branches, or stage bot-vs-bot engine exhibitions.",
    href: "/play/engine-lab",
    action: "Open the engine lab",
    icon: IconRobot,
    tone: "accent",
    metric: "65 bot levels",
  },
  {
    eyebrow: "Explore",
    title: "Switch games without switching apps.",
    detail: "Deep strategy, party games, cards, word puzzles and polished arcade classics share one library.",
    href: "/play",
    action: "Browse every game",
    icon: IconGrid,
    tone: "info",
    metric: "73 games",
  },
] as const;

const GAME_SHELF = [
  { name: "Othello", mark: "●○" },
  { name: "Quoridor", mark: "▦" },
  { name: "Word Game", mark: "Aa" },
  { name: "Solitaire", mark: "♠" },
  { name: "Tetris", mark: "▟" },
  { name: "Mancala", mark: "•••" },
];

function parseBoard(rows: string[]): Array<BoardPiece | null> {
  return rows.flatMap((row) =>
    [...row].map((symbol) => {
      if (symbol === ".") return null;
      return {
        t: symbol.toLowerCase() as BoardPiece["t"],
        c: symbol === symbol.toUpperCase() ? "w" : "b",
      };
    }),
  );
}

function HeroBoard() {
  const theme = getTheme("forest");
  const layout = parseBoard([
    "r.bqk..r",
    "pppp.ppp",
    "..n..n..",
    "..b.p...",
    "..B.P...",
    "..N..N..",
    "PPPP.PPP",
    "R.BQ.RK.",
  ]);

  return (
    <div className="home-board-float relative mx-auto w-full min-w-0 max-w-[32rem] select-none lg:mx-0" aria-label="Decorative chess game between Rosa and you" data-motion-reveal>
      <div className="absolute -inset-10 -z-10 rounded-full bg-[var(--accent)]/10 blur-3xl" />
      <div className="motion-card rounded-[1.7rem] border border-[var(--border-strong)] bg-[var(--panel)] p-3 shadow-[var(--shadow)] sm:p-4">
        <div className="mb-3 flex items-center justify-between px-1">
          <div className="flex items-center gap-2.5">
            <BotAvatar tierId="rosa" size={36} rounded="full" />
            <div className="leading-tight">
              <p className="text-sm font-bold">Rosa Marchetti <span aria-hidden="true">🇮🇹</span></p>
              <p className="text-xs text-[var(--text-faint)]">Tactical · 1150</p>
            </div>
          </div>
          <span className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 font-mono text-sm font-bold">04:18</span>
        </div>

        <div className="relative grid aspect-square grid-cols-8 overflow-hidden rounded-xl ring-1 ring-[var(--border-strong)]">
          {layout.map((piece, index) => {
            const row = Math.floor(index / 8);
            const col = index % 8;
            const isLight = (row + col) % 2 === 0;
            const isLastMove = row === 7 && (col === 4 || col === 6);
            return (
              <div key={index} className="relative" style={{ background: isLight ? theme.light : theme.dark }}>
                {isLastMove && <span className="absolute inset-0" style={{ background: theme.lastMove }} />}
                {piece && (
                  <span className="absolute inset-[7%]">
                    <Piece type={piece.t} color={piece.c} set="monarch" />
                  </span>
                )}
                {col === 0 && (
                  <span className="absolute left-1 top-0.5 text-[8px] font-black sm:text-[9px]" style={{ color: isLight ? theme.labelOnLight : theme.labelOnDark }}>
                    {8 - row}
                  </span>
                )}
                {row === 7 && (
                  <span className="absolute bottom-0.5 right-1 text-[8px] font-black sm:text-[9px]" style={{ color: isLight ? theme.labelOnLight : theme.labelOnDark }}>
                    {String.fromCharCode(97 + col)}
                  </span>
                )}
              </div>
            );
          })}
          <span className="home-board-scan absolute inset-y-0 w-24" aria-hidden="true" />
        </div>

        <div className="mt-3 flex items-center justify-between px-1">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-black text-[var(--accent-contrast)]">Y</span>
            <div className="leading-tight">
              <p className="text-sm font-bold">You</p>
              <p className="text-xs text-[var(--text-faint)]">White to move</p>
            </div>
          </div>
          <span className="rounded-lg border border-[var(--accent-dim)] bg-[var(--accent)] px-3 py-1.5 font-mono text-sm font-black text-[var(--accent-contrast)]">04:42</span>
        </div>
      </div>
      <div className="absolute -bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border border-[var(--border-strong)] bg-[var(--bg-elev-2)] px-4 py-2 text-xs font-bold shadow-xl">
        <span className="h-2 w-2 rounded-full bg-[var(--good)] shadow-[0_0_12px_var(--good)]" />
        Original board. Original pieces.
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="overflow-hidden">
      <section className="relative border-b border-[var(--border)]">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_22%_32%,color-mix(in_srgb,var(--accent)_12%,transparent),transparent_30%)]" />
        <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] items-center gap-12 px-4 py-10 md:py-14 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-14 lg:py-16">
          <div className="order-2 min-w-0 lg:order-1">
            <HeroBoard />
          </div>

          <div className="order-1 min-w-0 animate-fade lg:order-2" data-motion-reveal>
            <span className="chip mb-5 !border-[var(--accent)]/25 !bg-[var(--accent)]/10 !text-[var(--accent-strong)]">
              ♜ Your next game starts here
            </span>
            <h1 className="max-w-xl text-5xl font-black leading-[0.98] tracking-[-0.05em] sm:text-6xl">
              Play chess <span className="home-title-accent">your way.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-[var(--text-muted)] sm:text-xl">
              Find a live opponent, challenge a bot with a real personality, or train until the hard moves feel obvious.
            </p>

            <div className="mt-8 grid max-w-xl gap-3 sm:grid-cols-2">
              <Link href="/play/online" className="btn btn-primary btn-cta w-full !justify-between !rounded-xl !px-5">
                <span className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent-contrast)]/10">
                    <IconUsers width={21} height={21} />
                  </span>
                  <span className="text-left">
                    <span className="block text-lg leading-tight">Play Online</span>
                    <span className="block text-xs font-semibold opacity-70">Find a live opponent</span>
                  </span>
                </span>
                <IconChevronRight width={21} height={21} />
              </Link>

              <Link href="/play/bot" className="btn btn-cta w-full !justify-between !rounded-xl !border-[var(--border-strong)] !bg-[var(--bg-elev)] !px-5 hover:!bg-[var(--bg-elev-2)]">
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)]/10 text-[var(--accent)]">
                    <IconRobot width={21} height={21} />
                  </span>
                  <span className="text-left">
                    <span className="block text-lg leading-tight">Play a Bot</span>
                    <span className="block text-xs font-semibold text-[var(--text-faint)]">25 bot families</span>
                  </span>
                </span>
                <span className="hidden shrink-0 -space-x-2 xl:flex" aria-hidden="true">
                  {BOT_PREVIEW.map((tierId) => (
                    <BotAvatar key={tierId} tierId={tierId} size={34} rounded="full" className="ring-2 ring-[var(--bg-elev)]" />
                  ))}
                </span>
              </Link>
            </div>

            <div className="mt-4 grid max-w-xl grid-cols-2 gap-2 sm:grid-cols-4">
              {QUICK_LINKS.map((item) => (
                <Link key={item.href} href={item.href} className="motion-card home-quick-link group flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--panel)] p-3 transition hover:border-[var(--border-strong)] hover:bg-[var(--bg-elev)]">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--bg-elev-2)] text-[var(--accent)]">
                    <item.icon width={18} height={18} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-extrabold">{item.label}</span>
                    <span className="hidden truncate text-xs text-[var(--text-faint)] xl:block">{item.detail}</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <HomeQolRail />

      <section className="mx-auto max-w-6xl px-4 py-12 sm:py-16" data-motion-reveal>
        <div className="mb-8 max-w-2xl">
          <span className="chip mb-4"><IconSparkles width={14} height={14} /> One arcade, three ways in</span>
          <h2 className="text-3xl font-black tracking-[-0.03em] sm:text-4xl">Whatever mood you&apos;re in, there&apos;s a strong next move.</h2>
          <p className="mt-4 text-base leading-7 text-[var(--text-muted)] sm:text-lg">Jump straight into competition, shape a custom challenge, or roam the full games library.</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {PLAYER_PATHS.map((path, index) => (
            <Link key={path.href} href={path.href} className={`home-path-card home-path-${path.tone} motion-card group`}>
              <div className="flex items-start justify-between gap-4">
                <span className="home-path-icon"><path.icon width={23} height={23} /></span>
                <span className="chip !bg-[var(--bg)]/50">{path.metric}</span>
              </div>
              <div className="mt-8">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--path-color)]">0{index + 1} · {path.eyebrow}</p>
                <h3 className="mt-3 text-2xl font-black leading-tight tracking-tight">{path.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">{path.detail}</p>
              </div>
              <span className="mt-7 flex items-center gap-2 text-sm font-black text-[var(--path-color)]">{path.action} <IconChevronRight width={17} height={17} /></span>
              <span className="home-path-orbit" aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>

      <section className="border-y border-[var(--border)] bg-[var(--bg-elev)]/20" data-motion-reveal>
        <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
        <div className="panel overflow-hidden">
          <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-center">
            <div>
              <span className="chip mb-4"><IconGrid width={14} height={14} /> Beyond chess</span>
              <h2 className="text-3xl font-black tracking-tight sm:text-4xl">A whole games shelf lives here.</h2>
              <p className="mt-4 leading-7 text-[var(--text-muted)]">
                Switch from serious strategy to cards, words, puzzles, or a quick arcade run without leaving Sam&apos;s Arcade.
              </p>
              <div className="mt-6 flex items-center gap-5 text-sm font-bold text-[var(--text-muted)]">
                <span><strong className="text-[var(--accent)]">73</strong> games</span>
                <span><strong className="text-[var(--info)]">26</strong> online</span>
                <span><strong className="text-[var(--good)]">2</strong> originals</span>
              </div>
              <Link href="/play" className="btn btn-primary mt-7 !px-5 !py-3 text-base">
                Explore the Games Hub <IconChevronRight width={17} height={17} />
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {GAME_SHELF.map((game, index) => (
                <div key={game.name} className="motion-card flex min-h-32 flex-col justify-between rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--border-strong)]">
                  <span className={`text-2xl font-black ${index % 3 === 0 ? "text-[var(--accent)]" : index % 3 === 1 ? "text-[var(--info)]" : "text-[var(--good)]"}`}>
                    {game.mark}
                  </span>
                  <span className="text-sm font-bold">{game.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:py-10" data-motion-reveal>
        <div className="flex flex-col gap-4 rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <span className="text-xs font-black uppercase tracking-[0.14em] text-[var(--good)]">Latest release</span>
            <h2 className="mt-1 text-xl font-black tracking-tight">Cleaner games, adaptive graphics, better match controls.</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">The full history stays in one compact Patch Notes page.</p>
          </div>
          <Link href="/quality-of-life" className="btn shrink-0 !py-2.5 text-sm">Patch notes <IconChevronRight width={16} height={16} /></Link>
        </div>
      </section>
    </div>
  );
}
