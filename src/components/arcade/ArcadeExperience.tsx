"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import styles from "./ArcadeExperience.module.css";

type Scene = "hub" | "chess" | "board" | "table" | "neon" | "space" | "workshop" | "paddock";

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
  const rootRef = useRef<HTMLDivElement>(null);
  const [cinematic, setCinematic] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const segments = pathname.split("/").filter(Boolean);
  const slug = segments[1] ?? "hub";
  const isHub = pathname === "/play";
  const profile = useMemo(() => sceneFor(slug, isHub), [slug, isHub]);

  useEffect(() => {
    const onFullscreen = () => setFullscreen(document.fullscreenElement === rootRef.current);
    document.addEventListener("fullscreenchange", onFullscreen);
    return () => document.removeEventListener("fullscreenchange", onFullscreen);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }
    await rootRef.current?.requestFullscreen();
  }, []);

  const trackLight = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--arcade-light-x", `${event.clientX - rect.left}px`);
    event.currentTarget.style.setProperty("--arcade-light-y", `${event.clientY - rect.top}px`);
  }, []);

  return (
    <div
      ref={rootRef}
      className={styles.experience}
      data-arcade-scene={profile.scene}
      data-cinematic={cinematic ? "true" : "false"}
      data-game-slug={slug}
      onPointerMove={trackLight}
    >
      <div className={styles.environment} aria-hidden="true">
        <span className={styles.spotlight} />
        <span className={styles.orbOne} />
        <span className={styles.orbTwo} />
        <span className={styles.floor} />
        <span className={styles.grain} />
      </div>

      {!isHub && (
        <aside className={styles.commandBar} aria-label="Game presentation controls">
          <div className={styles.gameIdentity}>
            <span className={styles.liveDot} aria-hidden="true" />
            <span>
              <strong>{profile.eyebrow}</strong>
              <small>{titleFromSlug(slug)} · {profile.material}</small>
            </span>
          </div>
          <div className={styles.commands}>
            <button type="button" aria-pressed={cinematic} onClick={() => setCinematic((value) => !value)}>
              <span aria-hidden="true">✦</span>
              <span className={styles.commandLabel}>{cinematic ? "Cinematic" : "Calm light"}</span>
            </button>
            <button type="button" aria-pressed={fullscreen} onClick={toggleFullscreen}>
              <span aria-hidden="true">{fullscreen ? "⊙" : "⛶"}</span>
              <span className={styles.commandLabel}>{fullscreen ? "Exit" : "Fullscreen"}</span>
            </button>
          </div>
        </aside>
      )}

      <div className={styles.stage}>{children}</div>
    </div>
  );
}
