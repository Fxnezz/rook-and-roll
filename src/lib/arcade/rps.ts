/** Rock Paper Scissors vs a bot that tracks the player's move-after-move patterns (a simple order-1 Markov model). */
export type Move = "rock" | "paper" | "scissors";
export const MOVES: Move[] = ["rock", "paper", "scissors"];

export function beats(a: Move): Move {
  if (a === "rock") return "paper";
  if (a === "paper") return "scissors";
  return "rock";
}

export function resolveRound(player: Move, bot: Move): "player" | "bot" | "tie" {
  if (player === bot) return "tie";
  return beats(player) === bot ? "bot" : "player";
}

type Counts = Record<Move, number>;
function emptyCounts(): Counts {
  return { rock: 0, paper: 0, scissors: 0 };
}

export interface BotMemory {
  transitions: Record<Move, Counts>;
  overall: Counts;
  lastPlayerMove: Move | null;
}

export function newBotMemory(): BotMemory {
  return {
    transitions: { rock: emptyCounts(), paper: emptyCounts(), scissors: emptyCounts() },
    overall: emptyCounts(),
    lastPlayerMove: null,
  };
}

export function recordPlayerMove(memory: BotMemory, move: Move): BotMemory {
  const overall = { ...memory.overall, [move]: memory.overall[move] + 1 };
  const transitions = { ...memory.transitions };
  if (memory.lastPlayerMove) {
    transitions[memory.lastPlayerMove] = {
      ...transitions[memory.lastPlayerMove],
      [move]: transitions[memory.lastPlayerMove][move] + 1,
    };
  }
  return { transitions, overall, lastPlayerMove: move };
}

function argMax(counts: Counts): Move {
  return MOVES.reduce((best, m) => (counts[m] > counts[best] ? m : best), MOVES[0]);
}

export function predictNextMove(memory: BotMemory): Move {
  if (memory.lastPlayerMove) {
    const t = memory.transitions[memory.lastPlayerMove];
    if (t.rock + t.paper + t.scissors >= 2) return argMax(t);
  }
  if (memory.overall.rock + memory.overall.paper + memory.overall.scissors >= 3) return argMax(memory.overall);
  return MOVES[Math.floor(Math.random() * 3)];
}

export function pickBotMove(memory: BotMemory): Move {
  return beats(predictNextMove(memory));
}
