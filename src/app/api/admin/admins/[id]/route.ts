import { NextResponse } from "next/server";
import { prisma, isDbConfigured } from "@/lib/db/prisma";
import { guardAdmin } from "@/lib/admin/guard";
import { audit, clientIp } from "@/lib/admin/audit";
import { ADMIN_OWNER_EMAIL } from "@/lib/admin/owner";

export const runtime = "nodejs";

/** Revokes admin access. The owner account can never be removed — checked here server-side, never trusting the client's UI hiding the button. */
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin();
  if (denied) return denied;
  if (!isDbConfigured) return NextResponse.json({ error: "No database" }, { status: 503 });

  const { id } = await ctx.params;
  const target = await prisma.user.findUnique({ where: { id }, select: { id: true, username: true, email: true, isAdmin: true } });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (target.email.toLowerCase() === ADMIN_OWNER_EMAIL.toLowerCase()) {
    return NextResponse.json({ error: "The owner account can't be removed." }, { status: 403 });
  }
  if (!target.isAdmin) return NextResponse.json({ ok: true }); // already not an admin

  await prisma.user.update({ where: { id }, data: { isAdmin: false } });
  await audit({ action: "admin_removed", targetType: "user", targetId: id, ip: clientIp(req), detail: { email: target.email } });

  return NextResponse.json({ ok: true });
}
