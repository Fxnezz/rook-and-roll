"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { DEFAULT_THEME, type BoardThemeId } from "./themes";
import type { PieceSetId } from "@/lib/pieces";
import { setSoundEnabled, setSoundVolume, setUiVolume, setSoundPack, setNotifySoundPack, type SoundPack } from "./sound";

export type MoveInputMode = "drag" | "click" | "both";
export type AnimationSpeed = "instant" | "fast" | "normal" | "slow";
export type BoardFrame = "none" | "wood" | "minimal" | "shadow";
export type CoordinateStyle = "inside" | "outside";
export type UiTextScale = "small" | "normal" | "large";
export type DefaultGameTab = "moves" | "analysis" | "share";
export type HighlightStyle = "solid" | "pulse";
export type UiFontFamily = "system" | "serif" | "mono";
export type MoveAnnounceVerbosity = "minimal" | "standard" | "detailed";

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
  /** Separate tone choice for just the notification "ding" (bell/achievement/toast), independent of the move/game soundPack. */
  notifySoundPack: SoundPack;
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
  /** Engine search depth used by game review and live eval widgets: 8 = quick, 12 = standard, 16 = deep (slower). */
  analysisDepth: 8 | 12 | 16;
  /** Blindfold training: hide all pieces during bot games (moves still work). */
  blindfoldBot: boolean;
  /** Hint strength: "best" shows the engine's top move; "second-best" shows its #2 choice — a lighter nudge that still requires you to find the strongest move yourself. */
  hintMode: "best" | "second-best";
  /** When on, arcade/racing/platformer scores aren't recorded as a personal best or submitted to leaderboards — a way to try a game without it counting. */
  arcadePracticeMode: boolean;
  /** Visual treatment for the last-move/check square highlight: a steady tint, or a pulsing animation. */
  highlightStyle: HighlightStyle;
  /** Overrides the board theme's coordinate label color when set (null = use the theme default). */
  coordinateColor: string | null;
  /** Show OS-level desktop notifications (via the browser Notification API) when a new site notification arrives while the tab is hidden. Requesting this also triggers the browser's permission prompt. */
  desktopNotifications: boolean;
  /** Body-text typeface: system sans, a serif, or monospace. */
  uiFontFamily: UiFontFamily;
  /** Line-height multiplier applied to body/UI text (1.2-2.0). */
  uiLineHeight: number;
  /** Replace translucent/blurred panels (header, dropdowns) with solid backgrounds. */
  reduceTransparency: boolean;
  /** Color used for the visible focus ring on interactive elements. */
  focusOutlineColor: string;
  /** How much detail speechAnnounceMoves reads aloud: minimal (just the move), standard (+ check/capture), detailed (+ piece/square names). */
  moveAnnounceVerbosity: MoveAnnounceVerbosity;
  /** Always underline inline links, not just on hover. */
  underlineLinks: boolean;
  /** Increase the minimum size of buttons/icon-buttons/inputs for easier touch/click targeting. */
  largeTouchTargets: boolean;
  /** Stop blinking on in-app blinking indicators (e.g. the "thinking" dots) — browsers don't expose control over the native text-cursor blink rate, so this targets the closest in-app equivalent. */
  reducedCaretBlink: boolean;
  /** Show a small persistent icon/badge when sound is muted, so the muted state is visible without hovering the header button. */
  soundMutedIndicator: boolean;
  /** Auto-load the next page when a "Load more" sentinel scrolls into view, instead of requiring a click. */
  infiniteScrollLists: boolean;
  /** Show a short scripted speech-bubble line from the bot on capture/check/checkmate moves. */
  botBanter: boolean;
  /** Bot skill nudges up/down a notch based on your recent win/loss streak against it, on rematch. */
  adaptiveBotDifficulty: boolean;
  /** Show confetti/particle celebrations on wins (checkmate, arcade high scores, etc). Doesn't affect moderator troll effects. */
  confettiEnabled: boolean;
  /** Which corner/edge toasts (high-score celebrations, copy confirmations, etc) appear from. */
  toastPosition: "bottom-center" | "top-center" | "bottom-right" | "top-right";
  /** Denser spacing/padding across panels and lists, for fitting more on screen. */
  compactUi: boolean;
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
  notifySoundPack: "classic",
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
  analysisDepth: 12,
  blindfoldBot: false,
  hintMode: "best",
  arcadePracticeMode: false,
  highlightStyle: "solid",
  coordinateColor: null,
  desktopNotifications: false,
  uiFontFamily: "system",
  uiLineHeight: 1.5,
  reduceTransparency: false,
  focusOutlineColor: "#5b8dee",
  moveAnnounceVerbosity: "standard",
  underlineLinks: false,
  largeTouchTargets: false,
  reducedCaretBlink: false,
  soundMutedIndicator: false,
  infiniteScrollLists: false,
  botBanter: false,
  adaptiveBotDifficulty: false,
  confettiEnabled: true,
  toastPosition: "bottom-center",
  compactUi: false,
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
    setNotifySoundPack(settings.notifySoundPack);
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

  // Last-move highlight style (solid vs pulse) + coordinate label color override —
  // set globally so <Board> doesn't need every settings field prop-drilled through
  // the many pages that render it.
  useEffect(() => {
    document.documentElement.dataset.highlight = settings.highlightStyle;
    if (settings.coordinateColor) {
      document.documentElement.style.setProperty("--coord-color-override", settings.coordinateColor);
    } else {
      document.documentElement.style.removeProperty("--coord-color-override");
    }
  }, [settings.highlightStyle, settings.coordinateColor]);

  // Batch F accessibility toggles — same data-attribute/CSS-var pattern.
  useEffect(() => {
    document.documentElement.dataset.fontFamily = settings.uiFontFamily;
    document.documentElement.style.setProperty("--ui-line-height", settings.uiLineHeight.toString());
    document.documentElement.dataset.transparency = settings.reduceTransparency ? "reduced" : "normal";
    document.documentElement.style.setProperty("--focus-color", settings.focusOutlineColor);
    document.documentElement.dataset.underlineLinks = settings.underlineLinks ? "true" : "false";
    document.documentElement.dataset.touchTargets = settings.largeTouchTargets ? "large" : "normal";
    document.documentElement.dataset.caretBlink = settings.reducedCaretBlink ? "off" : "on";
    // Not a CSS hook — Board.tsx reads this dataset value directly to build its
    // speech/aria-live announcement text, since that setting isn't worth prop-drilling
    // through the ~8 pages that render <Board>.
    document.documentElement.dataset.moveAnnounceVerbosity = settings.moveAnnounceVerbosity;
  }, [
    settings.uiFontFamily,
    settings.uiLineHeight,
    settings.reduceTransparency,
    settings.focusOutlineColor,
    settings.underlineLinks,
    settings.largeTouchTargets,
    settings.reducedCaretBlink,
    settings.moveAnnounceVerbosity,
  ]);

  // Batch J: compact-UI density hook.
  useEffect(() => {
    document.documentElement.dataset.density = settings.compactUi ? "compact" : "normal";
  }, [settings.compactUi]);

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
