"use client";

import { LocalBoardGamePage } from "@/components/boardgames/LocalBoardGamePage";
import { BreakthroughBoard, type BreakthroughState, type BreakthroughMove } from "@/components/boardgames/BreakthroughBoard";
import { breakthroughEngine } from "@/lib/boardgames/engines/breakthrough";

export default function BreakthroughLocalPage() {
  return (
    <LocalBoardGamePage<BreakthroughMove, BreakthroughState>
      title="Breakthrough"
      blurb="Race your pawns to the far row — capture diagonally, but only advance straight onto an empty square."
      mode="passplay"
      engine={breakthroughEngine}
      seatLabel={(s) => (s === "a" ? "Player 1" : "Player 2")}
      renderBoard={({ state, mySeat, interactive, onMove, lastMove }) => (
        <BreakthroughBoard state={state} mySeat={mySeat} interactive={interactive} onMove={onMove} lastMove={lastMove} />
      )}
    />
  );
}
