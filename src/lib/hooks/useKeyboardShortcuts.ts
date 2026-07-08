"use client";

import { useEffect, useRef } from "react";

export interface ShortcutHandlers {
  onFlip?: () => void;
  onStepBack?: () => void;
  onStepForward?: () => void;
  onGoStart?: () => void;
  onGoLive?: () => void;
  onOfferDraw?: () => void;
  onAcceptDraw?: () => void;
  onToggleHelp?: () => void;
  /** Online play only: switch to the Chat tab and focus its message input. */
  onFocusChat?: () => void;
}

/** Global chess-page keyboard shortcuts. Ignored while typing in an input/textarea. */
export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  const ref = useRef(handlers);
  ref.current = handlers;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const h = ref.current;
      switch (e.key) {
        case "f":
        case "F":
          h.onFlip?.();
          break;
        case "ArrowLeft":
          h.onStepBack?.();
          break;
        case "ArrowRight":
          h.onStepForward?.();
          break;
        case "Home":
          h.onGoStart?.();
          break;
        case "End":
          h.onGoLive?.();
          break;
        case "d":
        case "D":
          h.onOfferDraw?.();
          break;
        case "a":
        case "A":
          h.onAcceptDraw?.();
          break;
        case "?":
          h.onToggleHelp?.();
          break;
        case "/":
          h.onFocusChat?.();
          break;
        default:
          return;
      }
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
