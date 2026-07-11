"use client";

import { LocalBoardGamePage } from "@/components/boardgames/LocalBoardGamePage";
import { GomokuBoard, type GomokuState, type GomokuMove } from "@/components/boardgames/GomokuBoard";
import { gomokuEngine } from "@/lib/boardgames/engines/gomoku";
import { pickGomokuMove } from "@/lib/boardgames/bots/gomokuBot";

export default function GomokuBotPage() {
  return (
    <LocalBoardGamePage<GomokuMove, GomokuState>
      title="Gomoku"
      blurb="Five in a row, any direction — freestyle rules, no forbidden moves."
      mode="bot"
      gameKey="gomoku"
      engine={gomokuEngine}
      botFn={pickGomokuMove}
      difficulties={[
        { label: "Easy", depth: 1 },
        { label: "Medium", depth: 2 },
        { label: "Hard", depth: 3 },
      ]}
      renderBoard={({ state, mySeat, interactive, onMove, lastMove }) => (
        <GomokuBoard state={state} mySeat={mySeat} interactive={interactive} onMove={onMove} lastMove={lastMove} />
      )}
    />
  );
}
