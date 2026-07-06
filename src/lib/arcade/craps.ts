/** Craps, Pass Line bet only (the fundamental bet) — the dozens of proposition/place bets are out of scope. */
export type CrapsPhase = "comeout" | "point";

export interface CrapsState {
  phase: CrapsPhase;
  point: number | null;
}

export type RollOutcome = "win" | "lose" | "continue";

export function rollDice(): [number, number] {
  return [1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)];
}

export function newGame(): CrapsState {
  return { phase: "comeout", point: null };
}

/** Pure rule resolution given already-rolled dice, so the rules can be tested without relying on randomness. */
export function resolveRoll(state: CrapsState, dice: [number, number]): { state: CrapsState; outcome: RollOutcome } {
  const sum = dice[0] + dice[1];
  if (state.phase === "comeout") {
    if (sum === 7 || sum === 11) return { state: { phase: "comeout", point: null }, outcome: "win" };
    if (sum === 2 || sum === 3 || sum === 12) return { state: { phase: "comeout", point: null }, outcome: "lose" };
    return { state: { phase: "point", point: sum }, outcome: "continue" };
  }
  if (sum === state.point) return { state: { phase: "comeout", point: null }, outcome: "win" };
  if (sum === 7) return { state: { phase: "comeout", point: null }, outcome: "lose" };
  return { state, outcome: "continue" };
}

export function roll(state: CrapsState): { state: CrapsState; dice: [number, number]; outcome: RollOutcome } {
  const dice = rollDice();
  const { state: next, outcome } = resolveRoll(state, dice);
  return { state: next, dice, outcome };
}
