"use client";

import { BoardGamePage } from "@/components/boardgames/BoardGamePage";
import { NimBoard, type NimState, type NimMove } from "@/components/boardgames/NimBoard";

export default function NimPage() {
  return (
    <BoardGamePage<NimMove, NimState>
      kind="nim"
      title="Nim"
      blurb="Take turns removing tokens from a pile — whoever takes the last token wins."
      ratedAvailable
      renderBoard={({ state, mySeat, interactive, onMove, lastMove }) => (
        <NimBoard state={state} mySeat={mySeat} interactive={interactive} onMove={onMove} lastMove={lastMove} />
      )}
    />
  );
}
