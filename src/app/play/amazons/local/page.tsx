"use client";

import { LocalBoardGamePage } from "@/components/boardgames/LocalBoardGamePage";
import { AmazonsBoard, type AmazonsState, type AmazonsMove } from "@/components/boardgames/AmazonsBoard";
import { amazonsEngine } from "@/lib/boardgames/engines/amazons";

export default function AmazonsLocalPage() {
  return (
    <LocalBoardGamePage<AmazonsMove, AmazonsState>
      title="Amazons"
      blurb="Move a queen-like amazon, then shoot an arrow to block a square forever — the last player who can move wins."
      mode="passplay"
      engine={amazonsEngine}
      seatLabel={(s) => (s === "a" ? "Player 1" : "Player 2")}
      renderBoard={({ state, mySeat, interactive, onMove, lastMove }) => (
        <AmazonsBoard state={state} mySeat={mySeat} interactive={interactive} onMove={onMove} lastMove={lastMove} />
      )}
    />
  );
}
