import "server-only";
import { prisma, isDbConfigured } from "@/lib/db/prisma";
import type { Prisma } from "@prisma/client";

export interface AuditEntry {
  action: string;
  targetType?: string;
  targetId?: string;
  ip?: string | null;
  detail?: Prisma.InputJsonValue;
  actor?: string;
}

/**
 * Append an entry to the admin audit log. Best-effort: never throws into the
 * caller (an audit failure must not break the underlying admin action, but is
 * logged to the server console).
 */
export async function audit(entry: AuditEntry): Promise<void> {
  if (!isDbConfigured) return;
  try {
    await prisma.adminAuditLog.create({
      data: {
        actor: entry.actor ?? "admin",
        action: entry.action,
        targetType: entry.targetType ?? null,
        targetId: entry.targetId ?? null,
        ip: entry.ip ?? null,
        detail: entry.detail,
      },
    });
  } catch (e) {
    console.error("[audit] failed to write", entry.action, (e as Error).message);
  }
}

/** Pull the client IP from proxy headers (Vercel sets x-forwarded-for). */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
