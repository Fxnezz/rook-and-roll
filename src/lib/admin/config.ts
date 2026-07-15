import "server-only";
import { prisma, isDbConfigured } from "@/lib/db/prisma";

// Small in-memory cache so the common "maintenance off" path is one cheap read.
const cache = new Map<string, { value: string | null; at: number }>();
const TTL = 15_000;
const failureLogAt = new Map<string, number>();
const FAILURE_LOG_TTL = 30_000;

export async function getConfig(key: string): Promise<string | null> {
  if (!isDbConfigured) return null;
  const c = cache.get(key);
  if (c && Date.now() - c.at < TTL) return c.value;
  try {
    const row = await prisma.appConfig.findUnique({ where: { key } });
    const value = row?.value ?? null;
    cache.set(key, { value, at: Date.now() });
    return value;
  } catch (error) {
    // Site-wide configuration is optional. A short database interruption must
    // not take down every page just because maintenance or broadcast settings
    // could not be refreshed. Reuse stale cache when possible, otherwise use
    // the safe defaults supplied by the callers.
    const now = Date.now();
    const lastLogged = failureLogAt.get(key) ?? 0;
    if (now - lastLogged >= FAILURE_LOG_TTL) {
      console.error("[config] read failed; using safe fallback", {
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      failureLogAt.set(key, now);
    }
    return c?.value ?? null;
  }
}

export async function setConfig(key: string, value: string | null): Promise<void> {
  if (!isDbConfigured) return;
  if (value === null) await prisma.appConfig.deleteMany({ where: { key } });
  else await prisma.appConfig.upsert({ where: { key }, update: { value }, create: { key, value } });
  cache.set(key, { value, at: Date.now() });
}

export interface Broadcast {
  id: string;
  message: string;
  level: "info" | "warning";
  expiresAt: number | null;
}

export async function getBroadcast(): Promise<Broadcast | null> {
  const raw = await getConfig("broadcast");
  if (!raw) return null;
  try {
    const b = JSON.parse(raw) as Broadcast;
    if (b.expiresAt && b.expiresAt < Date.now()) return null;
    return b;
  } catch {
    return null;
  }
}

export async function isMaintenance(): Promise<boolean> {
  return (await getConfig("maintenance")) === "on";
}
