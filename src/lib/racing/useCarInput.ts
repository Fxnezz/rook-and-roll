"use client";

import { useEffect, useRef } from "react";
import type { CarInput } from "./carPhysics";

/** Shared input state for keyboard + on-screen touch controls, read each frame. */
export function useCarInput() {
  const inputRef = useRef<CarInput>({ throttle: 0, steer: 0 });
  const keys = useRef<Set<string>>(new Set());

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "a", "s", "d"].includes(e.key)) e.preventDefault();
      keys.current.add(e.key.toLowerCase());
      recompute();
    };
    const up = (e: KeyboardEvent) => {
      keys.current.delete(e.key.toLowerCase());
      recompute();
    };
    const recompute = () => {
      const k = keys.current;
      let throttle = 0;
      let steer = 0;
      if (k.has("arrowup") || k.has("w")) throttle += 1;
      if (k.has("arrowdown") || k.has("s")) throttle -= 1;
      if (k.has("arrowleft") || k.has("a")) steer -= 1;
      if (k.has("arrowright") || k.has("d")) steer += 1;
      inputRef.current = { throttle, steer };
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  /** For on-screen touch buttons: hold-to-set, release-to-clear. */
  const setTouch = (field: keyof CarInput, value: number) => {
    inputRef.current = { ...inputRef.current, [field]: value };
  };

  return { inputRef, setTouch };
}
