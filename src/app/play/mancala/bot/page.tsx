"use client";

import { LocalBoardGamePage } from "@/components/boardgames/LocalBoardGamePage";
import { MancalaBoard, type MancalaState, type MancalaMove } from "@/components/boardgames/MancalaBoard";
import { mancalaEngine } from "@/lib/boardgames/engines/mancala";
import { pickMancalaMove } from "@/lib/boardgames/bots/mancalaBot";

export default function MancalaBotPage() {
  return (
    <LocalBoardGamePage<MancalaMove, MancalaState>
      title="Mancala"
      blurb="Standard Kalah rules — sow seeds, land in your store for an extra turn, capture across the board."
      mode="bot"
      gameKey="mancala"
      engine={mancalaEngine}
      botFn={pickMancalaMove}
      renderBoard={({ state, mySeat, interactive, onMove, lastMove }) => (
        <MancalaBoard state={state} mySeat={mySeat} interactive={interactive} onMove={onMove} lastMove={lastMove} />
      )}
    />
  );
}
