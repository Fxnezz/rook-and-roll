import { prisma } from "@/lib/db/prisma";
import { ACHIEVEMENT_BY_ID } from "@/lib/achievements/catalog";

export interface ActivityEvent {
  type: "game" | "achievement" | "friend";
  date: Date;
  label: string;
  href?: string;
}

/** Merges recent games, earned achievements, and new friendships into one chronological feed (most recent first, capped at `limit`). */
export async function computeActivityFeed(userId: string, limit = 12): Promise<ActivityEvent[]> {
  const [games, achievements, friendships] = await Promise.all([
    prisma.game.findMany({
      where: { OR: [{ whiteId: userId }, { blackId: userId }], NOT: { result: "ABORTED" } },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { id: true, whiteId: true, whiteName: true, blackName: true, result: true, createdAt: true },
    }),
    prisma.userAchievement.findMany({
      where: { userId },
      orderBy: { earnedAt: "desc" },
      take: limit,
      select: { achievementId: true, earnedAt: true },
    }),
    prisma.friendship.findMany({
      where: { status: "ACCEPTED", OR: [{ requesterId: userId }, { addresseeId: userId }] },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        createdAt: true,
        requester: { select: { username: true } },
        addressee: { select: { username: true } },
        requesterId: true,
      },
    }),
  ]);

  const events: ActivityEvent[] = [];

  for (const g of games) {
    const isWhite = g.whiteId === userId;
    const outcome = g.result === "DRAW" ? "drew with" : (g.result === "WHITE_WINS") === isWhite ? "won against" : "lost to";
    const opponent = isWhite ? g.blackName : g.whiteName;
    events.push({ type: "game", date: g.createdAt, label: `${outcome} ${opponent}`, href: `/games/${g.id}` });
  }

  for (const a of achievements) {
    const def = ACHIEVEMENT_BY_ID[a.achievementId];
    if (!def) continue;
    events.push({ type: "achievement", date: a.earnedAt, label: `earned ${def.icon} ${def.name}` });
  }

  for (const f of friendships) {
    const otherUsername = f.requesterId === userId ? f.addressee.username : f.requester.username;
    if (!otherUsername) continue;
    events.push({ type: "friend", date: f.createdAt, label: `became friends with ${otherUsername}`, href: `/u/${otherUsername}` });
  }

  return events.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, limit);
}
