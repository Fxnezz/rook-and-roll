"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
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

type S = Socket<ServerToClientEvents, ClientToServerEvents>;

export default function AdminLivePage() {
  const { settings } = useSettings();
  const theme = getTheme(settings.boardTheme);
  const game = useChessGame();
  const { snapshot } = game;

  const socketRef = useRef<S | null>(null);
  const [status, setStatus] = useState<"connecting" | "ok" | "denied">("connecting");
  const [games, setGames] = useState<LiveGameSummary[]>([]);
  const [attached, setAttached] = useState<string | null>(null);
  const [state, setState] = useState<GameStateMsg | null>(null);
  const [evalText, setEvalText] = useState<string>("—");
  const [fenInput, setFenInput] = useState("");

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

  const refresh = () => socketRef.current?.emit("admin:games");
  const attach = (roomId: string) => {
    setAttached(roomId);
    socketRef.current?.emit("admin:attach", { roomId });
  };
  const emit = useCallback(
    <E extends keyof ClientToServerEvents>(event: E, ...args: Parameters<ClientToServerEvents[E]>) => {
      socketRef.current?.emit(event, ...args);
    },
    [],
  );

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
        <button className="btn" onClick={refresh}>
          Refresh ({games.length})
        </button>
      </div>

      {status === "connecting" && <p className="text-[var(--text-muted)]">Connecting to realtime server…</p>}

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        {/* games list */}
        <div className="panel w-full lg:w-64 lg:shrink-0">
          <div className="border-b border-[var(--border)] px-3 py-2 text-sm font-semibold">In progress</div>
          {games.length === 0 ? (
            <p className="p-4 text-sm text-[var(--text-faint)]">No live games. Start one in two tabs to test.</p>
          ) : (
            games.map((g) => (
              <button
                key={g.roomId}
                onClick={() => attach(g.roomId)}
                className={`block w-full border-b border-[var(--border)] px-3 py-2 text-left text-sm last:border-0 hover:bg-[var(--bg-elev)] ${
                  attached === g.roomId ? "bg-[var(--bg-elev-2)]" : ""
                }`}
              >
                <div className="font-semibold">
                  {g.white} vs {g.black}
                </div>
                <div className="text-xs text-[var(--text-faint)]">
                  {g.ply} plies · {g.timeControl} · 👁 {g.spectators}
                </div>
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
              />
              <div className="mt-2 flex items-center justify-between text-sm">
                <span>
                  {state.players.white.username} vs {state.players.black.username}
                </span>
                <button className="btn btn-ghost !py-1 text-xs" onClick={runEval}>
                  Eval: <span className="font-mono">{evalText}</span>
                </button>
              </div>
              {state.frozen && (state.frozen.w || state.frozen.b) && (
                <p className="mt-1 text-xs text-[var(--warn)]">
                  Frozen: {state.frozen.w ? "White " : ""}
                  {state.frozen.b ? "Black" : ""}
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
                <div className="flex gap-2">
                  <button className="btn flex-1" onClick={() => emit("admin:forceResult", { roomId: attached, result: "1-0" })}>
                    White wins
                  </button>
                  <button className="btn flex-1" onClick={() => emit("admin:forceResult", { roomId: attached, result: "1/2-1/2" })}>
                    Draw
                  </button>
                  <button className="btn flex-1" onClick={() => emit("admin:forceResult", { roomId: attached, result: "0-1" })}>
                    Black wins
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
              </Tool>

              <Tool label="Freeze / swap">
                <div className="flex flex-wrap gap-2">
                  <MiniBtn onClick={() => emit("admin:freeze", { roomId: attached, color: "w", frozen: !state.frozen?.w })}>
                    {state.frozen?.w ? "Unfreeze W" : "Freeze W"}
                  </MiniBtn>
                  <MiniBtn onClick={() => emit("admin:freeze", { roomId: attached, color: "b", frozen: !state.frozen?.b })}>
                    {state.frozen?.b ? "Unfreeze B" : "Freeze B"}
                  </MiniBtn>
                  <MiniBtn onClick={() => emit("admin:freeze", { roomId: attached, color: "both", frozen: true })}>Freeze both</MiniBtn>
                  <MiniBtn onClick={() => emit("admin:swap", { roomId: attached })}>Swap sides</MiniBtn>
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
