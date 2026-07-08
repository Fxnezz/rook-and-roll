"use client";

import { useEffect, useRef, useState } from "react";
import { IconShield, IconVolumeOff, IconVolume } from "@/components/ui/icons";

export interface ModPanelProps {
  onClose: () => void;
  opponentUsername: string;
  flaggedMessages: { from: string; text: string; ts: number }[];
  opponentMuted: boolean;
  onToggleMute: () => void;
}

/**
 * In-game moderator panel — only ever rendered for the one designated
 * account (session.user.isModerator), and only inside a room they are
 * personally playing in right now. Structurally mirrors CheatPanel (fixed
 * floating panel) but opened from a header icon instead of a key sequence,
 * since this isn't meant to be secret — the 🛡 badge already announces it.
 */
export function ModPanel({ onClose, opponentUsername, flaggedMessages, opponentMuted, onToggleMute }: ModPanelProps) {
  const [autoMuteThreshold, setAutoMuteThreshold] = useState(3); // 0 = off
  const [suggestDismissed, setSuggestDismissed] = useState(false);
  const autoMutedRef = useRef(false);

  // Suggest muting the moment the first flagged message shows up this game.
  const showSuggestion = flaggedMessages.length > 0 && !opponentMuted && !suggestDismissed;

  // Reset the auto-mute guard whenever the moderator manually unmutes, so a
  // fresh run of flags in the same game can trigger it again.
  useEffect(() => {
    if (!opponentMuted) autoMutedRef.current = false;
  }, [opponentMuted]);

  useEffect(() => {
    if (autoMuteThreshold > 0 && !opponentMuted && !autoMutedRef.current && flaggedMessages.length >= autoMuteThreshold) {
      autoMutedRef.current = true;
      onToggleMute();
    }
  }, [flaggedMessages.length, autoMuteThreshold, opponentMuted, onToggleMute]);

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
        <p className="mb-2 text-xs text-white/50">
          Playing against <span className="font-semibold text-white/80">{opponentUsername}</span>
        </p>

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
            <span className="text-yellow-200">Flagged chat detected — mute?</span>
            <span className="flex shrink-0 gap-1">
              <button className="rounded bg-white/10 px-1.5 py-0.5 font-semibold hover:bg-white/20" onClick={onToggleMute}>
                Mute
              </button>
              <button className="rounded px-1.5 py-0.5 text-white/50 hover:text-white" onClick={() => setSuggestDismissed(true)}>
                Dismiss
              </button>
            </span>
          </div>
        )}

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
            {flaggedMessages.length}
          </span>
        </div>
        {flaggedMessages.length === 0 ? (
          <p className="py-2 text-xs text-white/30">No flagged messages this game.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {flaggedMessages.map((m, i) => (
              <div key={i} className="rounded border border-red-500/20 bg-red-500/10 px-2 py-1.5 text-xs">
                <span className="font-semibold text-red-300">{m.from}: </span>
                <span className="text-white/80">{m.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
