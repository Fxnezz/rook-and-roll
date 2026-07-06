"use client";

import { LocalBoardGamePage } from "@/components/boardgames/LocalBoardGamePage";
import { HalmaBoard, type HalmaState, type HalmaMove } from "@/components/boardgames/HalmaBoard";
import { halmaEngine } from "@/lib/boardgames/engines/halma";
import { pickHalmaMove } from "@/lib/boardgames/bots/halmaBot";

export default function HalmaBotPage() {
  return (
    <LocalBoardGamePage<HalmaMove, HalmaState>
      title="Halma"
      blurb="Hop your pieces across the board into the opposite corner — first to fill the far camp wins."
      mode="bot"
      engine={halmaEngine}
      botFn={(state, player) => pickHalmaMove(state, player)}
      renderBoard={({ state, mySeat, interactive, onMove, lastMove }) => (
        <HalmaBoard state={state} mySeat={mySeat} interactive={interactive} onMove={onMove} lastMove={lastMove} />
      )}
    />
  );
}
