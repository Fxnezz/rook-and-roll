"use client";

import { useEffect } from "react";
import { useToasts } from "@/lib/hooks/useToasts";
import { ToastStack } from "./ToastStack";

/** Site-wide: mounted once in Providers. Every arcade/racing/platformer game
 * reports scores through the shared useHighScore hook, so listening for its
 * "rr:new-highscore" event here celebrates a beaten personal best on any
 * game without each one needing its own toast plumbing. */
export function HighScoreCelebration() {
  const { toasts, push, clear } = useToasts();

  useEffect(() => {
    const onNewHighScore = (e: Event) => {
      const { score } = (e as CustomEvent<{ game: string; score: number }>).detail;
      push(`🎉 New high score: ${score.toLocaleString()}!`);
    };
    window.addEventListener("rr:new-highscore", onNewHighScore);
    return () => window.removeEventListener("rr:new-highscore", onNewHighScore);
  }, [push]);

  return <ToastStack toasts={toasts} onClear={clear} />;
}
