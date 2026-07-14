// Optional persistence: if DATABASE_URL is set AND @prisma/client is
// resolvable, finished rated games are stored and ratings updated. Otherwise
// the server runs fully in-memory (games just aren't saved).
//
// To enable: install @prisma/client in this package (or hoist from the root)
// and `prisma generate` against ../prisma/schema.prisma.

import { createRequire } from "node:module";

import { updateElo } from "./elo.js";
import type { GameRoom } from "./GameRoom.js";
import { OWNER_EMAIL } from "./ownerAccount.js";

type PrismaLike = {
  user: {
    findUnique: (a: unknown) => Promise<{ [k: string]: unknown } | null>;
    findMany: (a: unknown) => Promise<{ [k: string]: unknown }[]>;
    update: (a: unknown) => Promise<unknown>;
  };
  friendship?: { findMany: (a: unknown) => Promise<{ [k: string]: unknown }[]> };
  notification?: { create: (a: unknown) => Promise<unknown> };
  game: {
    create: (a: unknown) => Promise<{ id: string }>;
    count: (a: unknown) => Promise<number>;
    findMany: (a: unknown) => Promise<{ [k: string]: unknown }[]>;
  };
  ratingHistory: { create: (a: unknown) => Promise<unknown> };
  appConfig: { findUnique: (a: unknown) => Promise<{ key: string; value: string } | null> };
  report?: { create: (a: unknown) => Promise<unknown> };
  adminAuditLog?: { create: (a: unknown) => Promise<unknown> };
  userAchievement?: {
    findMany: (a: unknown) => Promise<{ achievementId: string }[]>;
    createMany: (a: unknown) => Promise<unknown>;
  };
};

let prisma: PrismaLike | null = null;
let enabled = false;

export async function initPersistence(): Promise<boolean> {
  if (!process.env.DATABASE_URL) {
    console.log("[persistence] DATABASE_URL not set — games will not be saved.");
    return false;
  }
  try {
    // Indirect specifier so TypeScript treats @prisma/client as an OPTIONAL
    // runtime dependency — the server builds and runs without it installed
    // (persistence simply stays disabled). A literal import() would make tsc
    // require the package at build time.
    const specifier: string = "@prisma/client";
    let mod: { PrismaClient: new () => PrismaLike };
    try {
      mod = (await import(specifier)) as { PrismaClient: new () => PrismaLike };
    } catch {
      // The shared schema lives at /prisma. On Render, `prisma generate`
      // therefore places the generated client in the repository-root
      // node_modules even though this server has its own package directory.
      // Resolve from the root as a production-safe fallback.
      const requireFromRoot = createRequire(new URL("../../package.json", import.meta.url));
      mod = requireFromRoot(specifier) as { PrismaClient: new () => PrismaLike };
    }
    const PrismaClient = mod.PrismaClient;
    prisma = new PrismaClient();
    enabled = true;
    console.log("[persistence] Prisma connected — rated games will be saved.");
    return true;
  } catch (e) {
    console.warn("[persistence] @prisma/client not available; persistence disabled.", (e as Error).message);
    return false;
  }
}

/** Shared client accessor so other modules (boardgames/persistence.ts) reuse
 *  this same connection instead of opening a second one. */
export function getPrisma(): PrismaLike | null {
  return enabled ? prisma : null;
}

/** Look up a real user's moderation state (ban/mute/in-game-moderator). Guests are never moderated or moderators. */
export async function getUserModeration(
  userId: string,
): Promise<{ banned: boolean; muted: boolean; isModerator: boolean; isOwner: boolean }> {
  if (!enabled || !prisma || userId.startsWith("guest:") || userId.startsWith("spectator:")) {
    return { banned: false, muted: false, isModerator: false, isOwner: false };
  }
  try {
    const u = (await prisma.user.findUnique({
      where: { id: userId },
      select: { status: true, bannedUntil: true, mutedUntil: true, isModerator: true, email: true },
    })) as {
      status?: string;
      bannedUntil?: string | Date | null;
      mutedUntil?: string | Date | null;
      isModerator?: boolean;
      email?: string | null;
    } | null;
    if (!u) return { banned: false, muted: false, isModerator: false, isOwner: false };
    const now = Date.now();
    const bUntil = u.bannedUntil ? new Date(u.bannedUntil).getTime() : null;
    const mUntil = u.mutedUntil ? new Date(u.mutedUntil).getTime() : null;
    const banned = (u.status === "BANNED" || u.status === "SUSPENDED") && (bUntil === null || bUntil > now);
    const muted = u.status === "MUTED" && (mUntil === null || mUntil > now);
    const isOwner = (u.email ?? "").toLowerCase() === OWNER_EMAIL.toLowerCase();
    return { banned, muted, isModerator: Boolean(u.isModerator), isOwner };
  } catch {
    return { banned: false, muted: false, isModerator: false, isOwner: false };
  }
}

/**
 * Filters a list of real (non-guest) userIds down to those who haven't
 * hidden their online status. Guests always pass through — they have no
 * User row / privacy setting to check. Fails open (returns everyone) if
 * persistence is disabled or the query errors, so presence never silently
 * breaks when the DB is unavailable.
 */
export async function filterVisibleUserIds(userIds: string[]): Promise<Set<string>> {
  const real = userIds.filter((id) => !id.startsWith("guest:") && !id.startsWith("spectator:"));
  const guests = userIds.filter((id) => id.startsWith("guest:") || id.startsWith("spectator:"));
  if (!enabled || !prisma || real.length === 0) return new Set(userIds);
  try {
    const rows = (await prisma.user.findMany({
      where: { id: { in: real } },
      select: { id: true, showOnlineStatus: true },
    })) as { id: string; showOnlineStatus?: boolean }[];
    const visible = rows.filter((r) => r.showOnlineStatus !== false).map((r) => r.id);
    return new Set([...visible, ...guests]);
  } catch {
    return new Set(userIds);
  }
}

/** Accepted-friend userIds for a real user, respecting nothing privacy-wise (this is for the OWNER of the friend list, not a third party). Guests have no friends. */
export async function getAcceptedFriendIds(userId: string): Promise<string[]> {
  if (!enabled || !prisma || !prisma.friendship || userId.startsWith("guest:") || userId.startsWith("spectator:")) return [];
  try {
    const rows = (await prisma.friendship.findMany({
      where: { status: "ACCEPTED", OR: [{ requesterId: userId }, { addresseeId: userId }] },
      select: { requesterId: true, addresseeId: true },
    })) as { requesterId: string; addresseeId: string }[];
    return rows.map((r) => (r.requesterId === userId ? r.addresseeId : r.requesterId));
  } catch {
    return [];
  }
}

/**
 * Writes a "Friend online" Notification row to each accepted friend who has
 * opted into it. Best-effort — caller decides when a fresh online transition
 * happened (this itself doesn't debounce). Skips entirely if the newly-online
 * user has hidden their own online status.
 */
export async function notifyFriendsOnline(userId: string, username: string): Promise<void> {
  if (!enabled || !prisma || !prisma.friendship || !prisma.notification || userId.startsWith("guest:") || userId.startsWith("spectator:")) return;
  try {
    const me = (await prisma.user.findUnique({ where: { id: userId }, select: { showOnlineStatus: true } })) as { showOnlineStatus?: boolean } | null;
    if (me?.showOnlineStatus === false) return;

    const friendIds = await getAcceptedFriendIds(userId);
    if (friendIds.length === 0) return;

    const recipients = (await prisma.user.findMany({
      where: { id: { in: friendIds }, notifyFriendOnline: true },
      select: { id: true },
    })) as { id: string }[];

    for (const r of recipients) {
      await prisma.notification.create({
        data: { userId: r.id, title: "Friend online", body: `${username} just came online.`, type: "FRIEND_ONLINE", href: "/friends" },
      });
    }
  } catch (e) {
    console.error("[persistence] failed to notify friends of online status", (e as Error).message);
  }
}

/**
 * Writes a "Game result" Notification row to a real (non-guest) player,
 * gated by their notifyGameResults preference. Best-effort — never throws.
 */
async function notifyGameResult(params: {
  userId: string;
  gameId: string;
  outcome: "won" | "lost" | "drew";
  category: string;
  opponentName: string;
  termination: string;
}): Promise<void> {
  if (!enabled || !prisma || !prisma.notification || params.userId.startsWith("guest:")) return;
  try {
    const user = (await prisma.user.findUnique({ where: { id: params.userId }, select: { notifyGameResults: true } })) as {
      notifyGameResults?: boolean;
    } | null;
    if (!user?.notifyGameResults) return;
    const title = params.outcome === "won" ? "Victory!" : params.outcome === "lost" ? "Defeat" : "Draw";
    await prisma.notification.create({
      data: {
        userId: params.userId,
        title,
        body: `You ${params.outcome} your rated ${params.category} game against ${params.opponentName} (${params.termination}).`,
        type: "GAME_RESULT",
        href: `/games/${params.gameId}`,
      },
    });
  } catch (e) {
    console.error("[persistence] failed to write game-result notification", (e as Error).message);
  }
}

/** Append to the shared AdminAuditLog table (best-effort, never throws). */
export async function auditAdminAction(
  action: string,
  targetType?: string,
  targetId?: string,
  detail?: Record<string, unknown>,
): Promise<void> {
  if (!enabled || !prisma?.adminAuditLog) return;
  try {
    await prisma.adminAuditLog.create({
      data: { actor: "admin", action, targetType: targetType ?? null, targetId: targetId ?? null, detail: detail ?? null },
    });
  } catch (e) {
    console.error("[persistence] failed to write admin audit log", (e as Error).message);
  }
}

/** Auto-generated report surfaced in the same queue as player-filed reports. */
export async function fileAutomatedReport(reportedId: string, reason: string, detail: string): Promise<void> {
  if (!enabled || !prisma?.report || reportedId.startsWith("guest:")) return;
  try {
    await prisma.report.create({ data: { reporterId: null, reportedId, reason, detail } });
  } catch (e) {
    console.error("[persistence] failed to file automated report", (e as Error).message);
  }
}

const FIELD: Record<string, string> = {
  bullet: "ratingBullet",
  blitz: "ratingBlitz",
  rapid: "ratingRapid",
  classical: "ratingClassical",
};

const RESULT_ENUM: Record<string, string> = {
  "1-0": "WHITE_WINS",
  "0-1": "BLACK_WINS",
  "1/2-1/2": "DRAW",
};

/** Name/description/icon for the achievement ids awardable from this file. Mirrors src/lib/achievements/catalog.ts (not imported — this package's tsconfig rootDir is scoped to server/src). */
const ACHIEVEMENT_CATALOG: Record<string, { name: string; description: string; icon: string }> = {
  first_game: { name: "First Steps", description: "Play your first game", icon: "🎬" },
  first_win: { name: "First Blood", description: "Win your first game", icon: "🏆" },
  ten_games: { name: "Regular", description: "Play 10 games", icon: "📈" },
  fifty_games: { name: "Veteran", description: "Play 50 games", icon: "🎖️" },
  win_streak_3: { name: "On a Roll", description: "Win 3 games in a row", icon: "🔥" },
  win_streak_5: { name: "Unstoppable", description: "Win 5 games in a row", icon: "⚡" },
  checkmate_win: { name: "Checkmate!", description: "Win a game by checkmate", icon: "♚" },
  first_draw: { name: "Stalemate Sage", description: "Draw a game", icon: "🤝" },
  bullet_win: { name: "Speed Demon", description: "Win a rated bullet game", icon: "🚀" },
  blitz_win: { name: "Blitz Master", description: "Win a rated blitz game", icon: "💨" },
  rapid_win: { name: "Rapid Fire", description: "Win a rated rapid game", icon: "🎯" },
  classical_win: { name: "Grandmaster's Patience", description: "Win a rated classical game", icon: "🏛️" },
  rating_1200: { name: "Club Player", description: "Reach a 1200 rating in any category", icon: "🥉" },
  rating_1400: { name: "Rising Star", description: "Reach a 1400 rating in any category", icon: "🥈" },
  rating_1600: { name: "Sharp Tactician", description: "Reach a 1600 rating in any category", icon: "🥇" },
  rating_1800: { name: "Expert", description: "Reach an 1800 rating in any category", icon: "💎" },
  rating_2000: { name: "Master Class", description: "Reach a 2000 rating in any category", icon: "👑" },
};

const RATING_MILESTONES: { threshold: number; id: string }[] = [
  { threshold: 1200, id: "rating_1200" },
  { threshold: 1400, id: "rating_1400" },
  { threshold: 1600, id: "rating_1600" },
  { threshold: 1800, id: "rating_1800" },
  { threshold: 2000, id: "rating_2000" },
];

/** Checks the just-saved game against the achievement rules and awards any newly-earned ones (idempotent). Mirrors src/lib/achievements/award.ts on the Next.js side. */
async function checkAndAwardAchievements(params: {
  userId: string;
  color: "w" | "b";
  result: string;
  category: string;
  rated: boolean;
  termination: string;
  ratingBefore?: number;
  ratingAfter?: number;
}): Promise<string[]> {
  if (!prisma?.userAchievement || params.userId.startsWith("guest:")) return [];
  const { userId, color, result, category, rated, termination } = params;
  const won = (result === "WHITE_WINS") === (color === "w");
  const drew = result === "DRAW";

  const totalGames = await prisma.game.count({
    where: { OR: [{ whiteId: userId }, { blackId: userId }], NOT: { result: "ABORTED" } },
  });

  const toAward: string[] = [];
  if (totalGames >= 1) toAward.push("first_game");
  if (totalGames >= 10) toAward.push("ten_games");
  if (totalGames >= 50) toAward.push("fifty_games");

  if (won) {
    toAward.push("first_win");
    if (termination === "Checkmate") toAward.push("checkmate_win");
    if (rated) {
      if (category === "bullet") toAward.push("bullet_win");
      if (category === "blitz") toAward.push("blitz_win");
      if (category === "rapid") toAward.push("rapid_win");
      if (category === "classical") toAward.push("classical_win");
    }
    const recent = (await prisma.game.findMany({
      where: { OR: [{ whiteId: userId }, { blackId: userId }], NOT: { result: "ABORTED" } },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { result: true, whiteId: true },
    })) as { result: string; whiteId: string | null }[];
    let streak = 0;
    for (const g of recent) {
      const isWhite = g.whiteId === userId;
      const gWon = (g.result === "WHITE_WINS") === isWhite;
      if (gWon) streak++;
      else break;
    }
    if (streak >= 3) toAward.push("win_streak_3");
    if (streak >= 5) toAward.push("win_streak_5");
  }
  if (drew) toAward.push("first_draw");
  if (params.ratingBefore != null && params.ratingAfter != null) {
    for (const m of RATING_MILESTONES) {
      if (params.ratingBefore < m.threshold && params.ratingAfter >= m.threshold) toAward.push(m.id);
    }
  }
  if (toAward.length === 0) return [];

  const existing = await prisma.userAchievement.findMany({
    where: { userId, achievementId: { in: toAward } },
    select: { achievementId: true },
  });
  const already = new Set(existing.map((e) => e.achievementId));
  const newOnes = [...new Set(toAward)].filter((a) => !already.has(a));
  if (newOnes.length === 0) return [];

  await prisma.userAchievement.createMany({
    data: newOnes.map((achievementId) => ({ userId, achievementId })),
    skipDuplicates: true,
  });

  if (prisma.notification) {
    const rec = (await prisma.user.findUnique({ where: { id: userId }, select: { username: true, notifyAchievements: true } })) as {
      username?: string | null;
      notifyAchievements?: boolean;
    } | null;
    if (rec?.notifyAchievements) {
      for (const id of newOnes) {
        const def = ACHIEVEMENT_CATALOG[id];
        await prisma.notification.create({
          data: {
            userId,
            title: "Achievement unlocked",
            body: def ? `${def.icon} ${def.name} — ${def.description}` : "You earned a new achievement.",
            type: "ACHIEVEMENT",
            href: rec.username ? `/u/${rec.username}` : "/account",
          },
        });
      }
    }
  }

  return newOnes;
}

export interface SaveGameResult {
  ratingDelta: { white: number; black: number } | null;
  achievements: { white: string[]; black: string[] };
}

/** Persist a finished room, update Elo, and award any newly-earned achievements. */
export async function saveFinishedGame(
  room: GameRoom,
  kFactorMultiplier: Record<string, number> = {},
): Promise<SaveGameResult | null> {
  if (!enabled || !prisma || !room.status) return null;
  const cat = room.timeControl.category;
  const field = FIELD[cat];
  const result = room.status.result;
  const kMult = kFactorMultiplier[cat] ?? 1;

  let whiteBefore: number | null = null;
  let blackBefore: number | null = null;
  let whiteAfter: number | null = null;
  let blackAfter: number | null = null;
  let deltas: { white: number; black: number } | null = null;

  const whiteReal = !room.white.userId.startsWith("guest:");
  const blackReal = !room.black.userId.startsWith("guest:");
  // A game flagged for review (by the in-game moderator or an admin) is
  // Elo-neutral for both sides — read live here, not cached, so unflagging
  // before the game ends restores normal rating impact automatically. Unlike
  // `voided`, a flagged game still gets a Game row below, just unrated.
  const recordedAsRated = room.rated && !room.reviewFlagged && whiteReal && blackReal;

  try {
    if (recordedAsRated && field && result !== undefined) {
      const [wu, bu] = await Promise.all([
        prisma.user.findUnique({ where: { id: room.white.userId } }),
        prisma.user.findUnique({ where: { id: room.black.userId } }),
      ]);
      if (wu && bu) {
        const wr = Number(wu[field] ?? 1200);
        const br = Number(bu[field] ?? 1200);
        const wScore = result === "1-0" ? 1 : result === "1/2-1/2" ? 0.5 : 0;
        const bScore = (1 - wScore) as 1 | 0.5 | 0;
        const [wGames, bGames] = await Promise.all([
          prisma.game.count({ where: { OR: [{ whiteId: room.white.userId }, { blackId: room.white.userId }], rated: true, category: cat } }),
          prisma.game.count({ where: { OR: [{ whiteId: room.black.userId }, { blackId: room.black.userId }], rated: true, category: cat } }),
        ]);
        const wUpd = updateElo(wr, br, wScore as 1 | 0.5 | 0, wGames, kMult);
        const bUpd = updateElo(br, wr, bScore, bGames, kMult);
        whiteBefore = wr;
        blackBefore = br;
        whiteAfter = wUpd.rating;
        blackAfter = bUpd.rating;
        deltas = { white: wUpd.delta, black: bUpd.delta };
        await Promise.all([
          prisma.user.update({ where: { id: room.white.userId }, data: { [field]: wUpd.rating } }),
          prisma.user.update({ where: { id: room.black.userId }, data: { [field]: bUpd.rating } }),
        ]);
      }
    }

    const game = await prisma.game.create({
      data: {
        whiteId: whiteReal ? room.white.userId : null,
        blackId: blackReal ? room.black.userId : null,
        whiteName: room.white.username,
        blackName: room.black.username,
        opponentType: "HUMAN",
        rated: recordedAsRated,
        category: cat,
        timeControl: room.timeControl.id,
        result: RESULT_ENUM[result],
        termination: room.status.reason,
        pgn: room.chess.pgn(),
        finalFen: room.chess.fen(),
        ply: room.moves().length,
        whiteRatingBefore: whiteBefore,
        blackRatingBefore: blackBefore,
        whiteRatingAfter: whiteAfter,
        blackRatingAfter: blackAfter,
      },
    });

    if (deltas) {
      await Promise.all([
        prisma.ratingHistory.create({
          data: { userId: room.white.userId, category: cat, rating: whiteAfter!, delta: deltas.white, gameId: game.id },
        }),
        prisma.ratingHistory.create({
          data: { userId: room.black.userId, category: cat, rating: blackAfter!, delta: deltas.black, gameId: game.id },
        }),
      ]);
    }

    const [whiteAch, blackAch] = await Promise.all([
      whiteReal
        ? checkAndAwardAchievements({
            userId: room.white.userId,
            color: "w",
            result: RESULT_ENUM[result],
            category: cat,
            rated: recordedAsRated,
            termination: room.status.reason,
            ratingBefore: whiteBefore ?? undefined,
            ratingAfter: whiteAfter ?? undefined,
          })
        : Promise.resolve([]),
      blackReal
        ? checkAndAwardAchievements({
            userId: room.black.userId,
            color: "b",
            result: RESULT_ENUM[result],
            category: cat,
            rated: recordedAsRated,
            termination: room.status.reason,
            ratingBefore: blackBefore ?? undefined,
            ratingAfter: blackAfter ?? undefined,
          })
        : Promise.resolve([]),
    ]);

    if (recordedAsRated) {
      const wOutcome = result === "1/2-1/2" ? "drew" : result === "1-0" ? "won" : "lost";
      const bOutcome = result === "1/2-1/2" ? "drew" : result === "0-1" ? "won" : "lost";
      await Promise.all([
        notifyGameResult({
          userId: room.white.userId,
          gameId: game.id,
          outcome: wOutcome,
          category: cat,
          opponentName: room.black.username,
          termination: room.status.reason,
        }),
        notifyGameResult({
          userId: room.black.userId,
          gameId: game.id,
          outcome: bOutcome,
          category: cat,
          opponentName: room.white.username,
          termination: room.status.reason,
        }),
      ]);
    }

    return { ratingDelta: deltas, achievements: { white: whiteAch, black: blackAch } };
  } catch (e) {
    console.error("[persistence] failed to save game", (e as Error).message);
    return null;
  }
}
