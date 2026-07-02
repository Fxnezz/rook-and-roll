"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMsg } from "@/lib/online/protocol";

export function ChatPanel({
  messages,
  onSend,
  disabled,
}: {
  messages: ChatMsg[];
  onSend: (text: string) => void;
  disabled?: boolean;
}) {
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Keep the chat pinned to the bottom by scrolling its own container only —
    // not the page (scrollIntoView would jump the mobile viewport).
    const c = scrollRef.current;
    if (c) c.scrollTop = c.scrollHeight;
  }, [messages]);

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2">
        {messages.length === 0 ? (
          <p className="py-6 text-center text-xs text-[var(--text-faint)]">Say hello — keep it friendly.</p>
        ) : (
          messages.map((m, i) => (
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
      <form
        className="flex gap-1 border-t border-[var(--border)] p-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) {
            onSend(text);
            setText("");
          }
        }}
      >
        <input
          className="input !py-1.5 !font-sans text-sm"
          placeholder={disabled ? "Chat unavailable" : "Message…"}
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={disabled}
          maxLength={300}
        />
        <button className="btn !px-3" disabled={disabled || !text.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
