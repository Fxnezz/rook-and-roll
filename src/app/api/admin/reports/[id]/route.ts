import { NextResponse } from "next/server";
import { guardAdmin } from "@/lib/admin/guard";
import { audit, clientIp } from "@/lib/admin/audit";
import { prisma, isDbConfigured } from "@/lib/db/prisma";

export const runtime = "nodejs";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin();
  if (denied) return denied;
  if (!isDbConfigured) return NextResponse.json({ error: "No database" }, { status: 503 });

  const { id } = await ctx.params;
  let body: { action?: "resolve" | "dismiss"; resolution?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (body.action !== "resolve" && body.action !== "dismiss") {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  const status = body.action === "resolve" ? "RESOLVED" : "DISMISSED";
  try {
    const report = await prisma.report.update({
      where: { id },
      data: { status, resolution: body.resolution?.slice(0, 500) ?? null, resolvedAt: new Date() },
    });
    await audit({
      action: `report_${status.toLowerCase()}`,
      targetType: "report",
      targetId: id,
      ip: clientIp(req),
      detail: { reportedId: report.reportedId, resolution: body.resolution ?? null },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }
}
