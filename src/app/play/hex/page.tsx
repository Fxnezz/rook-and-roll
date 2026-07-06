"use client";

import { BoardGamePage } from "@/components/boardgames/BoardGamePage";
import { HexBoard, type HexState, type HexMove } from "@/components/boardgames/HexBoard";

export default function HexPage() {
  return (
    <BoardGamePage<HexMove, HexState>
      kind="hex"
      title="Hex"
      blurb="Connect your two sides of the board with an unbroken chain — no draws are possible."
      ratedAvailable
      renderBoard={({ state, mySeat, interactive, onMove, lastMove }) => (
        <HexBoard state={state} mySeat={mySeat} interactive={interactive} onMove={onMove} lastMove={lastMove} />
      )}
    />
  );
}
