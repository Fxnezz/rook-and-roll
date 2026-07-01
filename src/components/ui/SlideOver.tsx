"use client";

import { useEffect, type ReactNode } from "react";
import { IconClose } from "./icons";

export function SlideOver({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <div
      className={`fixed inset-0 z-50 transition-opacity ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
    >
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <aside
        className="absolute right-0 top-0 flex h-full w-[min(88vw,22rem)] flex-col border-l border-[var(--border)] bg-[var(--panel)] shadow-2xl transition-transform duration-200"
        style={{ transform: open ? "translateX(0)" : "translateX(100%)" }}
      >
        <header className="flex items-center justify-between border-b border-[var(--border)] p-4">
          <h2 className="font-bold">{title}</h2>
          <button className="btn btn-ghost !p-2" onClick={onClose} aria-label="Close">
            <IconClose />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </aside>
    </div>
  );
}
