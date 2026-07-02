import { NextResponse } from "next/server";
import { prisma, isDbConfigured } from "@/lib/db/prisma";
import { guardAdmin } from "@/lib/admin/guard";

export const runtime = "nodejs";

/** Search / list users for the admin table. */
export async function GET(req: Request) {
  const denied = await guardAdmin();
  if (denied) return denied;
  if (!isDbConfigured) return NextResponse.json({ users: [] });

  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  const where = q
    ? {
        OR: [
          { username: { contains: q, mode: "insensitive" as const } },
          { email: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      username: true,
      email: true,
      status: true,
      createdAt: true,
      ratingBlitz: true,
      ratingRapid: true,
      bannedUntil: true,
      mutedUntil: true,
    },
  });
  return NextResponse.json({ users });
}
