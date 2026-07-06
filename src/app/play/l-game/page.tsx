"use client";

import { BoardGamePage } from "@/components/boardgames/BoardGamePage";
import { LGameBoard, type LGameState, type LGameMove } from "@/components/boardgames/LGameBoard";

export default function LGamePage() {
  return (
    <BoardGamePage<LGameMove, LGameState>
      kind="lgame"
      title="L-Game"
      blurb="Reposition your L-piece and optionally nudge a neutral piece — trap your opponent's L with nowhere to go."
      ratedAvailable
      renderBoard={({ state, mySeat, interactive, onMove, lastMove }) => (
        <LGameBoard state={state} mySeat={mySeat} interactive={interactive} onMove={onMove} lastMove={lastMove} />
      )}
    />
  );
}
