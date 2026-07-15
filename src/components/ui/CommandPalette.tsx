"use client";

import { useEffect, useMemo, useRef, useState, type SVGProps } from "react";
import { useRouter } from "next/navigation";
import { NAV } from "./nav";
import { IconSearch, IconUsers, IconSettings } from "./icons";

interface Command {
  label: string;
  href: string;
  icon: (p: SVGProps<SVGSVGElement>) => React.ReactElement;
  keywords?: string;
}

const EXTRA_COMMANDS: Command[] = [
  { label: "Friends", href: "/friends", icon: IconUsers },
  { label: "Account settings", href: "/account", icon: IconSettings },
];

/** Global Cmd/Ctrl+K command palette — jumps to any main destination. Mounted
 * once in Providers; owns its own key listener rather than sharing
 * useKeyboardShortcuts, since that hook explicitly ignores modifier combos. */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const commands = useMemo<Command[]>(
    () => [...NAV.map((n) => ({ label: n.label, href: n.href, icon: n.icon })), ...EXTRA_COMMANDS],
    [],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => c.label.toLowerCase().includes(q) || c.keywords?.toLowerCase().includes(q));
  }, [commands, query]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[95] flex items-start justify-center bg-black/60 pt-[15vh] animate-fade" onClick={() => setOpen(false)}>
      <div className="panel w-full max-w-md overflow-hidden p-0 animate-pop" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Command palette">
        <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2.5">
          <IconSearch width={16} height={16} className="shrink-0 text-[var(--text-faint)]" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveIndex((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter" && filtered[activeIndex]) {
                go(filtered[activeIndex].href);
              }
            }}
            placeholder="Jump to…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--text-faint)]"
          />
          <kbd className="shrink-0 rounded border border-[var(--border-strong)] bg-[var(--bg-elev)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--text-faint)]">
            Esc
          </kbd>
        </div>
        <div className="max-h-72 overflow-y-auto p-1">
          {filtered.length === 0 ? (
            <p className="p-4 text-center text-sm text-[var(--text-faint)]">No matches.</p>
          ) : (
            filtered.map((c, i) => (
              <button
                key={c.href}
                onClick={() => go(c.href)}
                onMouseEnter={() => setActiveIndex(i)}
                className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm font-semibold ${
                  i === activeIndex ? "bg-[var(--bg-elev-2)] text-[var(--accent)]" : "text-[var(--text)]"
                }`}
              >
                <c.icon width={16} height={16} />
                {c.label}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
