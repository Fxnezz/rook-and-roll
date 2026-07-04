"use client";

import { LocalBoardGamePage } from "@/components/boardgames/LocalBoardGamePage";
import { CheckersBoard, type CheckersState, type CheckersMove } from "@/components/boardgames/CheckersBoard";
import { checkersEngine } from "@/lib/boardgames/engines/checkers";

export default function CheckersLocalPage() {
  return (
    <LocalBoardGamePage<CheckersMove, CheckersState>
      title="Checkers"
      blurb="Standard American rules — forced capture, kings, multi-jumps."
      mode="passplay"
      engine={checkersEngine}
      seatLabel={(s) => (s === "a" ? "Dark" : "Light")}
      renderBoard={({ state, mySeat, interactive, onMove, lastMove }) => (
        <CheckersBoard state={state} mySeat={mySeat} interactive={interactive} onMove={onMove} lastMove={lastMove} />
      )}
    />
  );
}
