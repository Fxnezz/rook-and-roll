"use client";

import { BoardGamePage } from "@/components/boardgames/BoardGamePage";
import { Connect6Board, type Connect6State, type Connect6Move } from "@/components/boardgames/Connect6Board";

export default function Connect6Page() {
  return (
    <BoardGamePage<Connect6Move, Connect6State>
      kind="connect6"
      title="Connect6"
      blurb="Place two stones each turn (one on the opening move) — six in a row wins."
      ratedAvailable
      renderBoard={({ state, mySeat, interactive, onMove, lastMove }) => (
        <Connect6Board state={state} mySeat={mySeat} interactive={interactive} onMove={onMove} lastMove={lastMove} />
      )}
    />
  );
}
