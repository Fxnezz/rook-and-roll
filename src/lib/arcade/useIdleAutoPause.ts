"use client";

import { useEffect, useRef } from "react";

/**
 * Calls `onIdle` once after `timeoutMs` of no mouse/keyboard/touch activity,
 * and whenever the tab is hidden — so a forgotten timed arcade game pauses
 * itself instead of silently racking up a "score" nobody was playing for.
 * Only active while `enabled` is true (e.g. a running, unpaused game).
 */
export function useIdleAutoPause(onIdle: () => void, enabled: boolean, timeoutMs = 20_000) {
  const onIdleRef = useRef(onIdle);
  onIdleRef.current = onIdle;

  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => onIdleRef.current(), timeoutMs);
    };
    const onVisibility = () => {
      if (document.hidden) onIdleRef.current();
    };
    const events = ["mousemove", "mousedown", "keydown", "touchstart"] as const;
    events.forEach((ev) => window.addEventListener(ev, reset));
    document.addEventListener("visibilitychange", onVisibility);
    reset();
    return () => {
      clearTimeout(timer);
      events.forEach((ev) => window.removeEventListener(ev, reset));
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled, timeoutMs]);
}
