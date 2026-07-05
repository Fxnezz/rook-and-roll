"use client";

import { BoardGamePage } from "@/components/boardgames/BoardGamePage";
import { MancalaBoard, type MancalaState, type MancalaMove } from "@/components/boardgames/MancalaBoard";

export default function MancalaPage() {
  return (
    <BoardGamePage<MancalaMove, MancalaState>
      kind="mancala"
      title="Mancala"
      blurb="Standard Kalah rules — sow seeds, land in your store for an extra turn, capture across the board."
      ratedAvailable
      renderBoard={({ state, mySeat, interactive, onMove, lastMove }) => (
        <MancalaBoard state={state} mySeat={mySeat} interactive={interactive} onMove={onMove} lastMove={lastMove} />
      )}
    />
  );
}
