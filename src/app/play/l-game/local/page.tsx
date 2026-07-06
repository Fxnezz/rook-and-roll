"use client";

import { LocalBoardGamePage } from "@/components/boardgames/LocalBoardGamePage";
import { LGameBoard, type LGameState, type LGameMove } from "@/components/boardgames/LGameBoard";
import { lGameEngine } from "@/lib/boardgames/engines/lgame";

export default function LGameLocalPage() {
  return (
    <LocalBoardGamePage<LGameMove, LGameState>
      title="L-Game"
      blurb="Reposition your L-piece and optionally nudge a neutral piece — trap your opponent's L with nowhere to go."
      mode="passplay"
      engine={lGameEngine}
      seatLabel={(s) => (s === "a" ? "Player 1" : "Player 2")}
      renderBoard={({ state, mySeat, interactive, onMove, lastMove }) => (
        <LGameBoard state={state} mySeat={mySeat} interactive={interactive} onMove={onMove} lastMove={lastMove} />
      )}
    />
  );
}
