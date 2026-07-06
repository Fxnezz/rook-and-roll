"use client";

import { LocalBoardGamePage } from "@/components/boardgames/LocalBoardGamePage";
import { YGameBoard, type YGameState, type YGameMove } from "@/components/boardgames/YGameBoard";
import { yGameEngine } from "@/lib/boardgames/engines/ygame";

export default function YGameLocalPage() {
  return (
    <LocalBoardGamePage<YGameMove, YGameState>
      title="Y"
      blurb="Connect all three sides of the triangle with one unbroken group of stones — no draws are possible."
      mode="passplay"
      engine={yGameEngine}
      seatLabel={(s) => (s === "a" ? "Player 1" : "Player 2")}
      renderBoard={({ state, mySeat, interactive, onMove, lastMove }) => (
        <YGameBoard state={state} mySeat={mySeat} interactive={interactive} onMove={onMove} lastMove={lastMove} />
      )}
    />
  );
}
