"use client";

import { LocalBoardGamePage } from "@/components/boardgames/LocalBoardGamePage";
import { TicTacToeBoard, type TicTacToeState } from "@/components/boardgames/TicTacToeBoard";
import { ticTacToeEngine, type TicTacToeMove } from "@/lib/boardgames/engines/ticTacToe";

export default function TicTacToeLocalPage() {
  return (
    <LocalBoardGamePage<TicTacToeMove, TicTacToeState>
      title="Tic-Tac-Toe"
      blurb="Three in a row wins."
      mode="passplay"
      engine={ticTacToeEngine}
      seatLabel={(s) => (s === "a" ? "✕" : "◯")}
      renderBoard={({ state, mySeat, interactive, onMove, status }) => (
        <TicTacToeBoard state={state} mySeat={mySeat} interactive={interactive} onMove={onMove} status={status} />
      )}
    />
  );
}
