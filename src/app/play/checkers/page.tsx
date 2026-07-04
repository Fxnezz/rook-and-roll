"use client";

import { BoardGamePage } from "@/components/boardgames/BoardGamePage";
import { CheckersBoard, type CheckersState, type CheckersMove } from "@/components/boardgames/CheckersBoard";

export default function CheckersPage() {
  return (
    <BoardGamePage<CheckersMove, CheckersState>
      kind="checkers"
      title="Checkers"
      blurb="Standard American rules — forced capture, kings, multi-jumps."
      ratedAvailable
      supportsDraw
      renderBoard={({ state, mySeat, interactive, onMove, lastMove }) => (
        <CheckersBoard state={state} mySeat={mySeat} interactive={interactive} onMove={onMove} lastMove={lastMove} />
      )}
    />
  );
}
