"use client";

import { LocalBoardGamePage } from "@/components/boardgames/LocalBoardGamePage";
import { FanoronaBoard, type FanoronaState, type FanoronaMove } from "@/components/boardgames/FanoronaBoard";
import { fanoronaEngine } from "@/lib/boardgames/engines/fanorona";
import { pickFanoronaMove } from "@/lib/boardgames/bots/fanoronaBot";

export default function FanoronaBotPage() {
  return (
    <LocalBoardGamePage<FanoronaMove, FanoronaState>
      title="Fanorona"
      blurb="Madagascar's classic capture game — slide into a gap to capture a line of enemy pieces ahead or behind you."
      mode="bot"
      engine={fanoronaEngine}
      botFn={(state, player) => pickFanoronaMove(state, player)}
      renderBoard={({ state, mySeat, interactive, onMove, lastMove }) => (
        <FanoronaBoard state={state} mySeat={mySeat} interactive={interactive} onMove={onMove} lastMove={lastMove} />
      )}
    />
  );
}
