import { NextResponse } from "next/server";
import { guardAdmin } from "@/lib/admin/guard";

export const runtime = "nodejs";

/** Revokes admin access. The owner account can never be removed — checked here server-side, never trusting the client's UI hiding the button. */
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin();
  if (denied) return denied;
  void req;
  await ctx.params;
  return NextResponse.json({ error: "The owner-only Shield policy cannot be changed." }, { status: 403 });
}
