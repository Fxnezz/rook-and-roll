"use client";

import { BoardGamePage } from "@/components/boardgames/BoardGamePage";
import { BreakthroughBoard, type BreakthroughState, type BreakthroughMove } from "@/components/boardgames/BreakthroughBoard";

export default function BreakthroughPage() {
  return (
    <BoardGamePage<BreakthroughMove, BreakthroughState>
      kind="breakthrough"
      title="Breakthrough"
      blurb="Race your pawns to the far row — capture diagonally, but only advance straight onto an empty square."
      ratedAvailable
      renderBoard={({ state, mySeat, interactive, onMove, lastMove }) => (
        <BreakthroughBoard state={state} mySeat={mySeat} interactive={interactive} onMove={onMove} lastMove={lastMove} />
      )}
    />
  );
}
