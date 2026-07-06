"use client";

import { BoardGamePage } from "@/components/boardgames/BoardGamePage";
import { PentagoBoard, type PentagoState, type PentagoMove } from "@/components/boardgames/PentagoBoard";

export default function PentagoPage() {
  return (
    <BoardGamePage<PentagoMove, PentagoState>
      kind="pentago"
      title="Pentago"
      blurb="Place a marble, then rotate a quadrant — five in a row after the rotation wins."
      ratedAvailable
      renderBoard={({ state, mySeat, interactive, onMove, lastMove }) => (
        <PentagoBoard state={state} mySeat={mySeat} interactive={interactive} onMove={onMove} lastMove={lastMove} />
      )}
    />
  );
}
