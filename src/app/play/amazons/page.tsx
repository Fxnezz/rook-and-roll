"use client";

import { BoardGamePage } from "@/components/boardgames/BoardGamePage";
import { AmazonsBoard, type AmazonsState, type AmazonsMove } from "@/components/boardgames/AmazonsBoard";

export default function AmazonsPage() {
  return (
    <BoardGamePage<AmazonsMove, AmazonsState>
      kind="amazons"
      title="Amazons"
      blurb="Move a queen-like amazon, then shoot an arrow to block a square forever — the last player who can move wins."
      ratedAvailable
      renderBoard={({ state, mySeat, interactive, onMove, lastMove }) => (
        <AmazonsBoard state={state} mySeat={mySeat} interactive={interactive} onMove={onMove} lastMove={lastMove} />
      )}
    />
  );
}
