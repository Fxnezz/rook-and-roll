"use client";

import { useEffect, useState } from "react";
import { useHighScore } from "@/lib/arcade/useHighScore";
import { playArcadeSound } from "@/lib/arcade/sound";
import { RANK_LABEL, SUIT_GLYPH, isRedSuit } from "@/lib/arcade/blackjack";
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
  if (!card) return <div className="h-24 w-16 rounded-md" style={{ background: "var(--bg-elev)" }} />;
  const red = isRedSuit(card.suit);
  return (
    <div
      className="flex h-24 w-16 flex-col justify-between rounded-md p-1.5 text-sm font-bold"
      style={{ background: "#f3ecd8", color: red ? "#c0392b" : "#1c1c1c", boxShadow: "0 1px 3px rgba(0,0,0,0.4)" }}
    >
      <span>{RANK_LABEL[card.rank] ?? card.rank}</span>
      <span className="self-center text-xl leading-none">{SUIT_GLYPH[card.suit]}</span>
    </div>
  );
}
