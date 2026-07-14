import { NextResponse } from "next/server";
import type { Color } from "chess.js";
import { prisma, isDbConfigured } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";
import { updateElo, ratingFieldFor, type RatingCategory } from "@/lib/ratings/elo";
import { checkAndAwardAchievements } from "@/lib/achievements/award";
import { openingFor } from "@/lib/openings";

export const runtime = "nodejs";

interface SaveBody {
  pgn: string;
  finalFen: string;
  result: "WHITE_WINS" | "BLACK_WINS" | "DRAW" | "ABORTED";
  termination: string;
  category: string; // bullet|blitz|rapid|classical|untimed
  timeControl: string;
  opponentType: "HUMAN" | "BOT";
  botTier?: string;
  botElo?: number;
  /** the signed-in user's colour in this game */
  color: Color;
  opponentName?: string;
  rated?: boolean;
  moves?: { ply: number; san: string; uci: string; fen: string }[];
  /** Per-ply think time in ms, index 0 = move 1. */
  moveTimes?: number[];
}

export async function POST(req: Request) {
  if (!isDbConfigured) {
    return NextResponse.json({ error: "No database configured." }, { status: 503 });
  }
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in to save games." }, { status: 401 });
  }

  let b: SaveBody;
  try {
    b = (await req.json()) as SaveBody;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const userId = session.user.id;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const isRatedCategory = b.category !== "untimed";
  const rated = Boolean(b.rated) && isRatedCategory && b.opponentType === "BOT" && b.result !== "ABORTED";

  const humanName = user.username ?? user.name ?? "You";
  const oppName = b.opponentName ?? (b.opponentType === "BOT" ? "Bot" : "Opponent");
  const whiteName = b.color === "w" ? humanName : oppName;
  const blackName = b.color === "b" ? humanName : oppName;
  const whiteId = b.color === "w" ? userId : null;
  const blackId = b.color === "b" ? userId : null;

  // Rating update (only vs. bots here; multiplayer is handled by the realtime server).
  let whiteBefore: number | null = null;
  let blackBefore: number | null = null;
  let whiteAfter: number | null = null;
  let blackAfter: number | null = null;
  let ratingDelta = 0;
  let newRating: number | null = null;
  const category = b.category as RatingCategory;

  if (rated && category !== "puzzle") {
    const field = ratingFieldFor[category as Exclude<RatingCategory, "puzzle">];
    const current = user[field];
    const oppRating = b.botElo ?? 1200;
    const score = b.result === "DRAW" ? 0.5 : (b.result === "WHITE_WINS") === (b.color === "w") ? 1 : 0;
    const gamesPlayed = await prisma.game.count({
      where: { OR: [{ whiteId: userId }, { blackId: userId }], rated: true, category },
    });
    const upd = updateElo(current, oppRating, score as 1 | 0.5 | 0, gamesPlayed);
    newRating = upd.rating;
    ratingDelta = upd.delta;
    if (b.color === "w") {
      whiteBefore = current;
      whiteAfter = upd.rating;
    } else {
      blackBefore = current;
      blackAfter = upd.rating;
    }
    await prisma.user.update({ where: { id: userId }, data: { [field]: upd.rating } });
  }

  const game = await prisma.game.create({
    data: {
      whiteId,
      blackId,
      whiteName,
      blackName,
      opponentType: b.opponentType,
      botTier: b.botTier ?? null,
      rated,
      category: b.category,
      timeControl: b.timeControl,
      result: b.result,
      termination: b.termination,
      pgn: b.pgn,
      finalFen: b.finalFen,
      ply: b.moves?.length ?? 0,
      moveTimes: Array.isArray(b.moveTimes) && b.moveTimes.length ? b.moveTimes : undefined,
      ...(() => {
        const op = openingFor((b.moves ?? []).map((m) => m.san));
        return { opening: op?.name ?? null, eco: op?.eco ?? null };
      })(),
      whiteRatingBefore: whiteBefore,
      blackRatingBefore: blackBefore,
      whiteRatingAfter: whiteAfter,
      blackRatingAfter: blackAfter,
      moves: b.moves?.length
        ? { createMany: { data: b.moves.map((m) => ({ ply: m.ply, san: m.san, uci: m.uci, fen: m.fen })) } }
        : undefined,
    },
    select: { id: true },
  });

  if (rated && newRating != null) {
    await prisma.ratingHistory.create({
      data: { userId, category: b.category, rating: newRating, delta: ratingDelta, gameId: game.id },
    });
  }

  const achievements = await checkAndAwardAchievements({
    userId,
    color: b.color,
    result: b.result,
    category: b.category,
    rated,
    termination: b.termination,
    ratingBefore: (b.color === "w" ? whiteBefore : blackBefore) ?? undefined,
    ratingAfter: (b.color === "w" ? whiteAfter : blackAfter) ?? undefined,
  });

  return NextResponse.json({ ok: true, id: game.id, ratingDelta, newRating, achievements }, { status: 201 });
}
