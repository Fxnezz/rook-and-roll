"use client";

import { LocalBoardGamePage } from "@/components/boardgames/LocalBoardGamePage";
import { NimBoard, type NimState, type NimMove } from "@/components/boardgames/NimBoard";
import { nimEngine } from "@/lib/boardgames/engines/nim";

export default function NimLocalPage() {
  return (
    <LocalBoardGamePage<NimMove, NimState>
      title="Nim"
      blurb="Take turns removing tokens from a pile — whoever takes the last token wins."
      mode="passplay"
      engine={nimEngine}
      seatLabel={(s) => (s === "a" ? "Player 1" : "Player 2")}
      renderBoard={({ state, mySeat, interactive, onMove, lastMove }) => (
        <NimBoard state={state} mySeat={mySeat} interactive={interactive} onMove={onMove} lastMove={lastMove} />
      )}
    />
  );
}
