"use client";

import { useEffect, useRef, useState } from "react";
import type { TrollEffectMsg, TrollEffectType } from "@/lib/online/protocol";
import { PIECE_SETS, type PieceSetId } from "@/lib/pieces";

/** Effects implemented as a pure CSS class toggle on the board container ref — every new one is just a table entry + a globals.css class. */
const BOARD_CSS_EFFECTS: Partial<Record<TrollEffectType, string>> = {
  wobbleBoard: "troll-wobble",
  rainbowSquares: "troll-rainbow",
  invertColors: "troll-invert",
  flipBoard: "troll-flip",
  tinyBoard: "troll-tiny",
  giantBoard: "troll-giant",
  blackoutBoard: "troll-blackout",
  fakeLowTime: "troll-lowtime",
  clockJitter: "troll-jitter",
};

const DEFAULT_DURATION_MS: Partial<Record<TrollEffectType, number>> = {
  wobbleBoard: 3000,
  rainbowSquares: 4000,
  invertColors: 5000,
  flipBoard: 4000,
  tinyBoard: 4000,
  giantBoard: 4000,
  blackoutBoard: 3000,
  reskinPieces: 5000,
  fakeInCheck: 2200,
  fakeArrow: 2500,
  fakeLowTime: 3000,
  fakeLag: 2200,
  clockJitter: 2500,
};

/** Effects rendered as real overlay DOM (via <TrollEffectOverlay>) rather than a CSS class on the container. */
const OVERLAY_EFFECT_TYPES = new Set<TrollEffectType>(["fakeInCheck", "fakeArrow", "fakeLag"]);

export interface OverlayEffectState {
  type: "fakeInCheck" | "fakeArrow" | "fakeLag";
  /** Randomized once per fire so repeat fakeArrow trolls don't always point the same way. */
  arrow?: { x1: number; y1: number; x2: number; y2: number };
}

/**
 * Owns every troll effect's client-side side-effect and auto-revert timer.
 * Mounted once per page (play/online, watch/[roomId]), fed `state.trollEffect`
 * from useOnlineGame. Board-CSS effects are handled entirely here by toggling
 * a class on `boardContainerRef`; effects that need real overlay DOM content
 * (fake banners, confetti, chat bubbles, etc.) are added in later batches and
 * rendered by <TrollEffectOverlay>, which this hook does not know about.
 *
 * `reskinPieces` is the one effect that needs more than a CSS class — <Board>
 * takes `pieceSet` as a prop, so the hook returns a `pieceSetOverride` for the
 * page to splice in as `pieceSet={pieceSetOverride ?? settings.pieceSet}`.
 */
export function useTrollEffects(trollEffect: TrollEffectMsg | null, boardContainerRef: React.RefObject<HTMLElement | null>) {
  const prevSeq = useRef(0);
  const [pieceSetOverride, setPieceSetOverride] = useState<PieceSetId | null>(null);
  const [overlayEffect, setOverlayEffect] = useState<OverlayEffectState | null>(null);

  useEffect(() => {
    if (!trollEffect || trollEffect.seq === prevSeq.current) return;
    prevSeq.current = trollEffect.seq;

    if (trollEffect.type === "reskinPieces") {
      const others = PIECE_SETS.filter((p) => p.id !== pieceSetOverride);
      const next = others[Math.floor(Math.random() * others.length)]?.id ?? PIECE_SETS[0].id;
      setPieceSetOverride(next);
      const duration = trollEffect.durationMs ?? DEFAULT_DURATION_MS.reskinPieces ?? 5000;
      const t = setTimeout(() => setPieceSetOverride(null), duration);
      return () => clearTimeout(t);
    }

    if (OVERLAY_EFFECT_TYPES.has(trollEffect.type)) {
      const type = trollEffect.type as OverlayEffectState["type"];
      const arrow =
        type === "fakeArrow"
          ? {
              x1: 20 + Math.random() * 20,
              y1: 25 + Math.random() * 15,
              x2: 55 + Math.random() * 25,
              y2: 60 + Math.random() * 15,
            }
          : undefined;
      setOverlayEffect({ type, arrow });
      const duration = trollEffect.durationMs ?? DEFAULT_DURATION_MS[trollEffect.type] ?? 2200;
      const t = setTimeout(() => setOverlayEffect(null), duration);
      return () => clearTimeout(t);
    }

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trollEffect, boardContainerRef]);

  return { pieceSetOverride, overlayEffect };
}
