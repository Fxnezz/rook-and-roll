// Server-side mirror of src/lib/admin/liveConfig.ts — same AppConfig row in
// the same Postgres database, read directly since this process has its own
// Prisma connection (see persistence.ts). Kept read-only here: all writes
// happen through the Next.js admin API so audit logging stays in one place.

import { getPrisma } from "./persistence.js";

export interface LiveMatchConfig {
  allowSpectators: boolean;
  allowChat: boolean;
  enabledTimeControls: string[] | null;
  allowGuestPlay: boolean;
  disconnectGraceSec: number;
  kFactorMultiplier: { bullet: number; blitz: number; rapid: number; classical: number };
  matchmaking: { startBand: number; widenAmount: number; widenIntervalSec: number; maxBand: number };
  reportsMaxPerHour: number;
  autoWarn: { reportThreshold: number; windowDays: number };
  anticheat: { enabled: boolean; suspicionThreshold: number };
  spectatorBroadcastDelaySec: number;
  featuredGame: { roomId: string | null; expiresAt: number | null };
  liveNotice: string | null;
  notifyPlayersOnAdminAttach: boolean;
  logAdminSocketActions: boolean;
}

export const DEFAULT_LIVE_MATCH_CONFIG: LiveMatchConfig = {
  allowSpectators: true,
  allowChat: true,
  enabledTimeControls: null,
  allowGuestPlay: true,
  disconnectGraceSec: 30,
  kFactorMultiplier: { bullet: 1, blitz: 1, rapid: 1, classical: 1 },
  matchmaking: { startBand: 100, widenAmount: 100, widenIntervalSec: 5, maxBand: 1000 },
  reportsMaxPerHour: 5,
  autoWarn: { reportThreshold: 3, windowDays: 7 },
  anticheat: { enabled: true, suspicionThreshold: 0.6 },
  spectatorBroadcastDelaySec: 0,
  featuredGame: { roomId: null, expiresAt: null },
  liveNotice: null,
  notifyPlayersOnAdminAttach: false,
  logAdminSocketActions: true,
};

let cached: { value: LiveMatchConfig; at: number } | null = null;
const TTL_MS = 10_000;

export async function getLiveMatchConfig(): Promise<LiveMatchConfig> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.value;
  const prisma = getPrisma();
  if (!prisma) {
    cached = { value: DEFAULT_LIVE_MATCH_CONFIG, at: Date.now() };
    return DEFAULT_LIVE_MATCH_CONFIG;
  }
  try {
    const row = await prisma.appConfig.findUnique({ where: { key: "liveMatchConfig" } });
    const parsed = row?.value ? (JSON.parse(row.value as string) as Partial<LiveMatchConfig>) : {};
    const value: LiveMatchConfig = {
      ...DEFAULT_LIVE_MATCH_CONFIG,
      ...parsed,
      kFactorMultiplier: { ...DEFAULT_LIVE_MATCH_CONFIG.kFactorMultiplier, ...parsed.kFactorMultiplier },
      matchmaking: { ...DEFAULT_LIVE_MATCH_CONFIG.matchmaking, ...parsed.matchmaking },
      autoWarn: { ...DEFAULT_LIVE_MATCH_CONFIG.autoWarn, ...parsed.autoWarn },
      anticheat: { ...DEFAULT_LIVE_MATCH_CONFIG.anticheat, ...parsed.anticheat },
      featuredGame: { ...DEFAULT_LIVE_MATCH_CONFIG.featuredGame, ...parsed.featuredGame },
    };
    cached = { value, at: Date.now() };
    return value;
  } catch {
    return DEFAULT_LIVE_MATCH_CONFIG;
  }
}
