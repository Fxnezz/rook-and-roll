"use client";

import { LocalBoardGamePage } from "@/components/boardgames/LocalBoardGamePage";
import { HexBoard, type HexState, type HexMove } from "@/components/boardgames/HexBoard";
import { hexEngine } from "@/lib/boardgames/engines/hex";
import { pickHexMove } from "@/lib/boardgames/bots/hexBot";

export default function HexBotPage() {
  return (
    <LocalBoardGamePage<HexMove, HexState>
      title="Hex"
      blurb="Connect your two sides of the board with an unbroken chain — no draws are possible."
      mode="bot"
      engine={hexEngine}
      botFn={pickHexMove}
      renderBoard={({ state, mySeat, interactive, onMove, lastMove }) => (
        <HexBoard state={state} mySeat={mySeat} interactive={interactive} onMove={onMove} lastMove={lastMove} />
      )}
    />
  );
}
