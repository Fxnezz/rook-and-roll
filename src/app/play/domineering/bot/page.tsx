"use client";

import { LocalBoardGamePage } from "@/components/boardgames/LocalBoardGamePage";
import { DomineeringBoard, type DomineeringState, type DomineeringMove } from "@/components/boardgames/DomineeringBoard";
import { domineeringEngine } from "@/lib/boardgames/engines/domineering";
import { pickDomineeringMove } from "@/lib/boardgames/bots/domineeringBot";

export default function DomineeringBotPage() {
  return (
    <LocalBoardGamePage<DomineeringMove, DomineeringState>
      title="Domineering"
      blurb="Vertical vs horizontal domino placement on a shared grid — whoever can't move loses."
      mode="bot"
      engine={domineeringEngine}
      botFn={(state, player) => pickDomineeringMove(state, player)}
      renderBoard={({ state, mySeat, interactive, onMove, lastMove }) => (
        <DomineeringBoard state={state} mySeat={mySeat} interactive={interactive} onMove={onMove} lastMove={lastMove} />
      )}
    />
  );
}
