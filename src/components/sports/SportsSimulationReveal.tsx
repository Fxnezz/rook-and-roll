"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./SportsSimulationReveal.module.css";

export type SimulationOutcome = "win" | "draw" | "loss";
type OutcomeFilter = "all" | SimulationOutcome;

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
  const [filter, setFilter] = useState<OutcomeFilter>("all");
  const complete = revealed >= entries.length;
  const current = entries[Math.max(0, revealed - 1)];
  const revealedEntries = entries.slice(0, revealed);
  const filteredEntries = filter === "all" ? revealedEntries : revealedEntries.filter((entry) => entry.outcome === filter);
  const entryNumbers = useMemo(() => new Map(entries.map((entry, index) => [entry.id, index + 1])), [entries]);
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

      <div className={styles.controls}>
        <div className={styles.speedControl} aria-label="Simulation speed">
          {SPEEDS.map((option) => <button key={option} type="button" className={speed === option ? styles.activeSpeed : ""} onClick={() => setSpeed(option)}>{option}×</button>)}
        </div>
        {!complete && <button type="button" className={styles.pause} onClick={() => setPlaying((value) => !value)}>{playing ? "Pause reveal" : "Continue reveal"}</button>}
        {!complete && <button type="button" className={styles.skip} onClick={() => { setRevealed(entries.length); setPlaying(false); }}>Reveal all results</button>}
        {complete && <button type="button" className={styles.report} onClick={onComplete}>Open full campaign report <span>→</span></button>}
      </div>

      <section className={styles.ledger} aria-labelledby="simulation-ledger-title">
        <div className={styles.ledgerHeader}>
          <div>
            <span>Nothing skipped</span>
            <h2 id="simulation-ledger-title">Complete result ledger</h2>
            <p>{revealed} revealed · {Math.max(0, entries.length - revealed)} remaining</p>
          </div>
          <div className={styles.filters} aria-label="Filter revealed results">
            {(["all", "win", "draw", "loss"] as const).map((option) => {
              const count = option === "all" ? revealed : record[option];
              return <button key={option} type="button" aria-pressed={filter === option} onClick={() => setFilter(option)}><span>{option === "all" ? "All" : option === "win" ? "Wins" : option === "draw" ? "Draws" : "Losses"}</span><strong>{count}</strong></button>;
            })}
          </div>
        </div>

        {filteredEntries.length > 0 ? (
          <div className={styles.resultGrid} aria-label={`${filter === "all" ? "All" : filter} revealed results`}>
            {filteredEntries.map((entry) => {
              const number = entryNumbers.get(entry.id) ?? 0;
              const outcomeLabel = entry.outcome === "win" ? "Win" : entry.outcome === "draw" ? "Draw" : "Loss";
              return (
                <article key={entry.id} className={`${styles.resultRow} ${styles[entry.outcome]}`} aria-label={`${entry.label}: ${outcomeLabel}`}>
                  <span className={styles.resultNumber}>{number}</span>
                  <div className={styles.resultContext}><small>{entry.stage}</small><strong>{entry.label}</strong></div>
                  <div className={styles.resultTeams}><span>{entry.homeName}</span><strong>{entry.homeScore}<i>–</i>{entry.awayScore}</strong><span>{entry.awayName}</span></div>
                  <em>{outcomeLabel}</em>
                </article>
              );
            })}
          </div>
        ) : (
          <div className={styles.emptyLedger}><strong>{revealed ? `No ${filter === "win" ? "wins" : filter === "draw" ? "draws" : "losses"} yet` : "The first result is moments away"}</strong><span>Every score will stay here once it is revealed.</span></div>
        )}
      </section>

    </section>
  );
}
