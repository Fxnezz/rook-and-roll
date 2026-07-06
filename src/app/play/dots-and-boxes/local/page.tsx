"use client";

import { LocalBoardGamePage } from "@/components/boardgames/LocalBoardGamePage";
import { DotsBoxesBoard, type DotsBoxesState, type DotsBoxesMove } from "@/components/boardgames/DotsBoxesBoard";
import { dotsBoxesEngine } from "@/lib/boardgames/engines/dotsboxes";

export default function DotsAndBoxesLocalPage() {
  return (
    <LocalBoardGamePage<DotsBoxesMove, DotsBoxesState>
      title="Dots and Boxes"
      blurb="Draw a line, complete a box to claim it and go again — most boxes wins."
      mode="passplay"
      engine={dotsBoxesEngine}
      seatLabel={(s) => (s === "a" ? "Player 1" : "Player 2")}
      renderBoard={({ state, mySeat, interactive, onMove, lastMove }) => (
        <DotsBoxesBoard state={state} mySeat={mySeat} interactive={interactive} onMove={onMove} lastMove={lastMove} />
      )}
    />
  );
}
