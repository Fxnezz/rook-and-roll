"use client";

import { BoardGamePage } from "@/components/boardgames/BoardGamePage";
import { HalmaBoard, type HalmaState, type HalmaMove } from "@/components/boardgames/HalmaBoard";

export default function HalmaPage() {
  return (
    <BoardGamePage<HalmaMove, HalmaState>
      kind="halma"
      title="Halma"
      blurb="Hop your pieces across the board into the opposite corner — first to fill the far camp wins."
      ratedAvailable
      renderBoard={({ state, mySeat, interactive, onMove, lastMove }) => (
        <HalmaBoard state={state} mySeat={mySeat} interactive={interactive} onMove={onMove} lastMove={lastMove} />
      )}
    />
  );
}
