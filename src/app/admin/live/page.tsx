"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Chess, type Square } from "chess.js";
import type { Arrow } from "@/components/board/ArrowLayer";
import { io, type Socket } from "socket.io-client";
import {
  SOCKET_URL,
  type ClientToServerEvents,
  type ServerToClientEvents,
  type GameStateMsg,
  type LiveGameSummary,
} from "@/lib/online/protocol";
import { Board } from "@/components/board/Board";
import { useChessGame } from "@/lib/chess/useChessGame";
import { useSettings } from "@/lib/chess/useSettings";
import { getTheme } from "@/lib/chess/themes";
import { getEngine } from "@/lib/engine/stockfish";
import { LiveMatchSettings } from "@/components/admin/LiveMatchSettings";

type S = Socket<ServerToClientEvents, ClientToServerEvents>;
type Color = "w" | "b";

interface UserHistory {
  id: string;
  username: string | null;
  status: string;
  warnings: { id: string; reason: string; createdAt: string }[];
  reportsReceived: { id: string; reason: string; status: string; createdAt: string }[];
}

export default function AdminLivePage() {
  const { settings } = useSettings();
  const theme = getTheme(settings.boardTheme);
  const game = useChessGame();
  const { snapshot } = game;

  const [tab, setTab] = useState<"board" | "settings">("board");
  const socketRef = useRef<S | null>(null);
  const [status, setStatus] = useState<"connecting" | "ok" | "denied">("connecting");
  const [games, setGames] = useState<LiveGameSummary[]>([]);
  const [attached, setAttached] = useState<string | null>(null);
  const [state, setState] = useState<GameStateMsg | null>(null);
  const [evalText, setEvalText] = useState<string>("—");
  const [hintArrow, setHintArrow] = useState<Arrow | null>(null);
  const [hintLoading, setHintLoading] = useState(false);
  const [autoHint, setAutoHint] = useState(false);
  const [fenInput, setFenInput] = useState("");
  const [now, setNow] = useState(Date.now());

  // filters
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<"all" | "bullet" | "blitz" | "rapid" | "classical" | "untimed">("all");
  const [ratedFilter, setRatedFilter] = useState<"all" | "rated" | "casual">("all");
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [sortBy, setSortBy] = useState<"recent" | "ply" | "spectators" | "suspicion">("recent");

  // observability
  const [analyzing, setAnalyzing] = useState(false);
  const [evalSeries, setEvalSeries] = useState<number[]>([]);
  const [sharedIps, setSharedIps] = useState<string[] | null>(null);
  const [checkingIp, setCheckingIp] = useState(false);
  const [historyFor, setHistoryFor] = useState<Color | null>(null);
  const [history, setHistory] = useState<UserHistory | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    let s: S;
    (async () => {
      const { token } = await fetch("/api/admin/socket-token").then((r) => r.json());
      s = io(SOCKET_URL, { transports: ["websocket"] });
      socketRef.current = s;
      s.on("connect", () => s.emit("admin:hello", { token }));
      s.on("admin:ok", ({ games }) => {
        setStatus("ok");
        setGames(games);
      });
      s.on("admin:denied", () => setStatus("denied"));
      s.on("admin:games", ({ games }) => setGames(games));
      s.on("game:state", (gs) => {
        setState(gs);
        game.loadFen(gs.fen);
        setFenInput(gs.fen);
      });
      s.on("game:move", () => {});
    })();
    return () => {
      s?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // tick every second so disconnect-grace countdowns stay live
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const refresh = () => socketRef.current?.emit("admin:games");
  const attach = (roomId: string) => {
    setAttached(roomId);
    setEvalSeries([]);
    setSharedIps(null);
    setHistoryFor(null);
    setHistory(null);
    setHintArrow(null);
    socketRef.current?.emit("admin:attach", { roomId });
  };
  const emit = useCallback(<E extends keyof ClientToServerEvents>(event: E, ...args: Parameters<ClientToServerEvents[E]>) => {
    socketRef.current?.emit(event, ...args);
  }, []);

  const runEval = useCallback(async () => {
    if (!state) return;
    setEvalText("…");
    try {
      const r = await getEngine().evaluate(state.fen, { depth: 14 });
      setEvalText(r.mate != null ? `Mate in ${Math.abs(r.mate)}` : `${(r.cp ?? 0) / 100 >= 0 ? "+" : ""}${((r.cp ?? 0) / 100).toFixed(2)}`);
    } catch {
      setEvalText("engine error");
    }
  }, [state]);

  // Read-only analysis for reviewing any attached game — draws a suggestion
  // arrow instead of the player-facing hint's own-turn restriction, since an
  // admin isn't "playing" this position. Never touches game state.
  const requestHint = useCallback(async () => {
    if (!state || state.status) return;
    setHintLoading(true);
    try {
      const res = await getEngine().go(state.fen, { depth: 14 });
      const uci = res.bestmove || res.lines[0]?.move;
      if (uci) {
        setHintArrow({ from: uci.slice(0, 2) as Square, to: uci.slice(2, 4) as Square, color: "#5bbf7a" });
      }
    } finally {
      setHintLoading(false);
    }
  }, [state]);

  // Auto-hint: recompute the suggested move whenever the attached game's
  // position changes, instead of waiting for a manual click.
  useEffect(() => {
    setHintArrow(null);
    if (!autoHint || !state || state.status) return;
    let cancelled = false;
    (async () => {
      const res = await getEngine().go(state.fen, { depth: 14 });
      if (cancelled) return;
      const uci = res.bestmove || res.lines[0]?.move;
      if (uci) setHintArrow({ from: uci.slice(0, 2) as Square, to: uci.slice(2, 4) as Square, color: "#5bbf7a" });
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.fen, autoHint, state?.status]);

  const analyzeFullGame = useCallback(async () => {
    if (!state) return;
    setAnalyzing(true);
    setEvalSeries([]);
    try {
      const c = new Chess();
      const series: number[] = [];
      for (const m of state.moves) {
        c.move({ from: m.from, to: m.to, promotion: m.promotion });
        const r = await getEngine().evaluate(c.fen(), { depth: 10 });
        const cp = r.mate != null ? (r.mate > 0 ? 1000 : -1000) : (r.cp ?? 0);
        series.push(Math.max(-1000, Math.min(1000, cp)));
        setEvalSeries([...series]);
      }
    } finally {
      setAnalyzing(false);
    }
  }, [state]);

  const checkSharedIp = useCallback(async () => {
    if (!state) return;
    const a = state.players.white.userId;
    const b = state.players.black.userId;
    if (a.startsWith("guest:") || b.startsWith("guest:")) {
      setSharedIps([]);
      return;
    }
    setCheckingIp(true);
    try {
      const r = await fetch(`/api/admin/shared-ip?a=${a}&b=${b}`).then((x) => x.json());
      setSharedIps(r.shared ?? []);
    } finally {
      setCheckingIp(false);
    }
  }, [state]);

  const loadHistory = useCallback(
    async (color: Color) => {
      if (!state) return;
      const userId = color === "w" ? state.players.white.userId : state.players.black.userId;
      if (userId.startsWith("guest:")) return;
      setHistoryFor(color);
      setLoadingHistory(true);
      try {
        const r = await fetch(`/api/admin/users/${userId}`).then((x) => x.json());
        setHistory(r.user ?? null);
      } finally {
        setLoadingHistory(false);
      }
    },
    [state],
  );

  const moderate = async (userId: string, action: string, extra: Record<string, unknown> = {}) => {
    await fetch(`/api/admin/users/${userId}/moderate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
  };

  const filteredGames = useMemo(() => {
    let list = games;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((g) => g.white.toLowerCase().includes(q) || g.black.toLowerCase().includes(q));
    }
    if (category !== "all") list = list.filter((g) => g.category === category);
    if (ratedFilter !== "all") list = list.filter((g) => (ratedFilter === "rated" ? g.rated : !g.rated));
    if (flaggedOnly) list = list.filter((g) => g.reviewFlagged);
    const sorted = [...list];
    if (sortBy === "ply") sorted.sort((a, b) => b.ply - a.ply);
    else if (sortBy === "spectators") sorted.sort((a, b) => b.spectators - a.spectators);
    else if (sortBy === "suspicion") sorted.sort((a, b) => Math.max(b.suspicion.w, b.suspicion.b) - Math.max(a.suspicion.w, a.suspicion.b));
    return sorted;
  }, [games, search, category, ratedFilter, flaggedOnly, sortBy]);

  if (status === "denied") {
    return <div className="p-10 text-center text-[var(--bad)]">Admin token rejected.</div>;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <Link href="/admin" className="text-sm text-[var(--text-muted)] hover:text-[var(--text)]">
            ← Admin
          </Link>
          <h1 className="text-2xl font-bold">Live games · god mode</h1>
        </div>
        {tab === "board" && (
          <button className="btn" onClick={refresh}>
            Refresh ({games.length})
          </button>
        )}
      </div>

      <div className="mb-4 flex gap-2">
        <TabBtn active={tab === "board"} onClick={() => setTab("board")}>
          Live board
        </TabBtn>
        <TabBtn active={tab === "settings"} onClick={() => setTab("settings")}>
          Settings
        </TabBtn>
      </div>

      {tab === "settings" ? (
        <LiveMatchSettings />
      ) : (
        <>
          {status === "connecting" && <p className="text-[var(--text-muted)]">Connecting to realtime server…</p>}

          <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
            {/* games list */}
            <div className="panel w-full lg:w-72 lg:shrink-0">
              <div className="space-y-2 border-b border-[var(--border)] p-2">
                <input
                  className="input !font-sans text-xs"
                  placeholder="Search username…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <div className="flex flex-wrap gap-1">
                  <select className="input !font-sans text-xs" value={category} onChange={(e) => setCategory(e.target.value as typeof category)}>
                    {["all", "bullet", "blitz", "rapid", "classical", "untimed"].map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <select className="input !font-sans text-xs" value={ratedFilter} onChange={(e) => setRatedFilter(e.target.value as typeof ratedFilter)}>
                    <option value="all">rated + casual</option>
                    <option value="rated">rated only</option>
                    <option value="casual">casual only</option>
                  </select>
                  <select className="input !font-sans text-xs" value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)}>
                    <option value="recent">sort: recent</option>
                    <option value="ply">sort: most moves</option>
                    <option value="spectators">sort: most spectators</option>
                    <option value="suspicion">sort: suspicion</option>
                  </select>
                </div>
                <label className="flex items-center gap-1.5 text-xs">
                  <input type="checkbox" checked={flaggedOnly} onChange={(e) => setFlaggedOnly(e.target.checked)} />
                  Flagged for review only
                </label>
              </div>
              {filteredGames.length === 0 ? (
                <p className="p-4 text-sm text-[var(--text-faint)]">No live games match these filters.</p>
              ) : (
                filteredGames.map((g) => (
                  <button
                    key={g.roomId}
                    onClick={() => attach(g.roomId)}
                    className={`block w-full border-b border-[var(--border)] px-3 py-2 text-left text-sm last:border-0 hover:bg-[var(--bg-elev)] ${
                      attached === g.roomId ? "bg-[var(--bg-elev-2)]" : ""
                    }`}
                  >
                    <div className="flex items-center gap-1 font-semibold">
                      {g.reviewFlagged && <span title="Flagged for review">🚩</span>}
                      {g.white} vs {g.black}
                    </div>
                    <div className="text-xs text-[var(--text-faint)]">
                      {g.ply} plies · {g.timeControl} · {g.rated ? "rated" : "casual"} · 👁 {g.spectators}
                    </div>
                    {(g.suspicion.w > 0.4 || g.suspicion.b > 0.4) && (
                      <div className="text-xs text-[var(--warn)]">
                        suspicion — w:{g.suspicion.w.toFixed(2)} b:{g.suspicion.b.toFixed(2)}
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>

            {/* attached game + controls */}
            {attached && state ? (
              <div className="flex w-full flex-col gap-4 lg:flex-row lg:items-start">
                <div className="w-full lg:max-w-[380px]">
                  <Board
                    snapshot={snapshot}
                    orientation="w"
                    theme={theme}
                    pieceSet={settings.pieceSet}
                    legalMovesFrom={() => []}
                    onMove={() => {}}
                    interactive={false}
                    showCoordinates
                    squareColorOverride={settings.squareColorOverride}
                    colorblindMode={settings.colorblindMode}
                    speechAnnounceMoves={settings.speechAnnounceMoves}
                    pieceSizePercent={settings.pieceSize}
                    boardFrame={settings.boardFrame}
                    extraArrows={hintArrow ? [hintArrow] : []}
                  />
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    <button className="btn btn-ghost !py-1" disabled={hintLoading} onClick={requestHint}>
                      {hintLoading ? "Thinking…" : "💡 Hint"}
                    </button>
                    <button
                      className="btn btn-ghost !py-1"
                      style={autoHint ? { background: "var(--accent)", color: "var(--accent-contrast)" } : undefined}
                      onClick={() => setAutoHint((v) => !v)}
                    >
                      Auto-hint: {autoHint ? "on" : "off"}
                    </button>
                    <button className="btn btn-ghost !py-1" onClick={() => emit("admin:undo", { roomId: attached })}>
                      ↩ Take back
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <PlayerLine
                      color="w"
                      state={state}
                      now={now}
                      onHistory={() => loadHistory("w")}
                    />
                    <button className="btn btn-ghost !py-1 text-xs" onClick={runEval}>
                      Eval: <span className="font-mono">{evalText}</span>
                    </button>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-sm">
                    <PlayerLine color="b" state={state} now={now} onHistory={() => loadHistory("b")} />
                  </div>

                  {state.frozen && (state.frozen.w || state.frozen.b) && (
                    <p className="mt-1 text-xs text-[var(--warn)]">
                      Frozen: {state.frozen.w ? "White " : ""}
                      {state.frozen.b ? "Black" : ""}
                    </p>
                  )}
                  {state.paused && <p className="mt-1 text-xs text-[var(--warn)]">⏸ Paused by a moderator</p>}
                  {state.status?.voided && <p className="mt-1 text-xs text-[var(--text-faint)]">Voided — no rating impact</p>}

                  {historyFor && (
                    <div className="panel mt-2 p-2 text-xs">
                      {loadingHistory ? (
                        <p className="text-[var(--text-faint)]">Loading…</p>
                      ) : history ? (
                        <>
                          <div className="mb-1 flex items-center justify-between">
                            <span className="font-semibold">
                              {history.username} · {history.status}
                            </span>
                            <button className="text-[var(--text-faint)]" onClick={() => setHistoryFor(null)}>
                              ✕
                            </button>
                          </div>
                          <div>Warnings: {history.warnings.length}</div>
                          {history.warnings.slice(0, 3).map((w) => (
                            <div key={w.id} className="truncate text-[var(--text-faint)]">
                              · {w.reason}
                            </div>
                          ))}
                          <div className="mt-1">Reports received: {history.reportsReceived.length}</div>
                          {history.reportsReceived.slice(0, 3).map((r) => (
                            <div key={r.id} className="truncate text-[var(--text-faint)]">
                              · {r.reason} ({r.status})
                            </div>
                          ))}
                        </>
                      ) : (
                        <p className="text-[var(--text-faint)]">No record (guest or not found).</p>
                      )}
                    </div>
                  )}

                  <div className="panel mt-2 max-h-40 overflow-y-auto p-2 text-xs">
                    <div className="mb-1 font-semibold">Moves & timing</div>
                    {state.moves.length === 0 ? (
                      <span className="text-[var(--text-faint)]">no moves yet</span>
                    ) : (
                      <MoveList moves={state.moves} timesMs={state.moveTimesMs ?? []} />
                    )}
                  </div>

                  <div className="panel mt-2 p-2 text-xs">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="font-semibold">Spectators ({state.spectators})</span>
                      <button className="btn btn-ghost !py-0.5 text-xs" disabled={analyzing} onClick={analyzeFullGame}>
                        {analyzing ? "Analyzing…" : "Analyze full game"}
                      </button>
                    </div>
                    {(state.spectatorList ?? []).length > 0 && (
                      <div className="text-[var(--text-faint)]">{(state.spectatorList ?? []).map((s) => s.username).join(", ")}</div>
                    )}
                    {evalSeries.length > 0 && <EvalSparkline series={evalSeries} />}
                  </div>

                  <button className="btn btn-ghost mt-2 w-full text-xs" disabled={checkingIp} onClick={checkSharedIp}>
                    {checkingIp ? "Checking…" : "Check shared IP between players"}
                  </button>
                  {sharedIps != null && (
                    <p className="mt-1 text-xs" style={{ color: sharedIps.length ? "var(--bad)" : "var(--text-faint)" }}>
                      {sharedIps.length ? `Shared IP(s): ${sharedIps.join(", ")}` : "No shared IP found."}
                    </p>
                  )}
                </div>

                <div className="flex-1 space-y-4">
                  <Tool label="Board (FEN)">
                    <input className="input text-xs" value={fenInput} onChange={(e) => setFenInput(e.target.value)} />
                    <button className="btn mt-2 w-full" onClick={() => emit("admin:setFen", { roomId: attached, fen: fenInput })}>
                      Set position
                    </button>
                  </Tool>

                  <Tool label="Force move (bypass rules)">
                    <ForceMove onGo={(from, to) => emit("admin:forceMove", { roomId: attached, from, to })} />
                  </Tool>

                  <Tool label="End game">
                    <div className="flex flex-wrap gap-2">
                      <button className="btn flex-1" onClick={() => emit("admin:forceResult", { roomId: attached, result: "1-0" })}>
                        White wins
                      </button>
                      <button className="btn flex-1" onClick={() => emit("admin:forceResult", { roomId: attached, result: "1/2-1/2" })}>
                        Draw
                      </button>
                      <button className="btn flex-1" onClick={() => emit("admin:forceResult", { roomId: attached, result: "0-1" })}>
                        Black wins
                      </button>
                      <button
                        className="btn btn-ghost flex-1"
                        onClick={() => {
                          const reason = prompt("Void reason (shown to no one, logged only):", "Technical issue") ?? undefined;
                          emit("admin:void", { roomId: attached, reason });
                        }}
                      >
                        Void (no rating impact)
                      </button>
                    </div>
                  </Tool>

                  <Tool label="Clocks">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {(["w", "b"] as const).map((c) => (
                        <div key={c} className="rounded border border-[var(--border)] p-2">
                          <div className="mb-1 font-semibold">{c === "w" ? "White" : "Black"}</div>
                          <div className="flex flex-wrap gap-1">
                            <MiniBtn onClick={() => emit("admin:clock", { roomId: attached, color: c, addSeconds: 30 })}>+30s</MiniBtn>
                            <MiniBtn onClick={() => emit("admin:clock", { roomId: attached, color: c, addSeconds: 300 })}>+5m</MiniBtn>
                            <MiniBtn onClick={() => emit("admin:clock", { roomId: attached, color: c, disable: true })}>∞</MiniBtn>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <MiniBtn onClick={() => emit("admin:extendBoth", { roomId: attached, addSeconds: 60 })}>+60s both</MiniBtn>
                      <MiniBtn onClick={() => emit("admin:resetClocks", { roomId: attached })}>Reset both to start</MiniBtn>
                    </div>
                  </Tool>

                  <Tool label="Freeze / swap / pause">
                    <div className="flex flex-wrap gap-2">
                      <MiniBtn onClick={() => emit("admin:freeze", { roomId: attached, color: "w", frozen: !state.frozen?.w })}>
                        {state.frozen?.w ? "Unfreeze W" : "Freeze W"}
                      </MiniBtn>
                      <MiniBtn onClick={() => emit("admin:freeze", { roomId: attached, color: "b", frozen: !state.frozen?.b })}>
                        {state.frozen?.b ? "Unfreeze B" : "Freeze B"}
                      </MiniBtn>
                      <MiniBtn onClick={() => emit("admin:freeze", { roomId: attached, color: "both", frozen: true })}>Freeze both</MiniBtn>
                      <MiniBtn onClick={() => emit("admin:swap", { roomId: attached })}>Swap sides</MiniBtn>
                      <MiniBtn onClick={() => emit("admin:pause", { roomId: attached, paused: !state.paused })}>
                        {state.paused ? "Resume" : "Pause"}
                      </MiniBtn>
                    </div>
                  </Tool>

                  <Tool label="Chat & messaging">
                    <div className="flex flex-wrap gap-2">
                      <MiniBtn onClick={() => emit("admin:clearChat", { roomId: attached })}>Clear chat</MiniBtn>
                      <MiniBtn onClick={() => emit("admin:muteChat", { roomId: attached, color: "w", muted: !state.roomMuted?.w })}>
                        {state.roomMuted?.w ? "Unmute W chat" : "Mute W chat"}
                      </MiniBtn>
                      <MiniBtn onClick={() => emit("admin:muteChat", { roomId: attached, color: "b", muted: !state.roomMuted?.b })}>
                        {state.roomMuted?.b ? "Unmute B chat" : "Mute B chat"}
                      </MiniBtn>
                      <MiniBtn
                        onClick={() => {
                          const text = prompt("System message (both players + spectators see it):");
                          if (text) emit("admin:systemMessage", { roomId: attached, text });
                        }}
                      >
                        System message
                      </MiniBtn>
                      <MiniBtn
                        onClick={() => {
                          const text = prompt(`Private note to ${state.players.white.username}:`);
                          if (text) emit("admin:whisper", { roomId: attached, color: "w", text });
                        }}
                      >
                        Whisper W
                      </MiniBtn>
                      <MiniBtn
                        onClick={() => {
                          const text = prompt(`Private note to ${state.players.black.username}:`);
                          if (text) emit("admin:whisper", { roomId: attached, color: "b", text });
                        }}
                      >
                        Whisper B
                      </MiniBtn>
                    </div>
                  </Tool>

                  <Tool label="Review flag">
                    <MiniBtn onClick={() => emit("admin:flagReview", { roomId: attached, flagged: !games.find((g) => g.roomId === attached)?.reviewFlagged })}>
                      Toggle flag for review
                    </MiniBtn>
                  </Tool>

                  <Tool label="Players">
                    <div className="flex flex-wrap gap-2">
                      <MiniBtn
                        onClick={() => emit("admin:kick", { userId: state.players.white.userId, cooldownMs: 300_000, message: "Removed by a moderator." })}
                      >
                        Kick {state.players.white.username}
                      </MiniBtn>
                      <MiniBtn
                        onClick={() => emit("admin:kick", { userId: state.players.black.userId, cooldownMs: 300_000, message: "Removed by a moderator." })}
                      >
                        Kick {state.players.black.username}
                      </MiniBtn>
                      {!state.players.white.userId.startsWith("guest:") && (
                        <>
                          <MiniBtn
                            onClick={() => {
                              const reason = prompt(`Warn ${state.players.white.username} — reason:`);
                              if (reason) moderate(state.players.white.userId, "warn", { reason });
                            }}
                          >
                            Warn W
                          </MiniBtn>
                          <MiniBtn
                            onClick={() => {
                              const reason = prompt(`Ban ${state.players.white.username} — reason:`);
                              if (reason) moderate(state.players.white.userId, "ban", { reason });
                            }}
                          >
                            Ban W
                          </MiniBtn>
                        </>
                      )}
                      {!state.players.black.userId.startsWith("guest:") && (
                        <>
                          <MiniBtn
                            onClick={() => {
                              const reason = prompt(`Warn ${state.players.black.username} — reason:`);
                              if (reason) moderate(state.players.black.userId, "warn", { reason });
                            }}
                          >
                            Warn B
                          </MiniBtn>
                          <MiniBtn
                            onClick={() => {
                              const reason = prompt(`Ban ${state.players.black.username} — reason:`);
                              if (reason) moderate(state.players.black.userId, "ban", { reason });
                            }}
                          >
                            Ban B
                          </MiniBtn>
                        </>
                      )}
                    </div>
                  </Tool>

                  <Tool label="Danger zone">
                    <div className="flex flex-wrap gap-2">
                      {state.status && (
                        <MiniBtn onClick={() => emit("admin:forceRematch", { roomId: attached })}>Force rematch</MiniBtn>
                      )}
                      <MiniBtn
                        onClick={() => {
                          if (confirm("Cancel this game entirely? Both players are disconnected and it is not saved.")) {
                            emit("admin:cancelGame", { roomId: attached });
                            setAttached(null);
                          }
                        }}
                      >
                        Cancel game
                      </MiniBtn>
                    </div>
                  </Tool>
                </div>
              </div>
            ) : (
              <div className="panel flex flex-1 items-center justify-center p-12 text-sm text-[var(--text-faint)]">
                Select a live game to attach (you join invisibly — not counted as a spectator).
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="rounded border px-3 py-1.5 text-sm font-semibold"
      style={{
        borderColor: "var(--border-strong)",
        background: active ? "var(--accent)" : "transparent",
        color: active ? "var(--accent-contrast)" : "var(--text-muted)",
      }}
    >
      {children}
    </button>
  );
}

function PlayerLine({
  color,
  state,
  now,
  onHistory,
}: {
  color: Color;
  state: GameStateMsg;
  now: number;
  onHistory: () => void;
}) {
  const p = color === "w" ? state.players.white : state.players.black;
  const since = color === "w" ? state.disconnectedSince?.w : state.disconnectedSince?.b;
  return (
    <span className="flex items-center gap-1.5">
      <span title={p.connected ? "Connected" : "Disconnected"} style={{ color: p.connected ? "var(--good)" : "var(--bad)" }}>
        ●
      </span>
      {p.username} ({p.rating})
      {since != null && (
        <span className="text-xs text-[var(--warn)]">— disconnected {Math.round((now - since) / 1000)}s ago</span>
      )}
      {!p.userId.startsWith("guest:") && (
        <button className="text-xs text-[var(--text-faint)] hover:underline" onClick={onHistory}>
          history
        </button>
      )}
    </span>
  );
}

function MoveList({ moves, timesMs }: { moves: GameStateMsg["moves"]; timesMs: number[] }) {
  const rows: { n: number; w?: string; wt?: number; b?: string; bt?: number }[] = [];
  for (let i = 0; i < moves.length; i++) {
    const rowIdx = Math.floor(i / 2);
    if (!rows[rowIdx]) rows[rowIdx] = { n: rowIdx + 1 };
    if (i % 2 === 0) {
      rows[rowIdx].w = moves[i].san;
      rows[rowIdx].wt = timesMs[i];
    } else {
      rows[rowIdx].b = moves[i].san;
      rows[rowIdx].bt = timesMs[i];
    }
  }
  const fmt = (ms?: number) => (ms == null ? "" : `${(ms / 1000).toFixed(1)}s`);
  return (
    <div className="grid grid-cols-[2rem_1fr_1fr] gap-x-2 font-mono">
      {rows.map((r) => (
        <div key={r.n} className="contents">
          <span className="text-[var(--text-faint)]">{r.n}.</span>
          <span>
            {r.w} <span className="text-[var(--text-faint)]">{fmt(r.wt)}</span>
          </span>
          <span>
            {r.b} <span className="text-[var(--text-faint)]">{fmt(r.bt)}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

function EvalSparkline({ series }: { series: number[] }) {
  return (
    <div className="mt-1 flex h-8 items-end gap-px">
      {series.map((cp, i) => {
        const pct = Math.max(2, Math.min(100, 50 + cp / 20));
        return (
          <div
            key={i}
            title={(cp / 100).toFixed(2)}
            className="w-1 flex-1"
            style={{ height: `${pct}%`, background: cp >= 0 ? "var(--good)" : "var(--bad)" }}
          />
        );
      })}
    </div>
  );
}

function Tool({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="panel p-3">
      <div className="label mb-2">{label}</div>
      {children}
    </div>
  );
}

function MiniBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="rounded border border-[var(--border-strong)] px-2 py-1 text-xs font-semibold">
      {children}
    </button>
  );
}

function ForceMove({ onGo }: { onGo: (from: string, to: string) => void }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  return (
    <div className="flex gap-2">
      <input className="input text-xs" placeholder="from (e2)" value={from} onChange={(e) => setFrom(e.target.value)} maxLength={2} />
      <input className="input text-xs" placeholder="to (e4)" value={to} onChange={(e) => setTo(e.target.value)} maxLength={2} />
      <button className="btn" onClick={() => from && to && onGo(from, to)}>
        Force
      </button>
    </div>
  );
}
