"use client";

import { useState } from "react";
import { useHighScore } from "@/lib/arcade/useHighScore";
import { playArcadeSound } from "@/lib/arcade/sound";
import { newBotMemory, recordPlayerMove, pickBotMove, resolveRound, type Move, type BotMemory } from "@/lib/arcade/rps";

const EMOJI: Record<Move, string> = { rock: "🪨", paper: "📄", scissors: "✂️" };

export function RockPaperScissorsGame() {
  const { best, submit } = useHighScore("rps", { higherIsBetter: true });
  const [memory, setMemory] = useState<BotMemory>(() => newBotMemory());
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const [ties, setTies] = useState(0);
  const [last, setLast] = useState<{ player: Move; bot: Move; outcome: string } | null>(null);

  const play = (playerMove: Move) => {
    const botMove = pickBotMove(memory);
    const outcome = resolveRound(playerMove, botMove);
    setLast({ player: playerMove, bot: botMove, outcome });
    setMemory(recordPlayerMove(memory, playerMove));
    if (outcome === "player") {
      setWins((w) => {
        const next = w + 1;
        submit(next);
        return next;
      });
      playArcadeSound("win");
    } else if (outcome === "bot") {
      setLosses((l) => l + 1);
      playArcadeSound("lose");
    } else {
      setTies((t) => t + 1);
      playArcadeSound("draw");
    }
  };

  const reset = () => {
    setMemory(newBotMemory());
    setWins(0);
    setLosses(0);
    setTies(0);
    setLast(null);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex w-full max-w-sm items-center justify-between text-sm">
        <span className="chip">W: {wins}</span>
        <span className="chip">L: {losses}</span>
        <span className="chip">T: {ties}</span>
        {best != null && <span className="chip">Most wins: {best}</span>}
      </div>

      {last && (
        <div className="flex items-center gap-6 text-4xl">
          <span>{EMOJI[last.player]}</span>
          <span className="text-base text-[var(--text-muted)]">vs</span>
          <span>{EMOJI[last.bot]}</span>
        </div>
      )}
      {last && (
        <p className="text-sm font-semibold">
          {last.outcome === "player" ? "You win!" : last.outcome === "bot" ? "Bot wins" : "Tie"}
        </p>
      )}

      <div className="flex gap-3">
        {(["rock", "paper", "scissors"] as Move[]).map((m) => (
          <button key={m} className="btn !py-3 text-2xl" onClick={() => play(m)}>
            {EMOJI[m]}
          </button>
        ))}
      </div>

      <p className="max-w-xs text-center text-xs text-[var(--text-faint)]">
        The bot studies your patterns — mix up your moves or it'll start predicting you.
      </p>

      <button className="btn !py-1 text-xs" onClick={reset}>
        Reset
      </button>
    </div>
  );
}
