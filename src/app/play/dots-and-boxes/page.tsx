"use client";

import { BoardGamePage } from "@/components/boardgames/BoardGamePage";
import { DotsBoxesBoard, type DotsBoxesState, type DotsBoxesMove } from "@/components/boardgames/DotsBoxesBoard";

export default function DotsAndBoxesPage() {
  return (
    <BoardGamePage<DotsBoxesMove, DotsBoxesState>
      kind="dotsboxes"
      title="Dots and Boxes"
      blurb="Draw a line, complete a box to claim it and go again — most boxes wins."
      ratedAvailable
      renderBoard={({ state, mySeat, interactive, onMove, lastMove }) => (
        <DotsBoxesBoard state={state} mySeat={mySeat} interactive={interactive} onMove={onMove} lastMove={lastMove} />
      )}
    />
  );
}
