import "server-only";
import { prisma, isDbConfigured } from "@/lib/db/prisma";

// Small in-memory cache so the common "maintenance off" path is one cheap read.
const cache = new Map<string, { value: string | null; at: number }>();
const TTL = 15_000;

export async function getConfig(key: string): Promise<string | null> {
  if (!isDbConfigured) return null;
  const c = cache.get(key);
  if (c && Date.now() - c.at < TTL) return c.value;
  const row = await prisma.appConfig.findUnique({ where: { key } });
  const value = row?.value ?? null;
  cache.set(key, { value, at: Date.now() });
  return value;
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
