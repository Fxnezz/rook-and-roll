"use client";

import { LocalBoardGamePage } from "@/components/boardgames/LocalBoardGamePage";
import { LoaBoard, type LoaState, type LoaMove } from "@/components/boardgames/LoaBoard";
import { loaEngine } from "@/lib/boardgames/engines/linesofaction";
import { pickLoaMove } from "@/lib/boardgames/bots/loaBot";
import { LINES_OF_ACTION_RULES } from "@/lib/boardgames/rules";

export default function LoaBotPage() {
  return (
    <LocalBoardGamePage<LoaMove, LoaState>
      title="Lines of Action"
      blurb="Move as far as the pieces on your line let you — gather your whole army into one connected group to win."
      mode="bot"
      gameKey="lines-of-action"
      engine={loaEngine}
      botFn={(state, player) => pickLoaMove(state, player)}
      rules={LINES_OF_ACTION_RULES}
      renderBoard={({ state, mySeat, interactive, onMove, lastMove }) => (
        <LoaBoard state={state} mySeat={mySeat} interactive={interactive} onMove={onMove} lastMove={lastMove} />
      )}
    />
  );
}
