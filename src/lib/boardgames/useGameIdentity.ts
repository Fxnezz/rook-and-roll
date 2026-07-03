"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import type { BgIdentity } from "./protocol";

function useGuestId(): { userId: string; username: string } {
  const [guest, setGuest] = useState({ userId: "guest:pending", username: "Guest" });
  useEffect(() => {
    let id = localStorage.getItem("rr.guestId");
    if (!id) {
      id = "guest:" + Math.random().toString(36).slice(2, 10);
      localStorage.setItem("rr.guestId", id);
    }
    setGuest({ userId: id, username: `Guest-${id.slice(-4)}` });
  }, []);
  return guest;
}

/** Signed-in users play as themselves; everyone else gets a stable per-device guest id. */
export function useGameIdentity(rating = 1200): BgIdentity {
  const { data: session } = useSession();
  const guest = useGuestId();
  return useMemo(() => {
    if (session?.user) {
      return {
        userId: session.user.id,
        username: session.user.username ?? session.user.name ?? "Player",
        rating,
        guest: false,
      };
    }
    return { ...guest, rating, guest: true };
  }, [session, guest, rating]);
}
