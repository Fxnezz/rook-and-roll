import styles from "./PlayingCard.module.css";

type CardSize = "small" | "compact" | "standard" | "fill";

interface PlayingCardProps {
  rank?: number;
  suit?: string;
  faceDown?: boolean;
  selected?: boolean;
  held?: boolean;
  dim?: boolean;
  empty?: boolean;
  size?: CardSize;
}

const SUIT_GLYPH: Record<string, string> = { S: "♠", H: "♥", D: "♦", C: "♣" };
const RANK_LABEL: Record<number, string> = { 1: "A", 11: "J", 12: "Q", 13: "K" };

export function PlayingCard({
  rank,
  suit = "S",
  faceDown = false,
  selected = false,
  held = false,
  dim = false,
  empty = false,
  size = "standard",
}: PlayingCardProps) {
  const red = suit === "H" || suit === "D";
  const rankText = rank == null ? "" : RANK_LABEL[rank] ?? String(rank);
  const suitText = SUIT_GLYPH[suit] ?? suit;
  const stateClass = empty ? styles.empty : faceDown ? styles.back : styles.face;

  return (
    <div
      className={`${styles.card} ${styles[size]} ${stateClass} ${red ? styles.red : styles.black} ${selected ? styles.selected : ""} ${held ? styles.held : ""}`}
      style={{ opacity: dim ? 0.46 : 1 }}
      aria-label={empty ? "Empty card space" : faceDown ? "Face-down card" : `${rankText} of ${suitText}`}
    >
      {faceDown ? (
        <>
          <span className={styles.backInset} aria-hidden="true" />
          <span className={styles.backMonogram} aria-hidden="true">SA</span>
        </>
      ) : empty ? null : (
        <>
          <span className={styles.corner} aria-hidden="true"><b>{rankText}</b><i>{suitText}</i></span>
          <span className={styles.suit} aria-hidden="true">{suitText}</span>
          <span className={`${styles.corner} ${styles.cornerBottom}`} aria-hidden="true"><b>{rankText}</b><i>{suitText}</i></span>
          <span className={styles.paperSheen} aria-hidden="true" />
          {held && <span className={styles.heldBadge}>Held</span>}
        </>
      )}
    </div>
  );
}
