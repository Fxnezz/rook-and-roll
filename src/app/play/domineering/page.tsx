"use client";

import { BoardGamePage } from "@/components/boardgames/BoardGamePage";
import { DomineeringBoard, type DomineeringState, type DomineeringMove } from "@/components/boardgames/DomineeringBoard";

export default function DomineeringPage() {
  return (
    <BoardGamePage<DomineeringMove, DomineeringState>
      kind="domineering"
      title="Domineering"
      blurb="Vertical vs horizontal domino placement on a shared grid — whoever can't move loses."
      ratedAvailable
      renderBoard={({ state, mySeat, interactive, onMove, lastMove }) => (
        <DomineeringBoard state={state} mySeat={mySeat} interactive={interactive} onMove={onMove} lastMove={lastMove} />
      )}
    />
  );
}
