"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMsg } from "@/lib/online/protocol";
import { IconVolumeOff, IconVolume, IconFlag } from "@/components/ui/icons";

const QUICK_EMOJI = ["👍", "😂", "😮", "😢", "♟️", "🎉"];
const CANNED_PHRASES = ["Good luck!", "Well played", "Thanks", "Oops!", "Good game"];
const MAX_LEN = 300;
const COUNTER_THRESHOLD = 250;
/** How close to the bottom (px) still counts as "at the bottom" for auto-scroll purposes. */
const BOTTOM_THRESHOLD = 40;

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function ChatPanel({
  messages,
  onSend,
  disabled,
  myUsername,
  focusSignal,
  isModerator,
  onModMute,
  onModWarn,
}: {
  messages: ChatMsg[];
  onSend: (text: string) => void;
  disabled?: boolean;
  /** Used to tell "my" messages apart from the opponent's when muting, and to gate reporting/spectator-chat controls to players. */
  myUsername?: string;
  /** Bump this (e.g. from a keyboard shortcut) to focus the message input. */
  focusSignal?: number;
  /** Reveals flagged-message styling and an inline Mute/Warn/Ignore row — only ever true for the designated in-game moderator account. */
  isModerator?: boolean;
  onModMute?: () => void;
  onModWarn?: (m: ChatMsg) => void;
}) {
  const [text, setText] = useState("");
  const [muteOpponent, setMuteOpponent] = useState(false);
  const [hideSpectators, setHideSpectators] = useState(false);
  const [reportedKeys, setReportedKeys] = useState<Set<number>>(new Set());
  const [ignoredFlags, setIgnoredFlags] = useState<Set<number>>(new Set());
  const [atBottom, setAtBottom] = useState(true);
  const [newSinceScroll, setNewSinceScroll] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevLenRef = useRef(messages.length);

  useEffect(() => {
    if (focusSignal) inputRef.current?.focus();
  }, [focusSignal]);

  const visibleMessages = messages.filter((m) => {
    if (m.system) return true;
    if (muteOpponent && myUsername && m.from !== myUsername) return false;
    if (hideSpectators && m.fromSpectator) return false;
    return true;
  });

  useEffect(() => {
    const c = scrollRef.current;
    if (!c) return;
    const grew = visibleMessages.length > prevLenRef.current;
    prevLenRef.current = visibleMessages.length;
    if (!grew) return;
    // Keep the chat pinned to the bottom only if the reader was already there —
    // otherwise leave them where they are and surface a "new messages" pill.
    if (atBottom) {
      c.scrollTop = c.scrollHeight;
    } else {
      setNewSinceScroll((n) => n + 1);
    }
  }, [visibleMessages.length, atBottom]);

  const handleScroll = () => {
    const c = scrollRef.current;
    if (!c) return;
    const isAtBottom = c.scrollHeight - c.scrollTop - c.clientHeight < BOTTOM_THRESHOLD;
    setAtBottom(isAtBottom);
    if (isAtBottom) setNewSinceScroll(0);
  };

  const jumpToBottom = () => {
    const c = scrollRef.current;
    if (c) c.scrollTop = c.scrollHeight;
    setAtBottom(true);
    setNewSinceScroll(0);
  };

  const send = (value: string) => {
    if (value.trim()) onSend(value);
  };

  const reportMessage = async (key: number, m: ChatMsg) => {
    setReportedKeys((s) => new Set(s).add(key));
    try {
      await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportedUsername: m.from, reason: "Inappropriate chat message", detail: m.text }),
      });
    } catch {
      /* best-effort */
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-end gap-1 border-b border-[var(--border)] px-2 py-1">
        {!disabled && (
          <button
            className="hover-lift flex items-center gap-1 rounded px-1.5 py-1 text-xs text-[var(--text-faint)] transition-colors hover:text-[var(--text)]"
            onClick={() => setHideSpectators((v) => !v)}
            aria-pressed={hideSpectators}
            title={hideSpectators ? "Show spectator chat" : "Hide spectator chat"}
          >
            {hideSpectators ? "Spectators hidden" : "Hide spectators"}
          </button>
        )}
        <button
          className="hover-lift flex items-center gap-1 rounded px-1.5 py-1 text-xs text-[var(--text-faint)] transition-colors hover:text-[var(--text)]"
          onClick={() => setMuteOpponent((v) => !v)}
          aria-pressed={muteOpponent}
          title={muteOpponent ? "Unmute opponent's chat" : "Mute opponent's chat"}
        >
          {muteOpponent ? <IconVolumeOff width={13} height={13} /> : <IconVolume width={13} height={13} />}
          {muteOpponent ? "Opponent muted" : "Mute opponent"}
        </button>
      </div>

      <div className="relative flex-1 overflow-hidden">
        <div ref={scrollRef} onScroll={handleScroll} className="h-full overflow-y-auto px-3 py-2">
          {visibleMessages.length === 0 ? (
            <p className="py-6 text-center text-xs text-[var(--text-faint)]">
              {muteOpponent ? "Opponent's chat is muted." : "Say hello — keep it friendly."}
            </p>
          ) : (
            visibleMessages.map((m, i) => {
              const canReport = !m.system && myUsername && m.from !== myUsername;
              const isOpponentMsg = !m.system && myUsername && m.from !== myUsername;
              const showFlag = isModerator && m.flagged && !ignoredFlags.has(i);
              return (
                <div
                  key={i}
                  className="group flex items-start gap-1 rounded py-0.5 px-1 text-sm"
                  style={showFlag ? { background: "rgba(239,68,68,0.12)", boxShadow: "inset 2px 0 0 rgba(239,68,68,0.6)" } : undefined}
                >
                  {m.system ? (
                    <span className="text-xs italic text-[var(--text-faint)]">{m.text}</span>
                  ) : (
                    <>
                      <span className="min-w-0 flex-1">
                        <span className="font-semibold text-[var(--accent)]">{m.from}: </span>
                        <span className="text-[var(--text)]">{m.text}</span>
                        <span className="ml-1.5 text-[0.65rem] text-[var(--text-faint)]">{formatTime(m.ts)}</span>
                      </span>
                      {isModerator && isOpponentMsg && (
                        <span className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            className="rounded px-1 text-[0.65rem] font-semibold text-white/60 hover:bg-white/10 hover:text-white"
                            onClick={() => onModMute?.()}
                            title="Mute this player's chat"
                          >
                            Mute
                          </button>
                          <button
                            className="rounded px-1 text-[0.65rem] font-semibold text-white/60 hover:bg-white/10 hover:text-white"
                            onClick={() => onModWarn?.(m)}
                            title="Warn this player"
                          >
                            Warn
                          </button>
                          {showFlag && (
                            <button
                              className="rounded px-1 text-[0.65rem] font-semibold text-white/60 hover:bg-white/10 hover:text-white"
                              onClick={() => setIgnoredFlags((s) => new Set(s).add(i))}
                              title="Dismiss flag"
                            >
                              Ignore
                            </button>
                          )}
                        </span>
                      )}
                      {canReport && !isModerator && (
                        <button
                          className="shrink-0 opacity-0 transition-opacity hover:text-[var(--bad)] group-hover:opacity-100"
                          onClick={() => reportMessage(i, m)}
                          disabled={reportedKeys.has(i)}
                          aria-label="Report message"
                          title={reportedKeys.has(i) ? "Reported" : "Report message"}
                        >
                          <IconFlag width={11} height={11} />
                        </button>
                      )}
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>
        {!atBottom && newSinceScroll > 0 && (
          <button
            className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-semibold text-[var(--accent-contrast)] shadow-lg"
            onClick={jumpToBottom}
          >
            {newSinceScroll} new message{newSinceScroll > 1 ? "s" : ""} ↓
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-1 border-t border-[var(--border)] px-2 pt-1.5">
        {QUICK_EMOJI.map((e) => (
          <button
            key={e}
            type="button"
            className="hover-lift rounded-md px-1.5 py-0.5 text-base leading-none transition-colors hover:bg-[var(--bg-elev)]"
            onClick={() => send(e)}
            disabled={disabled}
            aria-label={`React with ${e}`}
          >
            {e}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1 px-2 pb-1.5 pt-1">
        {CANNED_PHRASES.map((p) => (
          <button
            key={p}
            type="button"
            className="hover-lift rounded-full border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
            onClick={() => send(p)}
            disabled={disabled}
          >
            {p}
          </button>
        ))}
      </div>

      <form
        className="flex flex-col gap-1 p-2 pt-0"
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) {
            send(text);
            setText("");
          }
        }}
      >
        <div className="flex gap-1">
          <input
            ref={inputRef}
            className="input !py-1.5 !font-sans text-sm"
            placeholder={disabled ? "Chat unavailable" : "Message…"}
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={disabled}
            maxLength={MAX_LEN}
          />
          <button className="btn !px-3" disabled={disabled || !text.trim()}>
            Send
          </button>
        </div>
        {text.length >= COUNTER_THRESHOLD && (
          <span
            className="self-end text-[0.65rem] tabular-nums"
            style={{ color: text.length >= MAX_LEN ? "var(--bad)" : "var(--text-faint)" }}
          >
            {text.length}/{MAX_LEN}
          </span>
        )}
      </form>
    </div>
  );
}
