"use client";

import { BoardGamePage } from "@/components/boardgames/BoardGamePage";
import { YGameBoard, type YGameState, type YGameMove } from "@/components/boardgames/YGameBoard";

export default function YGamePage() {
  return (
    <BoardGamePage<YGameMove, YGameState>
      kind="ygame"
      title="Y"
      blurb="Connect all three sides of the triangle with one unbroken group of stones — no draws are possible."
      ratedAvailable
      renderBoard={({ state, mySeat, interactive, onMove, lastMove }) => (
        <YGameBoard state={state} mySeat={mySeat} interactive={interactive} onMove={onMove} lastMove={lastMove} />
      )}
    />
  );
}
