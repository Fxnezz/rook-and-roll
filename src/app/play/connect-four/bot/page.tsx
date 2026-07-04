"use client";

import { LocalBoardGamePage } from "@/components/boardgames/LocalBoardGamePage";
import { ConnectFourBoard, type ConnectFourState, type ConnectFourMove } from "@/components/boardgames/ConnectFourBoard";
import { connectFourEngine } from "@/lib/boardgames/engines/connectFour";
import { pickConnectFourMove } from "@/lib/boardgames/bots/connectFourBot";

export default function ConnectFourBotPage() {
  return (
    <LocalBoardGamePage<ConnectFourMove, ConnectFourState>
      title="Connect Four"
      blurb="Four in a row — any direction — wins."
      mode="bot"
      engine={connectFourEngine}
      botFn={pickConnectFourMove}
      renderBoard={({ state, mySeat, interactive, onMove, status }) => (
        <ConnectFourBoard state={state} mySeat={mySeat} interactive={interactive} onMove={onMove} status={status} />
      )}
    />
  );
}
