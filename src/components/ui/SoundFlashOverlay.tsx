"use client";

import { useEffect, useState } from "react";
import { useSettings } from "@/lib/chess/useSettings";
import type { SoundName } from "@/lib/chess/sound";

const FLASH_COLOR: Partial<Record<SoundName, string>> = {
  check: "rgba(229, 96, 77, 0.35)",
  illegal: "rgba(229, 96, 77, 0.25)",
  gameEnd: "rgba(233, 162, 59, 0.3)",
};
const DEFAULT_COLOR = "rgba(255, 255, 255, 0.18)";

/** Screen-edge flash paired with move/capture/check/etc sounds — accessibility toggle for deaf/hard-of-hearing players (settings.flashOnSound). */
export function SoundFlashOverlay() {
  const { settings } = useSettings();
  const [active, setActive] = useState<{ color: string; seq: number } | null>(null);

  useEffect(() => {
    if (!settings.flashOnSound) return;
    const onFlash = (e: Event) => {
      const name = (e as CustomEvent<SoundName>).detail;
      setActive((prev) => ({ color: FLASH_COLOR[name] ?? DEFAULT_COLOR, seq: (prev?.seq ?? 0) + 1 }));
    };
    window.addEventListener("rr:sound-flash", onFlash);
    return () => window.removeEventListener("rr:sound-flash", onFlash);
  }, [settings.flashOnSound]);

  useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => setActive(null), 180);
    return () => clearTimeout(t);
  }, [active]);

  if (!settings.flashOnSound || !active) return null;

  return (
    <div
      key={active.seq}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[200]"
      style={{ boxShadow: `inset 0 0 0 8px ${active.color}`, animation: "rr-sound-flash 180ms ease-out" }}
    />
  );
}
