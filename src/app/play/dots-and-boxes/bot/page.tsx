"use client";

import { LocalBoardGamePage } from "@/components/boardgames/LocalBoardGamePage";
import { DotsBoxesBoard, type DotsBoxesState, type DotsBoxesMove } from "@/components/boardgames/DotsBoxesBoard";
import { dotsBoxesEngine } from "@/lib/boardgames/engines/dotsboxes";
import { pickDotsBoxesMove } from "@/lib/boardgames/bots/dotsboxesBot";

export default function DotsAndBoxesBotPage() {
  return (
    <LocalBoardGamePage<DotsBoxesMove, DotsBoxesState>
      title="Dots and Boxes"
      blurb="Draw a line, complete a box to claim it and go again — most boxes wins."
      mode="bot"
      engine={dotsBoxesEngine}
      botFn={pickDotsBoxesMove}
      renderBoard={({ state, mySeat, interactive, onMove, lastMove }) => (
        <DotsBoxesBoard state={state} mySeat={mySeat} interactive={interactive} onMove={onMove} lastMove={lastMove} />
      )}
    />
  );
}
