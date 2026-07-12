"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { DEFAULT_THEME, type BoardThemeId } from "./themes";
import type { PieceSetId } from "@/lib/pieces";
import { setSoundEnabled, setSoundVolume, setUiVolume, setSoundPack, type SoundPack } from "./sound";

export type MoveInputMode = "drag" | "click" | "both";
export type AnimationSpeed = "instant" | "fast" | "normal" | "slow";
export type BoardFrame = "none" | "wood" | "minimal" | "shadow";
export type CoordinateStyle = "inside" | "outside";
export type UiTextScale = "small" | "normal" | "large";
export type DefaultGameTab = "moves" | "analysis" | "share";

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
  /** Always promote to queen without showing the picker. */
  autoQueen: boolean;
  /** Allow picking a move for the not-yet-active side (online/bot play only). */
  premovesEnabled: boolean;
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
  /** Read each move aloud via the browser's speech synthesis (accessibility). */
  speechAnnounceMoves: boolean;
  /** Show figurine (piece-glyph) notation instead of letters in move lists. */
  figurineNotation: boolean;
  /** Play a sound when a new chat message arrives. */
  chatSound: boolean;
  /** Moderator-only: play a distinct sound when a flagged chat message arrives. */
  modFlaggedSound: boolean;
  /** Moderator-only: hide all in-game moderation UI (badge, shield icon, ModPanel) and act like a normal player. */
  modHideUI: boolean;
  /** Where file/rank labels render: inside the edge squares, or in a margin outside the 8x8 grid. */
  coordinateStyle: CoordinateStyle;
  /** Show the captured-pieces tray above/below the board. */
  showCapturedTray: boolean;
  /** Volume for UI/notification sounds (chat, notify), independent of move-sound volume. */
  uiVolume: number;
  /** Vibrate briefly on move/capture/check (devices that support the Vibration API). */
  hapticFeedback: boolean;
  /** Swap body text to a dyslexia-friendly typeface. */
  dyslexiaFont: boolean;
  /** Scales UI text size (move list, chat, menus) independent of board zoom. */
  uiTextScale: UiTextScale;
  /** Which tab (Moves/Analysis/Share) opens by default on bot/online game pages. */
  defaultGameTab: DefaultGameTab;
  /** Automatically run engine analysis when a game ends, instead of requiring a manual "Analyze game" click. */
  autoAnalyze: boolean;
  /** Seconds remaining at which a clock switches to its low-time (critical) warning visual/sound. */
  lowTimeThresholdSec: number;
  /** Bot/Pass-and-play only: skip the (default 3-per-side) takeback cap since there's no opponent to be unfair to. Online games always enforce the server-side cap regardless of this. */
  unlimitedTakebacks: boolean;
  /** Briefly flash the screen edge on move/capture/check/illegal sounds — a visual pairing for deaf/hard-of-hearing players. */
  flashOnSound: boolean;
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
  premovesEnabled: true,
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
  speechAnnounceMoves: false,
  figurineNotation: false,
  chatSound: true,
  modFlaggedSound: true,
  modHideUI: false,
  coordinateStyle: "inside",
  showCapturedTray: true,
  uiVolume: 0.6,
  hapticFeedback: false,
  dyslexiaFont: false,
  uiTextScale: "normal",
  defaultGameTab: "moves",
  autoAnalyze: false,
  lowTimeThresholdSec: 10,
  unlimitedTakebacks: false,
  flashOnSound: false,
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
    setUiVolume(settings.uiVolume);
    setSoundPack(settings.soundPack);
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

  // Dyslexia-friendly font + UI text scale — same data-attribute pattern.
  useEffect(() => {
    document.documentElement.dataset.dyslexiaFont = settings.dyslexiaFont ? "true" : "false";
    document.documentElement.dataset.textScale = settings.uiTextScale;
  }, [settings.dyslexiaFont, settings.uiTextScale]);

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
