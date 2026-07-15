import { NextResponse } from "next/server";
import { prisma, isDbConfigured } from "@/lib/db/prisma";
import { guardAdmin } from "@/lib/admin/guard";
import { ADMIN_OWNER_EMAIL } from "@/lib/admin/owner";

export const runtime = "nodejs";

export async function GET() {
  const denied = await guardAdmin();
  if (denied) return denied;
  if (!isDbConfigured) return NextResponse.json({ error: "No database" }, { status: 503 });

  const admins = await prisma.user.findMany({
    where: { email: ADMIN_OWNER_EMAIL },
    select: { id: true, username: true, email: true },
    orderBy: { email: "asc" },
  });
  return NextResponse.json({
    admins: admins.map((a) => ({ ...a, isOwner: a.email.toLowerCase() === ADMIN_OWNER_EMAIL.toLowerCase() })),
  });
}

export async function POST(req: Request) {
  const denied = await guardAdmin();
  if (denied) return denied;
  void req;
  return NextResponse.json({ error: "Shield access is permanently locked to the owner account." }, { status: 403 });
}
