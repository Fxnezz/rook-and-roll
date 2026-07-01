import { NextResponse } from "next/server";
import { prisma, isDbConfigured } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";

export const runtime = "nodejs";

export async function GET() {
  if (!isDbConfigured) return NextResponse.json({ user: null });
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ user: null });
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      username: true,
      ratingBullet: true,
      ratingBlitz: true,
      ratingRapid: true,
      ratingClassical: true,
    },
  });
  return NextResponse.json({ user });
}
