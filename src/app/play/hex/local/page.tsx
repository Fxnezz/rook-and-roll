"use client";

import { LocalBoardGamePage } from "@/components/boardgames/LocalBoardGamePage";
import { HexBoard, type HexState, type HexMove } from "@/components/boardgames/HexBoard";
import { hexEngine } from "@/lib/boardgames/engines/hex";

export default function HexLocalPage() {
  return (
    <LocalBoardGamePage<HexMove, HexState>
      title="Hex"
      blurb="Connect your two sides of the board with an unbroken chain — no draws are possible."
      mode="passplay"
      engine={hexEngine}
      seatLabel={(s) => (s === "a" ? "Top/Bottom" : "Left/Right")}
      renderBoard={({ state, mySeat, interactive, onMove, lastMove }) => (
        <HexBoard state={state} mySeat={mySeat} interactive={interactive} onMove={onMove} lastMove={lastMove} />
      )}
    />
  );
}
