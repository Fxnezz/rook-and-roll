"use client";

import { useEffect, useState } from "react";
import { useBoardGameMatch } from "@/lib/boardgames/useBoardGameMatch";
import { useGameIdentity } from "@/lib/boardgames/useGameIdentity";
import type { GameKind, GameResult, Seat } from "@/lib/boardgames/protocol";
import { ChatPanel } from "@/components/game/ChatPanel";
import { IconFlag, IconHandshake, IconUsers } from "@/components/ui/icons";

export interface BoardGamePageProps<TMove, TState> {
  kind: GameKind;
  title: string;
  blurb: string;
  ratedAvailable: boolean;
  supportsDraw?: boolean;
  renderBoard: (opts: {
    state: TState;
    mySeat: Seat | null;
    interactive: boolean;
    onMove: (move: TMove) => void;
    status: (GameResult & { adminResolved?: boolean }) | null;
    lastMove: { move: TMove; notation: string; by: Seat; seq: number } | null;
  }) => React.ReactNode;
}

export function BoardGamePage<TMove, TState>({
  kind,
  title,
  blurb,
  ratedAvailable,
  supportsDraw = false,
  renderBoard,
}: BoardGamePageProps<TMove, TState>) {
  const identity = useGameIdentity();
  const match = useBoardGameMatch<TMove, TState>(kind, identity);
  const { state } = match;
  const [rated, setRated] = useState(false);
  const [tab, setTab] = useState<"moves" | "chat">("moves");
  const [inviteInput, setInviteInput] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);

  useEffect(() => {
    match.connect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!state.status) return;
    const frame = requestAnimationFrame(() => setShowResult(true));
    return () => cancelAnimationFrame(frame);
  }, [state.status]);

  const loggedIn = !identity.guest;

  const copyInviteCode = async () => {
    if (!state.inviteCode) return;
    try {
      await navigator.clipboard.writeText(state.inviteCode);
      setCopiedInvite(true);
      window.setTimeout(() => setCopiedInvite(false), 1600);
    } catch {
      setCopiedInvite(false);
    }
  };

  if (state.phase === "idle") {
    return (
      <div data-game-session data-session-phase="lobby" className="board-lobby-shell mx-auto max-w-md px-4 py-10">
        <div className="game-match-header mb-6 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--bg-elev-2)] text-[var(--accent)]">
            <IconUsers width={22} height={22} />
          </span>
          <div>
            <h1 className="text-xl font-bold leading-tight">{title}</h1>
            <p className="text-sm text-[var(--text-muted)]">{blurb}</p>
          </div>
        </div>

        {ratedAvailable && (
          <label
            className="game-lobby-option mb-4 flex items-center justify-between rounded-xl border border-[var(--border)] px-3 py-3"
            style={{ opacity: loggedIn ? 1 : 0.5 }}
          >
            <span className="text-sm">
              Rated {!loggedIn && <span className="text-xs text-[var(--text-faint)]">(sign in for rated)</span>}
            </span>
            <input
              type="checkbox"
              checked={rated && loggedIn}
              disabled={!loggedIn}
              onChange={(e) => setRated(e.target.checked)}
              className="h-4 w-4 accent-[var(--accent)]"
            />
          </label>
        )}

        {state.error && <p className="mb-3 text-sm text-[var(--bad)]">{state.error}</p>}

        <button className="btn btn-primary w-full !py-3 text-base" onClick={() => match.findMatch(rated && loggedIn)}>
          Find a game
        </button>

        <div className="game-invite-card mt-5 rounded-xl border border-[var(--border)] p-3">
          <span className="label mb-2 block">Play a friend</span>
          <button className="btn w-full" onClick={match.createInvite}>
            Create invite link
          </button>
          <div className="mt-2 flex gap-2">
            <input
              className="input !font-sans"
              placeholder="Enter a code…"
              value={inviteInput}
              onChange={(e) => setInviteInput(e.target.value)}
              maxLength={6}
            />
            <button className="btn" disabled={!inviteInput.trim()} onClick={() => match.joinInvite(inviteInput.trim())}>
              Join
            </button>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-[var(--text-faint)]">
          Playing as <span className="font-semibold">{identity.username}</span>
        </p>
      </div>
    );
  }

  if (state.phase === "searching") {
    return (
      <div data-game-session data-session-phase="searching" className="game-search-stage mx-auto flex max-w-sm flex-col items-center px-4 py-24 text-center">
        {state.inviteCode ? (
          <>
            <h1 className="text-xl font-bold">Share this code</h1>
            <button type="button" className="game-invite-code mt-4 rounded-xl bg-[var(--bg-elev-2)] px-6 py-3 font-mono text-3xl font-black tracking-widest text-[var(--accent)]" onClick={copyInviteCode} aria-label={`Copy invite code ${state.inviteCode}`}>
              {state.inviteCode}<small>{copiedInvite ? "Copied!" : "Tap to copy"}</small>
            </button>
            <p className="mt-3 text-sm text-[var(--text-muted)]">Waiting for your friend to join…</p>
          </>
        ) : (
          <>
            <div className="dot-blink mb-4 flex gap-1.5 text-3xl leading-none text-[var(--accent)]">
              <span>•</span>
              <span>•</span>
              <span>•</span>
            </div>
            <h1 className="text-xl font-bold">Finding an opponent…</h1>
          </>
        )}
        <button className="btn mt-6" onClick={match.cancelSearch}>
          Cancel
        </button>
      </div>
    );
  }

  const players = state.players;
  const myTurn = state.mySeat === state.turn && !state.status;
  const opponentSeat: Seat = state.mySeat === "a" ? "b" : "a";
  const oppInfo = players ? (opponentSeat === "a" ? players.a : players.b) : null;
  const meInfo = players && state.mySeat ? (state.mySeat === "a" ? players.a : players.b) : null;

  const statusText = state.status
    ? state.status.winner === null
      ? "Draw"
      : state.status.winner === state.mySeat
        ? "You won!"
        : "You lost"
    : state.phase === "spectating"
      ? "Spectating"
      : myTurn
        ? "Your move"
        : "Opponent's move";

  return (
    <div data-game-session data-session-phase="playing" className="mx-auto max-w-4xl px-4 py-5">
      <div className="game-match-header mb-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <button className="btn btn-ghost" onClick={match.leave}>← Leave</button>
          <div className="min-w-0"><h1 className="truncate font-black">{title}</h1><p className="text-xs text-[var(--text-faint)]">Live online match · {rated ? "Rated" : "Casual"}</p></div>
        </div>
        {state.phase === "spectating" && <span className="chip">👁 Spectating</span>}
        {state.phase === "playing" && !state.status && (
          <div className="flex gap-2">
            {supportsDraw && (
              <button className="btn" onClick={match.offerDraw} disabled={state.drawOfferFrom === state.mySeat}>
                <IconHandshake width={16} height={16} /> Draw
              </button>
            )}
            <button className="btn btn-danger" onClick={match.resign}>
              <IconFlag width={16} height={16} /> Resign
            </button>
          </div>
        )}
      </div>

      <div className="game-status-rail mb-4" aria-live="polite">
        <div className="chip game-status-main"><span className="online-live-pulse" aria-hidden="true" />{statusText}</div>
        <div className="chip"><span aria-hidden="true">◆</span> {state.moveCount} {state.moveCount === 1 ? "move" : "moves"}</div>
        <div className="chip"><span aria-hidden="true">◉</span> {state.opponentConnected ? "Connected" : "Reconnecting"}</div>
      </div>

      {!state.opponentConnected && !state.status && (
        <div className="mb-3 rounded-lg border border-[var(--warn)]/40 bg-[var(--warn)]/10 px-3 py-2 text-sm text-[var(--warn)]">
          Opponent disconnected — waiting for them to reconnect…
        </div>
      )}

      {state.drawOfferFrom && state.drawOfferFrom !== state.mySeat && !state.status && (
        <div className="mb-3 flex items-center justify-between rounded-lg border border-[var(--accent)]/40 bg-[var(--accent)]/10 px-3 py-2 text-sm">
          <span>Your opponent offers a draw.</span>
          <span className="flex gap-2">
            <button className="btn !py-1" onClick={match.acceptDraw}>
              Accept
            </button>
            <button className="btn btn-ghost !py-1" onClick={match.declineDraw}>
              Decline
            </button>
          </span>
        </div>
      )}

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <div className="flex w-full flex-col gap-2 lg:max-w-[520px]">
          {oppInfo && <PlayerBar name={oppInfo.username} rating={oppInfo.rating} connected={oppInfo.connected} active={state.turn === opponentSeat} />}
          {state.board && (
            <div className="game-board-stage" data-game-board>
              {renderBoard({
              state: state.board,
              mySeat: state.mySeat,
              interactive: state.phase === "playing",
              onMove: match.sendMove,
              status: state.status,
              lastMove: match.lastMove,
              })}
            </div>
          )}
          {meInfo && <PlayerBar name={meInfo.username} rating={meInfo.rating} connected={meInfo.connected} active={state.turn === state.mySeat} />}
        </div>

        <div className="panel game-match-sidebar flex w-full flex-col lg:h-[480px] lg:w-[320px]">
          <div className="border-b border-[var(--border)] px-4 py-3 text-sm font-semibold">{statusText}</div>
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
          <div className="min-h-[200px] flex-1 overflow-hidden lg:min-h-0">
            {tab === "moves" ? (
              <div className="h-full overflow-y-auto p-2">
                {match.state.moveCount === 0 ? (
                  <p className="p-4 text-center text-sm text-[var(--text-faint)]">No moves yet.</p>
                ) : (
                  <p className="p-2 text-sm text-[var(--text-muted)]">{match.state.moveCount} moves played</p>
                )}
              </div>
            ) : (
              <ChatPanel messages={state.chat} onSend={match.sendChat} disabled={state.phase === "spectating"} myUsername={identity.username} />
            )}
          </div>
        </div>
      </div>

      {showResult && state.status && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md" role="presentation">
          <div className="panel game-result-card w-full max-w-sm p-6 text-center" role="dialog" aria-modal="true" aria-labelledby="online-result-title">
            <div className="game-result-icon" aria-hidden="true">{state.status.winner === null ? "◇" : state.status.winner === state.mySeat ? "🏆" : "♟"}</div>
            <h2 className="text-2xl font-bold">
              <span id="online-result-title">
              {state.status.winner === null ? "Draw" : state.status.winner === state.mySeat ? "You won!" : "You lost"}
              </span>
            </h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">{state.status.reason}</p>
            {state.ratingDelta && state.mySeat && (
              <p className="mt-2 text-sm">
                Rating{" "}
                <span
                  className="font-bold"
                  style={{
                    color: (state.mySeat === "a" ? state.ratingDelta.a : state.ratingDelta.b) >= 0 ? "var(--good)" : "var(--bad)",
                  }}
                >
                  {fmtDelta(state.mySeat === "a" ? state.ratingDelta.a : state.ratingDelta.b)}
                </span>
              </p>
            )}
            <div className="mt-5 flex gap-2">
              <button className="btn btn-ghost flex-1" onClick={() => setShowResult(false)}>
                View board
              </button>
              <button className="btn flex-1" onClick={match.leave}>
                Lobby
              </button>
              {state.phase === "playing" && (
                <button className="btn btn-primary flex-1" onClick={match.offerRematch}>
                  {state.rematchOfferFrom && state.rematchOfferFrom !== state.mySeat ? "Accept rematch" : "Rematch"}
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

function PlayerBar({ name, rating, connected, active }: { name: string; rating: number; connected: boolean; active: boolean }) {
  return (
    <div className="game-player-bar flex items-center justify-between px-2 py-2" data-active={active ? "true" : "false"}>
      <div className="flex items-center gap-2">
        <span className="game-player-avatar" aria-hidden="true">{name.charAt(0).toUpperCase()}</span>
        <span className="grid"><strong className="text-sm">{name}</strong><small className="text-[0.65rem] text-[var(--text-faint)]">{rating} rating · {connected ? "online" : "disconnected"}</small></span>
      </div>
      {active ? <span className="chip game-status-main !px-2 !py-1 text-[10px]">to move</span> : <span className="h-2 w-2 rounded-full" style={{ background: connected ? "var(--good)" : "var(--bad)" }} />}
    </div>
  );
}
