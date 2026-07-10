"use client";

import { LocalBoardGamePage } from "@/components/boardgames/LocalBoardGamePage";
import { TicTacToeBoard, type TicTacToeState } from "@/components/boardgames/TicTacToeBoard";
import { ticTacToeEngine, type TicTacToeMove } from "@/lib/boardgames/engines/ticTacToe";
import { pickTicTacToeMove } from "@/lib/boardgames/bots/ticTacToeBot";

export default function TicTacToeBotPage() {
  return (
    <LocalBoardGamePage<TicTacToeMove, TicTacToeState>
      title="Tic-Tac-Toe"
      blurb="Three in a row wins."
      mode="bot"
      gameKey="tic-tac-toe"
      engine={ticTacToeEngine}
      botFn={pickTicTacToeMove}
      renderBoard={({ state, mySeat, interactive, onMove, status }) => (
        <TicTacToeBoard state={state} mySeat={mySeat} interactive={interactive} onMove={onMove} status={status} />
      )}
    />
  );
}
