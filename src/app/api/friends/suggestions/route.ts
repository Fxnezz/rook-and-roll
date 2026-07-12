import { NextResponse } from "next/server";
import { prisma, isDbConfigured } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";

export const runtime = "nodejs";

const RATING_BAND = 150;
const LIMIT = 5;

/**
 * "People you might know" — users with a similar blitz rating who aren't
 * already a friend/blocked/pending in either direction, closest rating first.
 */
export async function GET() {
  if (!isDbConfigured) return NextResponse.json({ error: "No database configured." }, { status: 503 });
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const me = session.user.id;
  const [myUser, existingRows] = await Promise.all([
    prisma.user.findUnique({ where: { id: me }, select: { ratingBlitz: true } }),
    prisma.friendship.findMany({
      where: { OR: [{ requesterId: me }, { addresseeId: me }] },
      select: { requesterId: true, addresseeId: true },
    }),
  ]);
  if (!myUser) return NextResponse.json({ error: "User not found." }, { status: 404 });

  const excludeIds = new Set<string>([me]);
  for (const row of existingRows) {
    excludeIds.add(row.requesterId === me ? row.addresseeId : row.requesterId);
  }

  const myRating = myUser.ratingBlitz;
  const candidates = await prisma.user.findMany({
    where: {
      id: { notIn: Array.from(excludeIds) },
      username: { not: null },
      ratingBlitz: { gte: myRating - RATING_BAND, lte: myRating + RATING_BAND },
    },
    select: { id: true, username: true, name: true, ratingBlitz: true },
    take: 50,
  });

  const suggestions = candidates
    .map((u) => ({ ...u, distance: Math.abs(u.ratingBlitz - myRating) }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, LIMIT)
    .map(({ id, username, name, ratingBlitz }) => ({ id, username, name, ratingBlitz }));

  return NextResponse.json({ suggestions });
}
