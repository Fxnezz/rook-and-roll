"use client";

import { LocalBoardGamePage } from "@/components/boardgames/LocalBoardGamePage";
import { GomokuBoard, type GomokuState, type GomokuMove } from "@/components/boardgames/GomokuBoard";
import { gomokuEngine } from "@/lib/boardgames/engines/gomoku";

export default function GomokuLocalPage() {
  return (
    <LocalBoardGamePage<GomokuMove, GomokuState>
      title="Gomoku"
      blurb="Five in a row, any direction — freestyle rules, no forbidden moves."
      mode="passplay"
      engine={gomokuEngine}
      seatLabel={(s) => (s === "a" ? "Black" : "White")}
      renderBoard={({ state, mySeat, interactive, onMove, lastMove }) => (
        <GomokuBoard state={state} mySeat={mySeat} interactive={interactive} onMove={onMove} lastMove={lastMove} />
      )}
    />
  );
}
