import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma, isDbConfigured } from "@/lib/db/prisma";
import { ProfileRatings } from "@/components/profile/ProfileRatings";
import { UnifiedGameStats } from "@/components/profile/UnifiedGameStats";
import { ReportButton } from "@/components/profile/ReportButton";
import { FriendButton } from "@/components/profile/FriendButton";
import { DbNotice } from "@/components/ui/DbNotice";
import { auth } from "@/lib/auth/auth";
import { ACHIEVEMENT_BY_ID } from "@/lib/achievements/catalog";
import { AchievementsSection } from "@/components/profile/AchievementsSection";
import { fetchUserRank } from "@/lib/leaderboard/query";
import { ModStatsCard } from "@/components/profile/ModStatsCard";
import { computeHeadToHead } from "@/lib/db/headToHead";
import { computeStatsComparison } from "@/lib/db/compareStats";
import { StatsCompareCard } from "@/components/profile/StatsCompareCard";
import { computeProfileExtras } from "@/lib/db/profileStats";
import { computeActivityFeed } from "@/lib/db/activityFeed";
import { ActivityFeed } from "@/components/profile/ActivityFeed";
import { ProfileBreakdowns } from "@/components/profile/ProfileBreakdowns";
import { RecentGamesList } from "@/components/profile/RecentGamesList";
import { PresenceBadge } from "@/components/profile/PresenceBadge";
import { ActivityHeatmap } from "@/components/profile/ActivityHeatmap";
import { HIGHER_IS_BETTER_GAMES, LOWER_IS_BETTER_GAMES } from "@/lib/games/scoreDirection";
import { computeArcadeSummary } from "@/lib/db/arcadeSummary";
import { ArcadeSummaryCard } from "@/components/profile/ArcadeSummaryCard";

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
      bio: true,
      bannerColor: true,
      pinnedAchievementId: true,
      profilePublic: true,
    },
  });
  if (!user) notFound();

  const session = await auth();
  const canReport = session?.user?.id && session.user.id !== user.id;
  const isOwnProfile = session?.user?.id === user.id;

  const friendship =
    session?.user?.id && !isOwnProfile
      ? await prisma.friendship.findFirst({
          where: {
            OR: [
              { requesterId: session.user.id, addresseeId: user.id },
              { requesterId: user.id, addresseeId: session.user.id },
            ],
          },
          select: { id: true, status: true, requesterId: true },
        })
      : null;
  const friendState: "none" | "outgoing" | "incoming" | "friends" = !friendship
    ? "none"
    : friendship.status === "ACCEPTED"
      ? "friends"
      : friendship.status === "PENDING"
        ? friendship.requesterId === session?.user?.id
          ? "outgoing"
          : "incoming"
        : "none"; // BLOCKED — no UI exposes this state today, treat as no relationship

  // Private profiles show only a minimal stub to non-friends — the owner and accepted friends always see everything.
  const canViewFullProfile = isOwnProfile || user.profilePublic || friendState === "friends";
  if (!canViewFullProfile) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent)] text-2xl font-black text-[var(--accent-contrast)]">
            {(user.username ?? "?")[0]?.toUpperCase()}
          </span>
          <div>
            <h1 className="text-2xl font-bold">{user.username}</h1>
            <p className="text-sm text-[var(--text-muted)]">This profile is private.</p>
          </div>
          {canReport && (
            <div className="ml-auto">
              <FriendButton username={user.username!} initialState={friendState} initialFriendshipId={friendship?.id ?? null} />
            </div>
          )}
        </div>
      </div>
    );
  }

  const orFilter = [{ whiteId: user.id }, { blackId: user.id }];
  const viewerId = session?.user?.id;
  const [wins, losses, draws, history, gameRatings, higherScores, lowerScores, wordStats, earnedAchievements, streakGames, myRank, headToHead, statsComparison, profileExtras, achievementCounts, totalUsers, activityFeed, arcadeSummary] = await Promise.all([
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
    prisma.userAchievement.findMany({ where: { userId: user.id }, select: { achievementId: true, earnedAt: true } }),
    prisma.game.findMany({
      where: { OR: orFilter, NOT: { result: "ABORTED" } },
      orderBy: { createdAt: "asc" },
      select: { result: true, whiteId: true },
    }),
    isOwnProfile ? fetchUserRank({ field: "ratingBlitz", period: "all", userId: user.id }) : Promise.resolve(null),
    viewerId && !isOwnProfile ? computeHeadToHead(viewerId, user.id) : Promise.resolve(null),
    viewerId && !isOwnProfile ? computeStatsComparison(viewerId, user.id) : Promise.resolve(null),
    computeProfileExtras(user.id),
    prisma.userAchievement.groupBy({ by: ["achievementId"], _count: true }),
    prisma.user.count(),
    computeActivityFeed(user.id),
    computeArcadeSummary(user.id),
  ]);
  const achievementRarity = new Map(achievementCounts.map((a) => [a.achievementId, totalUsers > 0 ? Math.round((a._count / totalUsers) * 100) : 0]));

  let currentStreak = 0;
  let bestStreak = 0;
  {
    let running = 0;
    for (const g of streakGames) {
      const isWhite = g.whiteId === user.id;
      const won = (g.result === "WHITE_WINS") === isWhite;
      if (won) {
        running++;
        bestStreak = Math.max(bestStreak, running);
      } else {
        running = 0;
      }
    }
    currentStreak = running;
  }

  const highScores = [
    ...higherScores.map((h) => ({ game: h.game, level: null, score: h._max.score ?? 0 })),
    ...lowerScores.map((h) => ({ game: h.game, level: h.level, score: h._min.score ?? 0 })),
  ];

  const total = wins + losses + draws;
  const initial = (user.username ?? "?")[0]?.toUpperCase();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div
        className="flex items-center gap-4 rounded-2xl p-3"
        style={user.bannerColor ? { background: `${user.bannerColor}22` } : undefined}
      >
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent)] text-2xl font-black text-[var(--accent-contrast)]">
          {initial}
        </span>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{user.username}</h1>
            {user.pinnedAchievementId &&
              earnedAchievements.some((a) => a.achievementId === user.pinnedAchievementId) &&
              ACHIEVEMENT_BY_ID[user.pinnedAchievementId] && (
                <span
                  className="chip !px-2 !py-0.5 text-xs"
                  title={ACHIEVEMENT_BY_ID[user.pinnedAchievementId].description}
                >
                  {ACHIEVEMENT_BY_ID[user.pinnedAchievementId].icon} {ACHIEVEMENT_BY_ID[user.pinnedAchievementId].name}
                </span>
              )}
          </div>
          <p className="text-sm text-[var(--text-muted)]">
            Joined{" "}
            {user.createdAt.toLocaleDateString(undefined, { year: "numeric", month: "long" })}
          </p>
          {user.bio && <p className="mt-1 max-w-md text-sm text-[var(--text)]">{user.bio}</p>}
          {!isOwnProfile && <div className="mt-1"><PresenceBadge userId={user.id} /></div>}
        </div>
        <div className="ml-auto flex flex-col items-end gap-2">
          {isOwnProfile && myRank && (
            <span className="chip !px-2.5 !py-1 text-xs">
              #{myRank.rank} Blitz · {myRank.value}
            </span>
          )}
          <Link href={`/games?user=${user.username}`} className="btn">
            Game history
          </Link>
          {canReport && (
            <>
              <FriendButton username={user.username!} initialState={friendState} initialFriendshipId={friendship?.id ?? null} />
              <ReportButton username={user.username!} />
            </>
          )}
        </div>
      </div>

      {headToHead && headToHead.wins + headToHead.losses + headToHead.draws > 0 && (
        <div id="head-to-head" className="mt-4 flex items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-elev)] px-3 py-2 text-sm">
          <span className="text-[var(--text-muted)]">Your record vs {user.username}:</span>
          <span className="font-semibold">
            <span style={{ color: "var(--good)" }}>{headToHead.wins}W</span>{" "}
            <span style={{ color: "var(--bad)" }}>{headToHead.losses}L</span>{" "}
            <span style={{ color: "var(--text-muted)" }}>{headToHead.draws}D</span>
          </span>
        </div>
      )}

      {statsComparison && <StatsCompareCard comparison={statsComparison} />}

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Wins" value={wins} accent="var(--good)" />
        <Stat label="Losses" value={losses} accent="var(--bad)" />
        <Stat label="Draws" value={draws} accent="var(--text-muted)" />
      </div>
      {total > 0 && (
        <>
          <p className="mt-2 text-center text-sm text-[var(--text-muted)]">
            {total} games · {Math.round((wins / total) * 100)}% win rate
          </p>
          <WinLossDrawBar wins={wins} losses={losses} draws={draws} />
          <div className="mt-3 flex justify-center gap-6 text-center text-sm">
            <div>
              <div className="text-xl font-black text-[var(--accent)]">{currentStreak}</div>
              <div className="label mt-0.5">Current streak</div>
            </div>
            <div>
              <div className="text-xl font-black text-[var(--accent)]">{bestStreak}</div>
              <div className="label mt-0.5">Best streak</div>
            </div>
            {profileExtras.partialTimePlayedMs > 0 && (
              <div>
                <div className="text-xl font-black text-[var(--accent)]">
                  {formatDuration(profileExtras.partialTimePlayedMs)}
                </div>
                <div className="label mt-0.5" title="Bot and local pass-and-play games only — online games aren't tracked yet.">
                  Time played*
                </div>
              </div>
            )}
          </div>
        </>
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

      <ArcadeSummaryCard summary={arcadeSummary} />
      <UnifiedGameStats gameRatings={gameRatings} highScores={highScores} wordStats={wordStats} />

      {total > 0 && (
        <>
          <ProfileBreakdowns
            colorStats={profileExtras.colorStats}
            categoryStats={profileExtras.categoryStats}
            terminationStats={profileExtras.terminationStats}
            longestGame={profileExtras.longestGame}
            fastestCheckmate={profileExtras.fastestCheckmate}
            openingsReport={profileExtras.openingsReport}
            records={profileExtras.records}
            bestWin={profileExtras.bestWin}
            toughestLoss={profileExtras.toughestLoss}
            opponentsTable={profileExtras.opponentsTable}
            botRecords={profileExtras.botRecords}
          />
          <RecentGamesList games={profileExtras.recentGames} username={user.username ?? ""} />
          <ActivityHeatmap days={profileExtras.activityHeatmap} />
          <ActivityFeed events={activityFeed} />
        </>
      )}

      <ModStatsCard username={user.username ?? ""} />

      <AchievementsSection earned={earnedAchievements} rarity={achievementRarity} username={user.username ?? ""} />
    </div>
  );
}

function formatDuration(ms: number): string {
  const totalMinutes = Math.round(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
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

function WinLossDrawBar({ wins, losses, draws }: { wins: number; losses: number; draws: number }) {
  const total = wins + losses + draws;
  if (total === 0) return null;
  const wPct = (wins / total) * 100;
  const lPct = (losses / total) * 100;
  const dPct = (draws / total) * 100;
  return (
    <div className="mt-4 flex h-2.5 w-full overflow-hidden rounded-full bg-[var(--bg-elev)]">
      {wPct > 0 && <div style={{ width: `${wPct}%`, background: "var(--good)" }} title={`${wins} wins`} />}
      {dPct > 0 && <div style={{ width: `${dPct}%`, background: "var(--text-faint)" }} title={`${draws} draws`} />}
      {lPct > 0 && <div style={{ width: `${lPct}%`, background: "var(--bad)" }} title={`${losses} losses`} />}
    </div>
  );
}
