export const NAG_SYMBOLS = ["!!", "??", "!?", "?!", "!", "?"] as const;
export type NagSymbol = (typeof NAG_SYMBOLS)[number];

/** Comments are stored as "<nag> <free text>" (either half optional) so PGN export/import needs no changes. */
export function parseAnnotation(comment: string | undefined): { nag: NagSymbol | null; text: string } {
  if (!comment) return { nag: null, text: "" };
  for (const s of NAG_SYMBOLS) {
    if (comment === s) return { nag: s, text: "" };
    if (comment.startsWith(`${s} `)) return { nag: s, text: comment.slice(s.length + 1) };
  }
  return { nag: null, text: comment };
}

export function formatAnnotation(nag: NagSymbol | null, text: string): string {
  const trimmed = text.trim();
  if (nag && trimmed) return `${nag} ${trimmed}`;
  if (nag) return nag;
  return trimmed;
}
