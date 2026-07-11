"use client";

import { LocalBoardGamePage } from "@/components/boardgames/LocalBoardGamePage";
import { DomineeringBoard, type DomineeringState, type DomineeringMove } from "@/components/boardgames/DomineeringBoard";
import { domineeringEngine } from "@/lib/boardgames/engines/domineering";
import { pickDomineeringMove } from "@/lib/boardgames/bots/domineeringBot";
import { DOMINEERING_RULES } from "@/lib/boardgames/rules";

export default function DomineeringBotPage() {
  return (
    <LocalBoardGamePage<DomineeringMove, DomineeringState>
      title="Domineering"
      blurb="Vertical vs horizontal domino placement on a shared grid — whoever can't move loses."
      mode="bot"
      gameKey="domineering"
      engine={domineeringEngine}
      botFn={pickDomineeringMove}
      difficulties={[
        { label: "Easy", depth: 1 },
        { label: "Medium", depth: 2 },
        { label: "Hard", depth: 3 },
      ]}
      rules={DOMINEERING_RULES}
      renderBoard={({ state, mySeat, interactive, onMove, lastMove }) => (
        <DomineeringBoard state={state} mySeat={mySeat} interactive={interactive} onMove={onMove} lastMove={lastMove} />
      )}
    />
  );
}
