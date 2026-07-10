"use client";

import { useEffect } from "react";
import { IconClose } from "./icons";

export function RulesModal({ title, rules, onClose }: { title: string; rules: string[]; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4 animate-fade" onClick={onClose}>
      <div className="panel w-full max-w-md p-5 animate-pop" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold">How to play: {title}</h2>
          <button className="btn btn-ghost !p-1.5" onClick={onClose} aria-label="Close">
            <IconClose width={16} height={16} />
          </button>
        </div>
        <ul className="flex flex-col gap-2 text-sm text-[var(--text-muted)]">
          {rules.map((r, i) => (
            <li key={i} className="flex gap-2">
              <span className="shrink-0 text-[var(--accent)]">•</span>
              <span>{r}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
