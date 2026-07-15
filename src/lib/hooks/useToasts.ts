"use client";

import { useCallback, useRef, useState } from "react";

export interface Toast {
  id: number;
  text: string;
}

const MAX_TOASTS = 4;

/** Minimal transient toast stack — push a message, it auto-dismisses after `ms`. Caps visible toasts at MAX_TOASTS (oldest drop off first). */
export function useToasts(ms = 4000) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const push = useCallback(
    (text: string) => {
      const id = nextId.current++;
      setToasts((t) => [...t, { id, text }].slice(-MAX_TOASTS));
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), ms);
    },
    [ms],
  );

  const clear = useCallback(() => setToasts([]), []);

  return { toasts, push, clear };
}
