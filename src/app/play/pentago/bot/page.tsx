"use client";

import { LocalBoardGamePage } from "@/components/boardgames/LocalBoardGamePage";
import { PentagoBoard, type PentagoState, type PentagoMove } from "@/components/boardgames/PentagoBoard";
import { pentagoEngine } from "@/lib/boardgames/engines/pentago";
import { pickPentagoMove } from "@/lib/boardgames/bots/pentagoBot";

export default function PentagoBotPage() {
  return (
    <LocalBoardGamePage<PentagoMove, PentagoState>
      title="Pentago"
      blurb="Place a marble, then rotate a quadrant — five in a row after the rotation wins."
      mode="bot"
      gameKey="pentago"
      engine={pentagoEngine}
      botFn={pickPentagoMove}
      renderBoard={({ state, mySeat, interactive, onMove, lastMove }) => (
        <PentagoBoard state={state} mySeat={mySeat} interactive={interactive} onMove={onMove} lastMove={lastMove} />
      )}
    />
  );
}
