"use client";

import { BoardGamePage } from "@/components/boardgames/BoardGamePage";
import { GomokuBoard, type GomokuState, type GomokuMove } from "@/components/boardgames/GomokuBoard";

export default function GomokuPage() {
  return (
    <BoardGamePage<GomokuMove, GomokuState>
      kind="gomoku"
      title="Gomoku"
      blurb="Five in a row, any direction — freestyle rules, no forbidden moves."
      ratedAvailable
      supportsDraw
      renderBoard={({ state, mySeat, interactive, onMove, lastMove }) => (
        <GomokuBoard state={state} mySeat={mySeat} interactive={interactive} onMove={onMove} lastMove={lastMove} />
      )}
    />
  );
}
