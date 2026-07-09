"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { IconShield, IconVolumeOff, IconVolume } from "@/components/ui/icons";
import { useLastMuteDuration, useCustomWarnPhrases } from "@/lib/moderation/useModPreferences";
import { useModStats } from "@/lib/moderation/useModStats";
import type { TrollEffectType } from "@/lib/online/protocol";

interface PlayerContext {
  found: boolean;
  reportsReceived?: number;
  muteCount?: number;
  isNewAccount?: boolean;
}

const CANNED_WARN_PHRASES = [
  "Please keep the chat friendly.",
  "Watch your language.",
  "One more warning before a mute.",
  "Let's keep this respectful.",
];

const MUTE_DURATIONS: { label: string; ms: number | null }[] = [
  { label: "2 min", ms: 120_000 },
  { label: "5 min", ms: 300_000 },
  { label: "Rest of game", ms: null },
];

/** Extended one entry at a time as later batches add effects. */
const TROLL_EFFECTS: { type: TrollEffectType; label: string }[] = [
  { type: "wobbleBoard", label: "Wobble board" },
  { type: "rainbowSquares", label: "Rainbow squares" },
  { type: "invertColors", label: "Invert colors" },
  { type: "flipBoard", label: "Flip board" },
  { type: "reskinPieces", label: "Reskin pieces" },
  { type: "tinyBoard", label: "Tiny board" },
  { type: "giantBoard", label: "Giant board" },
  { type: "blackoutBoard", label: "Blackout" },
];

export interface ModPanelProps {
  onClose: () => void;
  roomId: string;
  opponentUsername: string;
  flaggedMessages: { from: string; text: string; ts: number; severity?: "low" | "medium" | "high"; reasons?: string[] }[];
  opponentMuted: boolean;
  onToggleMute: (durationMs?: number) => void;
  warnCount: number;
  onWarn: (text: string) => void;
  paused: boolean;
  onTogglePause: () => void;
  reviewFlagged: boolean;
  onToggleFlagReview: () => void;
  suspicion: { mine: number; opponent: number };
  gameOver: boolean;
  actionLog: { id: number; text: string; ts: number }[];
  onTroll: (type: TrollEffectType, opts?: { durationMs?: number; text?: string }) => void;
}

/**
 * In-game moderator panel — only ever rendered for the one designated
 * account (session.user.isModerator), and only inside a room they are
 * personally playing in right now. Structurally mirrors CheatPanel (fixed
 * floating panel) but opened from a header icon instead of a key sequence,
 * since this isn't meant to be secret — the 🛡 badge already announces it.
 */
export function ModPanel({
  onClose,
  roomId,
  opponentUsername,
  flaggedMessages,
  opponentMuted,
  onToggleMute,
  warnCount,
  onWarn,
  paused,
  onTogglePause,
  reviewFlagged,
  onToggleFlagReview,
  suspicion,
  gameOver,
  actionLog,
  onTroll,
}: ModPanelProps) {
  const [autoMuteThreshold, setAutoMuteThreshold] = useState(3); // 0 = off
  const [suggestDismissed, setSuggestDismissed] = useState(false);
  const [warnText, setWarnText] = useState("");
  const [newPhrase, setNewPhrase] = useState("");
  const [confirmingPause, setConfirmingPause] = useState(false);
  const [context, setContext] = useState<PlayerContext | null>(null);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());
  const [lastAction, setLastAction] = useState<{ label: string; undo: () => void } | null>(null);
  const [note, setNote] = useState("");
  const [cheatFlagSent, setCheatFlagSent] = useState(false);
  const autoMutedRef = useRef(false);
  const lastActionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { durationMs: muteDurationMs, setDurationMs: setMuteDurationMs } = useLastMuteDuration();
  const { phrases: customPhrases, addPhrase, removePhrase } = useCustomWarnPhrases();
  const { increment: incrementModStat } = useModStats();

  const withUndo = (label: string, undo: () => void) => {
    setLastAction({ label, undo });
    if (lastActionTimerRef.current) clearTimeout(lastActionTimerRef.current);
    lastActionTimerRef.current = setTimeout(() => setLastAction(null), 8000);
  };

  useEffect(() => {
    setNote(localStorage.getItem(`rr.mod.note.${roomId}`) ?? "");
  }, [roomId]);
  const updateNote = (v: string) => {
    setNote(v);
    try {
      localStorage.setItem(`rr.mod.note.${roomId}`, v);
    } catch {
      /* ignore storage errors */
    }
  };

  const flagCheating = async () => {
    setCheatFlagSent(true);
    incrementModStat("cheatFlags");
    try {
      await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportedUsername: opponentUsername,
          reason: "Suspected cheating (flagged by moderator)",
          detail: `Move-timing suspicion score: ${Math.round(suspicion.opponent * 100)}%`,
        }),
      });
    } catch {
      /* best-effort */
    }
  };

  useEffect(() => {
    let cancelled = false;
    setContext(null);
    fetch(`/api/mod/player-context?username=${encodeURIComponent(opponentUsername)}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setContext(d);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [opponentUsername]);

  const armPause = () => {
    if (paused) {
      onTogglePause(); // resuming is always immediate, never needs confirmation
      withUndo("Resumed the game", onTogglePause);
      return;
    }
    if (!confirmingPause) {
      setConfirmingPause(true);
      setTimeout(() => setConfirmingPause(false), 3000);
      return;
    }
    setConfirmingPause(false);
    onTogglePause();
    withUndo("Paused the game", onTogglePause);
  };

  // "Not a problem" dismissals drop a message from every count/suggestion below.
  const activeFlags = flaggedMessages.filter((_, i) => !dismissed.has(i));
  const hasHighSeverity = activeFlags.some((m) => m.severity === "high");

  // Suggest an action the moment the first (non-dismissed) flagged message
  // shows up this game — mute for high severity, just a warn nudge otherwise.
  const showSuggestion = activeFlags.length > 0 && !opponentMuted && !suggestDismissed;

  // Reset the auto-mute guard whenever the moderator manually unmutes, so a
  // fresh run of flags in the same game can trigger it again.
  useEffect(() => {
    if (!opponentMuted) autoMutedRef.current = false;
  }, [opponentMuted]);

  useEffect(() => {
    if (autoMuteThreshold > 0 && !opponentMuted && !autoMutedRef.current && activeFlags.length >= autoMuteThreshold) {
      autoMutedRef.current = true;
      onToggleMute(muteDurationMs ?? undefined);
    }
  }, [activeFlags.length, autoMuteThreshold, opponentMuted, onToggleMute, muteDurationMs]);

  const clickMute = () => {
    const wasMuted = opponentMuted;
    onToggleMute(wasMuted ? undefined : (muteDurationMs ?? undefined));
    withUndo(wasMuted ? `Unmuted ${opponentUsername}` : `Muted ${opponentUsername}`, () => onToggleMute());
  };

  return (
    <div
      className="fixed bottom-4 left-4 z-[90] flex max-h-[80vh] w-80 flex-col overflow-hidden rounded-xl border border-white/15 bg-[#14171f] text-white shadow-2xl"
      style={{ fontFamily: "var(--font-sans, sans-serif)" }}
    >
      <div className="flex items-center justify-between border-b border-white/10 bg-black/30 px-3 py-2">
        <span className="flex items-center gap-1.5 text-sm font-bold">
          <IconShield width={15} height={15} /> Moderation
        </span>
        <button onClick={onClose} className="text-white/60 hover:text-white">
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        <p className="mb-1 text-xs text-white/50">
          Playing against{" "}
          <Link href={`/u/${opponentUsername}`} target="_blank" className="font-semibold text-white/80 underline hover:text-white">
            {opponentUsername}
          </Link>
          {context?.isNewAccount && (
            <span className="ml-1.5 rounded-full bg-yellow-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-yellow-200">new account</span>
          )}
        </p>
        {context?.found && (
          <p className="mb-3 text-[11px] text-white/40">
            {context.reportsReceived} lifetime report{context.reportsReceived === 1 ? "" : "s"} · {context.muteCount} prior admin mute
            {context.muteCount === 1 ? "" : "s"}
          </p>
        )}

        {!opponentMuted && (
          <div className="mb-1.5 flex items-center gap-1 text-[10px] text-white/50">
            <span>Duration:</span>
            {MUTE_DURATIONS.map((opt) => (
              <button
                key={opt.label}
                className="rounded px-1.5 py-0.5 font-semibold"
                style={
                  muteDurationMs === opt.ms
                    ? { background: "var(--accent)", color: "var(--accent-contrast)" }
                    : { background: "rgba(255,255,255,0.08)", color: "white" }
                }
                onClick={() => setMuteDurationMs(opt.ms)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
        <button
          onClick={clickMute}
          className="mb-3 flex w-full items-center justify-center gap-1.5 rounded px-2 py-1.5 text-xs font-semibold transition-colors"
          style={{
            background: opponentMuted ? "var(--accent)" : "rgba(255,255,255,0.08)",
            color: opponentMuted ? "var(--accent-contrast)" : "white",
          }}
        >
          {opponentMuted ? <IconVolumeOff width={13} height={13} /> : <IconVolume width={13} height={13} />}
          {opponentMuted ? `Unmute ${opponentUsername}` : `Mute ${opponentUsername}`}
        </button>

        {lastAction && (
          <div className="mb-3 flex items-center justify-between rounded bg-white/5 px-2 py-1.5 text-xs">
            <span className="text-white/60">{lastAction.label}</span>
            <button
              className="font-semibold text-[var(--accent)] hover:underline"
              onClick={() => {
                lastAction.undo();
                setLastAction(null);
              }}
            >
              Undo
            </button>
          </div>
        )}

        {showSuggestion && (
          <div className="mb-3 flex items-center justify-between gap-2 rounded border border-yellow-500/30 bg-yellow-500/10 px-2 py-1.5 text-xs">
            <span className="text-yellow-200">{hasHighSeverity ? "Flagged chat detected — mute?" : "Minor issue detected — warn?"}</span>
            <span className="flex shrink-0 gap-1">
              {hasHighSeverity ? (
                <button className="rounded bg-white/10 px-1.5 py-0.5 font-semibold hover:bg-white/20" onClick={clickMute}>
                  Mute
                </button>
              ) : (
                <button
                  className="rounded bg-white/10 px-1.5 py-0.5 font-semibold hover:bg-white/20"
                  onClick={() => onWarn(CANNED_WARN_PHRASES[0])}
                >
                  Warn
                </button>
              )}
              <button className="rounded px-1.5 py-0.5 text-white/50 hover:text-white" onClick={() => setSuggestDismissed(true)}>
                Dismiss
              </button>
            </span>
          </div>
        )}

        {!gameOver && (
          <div className="mb-3 flex gap-1.5">
            <button
              onClick={armPause}
              className="flex-1 rounded px-2 py-1.5 text-xs font-semibold transition-colors"
              style={{
                background: paused ? "var(--accent)" : confirmingPause ? "rgba(239,68,68,0.25)" : "rgba(255,255,255,0.08)",
                color: paused ? "var(--accent-contrast)" : "white",
              }}
            >
              {paused ? "Resume game" : confirmingPause ? "Confirm pause?" : "Pause game"}
            </button>
            <button
              onClick={() => {
                const wasFlagged = reviewFlagged;
                onToggleFlagReview();
                withUndo(wasFlagged ? "Removed review flag" : "Flagged for review", onToggleFlagReview);
              }}
              className="flex-1 rounded px-2 py-1.5 text-xs font-semibold transition-colors"
              style={{
                background: reviewFlagged ? "var(--accent)" : "rgba(255,255,255,0.08)",
                color: reviewFlagged ? "var(--accent-contrast)" : "white",
              }}
              title="Flags this game in the admin dashboard for review"
            >
              {reviewFlagged ? "Flagged for review" : "Flag for review"}
            </button>
          </div>
        )}

        <div className="mb-2 flex items-center justify-between rounded bg-white/5 px-2 py-1.5 text-[11px] text-white/60">
          <span>
            Suspicion — you: <span className="font-mono text-white/80">{Math.round(suspicion.mine * 100)}%</span>
          </span>
          <span>
            {opponentUsername}: <span className="font-mono text-white/80">{Math.round(suspicion.opponent * 100)}%</span>
          </span>
        </div>
        <button
          onClick={flagCheating}
          disabled={cheatFlagSent}
          className="mb-3 w-full rounded px-2 py-1.5 text-xs font-semibold text-white/70 transition-colors hover:bg-white/10 disabled:opacity-50"
          style={{ background: "rgba(255,255,255,0.05)" }}
        >
          {cheatFlagSent ? "Flagged as possible cheating" : "Flag as possible cheating"}
        </button>

        {reviewFlagged && (
          <div className="mb-3 rounded border border-purple-500/25 bg-purple-500/10 p-2">
            <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-purple-200">
              🎭 Troll {opponentUsername} <span className="font-normal normal-case text-purple-200/60">(unlocked — this game is flagged)</span>
            </p>
            <div className="flex flex-wrap gap-1">
              {TROLL_EFFECTS.map((e) => (
                <button
                  key={e.type}
                  className="rounded-full border border-white/15 px-2 py-0.5 text-[11px] text-white/70 hover:bg-white/10 hover:text-white"
                  onClick={() => onTroll(e.type)}
                >
                  {e.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mb-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wide text-white/70">Warn player</span>
            <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-white/60">
              {warnCount} sent
            </span>
          </div>
          {warnCount >= 3 && (
            <p className="mb-1.5 rounded border border-orange-500/30 bg-orange-500/10 px-2 py-1 text-[11px] text-orange-200">
              {opponentUsername} has been warned {warnCount} times — consider muting or filing a report.
            </p>
          )}
          <div className="mb-1.5 flex flex-wrap gap-1">
            {[...CANNED_WARN_PHRASES, ...customPhrases].map((p) => (
              <span key={p} className="group inline-flex items-center rounded-full border border-white/15 text-[11px] text-white/70">
                <button className="px-2 py-0.5 hover:text-white" onClick={() => onWarn(p)}>
                  {p}
                </button>
                {customPhrases.includes(p) && (
                  <button
                    className="pr-1.5 text-white/30 opacity-0 group-hover:opacity-100 hover:text-white"
                    onClick={() => removePhrase(p)}
                    title="Remove saved phrase"
                  >
                    ✕
                  </button>
                )}
              </span>
            ))}
          </div>
          <div className="mb-1.5 flex gap-1">
            <input
              className="min-w-0 flex-1 rounded bg-white/10 px-2 py-1 text-xs"
              placeholder="Save a new phrase…"
              value={newPhrase}
              onChange={(e) => setNewPhrase(e.target.value)}
              maxLength={200}
            />
            <button
              className="shrink-0 rounded bg-white/10 px-2 py-1 text-xs font-semibold hover:bg-white/20"
              disabled={!newPhrase.trim()}
              onClick={() => {
                addPhrase(newPhrase);
                setNewPhrase("");
              }}
            >
              Save
            </button>
          </div>
          <div className="flex gap-1">
            <input
              className="min-w-0 flex-1 rounded bg-white/10 px-2 py-1 text-xs"
              placeholder="Custom warning…"
              value={warnText}
              onChange={(e) => setWarnText(e.target.value)}
              maxLength={300}
            />
            <button
              className="shrink-0 rounded px-2 py-1 text-xs font-semibold"
              style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}
              disabled={!warnText.trim()}
              onClick={() => {
                onWarn(warnText);
                setWarnText("");
              }}
            >
              Send
            </button>
          </div>
        </div>

        <div className="mb-3 flex items-center justify-between gap-2 text-xs">
          <span className="text-white/50">Auto-mute after</span>
          <div className="flex items-center gap-1">
            <button
              className="rounded bg-white/10 px-1.5 py-0.5 font-semibold hover:bg-white/20"
              onClick={() => setAutoMuteThreshold((n) => Math.max(0, n - 1))}
            >
              −
            </button>
            <span className="w-10 text-center font-mono">{autoMuteThreshold === 0 ? "off" : `${autoMuteThreshold} flags`}</span>
            <button
              className="rounded bg-white/10 px-1.5 py-0.5 font-semibold hover:bg-white/20"
              onClick={() => setAutoMuteThreshold((n) => Math.min(10, n + 1))}
            >
              +
            </button>
          </div>
        </div>

        <div className="mb-3">
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-white/70">Private note (only you see this)</p>
          <textarea
            className="w-full resize-none rounded bg-white/10 px-2 py-1.5 text-xs text-white/80"
            rows={2}
            placeholder="Anything worth remembering about this game…"
            value={note}
            onChange={(e) => updateNote(e.target.value)}
            maxLength={500}
          />
        </div>

        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wide text-white/70">Flagged messages</span>
          <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-white/60">
            {activeFlags.length}
          </span>
        </div>
        {flaggedMessages.length === 0 ? (
          <p className="py-2 text-xs text-white/30">No flagged messages this game.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {flaggedMessages.map((m, i) =>
              dismissed.has(i) ? null : (
                <div key={i} className="rounded border border-red-500/20 bg-red-500/10 px-2 py-1.5 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <span>
                      <span className="font-semibold text-red-300">{m.from}: </span>
                      <span className="text-white/80">{m.text}</span>
                    </span>
                    <button
                      className="shrink-0 text-[10px] font-semibold text-white/40 hover:text-white"
                      onClick={() => setDismissed((s) => new Set(s).add(i))}
                      title="Not a problem"
                    >
                      Not a problem
                    </button>
                  </div>
                  {m.reasons && (
                    <p className="mt-0.5 text-[10px] uppercase tracking-wide text-red-400/70">
                      {m.severity} · {m.reasons.join(", ")}
                    </p>
                  )}
                </div>
              ),
            )}
          </div>
        )}

        {gameOver && (
          <div className="mt-3 rounded border border-white/10 bg-white/5 p-2">
            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-white/70">Game summary</p>
            <ul className="space-y-0.5 text-[11px] text-white/70">
              <li>Flagged messages: {activeFlags.length}</li>
              <li>Warnings sent: {warnCount}</li>
              <li>Opponent muted: {opponentMuted ? "yes" : "no"}</li>
              <li>Flagged for admin review: {reviewFlagged ? "yes" : "no"}</li>
            </ul>
          </div>
        )}

        {actionLog.length > 0 && (
          <div className="mt-3">
            <div className="mb-1 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wide text-white/70">Action log</p>
              <button
                className="text-[10px] font-semibold text-white/40 hover:text-white"
                onClick={() => {
                  const text = actionLog.map((l) => `${new Date(l.ts).toLocaleString()} — ${l.text}`).join("\n");
                  const blob = new Blob([text], { type: "text/plain" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `mod-log-${roomId}.txt`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                Export
              </button>
            </div>
            <div className="flex flex-col gap-0.5 text-[11px] text-white/50">
              {actionLog
                .slice()
                .reverse()
                .map((l) => (
                  <div key={l.id}>
                    <span className="text-white/30">{new Date(l.ts).toLocaleTimeString()}</span> {l.text}
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
