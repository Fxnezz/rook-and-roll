import "server-only";
import { getConfig, setConfig } from "@/lib/admin/config";

/**
 * Global settings for live multiplayer chess, read by both this app (for the
 * public-facing bits: featured game, matchmaking gates) and the realtime
 * server (server/src/liveConfig.ts is the sibling reader — same AppConfig
 * row, different process/deployment, so the shape is duplicated there like
 * the rest of the socket protocol).
 */
export interface LiveMatchConfig {
  allowSpectators: boolean;
  allowChat: boolean;
  /** null = every preset in TIME_CONTROLS is enabled */
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

const KEY = "liveMatchConfig";

export async function getLiveMatchConfig(): Promise<LiveMatchConfig> {
  const raw = await getConfig(KEY);
  if (!raw) return DEFAULT_LIVE_MATCH_CONFIG;
  try {
    const parsed = JSON.parse(raw) as Partial<LiveMatchConfig>;
    // Shallow+one-level merge so old rows survive new fields being added later.
    return {
      ...DEFAULT_LIVE_MATCH_CONFIG,
      ...parsed,
      kFactorMultiplier: { ...DEFAULT_LIVE_MATCH_CONFIG.kFactorMultiplier, ...parsed.kFactorMultiplier },
      matchmaking: { ...DEFAULT_LIVE_MATCH_CONFIG.matchmaking, ...parsed.matchmaking },
      autoWarn: { ...DEFAULT_LIVE_MATCH_CONFIG.autoWarn, ...parsed.autoWarn },
      anticheat: { ...DEFAULT_LIVE_MATCH_CONFIG.anticheat, ...parsed.anticheat },
      featuredGame: { ...DEFAULT_LIVE_MATCH_CONFIG.featuredGame, ...parsed.featuredGame },
    };
  } catch {
    return DEFAULT_LIVE_MATCH_CONFIG;
  }
}

export async function setLiveMatchConfig(patch: Partial<LiveMatchConfig>): Promise<LiveMatchConfig> {
  const current = await getLiveMatchConfig();
  const next: LiveMatchConfig = {
    ...current,
    ...patch,
    kFactorMultiplier: { ...current.kFactorMultiplier, ...patch.kFactorMultiplier },
    matchmaking: { ...current.matchmaking, ...patch.matchmaking },
    autoWarn: { ...current.autoWarn, ...patch.autoWarn },
    anticheat: { ...current.anticheat, ...patch.anticheat },
    featuredGame: { ...current.featuredGame, ...patch.featuredGame },
  };
  await setConfig(KEY, JSON.stringify(next));
  return next;
}
