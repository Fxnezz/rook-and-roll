"use client";

import { LocalBoardGamePage } from "@/components/boardgames/LocalBoardGamePage";
import { BreakthroughBoard, type BreakthroughState, type BreakthroughMove } from "@/components/boardgames/BreakthroughBoard";
import { breakthroughEngine } from "@/lib/boardgames/engines/breakthrough";
import { pickBreakthroughMove } from "@/lib/boardgames/bots/breakthroughBot";

export default function BreakthroughBotPage() {
  return (
    <LocalBoardGamePage<BreakthroughMove, BreakthroughState>
      title="Breakthrough"
      blurb="Race your pawns to the far row — capture diagonally, but only advance straight onto an empty square."
      mode="bot"
      engine={breakthroughEngine}
      botFn={(state, player) => pickBreakthroughMove(state, player)}
      renderBoard={({ state, mySeat, interactive, onMove, lastMove }) => (
        <BreakthroughBoard state={state} mySeat={mySeat} interactive={interactive} onMove={onMove} lastMove={lastMove} />
      )}
    />
  );
}
