"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";

interface Note {
  id: string;
  title: string;
  body: string;
  fromAdmin: boolean;
  readAt: string | null;
  createdAt: string;
}

export function NotificationBell() {
  const { status } = useSession();
  const [notes, setNotes] = useState<Note[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status !== "authenticated") return;
    const load = () =>
      fetch("/api/notifications")
        .then((r) => r.json())
        .then((d) => {
          setNotes(d.notifications ?? []);
          setUnread(d.unread ?? 0);
        })
        .catch(() => {});
    load();
    const iv = setInterval(load, 60_000);
    return () => clearInterval(iv);
  }, [status]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (status !== "authenticated") return null;

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      fetch("/api/notifications", { method: "POST" }).catch(() => {});
      setUnread(0);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button className="btn btn-ghost relative !p-2" onClick={toggle} aria-label="Notifications">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--bad)] px-1 text-[10px] font-bold text-white">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div className="panel absolute right-0 top-10 z-50 max-h-96 w-72 overflow-y-auto p-1 animate-fade">
          {notes.length === 0 ? (
            <p className="p-4 text-center text-sm text-[var(--text-faint)]">No messages.</p>
          ) : (
            notes.map((n) => (
              <div key={n.id} className="rounded px-3 py-2 hover:bg-[var(--bg-elev)]">
                <div className="flex items-center gap-1.5">
                  {n.fromAdmin && <span className="chip !px-1.5 !py-0.5 text-[9px]">Admin</span>}
                  <span className="text-sm font-semibold">{n.title}</span>
                </div>
                <p className="mt-0.5 text-sm text-[var(--text-muted)]">{n.body}</p>
                <p className="mt-0.5 text-[10px] text-[var(--text-faint)]">{new Date(n.createdAt).toLocaleString()}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
