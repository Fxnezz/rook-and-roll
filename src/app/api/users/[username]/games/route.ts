import { NextResponse } from "next/server";
import { prisma, isDbConfigured } from "@/lib/db/prisma";
import { fetchGameHistory, type CategoryFilter, type ResultFilter } from "@/lib/games/history";

export const runtime = "nodejs";

const RESULT_FILTERS: ResultFilter[] = ["all", "win", "loss", "draw"];
const CATEGORY_FILTERS: CategoryFilter[] = ["all", "bullet", "blitz", "rapid", "classical", "untimed"];
/** Hard cap on how many games a single bulk-PGN export will concatenate, so one request can't run away. */
const MAX_BULK_EXPORT_GAMES = 1000;

/** chess.js's pgn() always emits its own placeholder header block (Event/Site/Date/Round/White/Black all "?", Result "*") even when no .header() calls were made — none of the save flows (bot/local/online pages) set real headers before storing. Strip that block plus the trailing "*" placeholder result token so we can layer real headers on top. */
function stripPlaceholderPgn(pgn: string): string {
  const lines = pgn.split("\n");
  let i = 0;
  while (i < lines.length && /^\[\w+\s+".*"\]$/.test(lines[i])) i++;
  while (i < lines.length && lines[i].trim() === "") i++;
  let movetext = lines.slice(i).join("\n").trim();
  movetext = movetext.replace(/\s*(1-0|0-1|1\/2-1\/2|\*)\s*$/, "").trim();
  return movetext;
}

/** Synthesizes standard PGN headers from Game fields (real Result/participants/date), since the stored `pgn` only ever carries chess.js's generic placeholder header block. */
function toPgnWithHeaders(g: {
  whiteName: string;
  blackName: string;
  result: string;
  category: string;
  timeControl: string;
  rated: boolean;
  termination: string;
  createdAt: Date;
  pgn: string;
}): string {
  const resultTag = g.result === "WHITE_WINS" ? "1-0" : g.result === "BLACK_WINS" ? "0-1" : g.result === "DRAW" ? "1/2-1/2" : "*";
  const date = g.createdAt.toISOString().slice(0, 10).replace(/-/g, ".");
  const headers = [
    `[Event "${g.rated ? "Rated" : "Casual"} ${g.category} game"]`,
    `[Site "Rook & Roll"]`,
    `[Date "${date}"]`,
    `[White "${g.whiteName}"]`,
    `[Black "${g.blackName}"]`,
    `[Result "${resultTag}"]`,
    `[TimeControl "${g.timeControl}"]`,
    `[Termination "${g.termination}"]`,
  ].join("\n");
  const movetext = stripPlaceholderPgn(g.pgn) || "*";
  return `${headers}\n\n${movetext} ${resultTag}`.trim();
}

export async function GET(req: Request, { params }: { params: Promise<{ username: string }> }) {
  if (!isDbConfigured) {
    return NextResponse.json({ error: "No database configured." }, { status: 503 });
  }
  const { username } = await params;
  const user = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const url = new URL(req.url);
  const cursor = url.searchParams.get("cursor") ?? undefined;
  const limit = Number(url.searchParams.get("limit") ?? 20);
  const resultParam = url.searchParams.get("result") ?? "all";
  const categoryParam = url.searchParams.get("category") ?? "all";
  const result = (RESULT_FILTERS as string[]).includes(resultParam) ? (resultParam as ResultFilter) : "all";
  const category = (CATEGORY_FILTERS as string[]).includes(categoryParam) ? (categoryParam as CategoryFilter) : "all";
  const favoritesOnly = url.searchParams.get("favorites") === "true";

  // Bulk "download all as PGN" archive (#203) — walks every page via the same
  // cursor pagination the history list uses, then concatenates one PGN per
  // game (blank-line separated, standard header block per game).
  if (url.searchParams.get("format") === "pgn") {
    const games: Awaited<ReturnType<typeof fetchGameHistory>>["games"] = [];
    let pageCursor: string | undefined;
    do {
      const page = await fetchGameHistory({ userId: user.id, cursor: pageCursor, limit: 50, result, category, favoritesOnly });
      games.push(...page.games);
      pageCursor = page.nextCursor ?? undefined;
    } while (pageCursor && games.length < MAX_BULK_EXPORT_GAMES);

    const archive = games.map(toPgnWithHeaders).join("\n\n\n") || "";
    return new NextResponse(archive, {
      headers: {
        "Content-Type": "application/x-chess-pgn; charset=utf-8",
        "Content-Disposition": `attachment; filename="rook-and-roll-${username}-games.pgn"`,
      },
    });
  }

  const { games, nextCursor } = await fetchGameHistory({ userId: user.id, cursor, limit, result, category, favoritesOnly });

  return NextResponse.json({
    games: games.map((g) => ({
      id: g.id,
      whiteName: g.whiteName,
      blackName: g.blackName,
      whiteId: g.whiteId,
      blackId: g.blackId,
      result: g.result,
      termination: g.termination,
      category: g.category,
      timeControl: g.timeControl,
      rated: g.rated,
      ply: g.ply,
      favorited: g.favorited,
      createdAt: g.createdAt,
    })),
    nextCursor,
  });
}
