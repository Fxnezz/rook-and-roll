"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { IconShield, IconVolumeOff, IconVolume } from "@/components/ui/icons";

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

export interface ModPanelProps {
  onClose: () => void;
  opponentUsername: string;
  flaggedMessages: { from: string; text: string; ts: number; severity?: "low" | "medium" | "high"; reasons?: string[] }[];
  opponentMuted: boolean;
  onToggleMute: () => void;
  warnCount: number;
  onWarn: (text: string) => void;
  paused: boolean;
  onTogglePause: () => void;
  reviewFlagged: boolean;
  onToggleFlagReview: () => void;
  suspicion: { mine: number; opponent: number };
  gameOver: boolean;
  actionLog: { id: number; text: string; ts: number }[];
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
}: ModPanelProps) {
  const [autoMuteThreshold, setAutoMuteThreshold] = useState(3); // 0 = off
  const [suggestDismissed, setSuggestDismissed] = useState(false);
  const [warnText, setWarnText] = useState("");
  const [confirmingPause, setConfirmingPause] = useState(false);
  const [context, setContext] = useState<PlayerContext | null>(null);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());
  const autoMutedRef = useRef(false);

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
      return;
    }
    if (!confirmingPause) {
      setConfirmingPause(true);
      setTimeout(() => setConfirmingPause(false), 3000);
      return;
    }
    setConfirmingPause(false);
    onTogglePause();
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
      onToggleMute();
    }
  }, [activeFlags.length, autoMuteThreshold, opponentMuted, onToggleMute]);

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

        <button
          onClick={onToggleMute}
          className="mb-3 flex w-full items-center justify-center gap-1.5 rounded px-2 py-1.5 text-xs font-semibold transition-colors"
          style={{
            background: opponentMuted ? "var(--accent)" : "rgba(255,255,255,0.08)",
            color: opponentMuted ? "var(--accent-contrast)" : "white",
          }}
        >
          {opponentMuted ? <IconVolumeOff width={13} height={13} /> : <IconVolume width={13} height={13} />}
          {opponentMuted ? `Unmute ${opponentUsername}` : `Mute ${opponentUsername}`}
        </button>

        {showSuggestion && (
          <div className="mb-3 flex items-center justify-between gap-2 rounded border border-yellow-500/30 bg-yellow-500/10 px-2 py-1.5 text-xs">
            <span className="text-yellow-200">{hasHighSeverity ? "Flagged chat detected — mute?" : "Minor issue detected — warn?"}</span>
            <span className="flex shrink-0 gap-1">
              {hasHighSeverity ? (
                <button className="rounded bg-white/10 px-1.5 py-0.5 font-semibold hover:bg-white/20" onClick={onToggleMute}>
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
              onClick={onToggleFlagReview}
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

        <div className="mb-3 flex items-center justify-between rounded bg-white/5 px-2 py-1.5 text-[11px] text-white/60">
          <span>
            Suspicion — you: <span className="font-mono text-white/80">{Math.round(suspicion.mine * 100)}%</span>
          </span>
          <span>
            {opponentUsername}: <span className="font-mono text-white/80">{Math.round(suspicion.opponent * 100)}%</span>
          </span>
        </div>

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
            {CANNED_WARN_PHRASES.map((p) => (
              <button
                key={p}
                className="rounded-full border border-white/15 px-2 py-0.5 text-[11px] text-white/70 hover:text-white"
                onClick={() => onWarn(p)}
              >
                {p}
              </button>
            ))}
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
            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-white/70">Action log</p>
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
