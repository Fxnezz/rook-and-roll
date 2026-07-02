"use client";

import { useState } from "react";

export function AdminLogoutButton() {
  const [loading, setLoading] = useState(false);
  return (
    <button
      className="btn btn-danger"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        await fetch("/api/admin/logout", { method: "POST" }).catch(() => {});
        window.location.href = "/";
      }}
    >
      {loading ? "…" : "Sign out"}
    </button>
  );
}
