import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma, isDbConfigured } from "@/lib/db/prisma";
import { ProfileRatings } from "@/components/profile/ProfileRatings";
import { UnifiedGameStats } from "@/components/profile/UnifiedGameStats";
import { ReportButton } from "@/components/profile/ReportButton";
import { DbNotice } from "@/components/ui/DbNotice";
import { auth } from "@/lib/auth/auth";

const HIGHER_IS_BETTER_GAMES = [
  "snake",
  "tetris",
  "2048",
  "simon",
  "breakout",
  "whackamole",
  "blackjack",
  "yahtzee",
  "hangman",
  "flappyrook",
  "videopoker",
  "pong",
  "spaceinvaders",
  "blockpuzzle",
  "match3",
  "asteroids",
  "frogger",
  "roulette",
  "baccarat",
  "craps",
  "slots",
  "rps",
  "farkle",
];
const LOWER_IS_BETTER_GAMES = [
  "racing",
  "platformer",
  "minesweeper",
  "memorymatch",
  "15puzzle",
  "sudoku",
  "solitaire",
  "freecell",
  "klotski",
  "pegsolitaire",
  "lightsout",
  "hanoi",
  "mastermind",
  "battleship",
  "war",
  "pyramidsolitaire",
  "sokoban",
  "floodit",
  "spidersolitaire",
  "wordsearch",
];

export const dynamic = "force-dynamic";

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;

  if (!isDbConfigured) return <DbNotice />;

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      name: true,
      image: true,
      createdAt: true,
      ratingBullet: true,
      ratingBlitz: true,
      ratingRapid: true,
      ratingClassical: true,
      puzzleRating: true,
    },
  });
  if (!user) notFound();

  const session = await auth();
  const canReport = session?.user?.id && session.user.id !== user.id;

  const orFilter = [{ whiteId: user.id }, { blackId: user.id }];
  const [wins, losses, draws, history, gameRatings, higherScores, lowerScores, wordStats] = await Promise.all([
    prisma.game.count({
      where: {
        OR: [
          { whiteId: user.id, result: "WHITE_WINS" },
          { blackId: user.id, result: "BLACK_WINS" },
        ],
      },
    }),
    prisma.game.count({
      where: {
        OR: [
          { whiteId: user.id, result: "BLACK_WINS" },
          { blackId: user.id, result: "WHITE_WINS" },
        ],
      },
    }),
    prisma.game.count({ where: { OR: orFilter, result: "DRAW" } }),
    prisma.ratingHistory.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
      select: { category: true, rating: true, createdAt: true },
    }),
    prisma.gameRating.findMany({
      where: { userId: user.id },
      select: { game: true, rating: true, wins: true, losses: true, draws: true },
    }),
    // Snake/Tetris/2048: higher score is better.
    prisma.highScore.groupBy({
      by: ["game"],
      where: { userId: user.id, game: { in: HIGHER_IS_BETTER_GAMES } },
      _max: { score: true },
    }),
    // Racing/platformer: lower time is better, and platformer is per-level.
    prisma.highScore.groupBy({
      by: ["game", "level"],
      where: { userId: user.id, game: { in: LOWER_IS_BETTER_GAMES } },
      _min: { score: true },
    }),
    prisma.wordGameStats.findUnique({ where: { userId: user.id } }),
  ]);

  const highScores = [
    ...higherScores.map((h) => ({ game: h.game, level: null, score: h._max.score ?? 0 })),
    ...lowerScores.map((h) => ({ game: h.game, level: h.level, score: h._min.score ?? 0 })),
  ];

  const total = wins + losses + draws;
  const initial = (user.username ?? "?")[0]?.toUpperCase();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center gap-4">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent)] text-2xl font-black text-[var(--accent-contrast)]">
          {initial}
        </span>
        <div>
          <h1 className="text-2xl font-bold">{user.username}</h1>
          <p className="text-sm text-[var(--text-muted)]">
            Joined{" "}
            {user.createdAt.toLocaleDateString(undefined, { year: "numeric", month: "long" })}
          </p>
        </div>
        <div className="ml-auto flex flex-col items-end gap-2">
          <Link href={`/games?user=${user.username}`} className="btn">
            Game history
          </Link>
          {canReport && <ReportButton username={user.username!} />}
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Wins" value={wins} accent="var(--good)" />
        <Stat label="Losses" value={losses} accent="var(--bad)" />
        <Stat label="Draws" value={draws} accent="var(--text-muted)" />
      </div>
      {total > 0 && (
        <p className="mt-2 text-center text-sm text-[var(--text-muted)]">
          {total} games · {Math.round((wins / total) * 100)}% win rate
        </p>
      )}

      <ProfileRatings
        ratings={{
          bullet: user.ratingBullet,
          blitz: user.ratingBlitz,
          rapid: user.ratingRapid,
          classical: user.ratingClassical,
          puzzle: user.puzzleRating,
        }}
        history={history.map((h) => ({ category: h.category, rating: h.rating }))}
      />

      <UnifiedGameStats gameRatings={gameRatings} highScores={highScores} wordStats={wordStats} />
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="panel p-4 text-center">
      <div className="text-3xl font-black" style={{ color: accent }}>
        {value}
      </div>
      <div className="label mt-1">{label}</div>
    </div>
  );
}
