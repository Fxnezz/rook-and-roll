"use client";

import { LocalBoardGamePage } from "@/components/boardgames/LocalBoardGamePage";
import { DomineeringBoard, type DomineeringState, type DomineeringMove } from "@/components/boardgames/DomineeringBoard";
import { domineeringEngine } from "@/lib/boardgames/engines/domineering";

export default function DomineeringLocalPage() {
  return (
    <LocalBoardGamePage<DomineeringMove, DomineeringState>
      title="Domineering"
      blurb="Vertical vs horizontal domino placement on a shared grid — whoever can't move loses."
      mode="passplay"
      engine={domineeringEngine}
      seatLabel={(s) => (s === "a" ? "Player 1 (vertical)" : "Player 2 (horizontal)")}
      renderBoard={({ state, mySeat, interactive, onMove, lastMove }) => (
        <DomineeringBoard state={state} mySeat={mySeat} interactive={interactive} onMove={onMove} lastMove={lastMove} />
      )}
    />
  );
}
