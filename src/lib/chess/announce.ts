import type { Color } from "chess.js";
import type { GameSnapshot } from "./useChessGame";

const COLOR_NAMES: Record<Color, string> = { w: "White", b: "Black" };

/**
 * Builds a concise spoken summary of the current position: side to move
 * (and check status), material balance, and the last move played. A full
 * square-by-square readout would be far too long to be useful, so this
 * favors the information a screen-reader user is most likely to want
 * on demand.
 */
export function describePosition(snapshot: GameSnapshot): string {
  const parts: string[] = [];

  if (snapshot.status.over) {
    const outcome = snapshot.status.winner ? `${COLOR_NAMES[snapshot.status.winner]} wins` : "Draw";
    parts.push(`Game over. ${outcome}${snapshot.status.reason ? ` by ${snapshot.status.reason}` : ""}.`);
  } else {
    parts.push(`${COLOR_NAMES[snapshot.turn]} to move${snapshot.check ? ", in check" : ""}.`);
  }

  const diff = snapshot.captured.materialDiff;
  if (diff === 0) parts.push("Material is even.");
  else parts.push(`${diff > 0 ? "White" : "Black"} is ahead by ${Math.abs(diff)} point${Math.abs(diff) === 1 ? "" : "s"}.`);

  const last = snapshot.moves[snapshot.moves.length - 1];
  parts.push(last ? `Last move: ${COLOR_NAMES[last.color]} ${last.san}.` : "No moves played yet.");

  return parts.join(" ");
}

/** Speaks the current position via the browser's speech synthesis, on demand (not tied to speechAnnounceMoves). */
export function announcePosition(snapshot: GameSnapshot) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(new SpeechSynthesisUtterance(describePosition(snapshot)));
}
