"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { Chess, type Color, type PieceSymbol } from "chess.js";
import { Piece } from "@/lib/pieces";
import { useSettings } from "@/lib/chess/useSettings";
import { getTheme } from "@/lib/chess/themes";

type BoardPiece = { type: PieceSymbol; color: Color };
type Grid = (BoardPiece | null)[][]; // grid[0] = rank8 … grid[7] = rank1

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const PALETTE_ORDER: PieceSymbol[] = ["k", "q", "r", "b", "n", "p"];

const STANDARD_START =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

function emptyGrid(): Grid {
  return Array.from({ length: 8 }, () => Array<BoardPiece | null>(8).fill(null));
}

function gridFromFen(fen: string): Grid {
  const grid = emptyGrid();
  const placement = fen.split(" ")[0];
  placement.split("/").forEach((row, r) => {
    let file = 0;
    for (const ch of row) {
      if (/[1-8]/.test(ch)) {
        file += Number(ch);
        continue;
      }
      grid[r][file] = { type: ch.toLowerCase() as PieceSymbol, color: ch === ch.toLowerCase() ? "b" : "w" };
      file++;
    }
  });
  return grid;
}

function gridToPlacement(grid: Grid): string {
  return grid
    .map((row) => {
      let out = "";
      let empties = 0;
      for (const cell of row) {
        if (!cell) {
          empties++;
          continue;
        }
        if (empties) {
          out += empties;
          empties = 0;
        }
        out += cell.color === "w" ? cell.type.toUpperCase() : cell.type;
      }
      if (empties) out += empties;
      return out;
    })
    .join("/");
}

type Tool = { type: PieceSymbol; color: Color } | "erase";

export default function BoardEditorPage() {
  const { settings } = useSettings();
  const theme = getTheme(settings.boardTheme);

  const [grid, setGrid] = useState<Grid>(() => gridFromFen(STANDARD_START));
  const [tool, setTool] = useState<Tool>("erase");
  const [turn, setTurn] = useState<Color>("w");
  const [castling, setCastling] = useState({ K: true, Q: true, k: true, q: true });
  const [epFile, setEpFile] = useState<string>("-");

  const fen = useMemo(() => {
    const placement = gridToPlacement(grid);
    const castleStr =
      (castling.K ? "K" : "") + (castling.Q ? "Q" : "") + (castling.k ? "k" : "") + (castling.q ? "q" : "") || "-";
    const epSquare = epFile === "-" ? "-" : `${epFile}${turn === "w" ? "6" : "3"}`;
    return `${placement} ${turn} ${castleStr} ${epSquare} 0 1`;
  }, [grid, turn, castling, epFile]);

  const validation = useMemo(() => {
    try {
      new Chess(fen);
      return { ok: true as const };
    } catch (e) {
      return { ok: false as const, message: e instanceof Error ? e.message : "Invalid position" };
    }
  }, [fen]);

  const placeAt = useCallback(
    (r: number, c: number) => {
      setGrid((g) => {
        const next = g.map((row) => row.slice());
        next[r][c] = tool === "erase" ? null : { type: tool.type, color: tool.color };
        return next;
      });
    },
    [tool],
  );

  const clearAt = useCallback((r: number, c: number) => {
    setGrid((g) => {
      const next = g.map((row) => row.slice());
      next[r][c] = null;
      return next;
    });
  }, []);

  const reset = useCallback((source: "standard" | "empty") => {
    setGrid(source === "standard" ? gridFromFen(STANDARD_START) : emptyGrid());
    setTurn("w");
    setCastling({ K: true, Q: true, k: true, q: true });
    setEpFile("-");
  }, []);

  const copyFen = useCallback(() => {
    navigator.clipboard.writeText(fen).catch(() => {});
  }, [fen]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="mb-1 text-2xl font-bold">Board editor</h1>
      <p className="mb-4 text-sm text-[var(--text-muted)]">
        Drag pieces from the palette onto the board (or click a piece, then click a square) to set up any position.
      </p>

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <div className="w-full lg:max-w-[min(65vh,560px)]">
          <div className="mb-3 flex flex-wrap gap-1.5">
            {(["w", "b"] as Color[]).map((color) => (
              <div key={color} className="flex gap-1">
                {PALETTE_ORDER.map((type) => {
                  const active = tool !== "erase" && tool.type === type && tool.color === color;
                  return (
                    <button
                      key={color + type}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData("text/plain", color + type)}
                      onClick={() => setTool({ type, color })}
                      className="flex h-11 w-11 items-center justify-center rounded-md border transition-colors"
                      style={{
                        borderColor: active ? "var(--accent)" : "var(--border)",
                        background: active ? "var(--bg-elev-2)" : "var(--bg-elev)",
                      }}
                      aria-label={`Place ${color === "w" ? "white" : "black"} ${type}`}
                    >
                      <Piece type={type} color={color} set={settings.pieceSet} size={30} />
                    </button>
                  );
                })}
              </div>
            ))}
            <button
              onClick={() => setTool("erase")}
              className="flex h-11 w-11 items-center justify-center rounded-md border text-lg font-bold transition-colors"
              style={{
                borderColor: tool === "erase" ? "var(--accent)" : "var(--border)",
                background: tool === "erase" ? "var(--bg-elev-2)" : "var(--bg-elev)",
                color: "var(--text-muted)",
              }}
              aria-label="Eraser"
              title="Eraser — click or drag onto a square to clear it"
            >
              ✕
            </button>
          </div>

          <div className="grid aspect-square w-full grid-cols-8 overflow-hidden rounded-lg border border-[var(--border)]">
            {grid.map((row, r) =>
              row.map((cell, c) => {
                const dark = (r + c) % 2 === 1;
                return (
                  <div
                    key={`${r}-${c}`}
                    className="relative flex items-center justify-center"
                    style={{ background: dark ? theme.dark : theme.light }}
                    onClick={() => placeAt(r, c)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const data = e.dataTransfer.getData("text/plain");
                      if (data.length === 2) {
                        setGrid((g) => {
                          const next = g.map((rowArr) => rowArr.slice());
                          next[r][c] = { color: data[0] as Color, type: data[1] as PieceSymbol };
                          return next;
                        });
                      }
                    }}
                  >
                    {cell && (
                      <div
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/plain", cell.color + cell.type);
                          clearAt(r, c);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="flex h-full w-full cursor-grab items-center justify-center"
                      >
                        <Piece type={cell.type} color={cell.color} set={settings.pieceSet} size={44} />
                      </div>
                    )}
                  </div>
                );
              }),
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button className="btn !text-xs" onClick={() => reset("standard")}>
              Reset to standard
            </button>
            <button className="btn !text-xs" onClick={() => reset("empty")}>
              Clear board
            </button>
          </div>
        </div>

        <div className="panel w-full p-4 lg:w-[340px]">
          <span className="label mb-2 block">Side to move</span>
          <div className="flex gap-2">
            {(["w", "b"] as Color[]).map((c) => (
              <button
                key={c}
                onClick={() => setTurn(c)}
                className="flex-1 rounded-md border px-3 py-1.5 text-sm font-semibold transition-colors"
                style={{
                  borderColor: turn === c ? "var(--accent)" : "var(--border)",
                  background: turn === c ? "var(--bg-elev-2)" : "transparent",
                  color: turn === c ? "var(--text)" : "var(--text-muted)",
                }}
              >
                {c === "w" ? "White" : "Black"}
              </button>
            ))}
          </div>

          <span className="label mb-2 mt-4 block">Castling rights</span>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {([
              ["K", "White O-O"],
              ["Q", "White O-O-O"],
              ["k", "Black O-O"],
              ["q", "Black O-O-O"],
            ] as [keyof typeof castling, string][]).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={castling[key]}
                  onChange={(e) => setCastling((prev) => ({ ...prev, [key]: e.target.checked }))}
                  className="h-4 w-4 accent-[var(--accent)]"
                />
                {label}
              </label>
            ))}
          </div>

          <span className="label mb-2 mt-4 block">En passant target file</span>
          <select
            className="input w-full !text-sm"
            value={epFile}
            onChange={(e) => setEpFile(e.target.value)}
          >
            <option value="-">None</option>
            {FILES.map((f) => (
              <option key={f} value={f}>
                {f}-file
              </option>
            ))}
          </select>

          <span className="label mb-2 mt-4 block">FEN</span>
          <textarea readOnly className="input h-16 w-full resize-none font-mono !text-xs" value={fen} />
          {!validation.ok && <p className="mt-1 text-xs text-[var(--bad)]">{validation.message}</p>}

          <div className="mt-3 flex flex-col gap-2">
            <button className="btn !text-xs" onClick={copyFen}>
              Copy FEN
            </button>
            <Link
              className={`btn !text-xs ${!validation.ok ? "pointer-events-none opacity-50" : ""}`}
              href={`/play/bot?fen=${encodeURIComponent(fen)}`}
            >
              Play vs bot from here
            </Link>
            <Link
              className={`btn !text-xs ${!validation.ok ? "pointer-events-none opacity-50" : ""}`}
              href={`/play/local?fen=${encodeURIComponent(fen)}`}
            >
              Play locally from here
            </Link>
            <Link
              className={`btn !text-xs ${!validation.ok ? "pointer-events-none opacity-50" : ""}`}
              href={`/friends?fen=${encodeURIComponent(fen)}`}
            >
              Challenge a friend with this position
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
