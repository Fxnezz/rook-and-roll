import styles from "./Die.module.css";

interface DieProps {
  value: number;
  selected?: boolean;
  muted?: boolean;
  size?: "compact" | "standard";
}

const PIPS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

export function Die({ value, selected = false, muted = false, size = "standard" }: DieProps) {
  const pips = new Set(PIPS[value] ?? []);
  return (
    <span
      className={`${styles.die} ${styles[size]} ${selected ? styles.selected : ""}`}
      style={{ opacity: muted ? 0.48 : 1 }}
      role="img"
      aria-label={`Die showing ${value}`}
    >
      {Array.from({ length: 9 }, (_, index) => <i key={index} className={pips.has(index) ? styles.pip : styles.blank} />)}
      <span className={styles.shine} aria-hidden="true" />
    </span>
  );
}
