"use client";

import { LocalBoardGamePage } from "@/components/boardgames/LocalBoardGamePage";
import { AmazonsBoard, type AmazonsState, type AmazonsMove } from "@/components/boardgames/AmazonsBoard";
import { amazonsEngine } from "@/lib/boardgames/engines/amazons";
import { pickAmazonsMove } from "@/lib/boardgames/bots/amazonsBot";

export default function AmazonsBotPage() {
  return (
    <LocalBoardGamePage<AmazonsMove, AmazonsState>
      title="Amazons"
      blurb="Move a queen-like amazon, then shoot an arrow to block a square forever — the last player who can move wins."
      mode="bot"
      engine={amazonsEngine}
      botFn={(state, player) => pickAmazonsMove(state, player)}
      renderBoard={({ state, mySeat, interactive, onMove, lastMove }) => (
        <AmazonsBoard state={state} mySeat={mySeat} interactive={interactive} onMove={onMove} lastMove={lastMove} />
      )}
    />
  );
}
