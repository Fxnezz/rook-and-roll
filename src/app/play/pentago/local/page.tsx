"use client";

import { LocalBoardGamePage } from "@/components/boardgames/LocalBoardGamePage";
import { PentagoBoard, type PentagoState, type PentagoMove } from "@/components/boardgames/PentagoBoard";
import { pentagoEngine } from "@/lib/boardgames/engines/pentago";

export default function PentagoLocalPage() {
  return (
    <LocalBoardGamePage<PentagoMove, PentagoState>
      title="Pentago"
      blurb="Place a marble, then rotate a quadrant — five in a row after the rotation wins."
      mode="passplay"
      engine={pentagoEngine}
      seatLabel={(s) => (s === "a" ? "Player 1" : "Player 2")}
      renderBoard={({ state, mySeat, interactive, onMove, lastMove }) => (
        <PentagoBoard state={state} mySeat={mySeat} interactive={interactive} onMove={onMove} lastMove={lastMove} />
      )}
    />
  );
}
