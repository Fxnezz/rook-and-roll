import type { Color } from "chess.js";

export type LocalVariant = "standard" | "threeCheck" | "koth" | "armageddon";

export const LOCAL_VARIANTS: { id: LocalVariant; label: string; blurb: string }[] = [
  { id: "standard", label: "Standard", blurb: "Normal chess rules." },
  { id: "threeCheck", label: "Three-check", blurb: "First to give check 3 times wins." },
  { id: "koth", label: "King of the Hill", blurb: "March your king to d4/d5/e4/e5 to win instantly." },
  { id: "armageddon", label: "Armageddon", blurb: "White gets more time, but Black wins any draw." },
];

const CENTER_SQUARES = new Set(["d4", "d5", "e4", "e5"]);

/** True if `color`'s king sits on one of the four center squares in this FEN. */
export function kingOnCenter(fen: string, color: Color): boolean {
  const placement = fen.split(" ")[0];
  const ranks = placement.split("/");
  const king = color === "w" ? "K" : "k";
  for (let r = 0; r < 8; r++) {
    let file = 0;
    for (const ch of ranks[r]) {
      if (/[1-8]/.test(ch)) {
        file += Number(ch);
        continue;
      }
      if (ch === king) {
        const square = "abcdefgh"[file] + String(8 - r);
        return CENTER_SQUARES.has(square);
      }
      file += 1;
    }
  }
  return false;
}
