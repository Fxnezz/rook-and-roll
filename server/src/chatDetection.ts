// Lightweight, in-memory chat-abuse signal detection — separate from the
// silent per-socket rate-limiter (RateLimiter in anticheat.ts), which just
// drops excess messages with no visible trace. This instead surfaces
// borderline behavior to the in-game moderator instead of hiding it.

export type FlagSeverity = "low" | "medium" | "high";
export interface ChatSignal {
  flagged: boolean;
  severity: FlagSeverity;
  reasons: string[];
}

const WINDOW_MS = 10_000;
const REPEAT_THRESHOLD = 2; // same exact text seen this many times within the window
const FLOOD_THRESHOLD = 4; // any messages within the window

const history = new Map<string, { text: string; ts: number }[]>();

function isExcessiveCaps(text: string): boolean {
  const letters = text.replace(/[^a-zA-Z]/g, "");
  return letters.length >= 8 && letters === letters.toUpperCase();
}

/** key should uniquely identify a (room, sender) pair, e.g. `${roomId}:${userId}`. */
export function analyzeChat(key: string, text: string, profane: boolean): ChatSignal {
  const now = Date.now();
  const recent = (history.get(key) ?? []).filter((m) => now - m.ts < WINDOW_MS);
  recent.push({ text, ts: now });
  history.set(key, recent);

  const reasons: string[] = [];
  if (profane) reasons.push("profanity");
  if (isExcessiveCaps(text)) reasons.push("caps");
  if (recent.filter((m) => m.text === text).length >= REPEAT_THRESHOLD) reasons.push("repeat");
  if (recent.length >= FLOOD_THRESHOLD) reasons.push("flooding");

  const flagged = reasons.length > 0;
  const severity: FlagSeverity = reasons.includes("profanity") || reasons.length >= 2 ? "high" : flagged ? "medium" : "low";
  return { flagged, severity, reasons };
}

/** Call when a room ends to avoid unbounded growth over long server uptime. */
export function clearChatHistory(roomId: string, userIds: string[]) {
  for (const userId of userIds) history.delete(`${roomId}:${userId}`);
}
