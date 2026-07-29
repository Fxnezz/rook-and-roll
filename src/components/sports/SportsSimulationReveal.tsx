"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./SportsSimulationReveal.module.css";

export type SimulationOutcome = "win" | "draw" | "loss";

export interface SimulationRevealEntry {
  id: string;
  label: string;
  stage: string;
  homeName: string;
  awayName: string;
  homeScore: string;
  awayScore: string;
  outcome: SimulationOutcome;
}

interface SportsSimulationRevealProps {
  accent: string;
  entries: SimulationRevealEntry[];
  eyebrow: string;
  onComplete: () => void;
  title: string;
}

const SPEEDS = [1, 2, 4] as const;

export function SportsSimulationReveal({ accent, entries, eyebrow, onComplete, title }: SportsSimulationRevealProps) {
  const [revealed, setRevealed] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(() => entries.length > 50 ? 4 : entries.length > 25 ? 2 : 1);
  const complete = revealed >= entries.length;
  const current = entries[Math.max(0, revealed - 1)];
  const visible = entries.slice(Math.max(0, revealed - 8), revealed);
  const record = useMemo(() => entries.slice(0, revealed).reduce((total, entry) => {
    total[entry.outcome] += 1;
    return total;
  }, { win: 0, draw: 0, loss: 0 }), [entries, revealed]);

  useEffect(() => {
    if (!playing || complete) return;
    const timeout = window.setTimeout(() => {
      setRevealed((value) => Math.min(entries.length, value + 1));
    }, 300 / speed);
    return () => window.clearTimeout(timeout);
  }, [complete, entries.length, playing, revealed, speed]);

  return (
    <section className={styles.shell} style={{ "--sim-accent": accent } as React.CSSProperties}>
      <div className={styles.stadiumGlow} />
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>{eyebrow}</span>
          <h1>{complete ? "Campaign complete" : title}</h1>
          <p>{complete ? "Every result is locked in. Your complete report is ready." : "Scores are being revealed in order—regular season through the last match you played."}</p>
        </div>
        <div className={styles.liveBadge}><i />{complete ? "FINAL" : playing ? "SIMULATING" : "PAUSED"}</div>
      </header>

      <div className={styles.scoreboard}>
        <div className={styles.progressCopy}><span>Progress</span><strong>{revealed}<i>/</i>{entries.length}</strong></div>
        <div className={styles.progressTrack}><i style={{ width: `${entries.length ? (revealed / entries.length) * 100 : 100}%` }} /></div>
        <div className={styles.record}>
          <span className={styles.win}><strong>{record.win}</strong>Wins</span>
          <span className={styles.draw}><strong>{record.draw}</strong>Draws</span>
          <span className={styles.loss}><strong>{record.loss}</strong>Losses</span>
        </div>
      </div>

      <div className={styles.stage}>
        {current ? (
          <article key={current.id} className={`${styles.currentMatch} ${styles[current.outcome]}`} aria-live="polite">
            <div className={styles.matchMeta}><span>{current.stage}</span><strong>{current.label}</strong></div>
            <div className={styles.team}><span>{current.homeName}</span><strong>{current.homeScore}</strong></div>
            <i className={styles.divider}>–</i>
            <div className={`${styles.team} ${styles.away}`}><strong>{current.awayScore}</strong><span>{current.awayName}</span></div>
            <em>{current.outcome === "win" ? "WIN" : current.outcome === "draw" ? "DRAW" : "LOSS"}</em>
          </article>
        ) : (
          <div className={styles.kickoff}><i /><strong>Preparing the opening result</strong><span>The complete schedule has already been calculated.</span></div>
        )}
      </div>

      <div className={styles.timeline} aria-label="Recently revealed results">
        {visible.map((entry, index) => (
          <article key={entry.id} className={styles[entry.outcome]}>
            <span>{revealed - visible.length + index + 1}</span>
            <div><strong>{entry.label}</strong><small>{entry.homeName} {entry.homeScore}–{entry.awayScore} {entry.awayName}</small></div>
            <em>{entry.outcome === "win" ? "W" : entry.outcome === "draw" ? "D" : "L"}</em>
          </article>
        ))}
      </div>

      <div className={styles.controls}>
        <div className={styles.speedControl} aria-label="Simulation speed">
          {SPEEDS.map((option) => <button key={option} type="button" className={speed === option ? styles.activeSpeed : ""} onClick={() => setSpeed(option)}>{option}×</button>)}
        </div>
        {!complete && <button type="button" className={styles.pause} onClick={() => setPlaying((value) => !value)}>{playing ? "Pause reveal" : "Continue reveal"}</button>}
        {!complete && <button type="button" className={styles.skip} onClick={() => { setRevealed(entries.length); setPlaying(false); }}>Reveal all results</button>}
        {complete && <button type="button" className={styles.report} onClick={onComplete}>Open full campaign report <span>→</span></button>}
      </div>
    </section>
  );
}
