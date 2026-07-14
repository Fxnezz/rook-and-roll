import { NextResponse } from "next/server";
import { Chess } from "chess.js";
import { prisma, isDbConfigured } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";
import { openingFor } from "@/lib/openings";

export const runtime = "nodejs";

interface ImportBody {
  pgn: string;
  /** Which side the importing user played, if any — determines whiteId/blackId attribution. */
  yourColor?: "w" | "b" | "none";
}

export async function POST(req: Request) {
  if (!isDbConfigured) {
    return NextResponse.json({ error: "No database configured." }, { status: 503 });
  }
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in to import games." }, { status: 401 });
  }

  let b: ImportBody;
  try {
    b = (await req.json()) as ImportBody;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!b.pgn || typeof b.pgn !== "string") {
    return NextResponse.json({ error: "Missing PGN" }, { status: 400 });
  }

  const chess = new Chess();
  try {
    chess.loadPgn(b.pgn.trim());
  } catch {
    return NextResponse.json({ error: "That PGN could not be parsed." }, { status: 400 });
  }
  const moves = chess.history({ verbose: true });
  if (moves.length === 0) {
    return NextResponse.json({ error: "That PGN has no moves." }, { status: 400 });
  }

  const headers = chess.header();
  const resultTag = headers.Result;
  const result = resultTag === "1-0" ? "WHITE_WINS" : resultTag === "0-1" ? "BLACK_WINS" : resultTag === "1/2-1/2" ? "DRAW" : "ABORTED";

  const userId = session.user.id;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  const humanName = user.username ?? user.name ?? "You";

  const yourColor = b.yourColor === "w" || b.yourColor === "b" ? b.yourColor : "none";
  const whiteId = yourColor === "w" ? userId : null;
  const blackId = yourColor === "b" ? userId : null;
  const whiteName = yourColor === "w" ? humanName : (headers.White ?? "White");
  const blackName = yourColor === "b" ? humanName : (headers.Black ?? "Black");

  const op = openingFor(moves.map((m) => m.san));

  const game = await prisma.game.create({
    data: {
      whiteId,
      blackId,
      whiteName,
      blackName,
      opponentType: "HUMAN",
      rated: false,
      imported: true,
      category: "untimed",
      timeControl: "untimed",
      result,
      termination: headers.Termination ?? "Imported",
      pgn: chess.pgn(),
      finalFen: chess.fen(),
      ply: moves.length,
      opening: op?.name ?? null,
      eco: op?.eco ?? null,
      moves: {
        createMany: {
          data: moves.map((m, i) => ({ ply: i + 1, san: m.san, uci: m.from + m.to + (m.promotion ?? ""), fen: m.after })),
        },
      },
    },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, id: game.id }, { status: 201 });
}
