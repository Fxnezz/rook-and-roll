"use client";

import { LocalBoardGamePage } from "@/components/boardgames/LocalBoardGamePage";
import { NineMensMorrisBoard, type NineMensMorrisState, type NineMensMorrisMove } from "@/components/boardgames/NineMensMorrisBoard";
import { nineMensMorrisEngine } from "@/lib/boardgames/engines/ninemensmorris";

export default function NineMensMorrisLocalPage() {
  return (
    <LocalBoardGamePage<NineMensMorrisMove, NineMensMorrisState>
      title="Nine Men's Morris"
      blurb="Place, then move your pieces to form a mill (3 in a row) and remove an opponent piece. Reduce them to 2 to win."
      mode="passplay"
      engine={nineMensMorrisEngine}
      seatLabel={(s) => (s === "a" ? "Player 1" : "Player 2")}
      renderBoard={({ state, mySeat, interactive, onMove, lastMove }) => (
        <NineMensMorrisBoard state={state} mySeat={mySeat} interactive={interactive} onMove={onMove} lastMove={lastMove} />
      )}
    />
  );
}
