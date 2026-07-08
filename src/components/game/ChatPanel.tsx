"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMsg } from "@/lib/online/protocol";
import { IconVolumeOff, IconVolume } from "@/components/ui/icons";

const QUICK_EMOJI = ["👍", "😂", "😮", "😢", "♟️", "🎉"];
const CANNED_PHRASES = ["Good luck!", "Well played", "Thanks", "Oops!", "Good game"];
const MAX_LEN = 300;
const COUNTER_THRESHOLD = 250;

export function ChatPanel({
  messages,
  onSend,
  disabled,
  myUsername,
}: {
  messages: ChatMsg[];
  onSend: (text: string) => void;
  disabled?: boolean;
  /** Used to tell "my" messages apart from the opponent's when muting. */
  myUsername?: string;
}) {
  const [text, setText] = useState("");
  const [muteOpponent, setMuteOpponent] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const visibleMessages = muteOpponent
    ? messages.filter((m) => m.system || !myUsername || m.from === myUsername)
    : messages;

  useEffect(() => {
    // Keep the chat pinned to the bottom by scrolling its own container only —
    // not the page (scrollIntoView would jump the mobile viewport).
    const c = scrollRef.current;
    if (c) c.scrollTop = c.scrollHeight;
  }, [visibleMessages.length]);

  const send = (value: string) => {
    if (value.trim()) onSend(value);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-end border-b border-[var(--border)] px-2 py-1">
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

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2">
        {visibleMessages.length === 0 ? (
          <p className="py-6 text-center text-xs text-[var(--text-faint)]">
            {muteOpponent ? "Opponent's chat is muted." : "Say hello — keep it friendly."}
          </p>
        ) : (
          visibleMessages.map((m, i) => (
            <div key={i} className="py-0.5 text-sm">
              {m.system ? (
                <span className="text-xs italic text-[var(--text-faint)]">{m.text}</span>
              ) : (
                <>
                  <span className="font-semibold text-[var(--accent)]">{m.from}: </span>
                  <span className="text-[var(--text)]">{m.text}</span>
                </>
              )}
            </div>
          ))
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
