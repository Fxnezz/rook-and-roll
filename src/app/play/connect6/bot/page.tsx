"use client";

import { LocalBoardGamePage } from "@/components/boardgames/LocalBoardGamePage";
import { Connect6Board, type Connect6State, type Connect6Move } from "@/components/boardgames/Connect6Board";
import { connect6Engine } from "@/lib/boardgames/engines/connect6";
import { pickConnect6Move } from "@/lib/boardgames/bots/connect6Bot";
import { CONNECT6_RULES } from "@/lib/boardgames/rules";

export default function Connect6BotPage() {
  return (
    <LocalBoardGamePage<Connect6Move, Connect6State>
      title="Connect6"
      blurb="Place two stones each turn (one on the opening move) — six in a row wins."
      mode="bot"
      gameKey="connect6"
      engine={connect6Engine}
      botFn={(state, player) => pickConnect6Move(state, player)}
      rules={CONNECT6_RULES}
      renderBoard={({ state, mySeat, interactive, onMove, lastMove }) => (
        <Connect6Board state={state} mySeat={mySeat} interactive={interactive} onMove={onMove} lastMove={lastMove} />
      )}
    />
  );
}
