"use client";

import { BoardGamePage } from "@/components/boardgames/BoardGamePage";
import { TicTacToeBoard, type TicTacToeState } from "@/components/boardgames/TicTacToeBoard";

export default function TicTacToePage() {
  return (
    <BoardGamePage<{ index: number }, TicTacToeState>
      kind="tictactoe"
      title="Tic-Tac-Toe"
      blurb="Three in a row wins. Quick and unrated."
      ratedAvailable={false}
      renderBoard={({ state, mySeat, interactive, onMove, status }) => (
        <TicTacToeBoard state={state} mySeat={mySeat} interactive={interactive} onMove={onMove} status={status} />
      )}
    />
  );
}
