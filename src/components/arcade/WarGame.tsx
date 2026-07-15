"use client";

import { useEffect, useState } from "react";
import { useHighScore } from "@/lib/arcade/useHighScore";
import { playArcadeSound } from "@/lib/arcade/sound";
import { PlayingCard } from "@/components/arcade/PlayingCard";
import { newGame, playRound, type WarState } from "@/lib/arcade/war";

export function WarGame() {
  const { best, submit } = useHighScore("war", { higherIsBetter: false });
  const [state, setState] = useState<WarState | null>(null);
  const [rounds, setRounds] = useState(0);

  useEffect(() => {
    setState(newGame());
  }, []);

  const next = () => {
    if (!state || state.status !== "playing") return;
    const nextState = playRound(state);
    setState(nextState);
    setRounds((r) => r + 1);
    if (nextState.status !== "playing") {
      if (nextState.status === "won") {
        submit(rounds + 1);
        playArcadeSound("win");
      } else {
        playArcadeSound("lose");
      }
    } else {
      playArcadeSound("flip");
    }
  };

  const reset = () => {
    setState(newGame());
    setRounds(0);
  };

  const topCard = (deck: WarState["player"]) => deck[0];

  if (!state) return null;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex w-full max-w-md items-center justify-between text-sm">
        <span className="chip">Rounds: {rounds}</span>
        {best != null && <span className="chip">Fastest win: {best} rounds</span>}
      </div>

      <div className="flex items-center gap-6">
        <div className="flex flex-col items-center gap-2">
          <span className="label">You ({state.player.length})</span>
          <MiniCard card={topCard(state.player)} />
        </div>
        <span className="text-xl font-bold text-[var(--text-faint)]">vs</span>
        <div className="flex flex-col items-center gap-2">
          <span className="label">Opponent ({state.opponent.length})</span>
          <MiniCard card={topCard(state.opponent)} />
        </div>
      </div>

      <p className="min-h-6 text-center text-sm text-[var(--text-muted)]">{state.log}</p>

      {state.status === "playing" ? (
        <button className="btn btn-primary" onClick={next}>
          Flip
        </button>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <p className="text-lg font-bold">{state.status === "won" ? "You win the whole deck!" : "You ran out of cards."}</p>
          <button className="btn" onClick={reset}>
            Play again
          </button>
        </div>
      )}
    </div>
  );
}

function MiniCard({ card }: { card: WarState["player"][number] | undefined }) {
  return card ? <PlayingCard rank={card.rank} suit={card.suit} /> : <PlayingCard empty />;
}
