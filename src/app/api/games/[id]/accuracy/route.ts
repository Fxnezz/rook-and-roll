import { NextResponse } from "next/server";
import { prisma, isDbConfigured } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isDbConfigured) {
    return NextResponse.json({ error: "No database configured." }, { status: 503 });
  }
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  const { id } = await params;

  let b: { accuracyW?: number; accuracyB?: number };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const game = await prisma.game.findUnique({ where: { id }, select: { whiteId: true, blackId: true } });
  if (!game) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (game.whiteId !== session.user.id && game.blackId !== session.user.id) {
    return NextResponse.json({ error: "Not your game." }, { status: 403 });
  }

  const clamp = (n: unknown) => (typeof n === "number" && Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : null);
  await prisma.game.update({
    where: { id },
    data: { accuracyW: clamp(b.accuracyW), accuracyB: clamp(b.accuracyB) },
  });

  return NextResponse.json({ ok: true });
}
