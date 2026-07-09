"use client";

import { useEffect, useRef } from "react";
import type { TrollEffectMsg } from "@/lib/online/protocol";

/** Effects implemented as a pure CSS class toggle on the board container ref — every new one is just a table entry + a globals.css class. */
const BOARD_CSS_EFFECTS: Partial<Record<TrollEffectMsg["type"], string>> = {
  wobbleBoard: "troll-wobble",
  rainbowSquares: "troll-rainbow",
  invertColors: "troll-invert",
};

const DEFAULT_DURATION_MS: Partial<Record<TrollEffectMsg["type"], number>> = {
  wobbleBoard: 3000,
  rainbowSquares: 4000,
  invertColors: 5000,
};

/**
 * Owns every troll effect's client-side side-effect and auto-revert timer.
 * Mounted once per page (play/online, watch/[roomId]), fed `state.trollEffect`
 * from useOnlineGame. Board-CSS effects are handled entirely here by toggling
 * a class on `boardContainerRef`; effects that need real overlay DOM content
 * (fake banners, confetti, chat bubbles, etc.) are added in later batches and
 * rendered by <TrollEffectOverlay>, which this hook does not know about.
 */
export function useTrollEffects(trollEffect: TrollEffectMsg | null, boardContainerRef: React.RefObject<HTMLElement | null>) {
  const prevSeq = useRef(0);

  useEffect(() => {
    if (!trollEffect || trollEffect.seq === prevSeq.current) return;
    prevSeq.current = trollEffect.seq;

    const cls = BOARD_CSS_EFFECTS[trollEffect.type];
    const el = boardContainerRef.current;
    if (!cls || !el) return;

    el.classList.remove(cls); // restart the animation even if it's still running from a prior fire
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    void el.offsetWidth; // force reflow so the removed class is observed before re-adding
    el.classList.add(cls);

    const duration = trollEffect.durationMs ?? DEFAULT_DURATION_MS[trollEffect.type] ?? 3000;
    const t = setTimeout(() => el.classList.remove(cls), duration);
    return () => clearTimeout(t);
  }, [trollEffect, boardContainerRef]);
}
