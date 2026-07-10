"use client";

import { LocalBoardGamePage } from "@/components/boardgames/LocalBoardGamePage";
import { FanoronaBoard, type FanoronaState, type FanoronaMove } from "@/components/boardgames/FanoronaBoard";
import { fanoronaEngine } from "@/lib/boardgames/engines/fanorona";
import { pickFanoronaMove } from "@/lib/boardgames/bots/fanoronaBot";
import { FANORONA_RULES } from "@/lib/boardgames/rules";

export default function FanoronaBotPage() {
  return (
    <LocalBoardGamePage<FanoronaMove, FanoronaState>
      title="Fanorona"
      blurb="Madagascar's classic capture game — slide into a gap to capture a line of enemy pieces ahead or behind you."
      mode="bot"
      gameKey="fanorona"
      engine={fanoronaEngine}
      botFn={pickFanoronaMove}
      difficulties={[
        { label: "Easy", depth: 1 },
        { label: "Medium", depth: 2 },
        { label: "Hard", depth: 3 },
      ]}
      rules={FANORONA_RULES}
      renderBoard={({ state, mySeat, interactive, onMove, lastMove }) => (
        <FanoronaBoard state={state} mySeat={mySeat} interactive={interactive} onMove={onMove} lastMove={lastMove} />
      )}
    />
  );
}
