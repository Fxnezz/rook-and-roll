"use client";

import { LocalBoardGamePage } from "@/components/boardgames/LocalBoardGamePage";
import { LGameBoard, type LGameState, type LGameMove } from "@/components/boardgames/LGameBoard";
import { lGameEngine } from "@/lib/boardgames/engines/lgame";
import { pickLGameMove } from "@/lib/boardgames/bots/lgameBot";

export default function LGameBotPage() {
  return (
    <LocalBoardGamePage<LGameMove, LGameState>
      title="L-Game"
      blurb="Reposition your L-piece and optionally nudge a neutral piece — trap your opponent's L with nowhere to go."
      mode="bot"
      engine={lGameEngine}
      botFn={(state, player) => pickLGameMove(state, player)}
      renderBoard={({ state, mySeat, interactive, onMove, lastMove }) => (
        <LGameBoard state={state} mySeat={mySeat} interactive={interactive} onMove={onMove} lastMove={lastMove} />
      )}
    />
  );
}
