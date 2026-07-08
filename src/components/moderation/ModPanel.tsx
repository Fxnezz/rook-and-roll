"use client";

import { IconShield } from "@/components/ui/icons";

export interface ModPanelProps {
  onClose: () => void;
  opponentUsername: string;
  flaggedMessages: { from: string; text: string; ts: number }[];
}

/**
 * In-game moderator panel — only ever rendered for the one designated
 * account (session.user.isModerator), and only inside a room they are
 * personally playing in right now. Structurally mirrors CheatPanel (fixed
 * floating panel) but opened from a header icon instead of a key sequence,
 * since this isn't meant to be secret — the 🛡 badge already announces it.
 */
export function ModPanel({ onClose, opponentUsername, flaggedMessages }: ModPanelProps) {
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
