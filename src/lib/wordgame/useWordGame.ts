"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import {
  MAX_GUESSES,
  WORD_LENGTH,
  dailyKey,
  dailyWord,
  isValidGuess,
  mergeKeyboardState,
  randomWord,
  scoreGuess,
  type LetterState,
} from "./index";

export type Mode = "daily" | "practice";

interface Persisted {
  guesses: string[];
  done: boolean;
  won: boolean;
}

function storageKey(mode: Mode) {
  return mode === "daily" ? `rr.wordle.daily.${dailyKey()}` : `rr.wordle.practice`;
}

export function useWordGame(mode: Mode) {
  const { data: session } = useSession();
  const [answer, setAnswer] = useState<string>("");
  const [guesses, setGuesses] = useState<string[]>([]);
  const [current, setCurrent] = useState("");
  const [shake, setShake] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [won, setWon] = useState(false);

// Picks a fresh word and restores (or clears) any persisted progress for the
  // given mode. Used on mode switch, and again for an explicit "new practice
  // word" restart (which doesn't change mode, so a plain mode-effect wouldn't
  // fire) — daily mode is deterministic by date, so it's never restarted.
  const load = useCallback((m: Mode, fresh: boolean) => {
    const a = m === "daily" ? dailyWord() : randomWord();
    setAnswer(a);
    if (fresh) {
      setGuesses([]);
      setDone(false);
      setWon(false);
      try {
        localStorage.removeItem(storageKey(m));
      } catch {
        /* ignore */
      }
    } else {
      try {
        const raw = localStorage.getItem(storageKey(m));
        if (raw) {
          const p = JSON.parse(raw) as Persisted;
          setGuesses(p.guesses);
          setDone(p.done);
          setWon(p.won);
        } else {
          setGuesses([]);
          setDone(false);
          setWon(false);
        }
      } catch {
        /* ignore */
      }
    }
    setCurrent("");
    setToast(null);
  }, []);

  useEffect(() => {
    load(mode, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const newPracticeWord = useCallback(() => {
    if (mode === "practice") load("practice", true);
  }, [mode, load]);

  const persist = useCallback(
    (next: Persisted) => {
      try {
        localStorage.setItem(storageKey(mode), JSON.stringify(next));
      } catch {
        /* ignore */
      }
    },
    [mode],
  );

  const rows = useMemo(() => guesses.map((g) => ({ word: g, states: scoreGuess(g, answer) })), [guesses, answer]);

  const keyboardState = useMemo(() => {
    let kb: Record<string, LetterState> = {};
    for (const r of rows) kb = mergeKeyboardState(kb, r.word, r.states);
    return kb;
  }, [rows]);

  const flashToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast((t) => (t === msg ? null : t)), 1400);
  };

  const submitStats = useCallback(
    async (solved: boolean, guessCount: number) => {
      if (mode !== "daily" || !session?.user) return;
      fetch("/api/wordgame/stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ solved, guessCount }),
      }).catch(() => {});
    },
    [mode, session],
  );

  const typeLetter = useCallback(
    (letter: string) => {
      if (done) return;
      setCurrent((c) => (c.length < WORD_LENGTH ? c + letter.toLowerCase() : c));
    },
    [done],
  );

  const backspace = useCallback(() => {
    if (done) return;
    setCurrent((c) => c.slice(0, -1));
  }, [done]);

  const submitGuess = useCallback(() => {
    if (done) return;
    if (current.length !== WORD_LENGTH) {
      setShake(true);
      flashToast("Not enough letters");
      setTimeout(() => setShake(false), 500);
      return;
    }
    if (!isValidGuess(current)) {
      setShake(true);
      flashToast("Not in word list");
      setTimeout(() => setShake(false), 500);
      return;
    }
    const nextGuesses = [...guesses, current];
    const isWin = current === answer;
    const isLastGuess = nextGuesses.length >= MAX_GUESSES;
    const nextDone = isWin || isLastGuess;
    setGuesses(nextGuesses);
    setCurrent("");
    if (nextDone) {
      setDone(true);
      setWon(isWin);
      submitStats(isWin, nextGuesses.length);
    }
    persist({ guesses: nextGuesses, done: nextDone, won: isWin });
  }, [current, guesses, answer, done, persist, submitStats]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (done) return;
      if (e.key === "Enter") submitGuess();
      else if (e.key === "Backspace") backspace();
      else if (/^[a-zA-Z]$/.test(e.key)) typeLetter(e.key);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [done, submitGuess, backspace, typeLetter]);

  return {
    answer, // exposed for a "reveal" UI on loss — never logged/sent anywhere
    rows,
    current,
    keyboardState,
    done,
    won,
    shake,
    toast,
    typeLetter,
    backspace,
    submitGuess,
    newPracticeWord,
    guessesLeft: MAX_GUESSES - guesses.length,
  };
}
