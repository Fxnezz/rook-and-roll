"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { DEFAULT_THEME, type BoardThemeId } from "./themes";
import type { PieceSetId } from "@/lib/pieces";
import { setSoundEnabled, setSoundVolume } from "./sound";

export type MoveInputMode = "drag" | "click" | "both";
export type AnimationSpeed = "instant" | "fast" | "normal" | "slow";
export type BoardFrame = "none" | "wood" | "minimal" | "shadow";
export type SoundPack = "classic" | "retro" | "soft" | "wood";

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
  /** Require a second click on the destination square to commit a move. */
  confirmMove: boolean;
  /** Always promote to queen without showing the picker (hold shift for the picker). */
  autoQueen: boolean;
  /** Which input gestures the board accepts. */
  moveInputMode: MoveInputMode;
  /** Overrides the active theme's light/dark square colors when set. */
  squareColorOverride: { light: string; dark: string } | null;
  /** Piece size as a percentage of the square (70-100). */
  pieceSize: number;
  animationSpeed: AnimationSpeed;
  /** Color used for hand-drawn arrows/annotations. */
  arrowColor: string;
  highContrast: boolean;
  colorblindMode: boolean;
  soundPack: SoundPack;
  boardFrame: BoardFrame;
  compactMoveList: boolean;
  /** Play a sound whenever the opponent makes a move (separate from your own move sound). */
  opponentMoveSound: boolean;
  /** Board render size as a percentage (80-140) of its available width. */
  boardZoom: number;
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
  confirmMove: false,
  autoQueen: false,
  moveInputMode: "both",
  squareColorOverride: null,
  pieceSize: 100,
  animationSpeed: "normal",
  arrowColor: "#f2b544",
  highContrast: false,
  colorblindMode: false,
  soundPack: "classic",
  boardFrame: "none",
  compactMoveList: false,
  opponentMoveSound: true,
  boardZoom: 100,
};

const STORAGE_KEY = "rr.settings.v1";

/** Multiplier applied to piece-slide animation durations (see globals.css `--anim-speed-scale`). */
const ANIM_SPEED_SCALE: Record<AnimationSpeed, number> = {
  instant: 0,
  fast: 0.5,
  normal: 1,
  slow: 1.8,
};

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

  // Same data-attribute pattern for the other app-wide visual toggles, so
  // globals.css (and any component) can react without prop drilling.
  useEffect(() => {
    document.documentElement.dataset.contrast = settings.highContrast ? "high" : "normal";
    document.documentElement.dataset.colorblind = settings.colorblindMode ? "true" : "false";
    document.documentElement.style.setProperty("--anim-speed-scale", ANIM_SPEED_SCALE[settings.animationSpeed].toString());
  }, [settings.highContrast, settings.colorblindMode, settings.animationSpeed]);

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
