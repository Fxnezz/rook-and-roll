"use client";

import { useCallback, useRef, useState } from "react";

export interface Toast {
  id: number;
  text: string;
}

/** Minimal transient toast stack — push a message, it auto-dismisses after `ms`. */
export function useToasts(ms = 4000) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const push = useCallback(
    (text: string) => {
      const id = nextId.current++;
      setToasts((t) => [...t, { id, text }]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), ms);
    },
    [ms],
  );

  return { toasts, push };
}
