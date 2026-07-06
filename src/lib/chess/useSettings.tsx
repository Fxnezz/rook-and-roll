"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { DEFAULT_THEME, type BoardThemeId } from "./themes";
import type { PieceSetId } from "@/lib/pieces";
import { setSoundEnabled, setSoundVolume } from "./sound";

export interface Settings {
  boardTheme: BoardThemeId;
  pieceSet: PieceSetId;
  soundEnabled: boolean;
  volume: number;
  showCoordinates: boolean;
  showLegalMoves: boolean;
  highlightLastMove: boolean;
  animate: boolean;
  /** Auto-rotate board to the side to move in pass-and-play. */
  autoFlip: boolean;
  /** Cuts UI transition/animation durations to ~0, on top of the OS-level prefers-reduced-motion. */
  reduceMotion: boolean;
}

const DEFAULTS: Settings = {
  boardTheme: DEFAULT_THEME,
  pieceSet: "monarch",
  soundEnabled: true,
  volume: 0.6,
  showCoordinates: true,
  showLegalMoves: true,
  highlightLastMove: true,
  animate: true,
  autoFlip: false,
  reduceMotion: false,
};

const STORAGE_KEY = "rr.settings.v1";

interface SettingsContextValue {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  reset: () => void;
  ready: boolean;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [ready, setReady] = useState(false);

  // Hydrate from localStorage once on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Settings>;
        setSettings((s) => ({ ...s, ...parsed }));
      }
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  // Persist + sync side-effects to the sound engine.
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      /* ignore */
    }
    setSoundEnabled(settings.soundEnabled);
    setSoundVolume(settings.volume);
  }, [settings, ready]);

  // Reflect the reduce-motion preference as a data attribute so globals.css
  // can kill transition/animation durations app-wide without a JS animation
  // library to coordinate with.
  useEffect(() => {
    document.documentElement.dataset.motion = settings.reduceMotion ? "reduced" : "full";
  }, [settings.reduceMotion]);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((s) => ({ ...s, ...patch }));
  }, []);

  const reset = useCallback(() => {
    setSettings(DEFAULTS);
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, update, reset, ready }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within <SettingsProvider>");
  return ctx;
}
