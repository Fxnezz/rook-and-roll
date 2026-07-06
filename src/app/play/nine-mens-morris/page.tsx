"use client";

import { BoardGamePage } from "@/components/boardgames/BoardGamePage";
import { NineMensMorrisBoard, type NineMensMorrisState, type NineMensMorrisMove } from "@/components/boardgames/NineMensMorrisBoard";

export default function NineMensMorrisPage() {
  return (
    <BoardGamePage<NineMensMorrisMove, NineMensMorrisState>
      kind="ninemensmorris"
      title="Nine Men's Morris"
      blurb="Place, then move your pieces to form a mill (3 in a row) and remove an opponent piece. Reduce them to 2 to win."
      ratedAvailable
      renderBoard={({ state, mySeat, interactive, onMove, lastMove }) => (
        <NineMensMorrisBoard state={state} mySeat={mySeat} interactive={interactive} onMove={onMove} lastMove={lastMove} />
      )}
    />
  );
}
