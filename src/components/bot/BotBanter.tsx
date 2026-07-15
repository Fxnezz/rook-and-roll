"use client";

import { useEffect, useRef, useState } from "react";

/** Player-facing bot banter bubble — shows a short scripted line on capture/check/checkmate
 * moves, gated by the "Bot banter" setting. Separate from CheatEffects' cheat-only
 * pieceVoiceLines toggle, which is admin/testing-only and gated behind CheatGate. */
export function BotBanter({ voiceLine, enabled }: { voiceLine: { text: string; seq: number } | null; enabled: boolean }) {
  const [bubble, setBubble] = useState<string | null>(null);
  const prevSeq = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (enabled && voiceLine && voiceLine.seq !== prevSeq.current) {
      setBubble(voiceLine.text);
      prevSeq.current = voiceLine.seq;
      const t = setTimeout(() => setBubble(null), 1200);
      return () => clearTimeout(t);
    }
    prevSeq.current = voiceLine?.seq ?? prevSeq.current;
  }, [voiceLine, enabled]);

  if (!bubble) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden" aria-hidden="true">
      <div className="animate-pop absolute left-1/2 top-2 -translate-x-1/2 rounded-full bg-white px-3 py-1 text-xs font-bold text-black shadow-lg">
        {bubble}
      </div>
    </div>
  );
}
