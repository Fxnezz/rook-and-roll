"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

type NotificationType =
  | "FRIEND_REQUEST"
  | "FRIEND_ACCEPTED"
  | "FRIEND_ONLINE"
  | "ACHIEVEMENT"
  | "GAME_RESULT"
  | "SYSTEM"
  | "ADMIN";

interface Note {
  id: string;
  title: string;
  body: string;
  type: NotificationType;
  href: string | null;
  fromAdmin: boolean;
  readAt: string | null;
  createdAt: string;
}

const TYPE_LABEL_PLURAL: Record<NotificationType, string> = {
  FRIEND_REQUEST: "friend requests",
  FRIEND_ACCEPTED: "friend requests accepted",
  FRIEND_ONLINE: "friends online",
  ACHIEVEMENT: "achievements earned",
  GAME_RESULT: "game results",
  SYSTEM: "notifications",
  ADMIN: "messages",
};

type Row = { kind: "group"; key: string; type: NotificationType; notes: Note[] } | { kind: "single"; note: Note };

/** Collapses consecutive unread notifications of the same type into a single summary row, unless the group has been manually expanded. */
function buildRows(notes: Note[], expanded: Set<string>): Row[] {
  const rows: Row[] = [];
  let i = 0;
  while (i < notes.length) {
    const n = notes[i];
    if (!n.readAt) {
      let j = i + 1;
      while (j < notes.length && !notes[j].readAt && notes[j].type === n.type) j++;
      if (j - i >= 2) {
        const key = `${n.type}:${n.id}`;
        if (expanded.has(key)) {
          for (let k = i; k < j; k++) rows.push({ kind: "single", note: notes[k] });
        } else {
          rows.push({ kind: "group", key, type: n.type, notes: notes.slice(i, j) });
        }
        i = j;
        continue;
      }
    }
    rows.push({ kind: "single", note: n });
    i++;
  }
  return rows;
}

export function NotificationBell() {
  const { status } = useSession();
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [announce, setAnnounce] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const prevUnread = useRef(0);
  const announceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (status !== "authenticated") return;
    const load = () =>
      fetch("/api/notifications")
        .then((r) => r.json())
        .then((d) => {
          const nextUnread: number = d.unread ?? 0;
          if (nextUnread > prevUnread.current) {
            const diff = nextUnread - prevUnread.current;
            setAnnounce(`${diff} new notification${diff === 1 ? "" : "s"}`);
            if (announceTimer.current) clearTimeout(announceTimer.current);
            announceTimer.current = setTimeout(() => setAnnounce(""), 5000);
          }
          prevUnread.current = nextUnread;
          setNotes(d.notifications ?? []);
          setUnread(nextUnread);
          setHasMore(Boolean(d.hasMore));
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

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (status !== "authenticated") return null;

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      fetch("/api/notifications", { method: "POST" }).catch(() => {});
      setNotes((prev) => prev.map((n) => (n.readAt ? n : { ...n, readAt: new Date().toISOString() })));
      setUnread(0);
      prevUnread.current = 0;
    }
  };

  const markOneRead = (id: string) => {
    setNotes((prev) => prev.map((n) => (n.id === id && !n.readAt ? { ...n, readAt: new Date().toISOString() } : n)));
    setUnread((u) => Math.max(0, u - 1));
    prevUnread.current = Math.max(0, prevUnread.current - 1);
    fetch(`/api/notifications/${id}`, { method: "PATCH" }).catch(() => {});
  };

  const clickNote = (n: Note) => {
    if (!n.readAt) markOneRead(n.id);
    if (n.href) {
      setOpen(false);
      router.push(n.href);
    }
  };

  const dismiss = (e: React.MouseEvent, n: Note) => {
    e.stopPropagation();
    setNotes((prev) => prev.filter((x) => x.id !== n.id));
    if (!n.readAt) {
      setUnread((u) => Math.max(0, u - 1));
      prevUnread.current = Math.max(0, prevUnread.current - 1);
    }
    fetch(`/api/notifications/${n.id}`, { method: "DELETE" }).catch(() => {});
  };

  const clearAll = () => {
    setNotes([]);
    setUnread(0);
    prevUnread.current = 0;
    setHasMore(false);
    fetch("/api/notifications", { method: "DELETE" }).catch(() => {});
  };

  const loadMore = async () => {
    const last = notes[notes.length - 1];
    if (!last || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/notifications?before=${encodeURIComponent(last.createdAt)}`);
      const d = await res.json();
      setNotes((prev) => [...prev, ...(d.notifications ?? [])]);
      setHasMore(Boolean(d.hasMore));
    } catch {
      /* best-effort */
    } finally {
      setLoadingMore(false);
    }
  };

  const expandGroup = (key: string) => setExpandedGroups((prev) => new Set(prev).add(key));

  const rows = buildRows(notes, expandedGroups);

  return (
    <div className="relative" ref={ref}>
      <div className="sr-only" role="status" aria-live="polite">
        {announce}
      </div>
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
          {notes.length > 0 && (
            <div className="flex justify-end px-2 pb-1 pt-0.5">
              <button className="text-[11px] font-semibold text-[var(--text-faint)] hover:text-[var(--text-muted)]" onClick={clearAll}>
                Clear all
              </button>
            </div>
          )}
          {notes.length === 0 ? (
            <p className="p-4 text-center text-sm text-[var(--text-faint)]">No messages.</p>
          ) : (
            <>
              {rows.map((row) =>
                row.kind === "group" ? (
                  <button
                    key={row.key}
                    className="flex w-full items-center gap-1.5 rounded px-3 py-2 text-left hover:bg-[var(--bg-elev)]"
                    onClick={() => expandGroup(row.key)}
                  >
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                    <span className="text-sm font-semibold">
                      {row.notes.length} {TYPE_LABEL_PLURAL[row.type]}
                    </span>
                  </button>
                ) : (
                  <div
                    key={row.note.id}
                    className="group relative flex items-start gap-1.5 rounded px-3 py-2 pr-6 hover:bg-[var(--bg-elev)]"
                    role={row.note.href ? "button" : undefined}
                    tabIndex={row.note.href ? 0 : undefined}
                    onClick={() => clickNote(row.note)}
                    onKeyDown={(e) => {
                      if (row.note.href && (e.key === "Enter" || e.key === " ")) {
                        e.preventDefault();
                        clickNote(row.note);
                      }
                    }}
                    style={{ cursor: row.note.href ? "pointer" : "default" }}
                  >
                    {!row.note.readAt && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />}
                    <div className={row.note.readAt ? "min-w-0 flex-1 opacity-70" : "min-w-0 flex-1"}>
                      <div className="flex items-center gap-1.5">
                        {row.note.fromAdmin && <span className="chip !px-1.5 !py-0.5 text-[9px]">Admin</span>}
                        <span className="truncate text-sm font-semibold">{row.note.title}</span>
                      </div>
                      <p className="mt-0.5 text-sm text-[var(--text-muted)]">{row.note.body}</p>
                      <p className="mt-0.5 text-[10px] text-[var(--text-faint)]">{new Date(row.note.createdAt).toLocaleString()}</p>
                    </div>
                    <button
                      className="absolute right-1 top-1 rounded p-1 text-[var(--text-faint)] opacity-0 hover:bg-[var(--bg)] hover:text-[var(--bad)] group-hover:opacity-100 focus:opacity-100"
                      aria-label="Dismiss notification"
                      onClick={(e) => dismiss(e, row.note)}
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                        <path d="M18 6 6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ),
              )}
              {hasMore && (
                <button
                  className="w-full rounded px-3 py-2 text-center text-xs font-semibold text-[var(--text-muted)] hover:bg-[var(--bg-elev)] disabled:opacity-50"
                  onClick={loadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? "Loading…" : "Load more"}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
