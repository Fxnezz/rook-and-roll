"use client";

import { useState } from "react";

const REASONS = ["Cheating", "Harassment", "Offensive name/profile", "Spam", "Other"];

export function ReportButton({ username }: { username: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REASONS[0]);
  const [detail, setDetail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  const submit = async () => {
    setStatus("sending");
    setError("");
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportedUsername: username, reason, detail }),
    });
    if (res.ok) {
      setStatus("sent");
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not submit report.");
      setStatus("error");
    }
  };

  if (!open) {
    return (
      <button className="btn-ghost text-xs text-[var(--text-faint)]" onClick={() => setOpen(true)}>
        Report player
      </button>
    );
  }

  return (
    <div className="panel p-4">
      {status === "sent" ? (
        <p className="text-sm text-[var(--good)]">Report submitted. Thanks for helping keep things fair.</p>
      ) : (
        <>
          <h3 className="mb-2 text-sm font-bold">Report {username}</h3>
          <select
            className="input !font-sans mb-2 w-full"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          >
            {REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <textarea
            className="input !font-sans mb-2 w-full"
            placeholder="Additional details (optional)"
            rows={3}
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
          />
          {error && <p className="mb-2 text-xs text-[var(--bad)]">{error}</p>}
          <div className="flex gap-2">
            <button className="btn flex-1" disabled={status === "sending"} onClick={submit}>
              Submit
            </button>
            <button className="btn-ghost flex-1" onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  );
}
