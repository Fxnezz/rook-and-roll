"use client";

import { LocalBoardGamePage } from "@/components/boardgames/LocalBoardGamePage";
import { QuoridorBoard, type QuoridorState, type QuoridorMove } from "@/components/boardgames/QuoridorBoard";
import { quoridorEngine } from "@/lib/boardgames/engines/quoridor";
import { pickQuoridorMove } from "@/lib/boardgames/bots/quoridorBot";
import { QUORIDOR_RULES } from "@/lib/boardgames/rules";

export default function QuoridorBotPage() {
  return (
    <LocalBoardGamePage<QuoridorMove, QuoridorState>
      title="Quoridor"
      blurb="Race to the far row, or place walls to slow your opponent down — but never seal off either path."
      mode="bot"
      gameKey="quoridor"
      engine={quoridorEngine}
      botFn={(state, player) => pickQuoridorMove(state, player)}
      rules={QUORIDOR_RULES}
      renderBoard={({ state, mySeat, interactive, onMove, lastMove }) => (
        <QuoridorBoard state={state} mySeat={mySeat} interactive={interactive} onMove={onMove} lastMove={lastMove} />
      )}
    />
  );
}
