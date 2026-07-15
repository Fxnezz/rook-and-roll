"use client";

import type { BotTierId } from "./bots";
import { getSamCoreEngine } from "./samCore";
import { getEngine, type ChessEngine } from "./stockfish";

export function getPlayingEngine(tierId: BotTierId): ChessEngine {
  return tierId === "samcore" ? getSamCoreEngine() : getEngine();
}

export async function configurePlayingEngine(engine: ChessEngine, tierId: BotTierId, skill: number) {
  if (tierId === "sam" && engine.configureMaximumStrength) await engine.configureMaximumStrength(skill);
  else await engine.setSkillLevel(skill);
}
