"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  IconChevronRight,
  IconChess,
  IconGrid,
  IconPuzzle,
  IconRobot,
  IconSparkles,
  IconStar,
  IconTraining,
  IconTrophy,
  IconUsers,
} from "@/components/ui/icons";
import styles from "./ChessHome.module.css";

export interface ChessRecentGame {
  id: string;
  opponent: string;
  result: "win" | "loss" | "draw" | "aborted";
  category: string;
  timeControl: string;
  opening: string | null;
  eco: string | null;
  accuracy: number | null;
  ratingDelta: number | null;
  createdAt: string;
}

export interface ChessHomeData {
  signedIn: boolean;
  username: string;
  ratings: { bullet: number; blitz: number; rapid: number; classical: number; puzzle: number };
  stats: {
    totalGames: number;
    reviewedGames: number;
    recentWins: number;
    recentDraws: number;
    recentLosses: number;
    puzzlesThisWeek: number;
    achievements: number;
    friends: number;
  };
  recentGames: ChessRecentGame[];
}

type PlanTaskId = "play" | "puzzles" | "study";

const QUICK_CONTROLS = [
  { id: "1+0", label: "1 min", category: "Bullet", detail: "Pure speed" },
  { id: "3+2", label: "3 | 2", category: "Blitz", detail: "Fast + flexible" },
  { id: "10+0", label: "10 min", category: "Rapid", detail: "Think it through" },
  { id: "15+10", label: "15 | 10", category: "Rapid", detail: "Serious chess" },
] as const;

const RATING_CARDS = [
  { key: "bullet", label: "Bullet", mark: "⚡" },
  { key: "blitz", label: "Blitz", mark: "◆" },
  { key: "rapid", label: "Rapid", mark: "◷" },
  { key: "classical", label: "Classical", mark: "♜" },
  { key: "puzzle", label: "Puzzles", mark: "✦" },
] as const;

const PLAN_TASKS: Array<{ id: PlanTaskId; title: string; detail: string; href: string; action: string }> = [
  { id: "play", title: "Play one focused game", detail: "Choose a pace where you can explain every move.", href: "/play/online?tc=10%2B0", action: "Play rapid" },
  { id: "puzzles", title: "Solve five tactical positions", detail: "Prioritize checks, captures, and forcing threats.", href: "/puzzles", action: "Start puzzles" },
  { id: "study", title: "Review or study for ten minutes", detail: "Turn one mistake or opening line into a reusable lesson.", href: "/training", action: "Choose training" },
];

const TOOL_CARDS = [
  { href: "/play/bot", title: "Play Bots", detail: "25 personalities and 65 strength branches", icon: IconRobot, tone: "accent" },
  { href: "/puzzles", title: "Puzzles", detail: "Daily tactics, rated practice and Puzzle Rush", icon: IconPuzzle, tone: "good" },
  { href: "/training", title: "Lessons & Training", detail: "A structured path from patterns to endgames", icon: IconTraining, tone: "info" },
  { href: "/analysis", title: "Analysis Board", detail: "Review any game, PGN or custom position", icon: IconSparkles, tone: "violet" },
  { href: "/openings", title: "Opening Drills", detail: "Practice theory from either side of the board", icon: IconChess, tone: "accent" },
  { href: "/games", title: "Game Archive", detail: "Filter, favorite, export and batch-review games", icon: IconGrid, tone: "info" },
  { href: "/friends", title: "Friends", detail: "Challenges, presence and head-to-head records", icon: IconUsers, tone: "good" },
  { href: "/play/variants", title: "Chess Variants", detail: "Chess960 and the fantasy Variant Workshop", icon: IconStar, tone: "violet" },
] as const;

const PIECES: Record<number, string> = {
  0: "♜", 1: "♞", 2: "♝", 3: "♛", 4: "♚", 5: "♝", 6: "♞", 7: "♜",
  8: "♟", 9: "♟", 10: "♟", 11: "♟", 13: "♟", 14: "♟", 15: "♟",
  18: "♞", 20: "♟", 27: "♙", 36: "♙", 42: "♘",
  48: "♙", 49: "♙", 50: "♙", 51: "♙", 53: "♙", 54: "♙", 55: "♙",
  56: "♖", 57: "♘", 58: "♗", 59: "♕", 60: "♔", 61: "♗", 63: "♖",
};

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function relativeDate(value: string) {
  const elapsed = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.round(elapsed / 60_000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function MiniBoard() {
  return (
    <div className={styles.miniBoard} role="img" aria-label="Decorative chess position">
      {Array.from({ length: 64 }, (_, index) => (
        <span key={index} className={(Math.floor(index / 8) + index) % 2 === 0 ? styles.lightSquare : styles.darkSquare}>
          {PIECES[index] && <i className={index < 24 ? styles.blackPiece : styles.whitePiece}>{PIECES[index]}</i>}
        </span>
      ))}
      <span className={styles.boardGlow} aria-hidden="true" />
    </div>
  );
}

function QuickPlay({ signedIn }: { signedIn: boolean }) {
  const [control, setControl] = useState<(typeof QUICK_CONTROLS)[number]["id"]>("3+2");
  const [rated, setRated] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const saved = localStorage.getItem("sams.chess.quickControl");
        if (QUICK_CONTROLS.some((item) => item.id === saved)) setControl(saved as typeof control);
        setRated(signedIn && localStorage.getItem("sams.chess.quickRated") === "true");
      } catch {
        // Device storage is optional; the default setup remains fully usable.
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [signedIn]);

  const choose = (id: typeof control) => {
    setControl(id);
    try { localStorage.setItem("sams.chess.quickControl", id); } catch { /* optional */ }
  };
  const toggleRated = () => {
    const next = signedIn && !rated;
    setRated(next);
    try { localStorage.setItem("sams.chess.quickRated", String(next)); } catch { /* optional */ }
  };
  const selected = QUICK_CONTROLS.find((item) => item.id === control) ?? QUICK_CONTROLS[1];
  const playHref = `/play/online?tc=${encodeURIComponent(control)}&rated=${rated}`;

  return (
    <section className={`${styles.quickPlay} motion-card`} aria-labelledby="quick-play-heading">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={styles.eyebrow}>Quick play</p>
          <h2 id="quick-play-heading" className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Choose a clock. Find a game.</h2>
        </div>
        <span className="chip !border-[var(--good)]/30 !bg-[var(--good)]/10 !text-[var(--good)]"><i className="h-2 w-2 rounded-full bg-current" /> Matchmaking ready</span>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Time control">
        {QUICK_CONTROLS.map((item) => {
          const active = control === item.id;
          return (
            <button key={item.id} type="button" role="radio" aria-checked={active} onClick={() => choose(item.id)} className={`${styles.clockChoice} ${active ? styles.clockChoiceActive : ""}`}>
              <span className="text-lg font-black">{item.label}</span>
              <span className="text-[0.65rem] font-black uppercase tracking-wider opacity-70">{item.category}</span>
              <span className="mt-1 text-[0.68rem] opacity-60">{item.detail}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg)]/55 p-3 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black">{selected.label} · {selected.category}</p>
          <p className="text-xs text-[var(--text-faint)]">The full lobby opens with this clock already selected.</p>
        </div>
        <button type="button" onClick={toggleRated} disabled={!signedIn} aria-pressed={rated} className={`${styles.ratedToggle} ${rated ? styles.ratedToggleActive : ""}`} title={signedIn ? "Toggle rated play" : "Sign in to play rated games"}>
          <span className={styles.toggleTrack}><i /></span>
          {rated ? "Rated" : "Casual"}
        </button>
        <Link href={playHref} className="btn btn-primary !justify-between !px-5 !py-3 text-base sm:min-w-44">
          Find a game <IconChevronRight width={18} height={18} />
        </Link>
      </div>
      {!signedIn && <p className="mt-3 text-xs text-[var(--text-faint)]">Guest games are casual. <Link href="/signup" className="font-black text-[var(--accent)] hover:underline">Create a free account</Link> to save ratings and history.</p>}
    </section>
  );
}

function DailyPlan() {
  const [completed, setCompleted] = useState<PlanTaskId[]>([]);
  const key = `sams.chess.plan.${todayKey()}`;

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const parsed = JSON.parse(localStorage.getItem(key) ?? "[]") as PlanTaskId[];
        if (Array.isArray(parsed)) setCompleted(parsed.filter((id) => PLAN_TASKS.some((task) => task.id === id)));
      } catch {
        setCompleted([]);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [key]);

  const toggle = (id: PlanTaskId) => {
    setCompleted((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* optional */ }
      return next;
    });
  };
  const progress = Math.round((completed.length / PLAN_TASKS.length) * 100);

  return (
    <section className="panel overflow-hidden" aria-labelledby="daily-plan-heading">
      <div className="border-b border-[var(--border)] p-5">
        <div className="flex items-start justify-between gap-4">
          <div><p className={styles.eyebrow}>Daily training plan</p><h2 id="daily-plan-heading" className="mt-1 text-xl font-black">Three moves forward</h2></div>
          <span className="font-mono text-xl font-black text-[var(--accent)]">{completed.length}/3</span>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--bg-elev-2)]"><div className={styles.planProgress} style={{ width: `${progress}%` }} /></div>
      </div>
      <div className="divide-y divide-[var(--border)]">
        {PLAN_TASKS.map((task, index) => {
          const done = completed.includes(task.id);
          return (
            <div key={task.id} className={`${styles.planTask} ${done ? styles.planTaskDone : ""}`}>
              <button type="button" onClick={() => toggle(task.id)} className={styles.planCheck} aria-label={`${done ? "Mark incomplete" : "Mark complete"}: ${task.title}`} aria-pressed={done}>{done ? "✓" : index + 1}</button>
              <div className="min-w-0 flex-1"><p className="text-sm font-black">{task.title}</p><p className="mt-0.5 text-xs leading-5 text-[var(--text-faint)]">{task.detail}</p></div>
              <Link href={task.href} className="shrink-0 text-xs font-black text-[var(--accent)] hover:underline">{task.action} →</Link>
            </div>
          );
        })}
      </div>
      {progress === 100 && <p className="border-t border-[var(--good)]/20 bg-[var(--good)]/10 px-5 py-3 text-sm font-black text-[var(--good)]">Daily plan complete. Strong work—come back tomorrow for a fresh set.</p>}
    </section>
  );
}

function coachRecommendation(data: ChessHomeData) {
  const rated = [
    ["bullet", data.ratings.bullet],
    ["blitz", data.ratings.blitz],
    ["rapid", data.ratings.rapid],
  ] as const;
  const lowest = [...rated].sort((a, b) => a[1] - b[1])[0][0];
  if (!data.signedIn) return { title: "Build your first chess baseline", detail: "Play a rapid game, solve five puzzles, then review the position that felt hardest.", href: "/play/online?tc=10%2B0", action: "Play a baseline game" };
  if (data.stats.puzzlesThisWeek < 5) return { title: "Tactics are the fastest win today", detail: `You have solved ${data.stats.puzzlesThisWeek} puzzles this week. A short forcing-move session will sharpen every time control.`, href: "/puzzles", action: "Start a tactics set" };
  if (lowest === "bullet") return { title: "Train fast board recognition", detail: "Your bullet rating trails your longer formats. Coordinate drills and simple tactical patterns will reduce hesitation.", href: "/training/coordinates", action: "Train coordinates" };
  if (lowest === "blitz") return { title: "Stabilize your first ten moves", detail: "Your blitz results will benefit from one dependable opening plan for each color.", href: "/openings", action: "Drill an opening" };
  return { title: "Turn calculation into a repeatable process", detail: "Review a recent rapid game and name the candidate moves you considered before checking the engine.", href: data.recentGames[0] ? `/games/${data.recentGames[0].id}` : "/analysis", action: "Review a game" };
}

function RecentGames({ data }: { data: ChessHomeData }) {
  const reviewTarget = data.recentGames.find((game) => game.accuracy == null) ?? data.recentGames[0];
  return (
    <section className="panel overflow-hidden" aria-labelledby="recent-games-heading">
      <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] p-5">
        <div><p className={styles.eyebrow}>Game review</p><h2 id="recent-games-heading" className="mt-1 text-xl font-black">Recent games</h2></div>
        <Link href="/games" className="text-xs font-black text-[var(--accent)] hover:underline">Open archive →</Link>
      </div>
      {data.recentGames.length ? (
        <div className="divide-y divide-[var(--border)]">
          {data.recentGames.slice(0, 4).map((game) => (
            <Link key={game.id} href={`/games/${game.id}`} className={styles.gameRow}>
              <span className={`${styles.resultBadge} ${styles[`result${game.result[0].toUpperCase()}${game.result.slice(1)}` as keyof typeof styles]}`}>{game.result === "win" ? "W" : game.result === "loss" ? "L" : game.result === "draw" ? "D" : "–"}</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2"><strong className="truncate text-sm">vs {game.opponent}</strong><span className="chip !px-1.5 !py-0.5 !text-[0.58rem] capitalize">{game.category}</span></span>
                <span className="mt-1 block truncate text-xs text-[var(--text-faint)]">{game.eco ? `${game.eco} · ` : ""}{game.opening ?? "Unclassified opening"} · {game.timeControl}</span>
              </span>
              <span className="text-right">
                <span className="block text-xs font-black">{game.accuracy != null ? `${game.accuracy}%` : "Review"}</span>
                <span className={`mt-1 block text-[0.65rem] ${game.ratingDelta != null && game.ratingDelta > 0 ? "text-[var(--good)]" : game.ratingDelta != null && game.ratingDelta < 0 ? "text-[var(--bad)]" : "text-[var(--text-faint)]"}`}>{game.ratingDelta != null ? `${game.ratingDelta > 0 ? "+" : ""}${game.ratingDelta}` : relativeDate(game.createdAt)}</span>
              </span>
            </Link>
          ))}
          {reviewTarget && (
            <Link href={`/games/${reviewTarget.id}`} className="flex items-center justify-between gap-3 bg-[var(--accent)]/8 px-5 py-3 text-sm font-black text-[var(--accent)] hover:bg-[var(--accent)]/12">
              <span>♜ Review {reviewTarget.accuracy == null ? "your latest unanalysed game" : "your latest game"}</span><IconChevronRight width={17} height={17} />
            </Link>
          )}
        </div>
      ) : (
        <div className="p-6 text-center">
          <span className="text-3xl">♟</span><p className="mt-3 font-black">Your game story starts here.</p><p className="mt-1 text-sm text-[var(--text-muted)]">Completed signed-in games will appear with openings, accuracy and rating changes.</p>
          <Link href="/play/online?tc=10%2B0" className="btn btn-primary mt-4">Play your first rapid game</Link>
        </div>
      )}
    </section>
  );
}

export function ChessHome({ data }: { data: ChessHomeData }) {
  const coach = coachRecommendation(data);
  const formTotal = data.stats.recentWins + data.stats.recentDraws + data.stats.recentLosses;
  const bestRating = Math.max(data.ratings.bullet, data.ratings.blitz, data.ratings.rapid, data.ratings.classical);

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-14">
          <div data-motion-reveal>
            <div className="flex flex-wrap items-center gap-2"><span className="chip !border-[var(--accent)]/25 !bg-[var(--accent)]/10 !text-[var(--accent)]">♜ Chess Home</span>{data.signedIn && <span className="chip">Welcome back, {data.username}</span>}</div>
            <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[0.98] tracking-[-0.045em] sm:text-6xl">Play stronger chess, <span className="home-title-accent">one session at a time.</span></h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--text-muted)] sm:text-lg">Your games, ratings, reviews, training plan, openings, bots and chess friends now live in one focused command center.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/play/online" className="btn btn-primary !px-5 !py-3 text-base"><IconUsers width={18} height={18} /> Play online</Link>
              <Link href="/play/bot" className="btn !px-5 !py-3 text-base"><IconRobot width={18} height={18} /> Challenge a bot</Link>
              <Link href="/puzzles" className="btn btn-ghost !px-5 !py-3 text-base"><IconPuzzle width={18} height={18} /> Solve puzzles</Link>
            </div>
          </div>
          <div className={styles.boardStage} data-motion-reveal>
            <MiniBoard />
            <div className={styles.boardCardTop}><span className="h-2 w-2 rounded-full bg-[var(--good)] shadow-[0_0_10px_var(--good)]" /> Live chess ready</div>
            <div className={styles.boardCardBottom}><strong>{bestRating}</strong><span>highest current rating</span></div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:py-10">
        <section className="grid grid-cols-2 gap-2 sm:grid-cols-5" aria-label="Chess ratings">
          {RATING_CARDS.map((rating) => (
            <div key={rating.key} className={`${styles.ratingCard} motion-card`}>
              <span className={styles.ratingMark}>{rating.mark}</span>
              <span><span className="block text-[0.65rem] font-black uppercase tracking-[0.14em] text-[var(--text-faint)]">{rating.label}</span><strong className="mt-1 block font-mono text-xl font-black sm:text-2xl">{data.ratings[rating.key]}</strong></span>
            </div>
          ))}
        </section>

        <div className="mt-5"><QuickPlay signedIn={data.signedIn} /></div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <DailyPlan />
          <section className={`${styles.coachCard} motion-card`} aria-labelledby="coach-heading">
            <div className="flex items-center justify-between gap-4"><span className={styles.coachAvatar}>S</span><span className="chip !border-[var(--info)]/25 !bg-[var(--info)]/10 !text-[var(--info)]">Personalized from your activity</span></div>
            <p className={`${styles.eyebrow} mt-8`}>Sam Coach recommends</p>
            <h2 id="coach-heading" className="mt-2 text-2xl font-black tracking-tight">{coach.title}</h2>
            <p className="mt-3 leading-7 text-[var(--text-muted)]">{coach.detail}</p>
            <Link href={coach.href} className="btn btn-primary mt-6 !px-5 !py-3">{coach.action} <IconChevronRight width={17} height={17} /></Link>
          </section>
        </div>

        <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Chess progress snapshot">
          <div className={styles.statCard}><span className="text-[var(--good)]">{data.stats.recentWins}W</span><small>{data.stats.recentDraws} draws · {data.stats.recentLosses} losses in recent form</small><div className={styles.formDots} aria-label={`${formTotal} recent results`}>{Array.from({ length: Math.max(formTotal, 1) }, (_, index) => <i key={index} className={index < data.stats.recentWins ? styles.formWin : index < data.stats.recentWins + data.stats.recentDraws ? styles.formDraw : styles.formLoss} />)}</div></div>
          <div className={styles.statCard}><span>{data.stats.totalGames}</span><small>saved chess games</small><Link href="/games">Browse archive →</Link></div>
          <div className={styles.statCard}><span>{data.stats.puzzlesThisWeek}</span><small>puzzles solved this week</small><Link href="/puzzles">Build the streak →</Link></div>
          <div className={styles.statCard}><span>{data.stats.reviewedGames}</span><small>engine-reviewed games · {data.stats.achievements} achievements</small><Link href="/games">Review another →</Link></div>
        </section>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <RecentGames data={data} />
          <section className="panel overflow-hidden" aria-labelledby="community-heading">
            <div className="border-b border-[var(--border)] p-5"><p className={styles.eyebrow}>Chess community</p><h2 id="community-heading" className="mt-1 text-xl font-black">Better with familiar rivals</h2></div>
            <div className="p-5">
              <div className={styles.friendCount}><span><IconUsers width={23} height={23} /></span><div><strong>{data.stats.friends}</strong><small>connected chess friends</small></div></div>
              <p className="mt-4 text-sm leading-6 text-[var(--text-muted)]">See who is online, send a challenge, compare head-to-head results, or find another player.</p>
              <div className="mt-5 grid grid-cols-2 gap-2"><Link href="/friends" className="btn btn-primary">Open friends</Link><Link href="/leaderboard" className="btn"><IconTrophy width={16} height={16} /> Leaderboard</Link></div>
            </div>
          </section>
        </div>

        <section className="mt-12" data-motion-reveal>
          <div className="mb-6 max-w-2xl"><p className={styles.eyebrow}>Complete chess toolkit</p><h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Everything connects back to your board.</h2><p className="mt-3 leading-7 text-[var(--text-muted)]">Move from play to review, from review to training, and from training straight back into a stronger game.</p></div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {TOOL_CARDS.map((tool) => (
              <Link key={tool.href} href={tool.href} className={`${styles.toolCard} ${styles[`tone${tool.tone[0].toUpperCase()}${tool.tone.slice(1)}` as keyof typeof styles]} motion-card`}>
                <span className={styles.toolIcon}><tool.icon width={21} height={21} /></span><h3 className="mt-8 text-lg font-black">{tool.title}</h3><p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{tool.detail}</p><span className="mt-auto pt-6 text-sm font-black text-[var(--tool-color)]">Open <IconChevronRight width={15} height={15} /></span>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
