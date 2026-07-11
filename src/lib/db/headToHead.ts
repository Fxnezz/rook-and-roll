import { prisma } from "@/lib/db/prisma";

export interface HeadToHead {
  wins: number;
  losses: number;
  draws: number;
}

/** Chess head-to-head record for `viewerId` against `otherId`, from viewer's perspective. */
export async function computeHeadToHead(viewerId: string, otherId: string): Promise<HeadToHead> {
  const games = await prisma.game.findMany({
    where: {
      NOT: { result: "ABORTED" },
      OR: [
        { whiteId: viewerId, blackId: otherId },
        { whiteId: otherId, blackId: viewerId },
      ],
    },
    select: { result: true, whiteId: true },
  });

  let wins = 0;
  let losses = 0;
  let draws = 0;
  for (const g of games) {
    if (g.result === "DRAW") draws++;
    else {
      const viewerWon = (g.result === "WHITE_WINS") === (g.whiteId === viewerId);
      if (viewerWon) wins++;
      else losses++;
    }
  }
  return { wins, losses, draws };
}
