"use client";

import { BoardGamePage } from "@/components/boardgames/BoardGamePage";
import { OthelloBoard, type OthelloState, type OthelloMove } from "@/components/boardgames/OthelloBoard";

export default function OthelloPage() {
  return (
    <BoardGamePage<OthelloMove, OthelloState>
      kind="othello"
      title="Othello"
      blurb="Flank a line of your opponent's discs to flip them — most discs when the board settles wins."
      ratedAvailable
      supportsDraw
      renderBoard={({ state, mySeat, interactive, onMove, lastMove }) => (
        <OthelloBoard state={state} mySeat={mySeat} interactive={interactive} onMove={onMove} lastMove={lastMove} />
      )}
    />
  );
}
