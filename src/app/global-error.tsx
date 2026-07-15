"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          minHeight: "100vh",
          margin: 0,
          display: "grid",
          placeItems: "center",
          padding: "24px",
          boxSizing: "border-box",
          color: "#f4f6fb",
          background: "#0e1117",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <main style={{ width: "min(100%, 560px)", textAlign: "center" }}>
          <div aria-hidden="true" style={{ fontSize: "52px" }}>♜</div>
          <p style={{ margin: "20px 0 6px", color: "#f4b451", fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", fontSize: "12px" }}>
            Sam&apos;s Arcade recovery
          </p>
          <h1 style={{ margin: 0, fontSize: "clamp(28px, 7vw, 44px)", lineHeight: 1.05 }}>
            The arcade needs a quick reset.
          </h1>
          <p style={{ margin: "18px auto 0", color: "#aeb6c5", lineHeight: 1.7 }}>
            A core screen failed to load. Your device settings and local game progress have not been cleared.
          </p>
          {error.digest && <p style={{ color: "#7f899b", fontFamily: "ui-monospace, monospace", fontSize: "12px" }}>Reference: {error.digest}</p>}
          <button
            type="button"
            onClick={unstable_retry}
            style={{ marginTop: "24px", border: 0, borderRadius: "12px", padding: "12px 18px", background: "#f4b451", color: "#241a08", font: "inherit", fontWeight: 800, cursor: "pointer" }}
          >
            Retry Sam&apos;s Arcade
          </button>
        </main>
      </body>
    </html>
  );
}
