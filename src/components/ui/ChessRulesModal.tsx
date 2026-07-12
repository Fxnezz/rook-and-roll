"use client";

import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import { IconClose } from "./icons";

const SECTIONS: { heading: string; body: string[] }[] = [
  {
    heading: "The goal",
    body: [
      "Checkmate the opponent's king — put it under attack with no way to escape, block, or capture the attacker.",
      "Each player moves one piece per turn, alternating, starting with White.",
    ],
  },
  {
    heading: "How the pieces move",
    body: [
      "Pawn — one square forward (two on its first move), captures one square diagonally forward. En passant: if an enemy pawn advances two squares and lands beside yours, you may capture it as if it had moved only one square, but only on the very next move. Promotion: a pawn reaching the far rank becomes a queen, rook, bishop, or knight.",
      "Knight — moves in an L-shape (two squares one way, one square perpendicular) and is the only piece that can jump over others.",
      "Bishop — any distance diagonally. Stays on one color of square for the whole game.",
      "Rook — any distance horizontally or vertically.",
      "Queen — any distance horizontally, vertically, or diagonally — the most powerful piece.",
      "King — one square in any direction. Special move: castling (see below).",
    ],
  },
  {
    heading: "Check, checkmate, and stalemate",
    body: [
      "Check — the king is under attack. The player must get out of check immediately, by moving the king, blocking the attack, or capturing the attacker.",
      "Checkmate — the king is in check with no legal way out. The game ends immediately; the checkmated side loses.",
      "Stalemate — the player to move has no legal move and is not in check. The game is a draw.",
    ],
  },
  {
    heading: "Castling",
    body: [
      "A special king-and-rook move, done once per game, that helps tuck the king away safely.",
      "Kingside — the king moves two squares toward the h-file rook; the rook jumps to the square beside the king.",
      "Queenside — the king moves two squares toward the a-file rook; the rook jumps to the square beside the king.",
      "Requirements: neither piece has moved before, the squares between them are empty, and the king isn't in check, doesn't pass through check, and doesn't land in check.",
    ],
  },
  {
    heading: "Draws",
    body: [
      "50-move rule — a draw can be claimed if 50 moves pass with no pawn move and no capture.",
      "Threefold repetition — a draw can be claimed if the exact same position occurs three times, with the same player to move.",
      "Insufficient material — neither side has enough pieces left to possibly checkmate (e.g. king vs. king, or king and bishop vs. king).",
      "Players may also agree to a draw at any point.",
    ],
  },
];

export function ChessRulesModal({ onClose }: { onClose: () => void }) {
  const panelRef = useFocusTrap<HTMLDivElement>(onClose, { lockBodyScroll: true });

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4 animate-fade" onClick={onClose}>
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="chess-rules-title"
        className="panel flex w-full max-w-lg flex-col p-0 animate-pop"
        style={{ maxHeight: "85vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] p-4">
          <h2 id="chess-rules-title" className="text-lg font-bold">
            How to play chess
          </h2>
          <button className="btn btn-ghost !p-1.5" onClick={onClose} aria-label="Close">
            <IconClose width={16} height={16} />
          </button>
        </div>
        <div className="flex flex-col gap-4 overflow-y-auto p-4">
          {SECTIONS.map((s) => (
            <section key={s.heading}>
              <h3 className="mb-1.5 text-sm font-bold text-[var(--text)]">{s.heading}</h3>
              <ul className="flex flex-col gap-1.5 text-sm text-[var(--text-muted)]">
                {s.body.map((line, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-0.5 shrink-0 text-[var(--accent)]">•</span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
