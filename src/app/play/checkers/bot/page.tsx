"use client";

import { LocalBoardGamePage } from "@/components/boardgames/LocalBoardGamePage";
import { CheckersBoard, type CheckersState, type CheckersMove } from "@/components/boardgames/CheckersBoard";
import { checkersEngine } from "@/lib/boardgames/engines/checkers";
import { pickCheckersMove } from "@/lib/boardgames/bots/checkersBot";

export default function CheckersBotPage() {
  return (
    <LocalBoardGamePage<CheckersMove, CheckersState>
      title="Checkers"
      blurb="Standard American rules — forced capture, kings, multi-jumps."
      mode="bot"
      gameKey="checkers"
      engine={checkersEngine}
      botFn={pickCheckersMove}
      renderBoard={({ state, mySeat, interactive, onMove, lastMove }) => (
        <CheckersBoard state={state} mySeat={mySeat} interactive={interactive} onMove={onMove} lastMove={lastMove} />
      )}
    />
  );
}
