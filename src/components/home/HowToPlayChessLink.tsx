"use client";

import { useState } from "react";
import { ChessRulesModal } from "@/components/ui/ChessRulesModal";

export function HowToPlayChessLink({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={className ?? "btn text-base !px-5 !py-3"}
      >
        How to play chess
      </button>
      {open && <ChessRulesModal onClose={() => setOpen(false)} />}
    </>
  );
}
