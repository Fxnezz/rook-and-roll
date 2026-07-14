"use client";

import { useState } from "react";

/** A text box for entering moves in standard algebraic notation (e.g. "Nf3", "exd5", "O-O") instead of clicking the board. */
export function SanMoveInput({ onSubmit, disabled }: { onSubmit: (san: string) => boolean; disabled?: boolean }) {
  const [value, setValue] = useState("");
  const [err, setErr] = useState(false);

  const submit = () => {
    if (!value.trim()) return;
    const ok = onSubmit(value.trim());
    if (ok) {
      setValue("");
      setErr(false);
    } else {
      setErr(true);
    }
  };

  return (
    <div className="flex items-center gap-1.5 px-3 py-2">
      <input
        className={`input !py-1 text-sm ${err ? "!border-[var(--bad)]" : ""}`}
        placeholder="Type a move… (e.g. Nf3)"
        value={value}
        disabled={disabled}
        onChange={(e) => {
          setValue(e.target.value);
          setErr(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
        }}
        aria-label="Enter move in algebraic notation"
      />
      <button className="btn btn-ghost !px-2 !py-1 text-xs" onClick={submit} disabled={disabled || !value.trim()}>
        Play
      </button>
    </div>
  );
}
