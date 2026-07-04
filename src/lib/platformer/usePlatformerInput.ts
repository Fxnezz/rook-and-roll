"use client";

import { useEffect, useRef } from "react";

export interface RawInput {
  left: boolean;
  right: boolean;
  jumpDown: boolean;
}

/** Tracks raw held-key/touch state; the game loop derives edge-triggered jump itself. */
export function usePlatformerInput() {
  const raw = useRef<RawInput>({ left: false, right: false, jumpDown: false });
  const keys = useRef<Set<string>>(new Set());

  useEffect(() => {
    const recompute = () => {
      const k = keys.current;
      raw.current = {
        left: k.has("arrowleft") || k.has("a"),
        right: k.has("arrowright") || k.has("d"),
        jumpDown: k.has("arrowup") || k.has("w") || k.has(" "),
      };
    };
    const down = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " ", "w", "a", "s", "d"].includes(e.key)) e.preventDefault();
      keys.current.add(e.key.toLowerCase());
      recompute();
    };
    const up = (e: KeyboardEvent) => {
      keys.current.delete(e.key.toLowerCase());
      recompute();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  const setTouch = (field: keyof RawInput, value: boolean) => {
    raw.current = { ...raw.current, [field]: value };
  };

  return { raw, setTouch };
}
