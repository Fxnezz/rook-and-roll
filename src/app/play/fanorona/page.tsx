"use client";

import { BoardGamePage } from "@/components/boardgames/BoardGamePage";
import { FanoronaBoard, type FanoronaState, type FanoronaMove } from "@/components/boardgames/FanoronaBoard";

export default function FanoronaPage() {
  return (
    <BoardGamePage<FanoronaMove, FanoronaState>
      kind="fanorona"
      title="Fanorona"
      blurb="Madagascar's classic capture game — slide into a gap to capture a line of enemy pieces ahead or behind you."
      ratedAvailable
      renderBoard={({ state, mySeat, interactive, onMove, lastMove }) => (
        <FanoronaBoard state={state} mySeat={mySeat} interactive={interactive} onMove={onMove} lastMove={lastMove} />
      )}
    />
  );
}
