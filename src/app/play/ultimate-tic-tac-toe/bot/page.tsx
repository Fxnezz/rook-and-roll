"use client";

import { LocalBoardGamePage } from "@/components/boardgames/LocalBoardGamePage";
import { UtttBoard, type UtttState, type UtttMove } from "@/components/boardgames/UtttBoard";
import { ultimateTicTacToeEngine } from "@/lib/boardgames/engines/ultimatetictactoe";
import { pickUltimateTicTacToeMove } from "@/lib/boardgames/bots/ultimatetictactoeBot";

export default function UltimateTicTacToeBotPage() {
  return (
    <LocalBoardGamePage<UtttMove, UtttState>
      title="Ultimate Tic-Tac-Toe"
      blurb="A 3x3 grid of tic-tac-toe boards — your move sends your opponent to the matching sub-board. Win 3 sub-boards in a row."
      mode="bot"
      gameKey="ultimate-tic-tac-toe"
      engine={ultimateTicTacToeEngine}
      botFn={pickUltimateTicTacToeMove}
      renderBoard={({ state, mySeat, interactive, onMove, lastMove }) => (
        <UtttBoard state={state} mySeat={mySeat} interactive={interactive} onMove={onMove} lastMove={lastMove} />
      )}
    />
  );
}
