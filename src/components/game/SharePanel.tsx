"use client";

import { useState } from "react";
import type { Color } from "chess.js";
import { IconCopy, IconDownload } from "@/components/ui/icons";

const PIECE_GLYPHS: Record<string, string> = {
  p: "♟",
  n: "♞",
  b: "♝",
  r: "♜",
  q: "♛",
  k: "♚",
  P: "♙",
  N: "♘",
  B: "♗",
  R: "♖",
  Q: "♕",
  K: "♔",
};

/** Draws a flat 2D rendering of a FEN position onto an offscreen canvas (no DOM screenshot library needed). */
function renderBoardCanvas(fen: string, theme: { light: string; dark: string }, orientation: Color): HTMLCanvasElement | null {
  const ranks = fen.split(" ")[0].split("/");
  const grid: (string | null)[][] = ranks.map((rank) => {
    const cells: (string | null)[] = [];
    for (const ch of rank) {
      if (/\d/.test(ch)) for (let i = 0; i < Number(ch); i++) cells.push(null);
      else cells.push(ch);
    }
    return cells;
  });
  const size = 480;
  const sq = size / 8;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const isLight = (r + f) % 2 === 0;
      const drawRow = orientation === "w" ? r : 7 - r;
      const drawCol = orientation === "w" ? f : 7 - f;
      ctx.fillStyle = isLight ? theme.light : theme.dark;
      ctx.fillRect(drawCol * sq, drawRow * sq, sq, sq);
      const piece = grid[r]?.[f];
      if (piece) {
        ctx.font = `${sq * 0.72}px serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = piece === piece.toUpperCase() ? "#f6f1e6" : "#1c2029";
        ctx.strokeStyle = "rgba(0,0,0,0.5)";
        ctx.lineWidth = 1.5;
        const glyph = PIECE_GLYPHS[piece] ?? "";
        ctx.strokeText(glyph, drawCol * sq + sq / 2, drawRow * sq + sq / 2 + 2);
        ctx.fillText(glyph, drawCol * sq + sq / 2, drawRow * sq + sq / 2 + 2);
      }
    }
  }
  return canvas;
}

export interface ShareCardMeta {
  whiteName: string;
  blackName: string;
  result: "WHITE_WINS" | "BLACK_WINS" | "DRAW";
  opening?: string;
  eco?: string;
  accuracyW?: number;
  accuracyB?: number;
}

/** Draws a shareable result card: board on top, names/result/opening/accuracy below. */
function renderShareCard(fen: string, theme: { light: string; dark: string }, orientation: Color, meta: ShareCardMeta): HTMLCanvasElement | null {
  const board = renderBoardCanvas(fen, theme, orientation);
  if (!board) return null;
  const boardSize = board.width;
  const footerH = 150;
  const canvas = document.createElement("canvas");
  canvas.width = boardSize;
  canvas.height = boardSize + footerH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#1c2029";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(board, 0, 0);

  const resultText = meta.result === "DRAW" ? "½–½" : meta.result === "WHITE_WINS" ? "1–0" : "0–1";
  const pad = 20;
  let y = boardSize + 34;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#f6f1e6";
  ctx.font = "bold 22px sans-serif";
  ctx.fillText(`${meta.whiteName}  ${resultText}  ${meta.blackName}`, pad, y);

  y += 30;
  ctx.font = "15px sans-serif";
  ctx.fillStyle = "#9aa3b5";
  if (meta.opening) {
    ctx.fillText(`${meta.eco ? meta.eco + " · " : ""}${meta.opening}`, pad, y);
    y += 24;
  }
  if (meta.accuracyW != null && meta.accuracyB != null) {
    ctx.fillText(`Accuracy — White ${meta.accuracyW}% · Black ${meta.accuracyB}%`, pad, y);
    y += 24;
  }
  ctx.font = "12px sans-serif";
  ctx.fillStyle = "#5a6273";
  ctx.fillText("Rook & Roll", pad, boardSize + footerH - 14);

  return canvas;
}

function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 1200);
    } catch {
      /* ignore */
    }
  };
  return { copied, copy };
}

export function SharePanel({
  fen,
  pgn,
  onLoadFen,
  onLoadPgn,
  theme = { light: "#ebecd0", dark: "#6f8f5a" },
  orientation = "w",
  showImport = true,
  shareCardMeta,
}: {
  fen: string;
  pgn: string;
  onLoadFen?: (fen: string) => boolean;
  onLoadPgn?: (pgn: string) => boolean;
  theme?: { light: string; dark: string };
  orientation?: Color;
  /** Hide the "load a position/game" import sections — for read-only contexts (spectating, reviewing a finished game, live online games where importing a position would bypass server authority). */
  showImport?: boolean;
  /** When set (a finished game with a known result), enables a "Share card" download with names/result/opening/accuracy baked in. */
  shareCardMeta?: ShareCardMeta;
}) {
  const { copied, copy } = useCopy();
  const [fenInput, setFenInput] = useState("");
  const [pgnInput, setPgnInput] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const downloadPgn = () => {
    const blob = new Blob([pgn || "*"], { type: "application/x-chess-pgn" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rook-and-roll-${Date.now()}.pgn`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadImage = () => {
    const canvas = renderBoardCanvas(fen, theme, orientation);
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rook-and-roll-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  const downloadShareCard = () => {
    if (!shareCardMeta) return;
    const canvas = renderShareCard(fen, theme, orientation, shareCardMeta);
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rook-and-roll-game-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  return (
    <div className="flex flex-col gap-4 p-4 text-sm">
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="label">Current FEN</span>
          <div className="flex gap-1">
            <button className="btn btn-ghost !px-2 !py-1 text-xs" onClick={() => copy("fen", fen)}>
              <IconCopy width={14} height={14} /> {copied === "fen" ? "Copied" : "Copy"}
            </button>
            <button className="btn btn-ghost !px-2 !py-1 text-xs" onClick={downloadImage}>
              <IconDownload width={14} height={14} /> Image
            </button>
          </div>
        </div>
        <code className="block break-all rounded-md bg-[var(--bg)] p-2 font-mono text-xs text-[var(--text-muted)]">
          {fen}
        </code>
      </section>

      {shareCardMeta && (
        <section className="flex items-center justify-between rounded-md bg-[var(--bg-elev)] p-2">
          <span className="text-xs text-[var(--text-muted)]">Result card (board + names + accuracy)</span>
          <button className="btn btn-ghost !px-2 !py-1 text-xs" onClick={downloadShareCard}>
            <IconDownload width={14} height={14} /> Share card
          </button>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="label">PGN</span>
          <div className="flex gap-1">
            <button className="btn btn-ghost !px-2 !py-1 text-xs" onClick={() => copy("pgn", pgn)}>
              <IconCopy width={14} height={14} /> {copied === "pgn" ? "Copied" : "Copy"}
            </button>
            <button className="btn btn-ghost !px-2 !py-1 text-xs" onClick={downloadPgn}>
              <IconDownload width={14} height={14} /> Save
            </button>
          </div>
        </div>
        <code className="block max-h-28 overflow-y-auto whitespace-pre-wrap break-words rounded-md bg-[var(--bg)] p-2 font-mono text-xs text-[var(--text-muted)]">
          {pgn || "No moves yet."}
        </code>
      </section>

      {showImport && onLoadFen && onLoadPgn && (
        <>
          <div className="h-px bg-[var(--border)]" />

          <section className="flex flex-col gap-2">
            <span className="label">Import position (FEN)</span>
            <input
              className="input"
              placeholder="Paste a FEN string…"
              value={fenInput}
              onChange={(e) => setFenInput(e.target.value)}
            />
            <button
              className="btn"
              onClick={() => {
                setErr(null);
                if (!onLoadFen(fenInput.trim())) setErr("That FEN could not be loaded.");
                else setFenInput("");
              }}
              disabled={!fenInput.trim()}
            >
              Load FEN
            </button>
          </section>

          <section className="flex flex-col gap-2">
            <span className="label">Import game (PGN)</span>
            <textarea
              className="input min-h-[80px] resize-y"
              placeholder="Paste a PGN game…"
              value={pgnInput}
              onChange={(e) => setPgnInput(e.target.value)}
            />
            <button
              className="btn"
              onClick={() => {
                setErr(null);
                if (!onLoadPgn(pgnInput.trim())) setErr("That PGN could not be parsed.");
                else setPgnInput("");
              }}
              disabled={!pgnInput.trim()}
            >
              Load PGN
            </button>
          </section>

          {err && <p className="text-xs text-[var(--bad)]">{err}</p>}
        </>
      )}
    </div>
  );
}
