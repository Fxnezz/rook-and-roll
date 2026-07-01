"use client";

import { useState } from "react";
import { IconCopy, IconDownload } from "@/components/ui/icons";

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
}: {
  fen: string;
  pgn: string;
  onLoadFen: (fen: string) => boolean;
  onLoadPgn: (pgn: string) => boolean;
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

  return (
    <div className="flex flex-col gap-4 p-4 text-sm">
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="label">Current FEN</span>
          <button className="btn btn-ghost !px-2 !py-1 text-xs" onClick={() => copy("fen", fen)}>
            <IconCopy width={14} height={14} /> {copied === "fen" ? "Copied" : "Copy"}
          </button>
        </div>
        <code className="block break-all rounded-md bg-[var(--bg)] p-2 font-mono text-xs text-[var(--text-muted)]">
          {fen}
        </code>
      </section>

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
    </div>
  );
}
