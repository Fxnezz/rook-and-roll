"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BotCapableEngine, GameResult, Player } from "./engines/types";

export type LocalMode = "passplay" | "bot";

export interface LocalMatchState<TMove, TState> {
  state: TState;
  turn: Player;
  status: GameResult | null;
  lastMove: { move: TMove; by: Player; seq: number } | null;
  moveCount: number;
  thinking: boolean;
}

interface MatchSnapshot<TMove, TState> {
  state: TState;
  lastMove: { move: TMove; by: Player; seq: number } | null;
  moveCount: number;
  sequence: number;
}

/**
 * Drives one local (no-socket) game against the shared BotCapableEngine
 * interface. Two modes share this same state machine:
 *  - "passplay": both seats are human, hot-seat on one screen.
 *  - "bot": one seat (`humanSeat`) is human, the other is played by `botFn`
 *    on a short delay so it doesn't feel instantaneous/robotic.
 */
export function useLocalMatch<TMove, TState>(
  engine: BotCapableEngine<TMove, TState>,
  mode: LocalMode,
  botFn: (state: TState, player: Player) => TMove | null,
  humanSeat: Player,
) {
  const [state, setState] = useState<TState>(() => engine.initialState());
  const [lastMove, setLastMove] = useState<{ move: TMove; by: Player; seq: number } | null>(null);
  const [moveCount, setMoveCount] = useState(0);
  const moveSeq = useRef(0);
  const historyRef = useRef<MatchSnapshot<TMove, TState>[]>([]);

  const status = engine.getResult(state);
  const turn = engine.turnOf(state);
  const thinking = mode === "bot" && !status && turn !== humanSeat;

  const applyMove = useCallback(
    (move: TMove, by: Player) => {
      if (engine.getResult(state)) return false;
      const res = engine.applyMove(state, by, move);
      if (!res.ok || !res.state) return false;
      historyRef.current.push({
        state,
        lastMove,
        moveCount,
        sequence: moveSeq.current,
      });
      setState(res.state);
      moveSeq.current += 1;
      setLastMove({ move, by, seq: moveSeq.current });
      setMoveCount((c) => c + 1);
      return true;
    },
    [engine, state, lastMove, moveCount],
  );

  // Bot's turn: think for a moment, then move (purely cosmetic delay).
  useEffect(() => {
    if (mode !== "bot" || status) return;
    const botSeat: Player = humanSeat === "a" ? "b" : "a";
    if (turn !== botSeat) return;
    const delay = 350 + Math.random() * 450;
    const t = setTimeout(() => {
      const move = botFn(state, botSeat);
      if (move) applyMove(move, botSeat);
    }, delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, status, turn, state, humanSeat]);

  const sendMove = useCallback(
    (move: TMove) => {
      if (mode === "bot" && turn !== humanSeat) return;
      applyMove(move, turn);
    },
    [mode, turn, humanSeat, applyMove],
  );

  const reset = useCallback(() => {
    setState(engine.initialState());
    setLastMove(null);
    setMoveCount(0);
    moveSeq.current = 0;
    historyRef.current = [];
  }, [engine]);

  const undo = useCallback(() => {
    if (historyRef.current.length === 0) return;

    // In bot mode, undo a complete human+bot round when both plies exist.
    // If the bot is still thinking, only the human move needs to be undone.
    const steps = mode === "bot" && !thinking ? Math.min(2, historyRef.current.length) : 1;
    let target = historyRef.current.pop();
    for (let i = 1; i < steps; i += 1) target = historyRef.current.pop() ?? target;
    if (!target) return;

    setState(target.state);
    setLastMove(target.lastMove);
    setMoveCount(target.moveCount);
    moveSeq.current = target.sequence;
  }, [mode, thinking]);

  const result: LocalMatchState<TMove, TState> = { state, turn, status, lastMove, moveCount, thinking };
  return { ...result, sendMove, reset, undo, canUndo: moveCount > 0 };
}
