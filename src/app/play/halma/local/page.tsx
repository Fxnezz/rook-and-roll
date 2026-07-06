"use client";

import { LocalBoardGamePage } from "@/components/boardgames/LocalBoardGamePage";
import { HalmaBoard, type HalmaState, type HalmaMove } from "@/components/boardgames/HalmaBoard";
import { halmaEngine } from "@/lib/boardgames/engines/halma";

export default function HalmaLocalPage() {
  return (
    <LocalBoardGamePage<HalmaMove, HalmaState>
      title="Halma"
      blurb="Hop your pieces across the board into the opposite corner — first to fill the far camp wins."
      mode="passplay"
      engine={halmaEngine}
      seatLabel={(s) => (s === "a" ? "Player 1" : "Player 2")}
      renderBoard={({ state, mySeat, interactive, onMove, lastMove }) => (
        <HalmaBoard state={state} mySeat={mySeat} interactive={interactive} onMove={onMove} lastMove={lastMove} />
      )}
    />
  );
}
