"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconUpload } from "@/components/ui/icons";

/** Paste-a-PGN import: adds a finished game (played elsewhere, or just for study) into the signed-in user's game history. */
export function GameImportButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pgn, setPgn] = useState("");
  const [yourColor, setYourColor] = useState<"w" | "b" | "none">("w");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (!pgn.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/games/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pgn: pgn.trim(), yourColor }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error ?? "Import failed.");
        return;
      }
      setOpen(false);
      setPgn("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button className="btn hover-lift !py-1.5 text-xs" onClick={() => setOpen(true)}>
        <IconUpload width={14} height={14} /> Import PGN
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
      <div className="panel w-full max-w-lg p-4">
        <h2 className="mb-2 font-semibold">Import a game from PGN</h2>
        <p className="mb-2 text-xs text-[var(--text-muted)]">
          Paste a full PGN. It won&apos;t affect your rating — this just adds it to your history for review.
        </p>
        <textarea
          className="input mb-2 h-40 w-full resize-y font-mono !text-xs"
          placeholder="[Event ...]&#10;1. e4 e5 2. Nf3 ..."
          value={pgn}
          onChange={(e) => setPgn(e.target.value)}
        />
        <span className="label mb-1 block">Which side did you play?</span>
        <div className="mb-3 flex gap-2">
          {(
            [
              ["w", "White"],
              ["b", "Black"],
              ["none", "Neither (just reviewing)"],
            ] as [typeof yourColor, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              className={`btn !text-xs ${yourColor === id ? "!border-[var(--accent)] !text-[var(--accent)]" : ""}`}
              onClick={() => setYourColor(id)}
            >
              {label}
            </button>
          ))}
        </div>
        {yourColor === "none" && (
          <p className="mb-2 text-xs text-[var(--warn,var(--text-muted))]">
            Note: without picking a side, this game won&apos;t show up in your own game history list (only via direct link).
          </p>
        )}
        {err && <p className="mb-2 text-xs text-[var(--bad)]">{err}</p>}
        <div className="flex justify-end gap-2">
          <button className="btn btn-ghost !text-xs" onClick={() => setOpen(false)} disabled={busy}>
            Cancel
          </button>
          <button className="btn btn-primary !text-xs" onClick={submit} disabled={busy || !pgn.trim()}>
            {busy ? "Importing…" : "Import"}
          </button>
        </div>
      </div>
    </div>
  );
}
