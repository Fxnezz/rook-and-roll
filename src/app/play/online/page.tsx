"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import type { Color, PieceSymbol, Square } from "chess.js";
import { Board } from "@/components/board/Board";
import { MoveList } from "@/components/game/MoveList";
import { Clock } from "@/components/game/Clock";
import { ChatPanel } from "@/components/game/ChatPanel";
import { useChessGame } from "@/lib/chess/useChessGame";
import { useSettings } from "@/lib/chess/useSettings";
import { getTheme } from "@/lib/chess/themes";
import { TIME_CONTROLS, type TimeControl } from "@/lib/chess/useClock";
import { playSound, primeAudio } from "@/lib/chess/sound";
import { useOnlineGame } from "@/lib/online/useOnlineGame";
import type { Identity } from "@/lib/online/protocol";
import { IconFlag, IconHandshake, IconUsers } from "@/components/ui/icons";

function soundFor(san: string) {
  if (san.includes("#")) return; // handled by game over
  if (san.includes("+")) playSound("check");
  else if (san.includes("x")) playSound("capture");
  else if (san.includes("O-O")) playSound("castle");
  else if (san.includes("=")) playSound("promote");
  else playSound("move");
}

function guestIdentity(): { userId: string; username: string } {
  if (typeof window === "undefined") return { userId: "guest:ssr", username: "Guest" };
  let id = localStorage.getItem("rr.guestId");
  if (!id) {
    id = "guest:" + Math.random().toString(36).slice(2, 10);
    localStorage.setItem("rr.guestId", id);
  }
  const num = id.slice(-4);
  return { userId: id, username: `Guest-${num}` };
}

export default function OnlinePage() {
  const { data: session } = useSession();
  const { settings } = useSettings();
  const theme = getTheme(settings.boardTheme);
  const game = useChessGame();
  const { snapshot } = game;

  const [tc, setTc] = useState<TimeControl>(TIME_CONTROLS[4]); // 3+2 default
  const [rated, setRated] = useState(false);
  const [ratings, setRatings] = useState<Record<string, number> | null>(null);
  const [tab, setTab] = useState<"moves" | "chat">("moves");

  const loggedIn = Boolean(session?.user);

  useEffect(() => {
    if (!loggedIn) return;
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.user)
          setRatings({
            bullet: d.user.ratingBullet,
            blitz: d.user.ratingBlitz,
            rapid: d.user.ratingRapid,
            classical: d.user.ratingClassical,
          });
      })
      .catch(() => {});
  }, [loggedIn]);

  const identity: Identity = useMemo(() => {
    const ratingForCat = ratings?.[tc.category] ?? 1200;
    if (session?.user) {
      return {
        userId: session.user.id,
        username: session.user.username ?? session.user.name ?? "Player",
        rating: ratingForCat,
        guest: false,
      };
    }
    const g = guestIdentity();
    return { ...g, rating: 1200, guest: true };
  }, [session, ratings, tc.category]);

  const online = useOnlineGame(identity);
  const { state } = online;

  const orientation: Color = state.myColor ?? "w";
  const lastAppliedRef = useRef<string>("");

  // Full resync from authoritative server state.
  useEffect(() => {
    if (!state.fullState) return;
    const fs = state.fullState;
    if (fs.moves.length === 0) game.reset();
    else game.loadPgn(fs.pgn);
    game.goLive();
    lastAppliedRef.current = fs.moves.length ? fs.moves[fs.moves.length - 1].from + fs.moves[fs.moves.length - 1].to : "";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.stateSeq]);

  // Apply an incoming server move (skip if we already applied it optimistically).
  useEffect(() => {
    const mv = state.lastServerMove;
    if (!mv) return;
    const key = mv.from + mv.to + (mv.promotion ?? "");
    const moves = snapshot.moves;
    const last = moves[moves.length - 1];
    const alreadyApplied = last && last.from === mv.from && last.to === mv.to;
    if (alreadyApplied) {
      lastAppliedRef.current = key;
      return;
    }
    const applied = game.makeMove({ from: mv.from as Square, to: mv.to as Square, promotion: mv.promotion as PieceSymbol | undefined });
    if (applied) soundFor(applied.san);
    lastAppliedRef.current = key;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.moveSeq]);

  // Game over sound
  useEffect(() => {
    if (state.status) playSound("gameEnd");
  }, [state.status]);

  const onMove = useCallback(
    (from: Square, to: Square, promotion?: PieceSymbol) => {
      if (state.phase !== "playing" || state.myColor !== snapshot.turn || state.status) return;
      primeAudio();
      const applied = game.makeMove({ from, to, promotion });
      if (!applied) return;
      soundFor(applied.san);
      online.sendMove(from, to, promotion);
    },
    [game, online, state.phase, state.myColor, state.status, snapshot.turn],
  );

  // ---------- lobby ----------
  if (state.phase === "idle") {
    const grouped: Record<string, TimeControl[]> = {};
    for (const t of TIME_CONTROLS) if (t.category !== "untimed") (grouped[t.category] ??= []).push(t);
    return (
      <div className="mx-auto max-w-lg px-4 py-10">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--bg-elev-2)] text-[var(--accent)]">
            <IconUsers width={22} height={22} />
          </span>
          <div>
            <h1 className="text-xl font-bold leading-tight">Play online</h1>
            <p className="text-sm text-[var(--text-muted)]">
              {online.state.connected ? "Get matched with a live opponent" : "Connecting to the game server…"}
            </p>
          </div>
        </div>

        <section className="panel p-4">
          <span className="label mb-3 block">Time control</span>
          <div className="flex flex-col gap-3">
            {Object.entries(grouped).map(([cat, list]) => (
              <div key={cat} className="flex flex-wrap items-center gap-2">
                <span className="w-16 shrink-0 text-xs capitalize text-[var(--text-faint)]">{cat}</span>
                {list.map((t) => {
                  const active = tc.id === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTc(t)}
                      className="rounded-md border px-3 py-1.5 text-sm font-semibold transition-colors"
                      style={{
                        borderColor: active ? "var(--accent)" : "var(--border)",
                        background: active ? "var(--bg-elev-2)" : "transparent",
                        color: active ? "var(--text)" : "var(--text-muted)",
                      }}
                    >
                      {t.name}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </section>

        <label
          className="mt-4 flex items-center justify-between px-1"
          style={{ opacity: loggedIn ? 1 : 0.5 }}
        >
          <span className="text-sm">
            Rated {!loggedIn && <span className="text-xs text-[var(--text-faint)]">(sign in to play rated)</span>}
          </span>
          <input
            type="checkbox"
            checked={rated && loggedIn}
            disabled={!loggedIn}
            onChange={(e) => setRated(e.target.checked)}
            className="h-4 w-4 accent-[var(--accent)]"
          />
        </label>

        {state.error && <p className="mt-3 text-sm text-[var(--bad)]">{state.error}</p>}

        <button
          className="btn btn-primary mt-5 w-full !py-3 text-base"
          onClick={() => {
            primeAudio();
            online.findGame(tc, rated && loggedIn);
          }}
        >
          Find a game
        </button>
        <p className="mt-3 text-center text-xs text-[var(--text-faint)]">
          Playing as <span className="font-semibold">{identity.username}</span>
        </p>
      </div>
    );
  }

  // ---------- searching ----------
  if (state.phase === "searching") {
    return (
      <div className="mx-auto flex max-w-sm flex-col items-center px-4 py-24 text-center">
        <div className="dot-blink mb-4 flex gap-1.5 text-3xl leading-none text-[var(--accent)]">
          <span>•</span>
          <span>•</span>
          <span>•</span>
        </div>
        <h1 className="text-xl font-bold">Finding an opponent…</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          {tc.name} {rated ? "· Rated" : "· Casual"} · {state.searching.seconds}s
        </p>
        <p className="mt-1 text-xs text-[var(--text-faint)]">Rating range widens the longer you wait.</p>
        <button className="btn mt-6" onClick={online.cancelSearch}>
          Cancel
        </button>
      </div>
    );
  }

  // ---------- game / spectate ----------
  const players = state.players;
  const myTurn = state.myColor === snapshot.turn && !state.status;
  const topColor: Color = orientation === "w" ? "b" : "w";
  const bottomColor: Color = orientation;

  const PlayerBar = ({ color }: { color: Color }) => {
    const p = color === "w" ? players?.white : players?.black;
    return (
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: p?.connected ? "var(--good)" : "var(--bad)" }}
            title={p?.connected ? "Connected" : "Disconnected"}
          />
          <span className="text-sm font-semibold">{p?.username ?? "—"}</span>
          {p && <span className="text-xs text-[var(--text-faint)]">{p.rating}</span>}
        </div>
        {state.timeControl?.initialMs != null && (
          <Clock
            ms={color === "w" ? state.clock.whiteMs : state.clock.blackMs}
            active={state.clock.activeColor === color && !state.status}
          />
        )}
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <button className="btn btn-ghost" onClick={online.leave}>
          ← Leave
        </button>
        {state.phase === "spectating" && <span className="chip">👁 Spectating</span>}
        {state.phase === "playing" && !state.status && (
          <div className="flex gap-2">
            <button className="btn" onClick={online.offerDraw} disabled={state.drawOfferFrom === state.myColor}>
              <IconHandshake width={16} height={16} /> Draw
            </button>
            <button className="btn btn-danger" onClick={online.resign}>
              <IconFlag width={16} height={16} /> Resign
            </button>
          </div>
        )}
      </div>

      {!state.opponentConnected && !state.status && (
        <div className="mb-3 rounded-lg border border-[var(--warn)]/40 bg-[var(--warn)]/10 px-3 py-2 text-sm text-[var(--warn)]">
          Opponent disconnected — waiting for them to reconnect…
        </div>
      )}

      {state.drawOfferFrom && state.drawOfferFrom !== state.myColor && !state.status && (
        <div className="mb-3 flex items-center justify-between rounded-lg border border-[var(--accent)]/40 bg-[var(--accent)]/10 px-3 py-2 text-sm">
          <span>Your opponent offers a draw.</span>
          <span className="flex gap-2">
            <button className="btn !py-1" onClick={online.acceptDraw}>
              Accept
            </button>
            <button className="btn btn-ghost !py-1" onClick={online.declineDraw}>
              Decline
            </button>
          </span>
        </div>
      )}

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <div className="flex w-full flex-col gap-2 lg:max-w-[min(72vh,640px)]">
          <PlayerBar color={topColor} />
          <Board
            snapshot={snapshot}
            orientation={orientation}
            theme={theme}
            pieceSet={settings.pieceSet}
            legalMovesFrom={game.legalMovesFrom}
            onMove={onMove}
            movableColor={state.myColor ?? "w"}
            interactive={state.phase === "playing" && !!state.myColor && myTurn}
            showCoordinates={settings.showCoordinates}
            showLegalMoves={settings.showLegalMoves}
            highlightLastMove={settings.highlightLastMove}
            animate={settings.animate}
          />
          <PlayerBar color={bottomColor} />
        </div>

        <div className="panel flex w-full flex-col lg:h-[min(72vh,640px)] lg:w-[340px]">
          <div className="border-b border-[var(--border)] px-4 py-3 text-sm font-semibold">
            {state.status
              ? statusText(state)
              : myTurn
                ? "Your move"
                : state.phase === "spectating"
                  ? "Spectating"
                  : "Opponent to move"}
          </div>
          <div className="flex border-b border-[var(--border)]">
            {(["moves", "chat"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 border-b-2 px-4 py-2.5 text-sm font-semibold capitalize transition-colors ${
                  tab === t ? "border-[var(--accent)] text-[var(--text)]" : "border-transparent text-[var(--text-muted)]"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="min-h-[240px] flex-1 overflow-hidden lg:min-h-0">
            {tab === "moves" ? (
              <MoveList moves={snapshot.moves} viewPly={snapshot.viewPly} onGoToPly={game.goToPly} />
            ) : (
              <ChatPanel messages={state.chat} onSend={online.sendChat} disabled={state.phase === "spectating"} />
            )}
          </div>
        </div>
      </div>

      {state.status && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade">
          <div className="panel w-full max-w-sm p-6 text-center animate-pop">
            <h2 className="text-2xl font-bold">{statusHeadline(state)}</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              {state.status.reason} · <span className="font-mono">{state.status.result}</span>
            </p>
            {state.status.ratingDelta && state.myColor && (
              <p className="mt-2 text-sm">
                Rating{" "}
                <span
                  className="font-bold"
                  style={{
                    color:
                      (state.myColor === "w" ? state.status.ratingDelta.white : state.status.ratingDelta.black) >= 0
                        ? "var(--good)"
                        : "var(--bad)",
                  }}
                >
                  {fmtDelta(state.myColor === "w" ? state.status.ratingDelta.white : state.status.ratingDelta.black)}
                </span>
              </p>
            )}
            <div className="mt-5 flex gap-2">
              <button className="btn flex-1" onClick={online.leave}>
                Lobby
              </button>
              {state.phase === "playing" && (
                <button className="btn btn-primary flex-1" onClick={online.offerRematch}>
                  {state.rematchOfferFrom && state.rematchOfferFrom !== state.myColor ? "Accept rematch" : "Rematch"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function fmtDelta(d: number) {
  return d >= 0 ? `+${d}` : `${d}`;
}

function statusText(state: { status: { winner: Color | null } | null; myColor: Color | null }): string {
  if (!state.status) return "";
  if (state.status.winner === null) return "Draw";
  return state.status.winner === state.myColor ? "You won" : "You lost";
}

function statusHeadline(state: { status: { winner: Color | null; result: string } | null; myColor: Color | null }): string {
  if (!state.status) return "";
  if (state.status.winner === null) return "Draw";
  if (!state.myColor) return state.status.winner === "w" ? "White wins" : "Black wins";
  return state.status.winner === state.myColor ? "You won!" : "You lost";
}
