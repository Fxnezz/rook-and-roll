"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSettings, type ArcadeQuality } from "@/lib/chess/useSettings";
import { openSettingsPanel } from "@/lib/settings/openSettings";
import styles from "./ArcadeExperience.module.css";

type Scene = "hub" | "chess" | "board" | "table" | "neon" | "space" | "workshop" | "paddock";
type RenderQuality = Exclude<ArcadeQuality, "auto">;

interface SceneProfile {
  scene: Scene;
  eyebrow: string;
  material: string;
}

const CHESS = new Set(["online", "local", "bot", "engine-lab", "variants"]);
const TABLE = new Set([
  "baccarat", "blackjack", "craps", "farkle", "freecell", "pyramid-solitaire", "roulette", "slot-machine",
  "solitaire", "spider-solitaire", "video-poker", "war", "yahtzee",
]);
const SPACE = new Set(["asteroids", "space-invaders", "flappy-rook"]);
const PADDOCK = new Set(["racing", "platformer"]);
const WORKSHOP = new Set([
  "15puzzle", "block-puzzle", "flood-it", "hangman", "hanoi", "klotski", "lights-out", "mastermind",
  "memory", "minesweeper", "peg-solitaire", "sokoban", "sudoku", "word-search", "wordle",
]);
const NEON = new Set([
  "2048", "breakout", "frogger", "match3", "pong", "rock-paper-scissors", "simon", "snake", "tetris", "whackamole",
]);

const QUALITY_LABELS: Record<ArcadeQuality, string> = {
  auto: "Auto",
  ultra: "Ultra",
  smooth: "Smooth",
  calm: "Calm",
};

const QUALITY_ORDER: ArcadeQuality[] = ["auto", "ultra", "smooth", "calm"];

const CONTROL_HINTS: Record<Scene, { icon: string; title: string; detail: string }[]> = {
  hub: [
    { icon: "⌘K", title: "Quick find", detail: "Search the entire collection instantly." },
    { icon: "↵", title: "Open", detail: "Choose any cabinet or tabletop game." },
  ],
  chess: [
    { icon: "♟", title: "Move", detail: "Select a piece, then choose a highlighted square." },
    { icon: "⌘Z", title: "Undo", detail: "Take back a move in supported local modes." },
    { icon: "F", title: "Focus", detail: "Use fullscreen for a tournament-style board." },
  ],
  board: [
    { icon: "●", title: "Play", detail: "Select a piece or legal space to make your move." },
    { icon: "↶", title: "Undo", detail: "Take back the latest casual move or bot round." },
    { icon: "?", title: "Rules", detail: "Open the game-specific rules from the header." },
  ],
  table: [
    { icon: "♠", title: "Play", detail: "Tap cards, chips, and table actions directly." },
    { icon: "↵", title: "Deal", detail: "Primary actions are always highlighted." },
    { icon: "F", title: "Focus", detail: "Fullscreen turns the screen into a private table." },
  ],
  neon: [
    { icon: "WASD", title: "Move", detail: "Most cabinets support arrows or WASD." },
    { icon: "␣", title: "Action", detail: "Use Space, click, or tap for the main action." },
    { icon: "F", title: "Focus", detail: "Fullscreen gives you the complete cabinet view." },
  ],
  space: [
    { icon: "←→", title: "Steer", detail: "Use arrows, WASD, touch, or pointer controls." },
    { icon: "␣", title: "Fire", detail: "Space or tap performs the primary action." },
    { icon: "F", title: "Focus", detail: "Fullscreen maximizes the flight display." },
  ],
  workshop: [
    { icon: "◆", title: "Solve", detail: "Tap, drag, or type depending on the puzzle." },
    { icon: "⌘Z", title: "Undo", detail: "Supported puzzles keep your latest safe move." },
    { icon: "?", title: "Guide", detail: "Hints and rules stay one click away." },
  ],
  paddock: [
    { icon: "WASD", title: "Drive", detail: "Use arrows or WASD, with touch controls on mobile." },
    { icon: "␣", title: "Jump", detail: "Space or the on-screen action button." },
    { icon: "F", title: "Focus", detail: "Fullscreen widens the performance arena." },
  ],
};

function sceneFor(slug: string, hub: boolean): SceneProfile {
  if (hub) return { scene: "hub", eyebrow: "The complete collection", material: "Curated arcade floor" };
  if (CHESS.has(slug)) return { scene: "chess", eyebrow: "Grandmaster room", material: "Obsidian & maple" };
  if (TABLE.has(slug)) return { scene: "table", eyebrow: "Private table", material: "Casino felt & brass" };
  if (SPACE.has(slug)) return { scene: "space", eyebrow: "Flight deck", material: "Deep-space display" };
  if (PADDOCK.has(slug)) return { scene: "paddock", eyebrow: "Performance arena", material: "Carbon & asphalt" };
  if (WORKSHOP.has(slug)) return { scene: "workshop", eyebrow: "Puzzle atelier", material: "Oak & drafting glass" };
  if (NEON.has(slug)) return { scene: "neon", eyebrow: "Deluxe cabinet", material: "Neon glass & chrome" };
  return { scene: "board", eyebrow: "Tournament table", material: "Walnut & carved stone" };
}

function titleFromSlug(slug: string) {
  const aliases: Record<string, string> = {
    "15puzzle": "15 Puzzle",
    "2048": "2048",
    "engine-lab": "Engine Arena",
    "l-game": "L-Game",
    "rock-paper-scissors": "Rock Paper Scissors",
    "slot-machine": "Slot Machine",
    "space-invaders": "Space Invaders",
    "tic-tac-toe": "Tic-Tac-Toe",
    "ultimate-tic-tac-toe": "Ultimate Tic-Tac-Toe",
    "y-game": "Y-Game",
  };
  return aliases[slug] ?? slug.split("-").map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`).join(" ");
}

export function ArcadeExperience({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { settings, update, ready } = useSettings();
  const rootRef = useRef<HTMLDivElement>(null);
  const lightFrameRef = useRef<number | null>(null);
  const pendingLightRef = useRef<{ element: HTMLDivElement; x: number; y: number } | null>(null);
  const controlCloseRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const fpsOutputRef = useRef<HTMLElement>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [autoQuality, setAutoQuality] = useState<RenderQuality>("ultra");
  const [showControls, setShowControls] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const segments = pathname.split("/").filter(Boolean);
  const slug = segments[1] ?? "hub";
  const isHub = pathname === "/play";
  const profile = useMemo(() => sceneFor(slug, isHub), [slug, isHub]);
  const visualQuality: RenderQuality = settings.arcadeQuality === "auto" ? autoQuality : settings.arcadeQuality;
  const cinematic = settings.arcadeCinematic && !settings.reduceMotion;

  useEffect(() => {
    const onFullscreen = () => setFullscreen(document.fullscreenElement === rootRef.current);
    document.addEventListener("fullscreenchange", onFullscreen);
    return () => document.removeEventListener("fullscreenchange", onFullscreen);
  }, []);

  useEffect(() => {
    const onVisibility = () => setPageVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    if (!ready || settings.arcadeQuality !== "auto") return;
    const device = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const constrained = Boolean(device.connection?.saveData);
    const balanced = Boolean((device.deviceMemory && device.deviceMemory <= 8) || navigator.hardwareConcurrency <= 8);
    const frame = requestAnimationFrame(() => {
      setAutoQuality(reducedMotion || constrained ? "calm" : balanced ? "smooth" : "ultra");
    });
    return () => cancelAnimationFrame(frame);
  }, [ready, settings.arcadeQuality]);

  useEffect(() => {
    if (!pageVisible || isHub || (!settings.arcadePerformanceHud && settings.arcadeQuality !== "auto")) return;
    let animationFrame = 0;
    let frames = 0;
    let sampleStarted = performance.now();
    const measure = (now: number) => {
      frames += 1;
      const elapsed = now - sampleStarted;
      if (elapsed >= 1000) {
        const measured = Math.min(60, Math.round((frames * 1000) / elapsed));
        if (fpsOutputRef.current) fpsOutputRef.current.textContent = String(measured);
        if (settings.arcadeQuality === "auto") {
          setAutoQuality((quality) => measured < 48 && quality === "ultra" ? "smooth" : quality);
        }
        frames = 0;
        sampleStarted = now;
      }
      animationFrame = requestAnimationFrame(measure);
    };
    animationFrame = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(animationFrame);
  }, [isHub, pageVisible, settings.arcadePerformanceHud, settings.arcadeQuality]);

  useEffect(() => {
    if (showControls) controlCloseRef.current?.focus();
  }, [showControls]);

  useEffect(() => () => {
    if (lightFrameRef.current !== null) cancelAnimationFrame(lightFrameRef.current);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }
      await rootRef.current?.requestFullscreen();
    } catch {
      // Fullscreen can be blocked by device/browser policy; the stage remains usable.
    }
  }, []);

  const trackLight = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    pendingLightRef.current = {
      element: event.currentTarget,
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
    if (lightFrameRef.current !== null) return;
    lightFrameRef.current = requestAnimationFrame(() => {
      const pending = pendingLightRef.current;
      if (pending) {
        pending.element.style.setProperty("--arcade-light-x", `${pending.x}px`);
        pending.element.style.setProperty("--arcade-light-y", `${pending.y}px`);
      }
      lightFrameRef.current = null;
    });
  }, []);

  const cycleVisualQuality = useCallback(() => {
    const currentIndex = QUALITY_ORDER.indexOf(settings.arcadeQuality);
    update({ arcadeQuality: QUALITY_ORDER[(currentIndex + 1) % QUALITY_ORDER.length] });
  }, [settings.arcadeQuality, update]);

  const openControls = useCallback(() => {
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setShowControls(true);
  }, []);

  const closeControls = useCallback(() => {
    setShowControls(false);
    requestAnimationFrame(() => previousFocusRef.current?.focus());
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.matches("input, textarea, select, [contenteditable='true']")) return;
      const key = event.key.toLowerCase();
      if (event.key === "Escape") closeControls();
      if (event.key === "?" || (event.shiftKey && event.key === "/")) {
        event.preventDefault();
        if (showControls) closeControls();
        else openControls();
      }
      if (!isHub && key === "f") {
        event.preventDefault();
        void toggleFullscreen();
      }
      if (!isHub && key === "m") {
        event.preventDefault();
        update({ soundEnabled: !settings.soundEnabled });
      }
      if (!isHub && key === "q") {
        event.preventDefault();
        cycleVisualQuality();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeControls, cycleVisualQuality, isHub, openControls, settings.soundEnabled, showControls, toggleFullscreen, update]);

  const triggerTactileFeedback = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!settings.hapticFeedback || visualQuality === "calm" || typeof navigator.vibrate !== "function") return;
    const target = event.target;
    if (target instanceof Element && target.closest("button, [role='button'], [role='gridcell'], canvas, [data-game-board]")) {
      navigator.vibrate(8);
    }
  }, [settings.hapticFeedback, visualQuality]);

  return (
    <div
      ref={rootRef}
      className={styles.experience}
      data-arcade-scene={profile.scene}
      data-cinematic={cinematic ? "true" : "false"}
      data-visual-quality={visualQuality}
      data-selected-quality={settings.arcadeQuality}
      data-page-visible={pageVisible ? "true" : "false"}
      data-game-slug={slug}
      onPointerMove={trackLight}
      onPointerDown={triggerTactileFeedback}
    >
      <div className={styles.environment} aria-hidden="true">
        <span className={styles.spotlight} />
        <span className={styles.aurora} />
        <span className={styles.orbOne} />
        <span className={styles.orbTwo} />
        <span className={styles.particles} />
        <span className={styles.floor} />
        <span className={styles.scanlines} />
        <span className={styles.vignette} />
        <span className={styles.grain} />
      </div>

      {!isHub && (
        <aside className={styles.commandBar} aria-label="Game presentation controls">
          <div className={styles.identityCluster}>
            <Link href="/play" className={styles.backButton} aria-label="Back to Games Hub" title="Back to Games Hub">
              <span aria-hidden="true">‹</span>
              <span className={styles.commandLabel}>Games</span>
            </Link>
            <div className={styles.gameIdentity}>
              <span className={styles.liveDot} aria-hidden="true" />
              <span>
                <strong>{profile.eyebrow}</strong>
                <small>{titleFromSlug(slug)} · {profile.material}</small>
              </span>
            </div>
          </div>
          <div className={styles.commands}>
            <button type="button" aria-pressed={settings.arcadeCinematic} onClick={() => update({ arcadeCinematic: !settings.arcadeCinematic })}>
              <span aria-hidden="true">✦</span>
              <span className={styles.commandLabel}>{cinematic ? "Cinematic" : "Calm light"}</span>
            </button>
            <button type="button" onClick={cycleVisualQuality} aria-label={`Visual quality: ${QUALITY_LABELS[settings.arcadeQuality]}${settings.arcadeQuality === "auto" ? `, currently ${QUALITY_LABELS[visualQuality]}` : ""}`}>
              <span aria-hidden="true">◈</span>
              <span className={styles.commandLabel}>{settings.arcadeQuality === "auto" ? `Auto · ${QUALITY_LABELS[visualQuality]}` : QUALITY_LABELS[visualQuality]}</span>
            </button>
            <button type="button" onClick={openControls} aria-haspopup="dialog">
              <span aria-hidden="true">?</span>
              <span className={styles.commandLabel}>Controls</span>
            </button>
            <button type="button" aria-pressed={fullscreen} onClick={toggleFullscreen}>
              <span aria-hidden="true">{fullscreen ? "⊙" : "⛶"}</span>
              <span className={styles.commandLabel}>{fullscreen ? "Exit" : "Fullscreen"}</span>
            </button>
          </div>
        </aside>
      )}

      <div className={styles.stage}>{children}</div>

      {!isHub && settings.arcadePerformanceHud && (
        <aside className={styles.performanceHud} aria-label="Live game performance">
          <span className={styles.performancePulse} aria-hidden="true" />
          <span><strong ref={fpsOutputRef}>60</strong><small>FPS</small></span>
          <i aria-hidden="true" />
          <span><strong>{settings.arcadeQuality === "auto" ? "AUTO" : QUALITY_LABELS[visualQuality].toUpperCase()}</strong><small>{QUALITY_LABELS[visualQuality]}</small></span>
          <i aria-hidden="true" />
          <span className={settings.soundEnabled ? styles.hudEnabled : styles.hudDisabled}><strong>{settings.soundEnabled ? "ON" : "OFF"}</strong><small>Sound</small></span>
          <span className={settings.hapticFeedback ? styles.hudEnabled : styles.hudDisabled}><strong>{settings.hapticFeedback ? "ON" : "OFF"}</strong><small>Haptic</small></span>
        </aside>
      )}

      {showControls && !isHub && (
        <div className={styles.controlOverlay} role="presentation" onPointerDown={(event) => {
          if (event.target === event.currentTarget) closeControls();
        }}>
          <section className={styles.controlPanel} role="dialog" aria-modal="true" aria-labelledby="game-controls-title">
            <div className={styles.controlHeader}>
              <div>
                <span>Player guide</span>
                <h2 id="game-controls-title">{titleFromSlug(slug)} controls</h2>
              </div>
              <button ref={controlCloseRef} type="button" onClick={closeControls} aria-label="Close controls">×</button>
            </div>
            <div className={styles.controlGrid}>
              {CONTROL_HINTS[profile.scene].map((hint) => (
                <article key={hint.title}>
                  <kbd>{hint.icon}</kbd>
                  <div>
                    <strong>{hint.title}</strong>
                    <p>{hint.detail}</p>
                  </div>
                </article>
              ))}
            </div>
            <div className={styles.qualityPicker} role="group" aria-label="Visual quality">
              {(Object.keys(QUALITY_LABELS) as ArcadeQuality[]).map((quality) => (
                <button
                  type="button"
                  key={quality}
                  aria-pressed={settings.arcadeQuality === quality}
                  onClick={() => update({ arcadeQuality: quality })}
                >
                  <strong>{QUALITY_LABELS[quality]}</strong>
                  <small>{quality === "auto" ? "Adapts to live frame rate" : quality === "ultra" ? "Maximum atmosphere" : quality === "smooth" ? "Balanced effects" : "Reduced effects"}</small>
                </button>
              ))}
            </div>
            <div className={styles.quickSettings} aria-label="Quick game settings">
              <button type="button" aria-pressed={settings.soundEnabled} onClick={() => update({ soundEnabled: !settings.soundEnabled })}><span aria-hidden="true">♫</span><span><strong>Sound</strong><small>{settings.soundEnabled ? "On" : "Off"} · M</small></span></button>
              <button type="button" aria-pressed={settings.hapticFeedback} onClick={() => update({ hapticFeedback: !settings.hapticFeedback })}><span aria-hidden="true">◉</span><span><strong>Haptics</strong><small>{settings.hapticFeedback ? "On" : "Off"}</small></span></button>
              <button type="button" aria-pressed={settings.arcadeCinematic} onClick={() => update({ arcadeCinematic: !settings.arcadeCinematic })}><span aria-hidden="true">✦</span><span><strong>Cinematic</strong><small>{settings.arcadeCinematic ? "On" : "Off"}</small></span></button>
              <button type="button" onClick={() => { closeControls(); openSettingsPanel("motion"); }}><span aria-hidden="true">⚙</span><span><strong>All settings</strong><small>Motion Studio</small></span></button>
            </div>
            <p className={styles.controlFooter}>Shortcuts: <kbd>?</kbd> guide · <kbd>F</kbd> fullscreen · <kbd>M</kbd> sound · <kbd>Q</kbd> quality</p>
          </section>
        </div>
      )}
    </div>
  );
}
