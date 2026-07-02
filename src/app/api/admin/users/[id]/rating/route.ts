import { NextResponse } from "next/server";
import { prisma, isDbConfigured } from "@/lib/db/prisma";
import { guardAdmin } from "@/lib/admin/guard";
import { audit, clientIp } from "@/lib/admin/audit";
import { ratingFieldFor, type RatingCategory } from "@/lib/ratings/elo";

export const runtime = "nodejs";

const CATS: RatingCategory[] = ["bullet", "blitz", "rapid", "classical"];

/** Set a user's rating for one time control, logging an admin-adjustment marker. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin();
  if (denied) return denied;
  if (!isDbConfigured) return NextResponse.json({ error: "No database" }, { status: 503 });

  const { id } = await ctx.params;
  let body: { category?: string; rating?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const category = body.category as RatingCategory;
  if (!CATS.includes(category)) return NextResponse.json({ error: "Bad category" }, { status: 400 });
  const rating = Math.round(Number(body.rating));
  if (!Number.isFinite(rating) || rating < 100 || rating > 3500)
    return NextResponse.json({ error: "Rating out of range (100–3500)" }, { status: 400 });

  const field = ratingFieldFor[category as Exclude<RatingCategory, "puzzle">];
  const before = await prisma.user.findUnique({ where: { id }, select: { [field]: true, username: true } });
  if (!before) return NextResponse.json({ error: "User not found" }, { status: 404 });
  const prev = (before as unknown as Record<string, number>)[field];

  await prisma.user.update({ where: { id }, data: { [field]: rating } });
  await prisma.ratingHistory.create({
    data: { userId: id, category, rating, delta: rating - prev, kind: "admin" },
  });
  await audit({
    action: "user_rating_edit",
    targetType: "user",
    targetId: id,
    ip: clientIp(req),
    detail: { category, from: prev, to: rating },
  });

  return NextResponse.json({ ok: true, category, rating });
}
