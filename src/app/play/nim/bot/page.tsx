"use client";

import { LocalBoardGamePage } from "@/components/boardgames/LocalBoardGamePage";
import { NimBoard, type NimState, type NimMove } from "@/components/boardgames/NimBoard";
import { nimEngine, pickNimMove } from "@/lib/boardgames/engines/nim";

export default function NimBotPage() {
  return (
    <LocalBoardGamePage<NimMove, NimState>
      title="Nim"
      blurb="Take turns removing tokens from a pile — whoever takes the last token wins."
      mode="bot"
      engine={nimEngine}
      botFn={(state, player) => pickNimMove(state, player)}
      renderBoard={({ state, mySeat, interactive, onMove, lastMove }) => (
        <NimBoard state={state} mySeat={mySeat} interactive={interactive} onMove={onMove} lastMove={lastMove} />
      )}
    />
  );
}
