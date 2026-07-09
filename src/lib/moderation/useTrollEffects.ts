"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMsg, TrollEffectMsg, TrollEffectType } from "@/lib/online/protocol";
import { PIECE_SETS, type PieceSetId } from "@/lib/pieces";
import type { SoundName } from "@/lib/chess/sound";

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
  screenFlash: "troll-flash",
  screenShake: "troll-shake",
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
  reverseClockDigits: 4000,
  emojiBurst: 2200,
  moveSoundOverride: 15000,
  screenFlash: 700,
  screenShake: 1300,
};

const DEFAULT_TEXT: Partial<Record<TrollEffectType, string>> = {
  systemAutoReply: "⚙️ System: this game is being monitored for fair play.",
};

const EMOJI_BURST_SET = ["😂", "🤡", "💩", "🙃", "😹", "🎉", "👻", "🫠", "🔥", "🐸"];

/** Effects rendered as real overlay DOM (via <TrollEffectOverlay>) rather than a CSS class on the container. */
const OVERLAY_EFFECT_TYPES = new Set<TrollEffectType>(["fakeInCheck", "fakeArrow", "fakeLag", "emojiBurst"]);

export type OverlayEffectState =
  | { type: "fakeInCheck" | "fakeLag" }
  | { type: "fakeArrow"; arrow: { x1: number; y1: number; x2: number; y2: number } }
  | { type: "emojiBurst"; particles: { emoji: string; leftPct: number; delayMs: number }[] };

/**
 * Owns every troll effect's client-side side-effect and auto-revert timer.
 * Mounted once per page (play/online, watch/[roomId]), fed `state.trollEffect`
 * from useOnlineGame. Board-CSS effects are handled entirely here by toggling
 * a class on `boardContainerRef`; effects that need real overlay DOM content
 * (fake banners, bogus arrows, lag spinners, emoji bursts) are rendered by
 * <TrollEffectOverlay> via the `overlayEffect` return value.
 *
 * `reskinPieces` needs a `pieceSetOverride` (Board takes pieceSet as a prop),
 * `reverseClockDigits` needs a `clockDigitsReversed` boolean threaded into
 * <Clock reversed=…>, `systemAutoReply` appends a fake, purely local ChatMsg
 * to `fakeChatMessages` — never sent through the real chat:send path, so it
 * never reaches the server or the opponent — and `moveSoundOverride` returns
 * a `SoundName` for the page to pass into its own soundFor() calls. Screen
 * effects (screenFlash, screenShake) are just more BOARD_CSS_EFFECTS entries.
 */
export function useTrollEffects(trollEffect: TrollEffectMsg | null, boardContainerRef: React.RefObject<HTMLElement | null>) {
  const prevSeq = useRef(0);
  const [pieceSetOverride, setPieceSetOverride] = useState<PieceSetId | null>(null);
  const [overlayEffect, setOverlayEffect] = useState<OverlayEffectState | null>(null);
  const [clockDigitsReversed, setClockDigitsReversed] = useState(false);
  const [fakeChatMessages, setFakeChatMessages] = useState<ChatMsg[]>([]);
  const [moveSoundOverride, setMoveSoundOverride] = useState<SoundName | null>(null);

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

    if (trollEffect.type === "reverseClockDigits") {
      setClockDigitsReversed(true);
      const duration = trollEffect.durationMs ?? DEFAULT_DURATION_MS.reverseClockDigits ?? 4000;
      const t = setTimeout(() => setClockDigitsReversed(false), duration);
      return () => clearTimeout(t);
    }

    if (trollEffect.type === "moveSoundOverride") {
      setMoveSoundOverride("illegal"); // every move sounds like a buzzer, real legality is untouched
      const duration = trollEffect.durationMs ?? DEFAULT_DURATION_MS.moveSoundOverride ?? 15000;
      const t = setTimeout(() => setMoveSoundOverride(null), duration);
      return () => clearTimeout(t);
    }

    if (trollEffect.type === "systemAutoReply") {
      const text = trollEffect.text?.trim() || DEFAULT_TEXT.systemAutoReply || "";
      setFakeChatMessages((prev) => [...prev, { from: "System", text, ts: Date.now(), system: true }]);
      return;
    }

    if (OVERLAY_EFFECT_TYPES.has(trollEffect.type)) {
      if (trollEffect.type === "fakeArrow") {
        setOverlayEffect({
          type: "fakeArrow",
          arrow: {
            x1: 20 + Math.random() * 20,
            y1: 25 + Math.random() * 15,
            x2: 55 + Math.random() * 25,
            y2: 60 + Math.random() * 15,
          },
        });
      } else if (trollEffect.type === "emojiBurst") {
        const particles = Array.from({ length: 7 }, () => ({
          emoji: EMOJI_BURST_SET[Math.floor(Math.random() * EMOJI_BURST_SET.length)],
          leftPct: 10 + Math.random() * 80,
          delayMs: Math.random() * 400,
        }));
        setOverlayEffect({ type: "emojiBurst", particles });
      } else {
        setOverlayEffect({ type: trollEffect.type as "fakeInCheck" | "fakeLag" });
      }
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

  return { pieceSetOverride, overlayEffect, clockDigitsReversed, fakeChatMessages, moveSoundOverride };
}
