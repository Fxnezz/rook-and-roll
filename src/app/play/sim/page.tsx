"use client";

import { BoardGamePage } from "@/components/boardgames/BoardGamePage";
import { SimBoard, type SimState, type SimMove } from "@/components/boardgames/SimBoard";

export default function SimPage() {
  return (
    <BoardGamePage<SimMove, SimState>
      kind="sim"
      title="Sim"
      blurb="Color the lines between 6 points — whoever completes a triangle in their own color loses."
      ratedAvailable
      renderBoard={({ state, mySeat, interactive, onMove, lastMove }) => (
        <SimBoard state={state} mySeat={mySeat} interactive={interactive} onMove={onMove} lastMove={lastMove} />
      )}
    />
  );
}
