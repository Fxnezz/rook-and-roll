"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AFL_CLUBS,
  AFL_PLAYERS,
  AFL_POSITION_SLOTS,
  getAflClub,
  playerEligibleLines,
  playerOverall,
  type AflLine,
  type AflPlayer,
} from "@/lib/afl/data";
import { getTeamMetrics, scoreText, simulateSeason, type SeasonResult, type SimulatedMatch, type TeamMetrics } from "@/lib/afl/simulator";
import { playArcadeSound } from "@/lib/arcade/sound";
import { SportsSimulationReveal, type SimulationRevealEntry } from "@/components/sports/SportsSimulationReveal";
import styles from "./Afl23Game.module.css";

type Phase = "intro" | "draft" | "review" | "simulating" | "result";
type ResultTab = "overview" | "fixture" | "ladder" | "finals" | "squad";

interface SavedRun {
  id: string;
  clubId: string;
  wins: number;
  losses: number;
  draws: number;
  finish: string;
  seed: number;
  date: string;
}

interface LineupPick {
  slotId: string;
  player: AflPlayer;
  pickNumber: number;
}

const STORAGE_KEY = "sams-arcade:afl-23-0:runs";

function initials(name: string) {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2);
}

function metricTone(value: number) {
  if (value >= 95) return "var(--good)";
  if (value >= 90) return "var(--accent)";
  return "var(--info)";
}

function lineLabel(line: AflLine) {
  return line === "forward" ? "Forward" : line === "midfield" ? "Midfielder" : "Defender";
}

function shuffled<T>(items: T[]) {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

function buildCandidatePool(lineup: LineupPick[]) {
  const usedPlayers = new Set(lineup.map((pick) => pick.player.id));
  const filledSlots = new Set(lineup.map((pick) => pick.slotId));
  const openLines = (["forward", "midfield", "defence"] as AflLine[]).filter((line) =>
    AFL_POSITION_SLOTS.some((slot) => slot.line === line && !filledSlots.has(slot.id)),
  );
  const available = AFL_PLAYERS.filter((player) =>
    !usedPlayers.has(player.id) && playerEligibleLines(player).some((line) => openLines.includes(line)),
  );
  const candidates: AflPlayer[] = [];
  for (const line of shuffled(openLines)) {
    const option = shuffled(available).find((player) =>
      !candidates.some((candidate) => candidate.id === player.id) && playerEligibleLines(player).includes(line),
    );
    if (option) candidates.push(option);
  }
  for (const option of shuffled(available)) {
    if (candidates.length >= 3) break;
    if (!candidates.some((candidate) => candidate.id === option.id)) candidates.push(option);
  }
  return candidates.slice(0, 3);
}

function ClubMark({ clubId, compact = false }: { clubId: string; compact?: boolean }) {
  const club = getAflClub(clubId);
  return (
    <span
      className={`${styles.clubMark} ${compact ? styles.clubMarkCompact : ""}`}
      style={{ "--club-primary": club.primary, "--club-secondary": club.secondary } as React.CSSProperties}
      aria-hidden="true"
    >
      {club.short}
    </span>
  );
}

function FootyIcon() {
  return <span className={styles.footy} aria-hidden="true"><span /></span>;
}

function PlayerAvatar({ player, large = false }: { player: AflPlayer; large?: boolean }) {
  const hue = [...player.id].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 360;
  return (
    <span className={`${styles.avatar} ${large ? styles.avatarLarge : ""}`} style={{ "--avatar-hue": hue } as React.CSSProperties} aria-hidden="true">
      <span>{initials(player.name)}</span>
    </span>
  );
}

function RatingBar({ label, value }: { label: string; value: number }) {
  return (
    <div className={styles.ratingRow}>
      <span>{label}</span>
      <span className={styles.ratingTrack}><span style={{ width: `${value}%`, background: metricTone(value) }} /></span>
      <strong>{value}</strong>
    </div>
  );
}

function PlayerCard({ player, onPick, disabled = false, selected = false }: { player: AflPlayer; onPick?: () => void; disabled?: boolean; selected?: boolean }) {
  const content = (
    <>
      <div className={styles.playerTop}>
        <PlayerAvatar player={player} large />
        <div className={styles.playerIdentity}>
          <span className={styles.playerPosition}>{player.position}</span>
          <h3>{player.name}</h3>
          <p>{player.representativeClub} · {player.era}</p>
        </div>
        <span className={styles.overall}><small>OVR</small>{playerOverall(player)}</span>
      </div>
      <div className={styles.trait}><span>Signature</span>{player.trait}</div>
      <div className={styles.ratings}>
        <RatingBar label="ATK" value={player.attack} />
        <RatingBar label="MID" value={player.midfield} />
        <RatingBar label="DEF" value={player.defence} />
        <RatingBar label="ATH" value={player.athleticism} />
        <RatingBar label="LDR" value={player.leadership} />
      </div>
      {onPick && <span className={styles.draftCta}>{disabled ? "Already selected" : "Draft player"}<span aria-hidden="true">→</span></span>}
    </>
  );
  if (!onPick) return <article className={styles.playerCard}>{content}</article>;
  return <button type="button" className={`${styles.playerCard} ${selected ? styles.playerCardSelected : ""}`} onClick={onPick} disabled={disabled}>{content}</button>;
}

function MetricsPanel({ metrics }: { metrics: TeamMetrics }) {
  const entries = [
    ["Attack", metrics.attack], ["Midfield", metrics.midfield], ["Defence", metrics.defence],
    ["Athleticism", metrics.athleticism], ["Leadership", metrics.leadership], ["Chemistry", metrics.chemistry],
  ] as const;
  return (
    <div className={styles.metricsGrid}>
      {entries.map(([label, value]) => (
        <div key={label} className={styles.metric}>
          <span>{label}</span><strong style={{ color: metricTone(value) }}>{value}</strong>
          <span className={styles.metricTrack}><span style={{ width: `${value}%` }} /></span>
        </div>
      ))}
    </div>
  );
}

function MatchRow({ match, userClubId, showRound = true }: { match: SimulatedMatch; userClubId: string; showRound?: boolean }) {
  const home = getAflClub(match.homeId);
  const away = getAflClub(match.awayId);
  const userPlayed = match.homeId === userClubId || match.awayId === userClubId;
  const won = match.winnerId === userClubId;
  const draw = userPlayed && match.winnerId === null;
  const userOutcomeClass = won ? styles.userWin : draw ? styles.userDraw : styles.userLoss;
  return (
    <div className={`${styles.matchRow} ${userPlayed ? `${styles.userMatch} ${userOutcomeClass}` : ""}`}>
      <div className={styles.matchMeta}>
        {showRound && <strong>{match.label}</strong>}
        <span>{match.extraTime ? "After extra time" : match.upset ? "Upset" : "Final"}</span>
      </div>
      <div className={styles.matchTeam}><span>{home.name}</span><ClubMark clubId={home.id} compact /></div>
      <strong className={match.winnerId === home.id ? styles.winnerScore : ""}>{scoreText(match.homeScore)}</strong>
      <span className={styles.versus}>v</span>
      <strong className={match.winnerId === away.id ? styles.winnerScore : ""}>{scoreText(match.awayScore)}</strong>
      <div className={styles.matchTeam}><ClubMark clubId={away.id} compact /><span>{away.name}</span></div>
      {userPlayed && <span className={`${styles.resultPill} ${won ? styles.win : draw ? styles.draw : styles.loss}`}>{won ? "Win" : draw ? "Draw" : "Loss"}</span>}
    </div>
  );
}

function aflRevealEntries(result: SeasonResult): SimulationRevealEntry[] {
  return [...result.homeAway, ...result.finals]
    .filter((match) => match.homeId === result.clubId || match.awayId === result.clubId)
    .map((match) => ({
      id: match.id,
      label: match.label,
      stage: match.round <= 23 ? "Home-and-away season" : match.round === 28 ? "Grand Final" : "Finals series",
      homeName: getAflClub(match.homeId).name,
      awayName: getAflClub(match.awayId).name,
      homeScore: scoreText(match.homeScore),
      awayScore: scoreText(match.awayScore),
      outcome: match.winnerId === result.clubId ? "win" : match.winnerId === null ? "draw" : "loss",
    }));
}

function Intro({ onStart, savedRuns }: { onStart: (clubId: string) => void; savedRuns: SavedRun[] }) {
  const [clubId, setClubId] = useState("fre");
  const club = getAflClub(clubId);
  return (
    <>
      <section className={styles.hero} style={{ "--club-primary": club.primary, "--club-secondary": club.secondary } as React.CSSProperties}>
        <div className={styles.heroGlow} />
        <div className={styles.heroCopy}>
          <Link href="/play" className={styles.backLink}>← Games Hub</Link>
          <span className={styles.eyebrow}><span className={styles.liveDot} /> Sam&apos;s Sports Lab · Australian football</span>
          <h1><span>23</span><i>–</i><span>0</span></h1>
          <p className={styles.heroKicker}>Draft history. Chase perfection.</p>
          <p className={styles.heroBody}>Build a complete 18-player starting side from Australian football greats, place every star on the oval, play a 23-match season, then survive the wildcard and finals system.</p>
          <div className={styles.heroStats}>
            <div><strong>48</strong><span>greats</span></div>
            <div><strong>23</strong><span>rounds</span></div>
            <div><strong>18</strong><span>clubs</span></div>
            <div><strong>1</strong><span>premier</span></div>
          </div>
        </div>
        <div className={styles.stadium} aria-hidden="true">
          <div className={styles.scoreboard}><small>PERFECT SEASON</small><strong>23–0</strong><span>CAN YOU DO IT?</span></div>
          <div className={styles.oval}><span className={styles.centreSquare} /><span className={styles.centreCircle} /><FootyIcon /></div>
          <div className={styles.crowd} />
        </div>
      </section>

      <section className={styles.setupSection}>
        <div className={styles.sectionHeading}>
          <span>01</span><div><p>Choose your colours</p><h2>Which club gets the dream list?</h2></div>
        </div>
        <div className={styles.clubGrid}>
          {AFL_CLUBS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`${styles.clubChoice} ${option.id === clubId ? styles.clubChoiceActive : ""}`}
              style={{ "--club-primary": option.primary, "--club-secondary": option.secondary } as React.CSSProperties}
              onClick={() => { setClubId(option.id); playArcadeSound("click"); }}
            >
              <ClubMark clubId={option.id} />
              <span><strong>{option.name}</strong><small>{option.city}</small></span>
              <i>{option.id === clubId ? "✓" : ""}</i>
            </button>
          ))}
        </div>
        <button type="button" className={styles.primaryAction} onClick={() => onStart(clubId)}>
          Start the all-time draft <span>Build your 18</span>
        </button>
      </section>

      <section className={styles.rulesGrid}>
        <article><span>Draft room</span><h3>Pick, then place on the oval</h3><p>Select a candidate from the side panel, then place them in any open forward, midfield or defensive slot they can play.</p></article>
        <article><span>Match model</span><h3>AFL scores, not coin flips</h3><p>Club strength, home advantage, list balance, chemistry and seeded match variance drive every goal and behind.</p></article>
        <article><span>2026 structure</span><h3>The wildcard is live</h3><p>Seventh plays tenth and eighth plays ninth before the traditional final eight. Finals ties go to extra time.</p></article>
      </section>

      {savedRuns.length > 0 && (
        <section className={styles.history}>
          <div className={styles.sectionHeading}><span>↺</span><div><p>Local history</p><h2>Your recent campaigns</h2></div></div>
          <div className={styles.historyRows}>
            {savedRuns.map((run) => (
              <div key={run.id}><ClubMark clubId={run.clubId} compact /><strong>{run.wins}-{run.losses}{run.draws ? `-${run.draws}` : ""}</strong><span>{run.finish}</span><small>Seed {run.seed}</small></div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function Draft({
  clubId,
  lineup,
  rerollsLeft,
  rerollsTotal,
  onPlace,
  onReroll,
  onUndo,
}: {
  clubId: string;
  lineup: LineupPick[];
  rerollsLeft: number;
  rerollsTotal: number;
  onPlace: (player: AflPlayer, slotId: string) => void;
  onReroll: () => void;
  onUndo: () => void;
}) {
  const [candidates, setCandidates] = useState<AflPlayer[]>(() => buildCandidatePool(lineup));
  const [activePlayerId, setActivePlayerId] = useState<string | null>(null);
  const club = getAflClub(clubId);
  const selected = lineup.map((pick) => pick.player);
  const provisional = getTeamMetrics(selected);
  const activePlayer = candidates.find((player) => player.id === activePlayerId) ?? null;
  const filledSlots = new Map(lineup.map((pick) => [pick.slotId, pick]));

  const reroll = () => {
    if (!rerollsLeft) return;
    setCandidates(buildCandidatePool(lineup));
    setActivePlayerId(null);
    onReroll();
    playArcadeSound("swoosh");
  };

  const placePlayer = (slotId: string) => {
    if (!activePlayer || filledSlots.has(slotId)) return;
    const slot = AFL_POSITION_SLOTS.find((option) => option.id === slotId);
    if (!slot || !playerEligibleLines(activePlayer).includes(slot.line)) return;
    const next = [...lineup, { player: activePlayer, slotId, pickNumber: lineup.length + 1 }];
    setCandidates(buildCandidatePool(next));
    setActivePlayerId(null);
    onPlace(activePlayer, slotId);
  };

  const undoDraft = () => {
    const next = lineup.slice(0, -1);
    setCandidates(buildCandidatePool(next));
    setActivePlayerId(null);
    onUndo();
  };

  return (
    <section className={styles.draftShell} style={{ "--club-primary": club.primary, "--club-secondary": club.secondary } as React.CSSProperties}>
      <header className={styles.draftHeader}>
        <div className={styles.draftBrand}><ClubMark clubId={clubId} /><div><small>Sam&apos;s Sports Lab</small><strong>Build your 18</strong></div></div>
        <div className={styles.draftProgress}><span>Placed {lineup.length} of {AFL_POSITION_SLOTS.length}</span><div>{AFL_POSITION_SLOTS.map((slot, index) => <i key={slot.id} className={index < lineup.length ? styles.complete : index === lineup.length ? styles.current : ""} />)}</div></div>
        <button type="button" className={styles.secondaryAction} disabled={!lineup.length} onClick={undoDraft}>Undo last</button>
      </header>

      <div className={styles.draftTitle}>
        <div><span>{String(lineup.length + 1).padStart(2, "0")}</span><div><p>Selection room · {club.short}</p><h1>{activePlayer ? `Place ${activePlayer.name}` : "Choose a player"}</h1><small>{activePlayer ? `${lineLabel(playerEligibleLines(activePlayer)[0])} selected — every valid slot is glowing.` : "Pick a player on the right, then click any highlighted position on the oval."}</small></div></div>
        <strong>{rerollsLeft} reroll{rerollsLeft === 1 ? "" : "s"} left</strong>
      </div>

      <div className={styles.fieldStage}>
        <div className={styles.positionLegend}>
          <span><i className={styles.forwardKey} /> Forward six</span>
          <span><i className={styles.midfieldKey} /> Midfield six</span>
          <span><i className={styles.defenceKey} /> Back six</span>
        </div>
        <div className={styles.draftOval}>
          <span className={styles.draftGoalTop} aria-hidden="true" />
          <span className={styles.draftGoalBottom} aria-hidden="true" />
          <span className={styles.draftCentreSquare} aria-hidden="true" />
          <span className={styles.draftCentreCircle} aria-hidden="true" />
          <div className={styles.positionGrid}>
            {AFL_POSITION_SLOTS.map((slot) => {
              const pick = filledSlots.get(slot.id);
              const eligible = Boolean(activePlayer && playerEligibleLines(activePlayer).includes(slot.line));
              return (
                <button
                  key={slot.id}
                  type="button"
                  className={`${styles.positionSlot} ${styles[`position${slot.line[0].toUpperCase()}${slot.line.slice(1)}`]} ${pick ? styles.positionFilled : ""} ${eligible && !pick ? styles.positionEligible : ""}`}
                  style={{ gridRow: slot.row, gridColumn: slot.column }}
                  onClick={() => placePlayer(slot.id)}
                  disabled={Boolean(pick) || !eligible}
                  aria-label={pick ? `${slot.label}: ${pick.player.name}` : eligible ? `Place ${activePlayer?.name} at ${slot.label}` : `${slot.label}, empty`}
                >
                  {pick ? <><PlayerAvatar player={pick.player} /><span><strong>{pick.player.name}</strong><small>{slot.short} · {playerOverall(pick.player)}</small></span></> : <><strong>{slot.short}</strong><small>{slot.label}</small></>}
                </button>
              );
            })}
          </div>
        </div>
        <div className={styles.fieldHint}>{activePlayer ? `Choose any glowing ${playerEligibleLines(activePlayer).map(lineLabel).join(" / ")} slot` : "Select a candidate to reveal their valid positions"}</div>
      </div>

      <aside className={styles.candidatePanel}>
        <div className={styles.candidatePanelHeading}>
          <div><span>Candidate board</span><strong>Pick one</strong></div>
          <div className={styles.rerollCounter}><b>{rerollsLeft}</b><small>of {rerollsTotal}<br />rerolls</small></div>
        </div>
        <div className={styles.sideCandidates}>
          {candidates.map((player) => (
            <PlayerCard key={player.id} player={player} onPick={() => { setActivePlayerId(player.id); playArcadeSound("click"); }} selected={activePlayerId === player.id} />
          ))}
        </div>
        <button type="button" className={styles.rerollButton} onClick={reroll} disabled={!rerollsLeft}>
          <span aria-hidden="true">↻</span>
          <strong>{rerollsLeft ? "Reroll all three" : "No rerolls left"}</strong>
          <small>{rerollsLeft ? "Deal a fresh candidate board" : "Make this board count"}</small>
        </button>
        {lineup.length > 0 && <div className={styles.liveRating}><span>Live team rating</span><strong>{provisional.overall}</strong><small>{18 - lineup.length} spots remaining</small></div>}
      </aside>
    </section>
  );
}

function Review({ clubId, lineup, onBack, onSimulate }: { clubId: string; lineup: LineupPick[]; onBack: () => void; onSimulate: () => void }) {
  const club = getAflClub(clubId);
  const selected = lineup.map((pick) => pick.player);
  const metrics = getTeamMetrics(selected);
  const orderedLineup = AFL_POSITION_SLOTS.map((slot) => ({ slot, pick: lineup.find((entry) => entry.slotId === slot.id)! }));
  return (
    <section className={styles.review} style={{ "--club-primary": club.primary, "--club-secondary": club.secondary } as React.CSSProperties}>
      <div className={styles.reviewHero}>
        <ClubMark clubId={clubId} />
        <div><span>Draft complete</span><h1>{club.name}&apos;s dream 18</h1><p>Every line is locked: six forwards, six midfielders and six defenders. Your positional balance now drives the full season model.</p></div>
        <div className={styles.overallBig}><small>LIST RATING</small><strong>{metrics.overall}</strong><span>{metrics.overall >= 94 ? "Premiership favourite" : "Finals contender"}</span></div>
      </div>
      <MetricsPanel metrics={metrics} />
      <div className={styles.reviewGrid}>
        {orderedLineup.map(({ slot, pick }) => (
          <article key={slot.id}><span>{slot.short}</span><PlayerAvatar player={pick.player} /><div><strong>{pick.player.name}</strong><small>{slot.label} · {pick.player.trait}</small></div><b>{playerOverall(pick.player)}</b></article>
        ))}
      </div>
      <div className={styles.modelNote}><strong>How the simulation works</strong><p>Every fixture uses the same shareable seed. Team-line strength, home advantage, list chemistry and controlled variance determine scoring shots and accuracy. Finals are higher pressure and cannot finish level.</p></div>
      <div className={styles.reviewActions}><button type="button" className={styles.secondaryAction} onClick={onBack}>Change final pick</button><button type="button" className={styles.primaryAction} onClick={onSimulate}>Simulate the 23-game season <span>then finals →</span></button></div>
    </section>
  );
}

function Result({ result, lineup, onReset, onReplay }: { result: SeasonResult; lineup: LineupPick[]; onReset: () => void; onReplay: () => void }) {
  const [tab, setTab] = useState<ResultTab>("overview");
  const [copied, setCopied] = useState(false);
  const club = getAflClub(result.clubId);
  const userMatches = result.homeAway.filter((match) => match.homeId === result.clubId || match.awayId === result.clubId);
  const ladderRow = result.ladder.find((row) => row.clubId === result.clubId)!;
  const perfect = result.userWins === 23;
  const userFinals = result.finals.filter((match) => match.homeId === result.clubId || match.awayId === result.clubId);
  const fullJourney = [...userMatches, ...userFinals];
  const tabs: Array<{ id: ResultTab; label: string }> = [
    { id: "overview", label: "Season HQ" }, { id: "fixture", label: "Full journey" }, { id: "ladder", label: "Ladder" }, { id: "finals", label: "Finals" }, { id: "squad", label: "Drafted list" },
  ];
  const copySeed = async () => {
    await navigator.clipboard.writeText(`Sam's Arcade AFL 23-0 seed: ${result.seed} — ${club.name} ${result.userWins}-${result.userLosses}${result.userDraws ? `-${result.userDraws}` : ""}, ${result.finish}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };
  return (
    <section className={styles.resultShell} style={{ "--club-primary": club.primary, "--club-secondary": club.secondary } as React.CSSProperties}>
      <header className={`${styles.resultHero} ${result.premiership ? styles.premierHero : ""}`}>
        <div className={styles.resultNoise} />
        <ClubMark clubId={club.id} />
        <div className={styles.recordBlock}><span>{perfect ? "PERFECT HOME-AND-AWAY SEASON" : "HOME-AND-AWAY RECORD"}</span><h1>{result.userWins}<i>–</i>{result.userLosses}{result.userDraws ? <><i>–</i>{result.userDraws}</> : null}</h1><p>{club.name} · {result.finish}</p></div>
        <div className={styles.resultBadge}>{result.premiership ? <><span>🏆</span><strong>PREMIERS</strong><small>Season conquered</small></> : <><span>{perfect ? "⚡" : "◆"}</span><strong>{perfect ? "23–0" : `#${ladderRow.position}`}</strong><small>{perfect ? "Perfect run" : "Ladder finish"}</small></>}</div>
      </header>
      <nav className={styles.resultTabs} aria-label="Season results">
        {tabs.map((item) => <button key={item.id} type="button" className={tab === item.id ? styles.activeTab : ""} onClick={() => setTab(item.id)}>{item.label}</button>)}
      </nav>

      {tab === "overview" && (
        <div className={styles.overview}>
          <div className={styles.summaryCards}>
            <article><span>Ladder</span><strong>#{ladderRow.position}</strong><small>{ladderRow.premiershipPoints} pts · {ladderRow.percentage.toFixed(1)}%</small></article>
            <article><span>Points for</span><strong>{result.userPointsFor.toLocaleString()}</strong><small>{Math.round(result.userPointsFor / 23)} per match</small></article>
            <article><span>Points against</span><strong>{result.userPointsAgainst.toLocaleString()}</strong><small>{Math.round(result.userPointsAgainst / 23)} per match</small></article>
            <article><span>Best streak</span><strong>{result.streak}</strong><small>straight wins</small></article>
          </div>
          <div className={styles.overviewGrid}>
            <article className={styles.seasonCard}>
              <div className={styles.cardHeading}><div><span>Form line</span><h2>Round by round</h2></div><strong>{result.userWins}/23 wins</strong></div>
              <div className={styles.outcomeLegend} aria-label="Result colours"><span><i className={styles.win} />Win</span><span><i className={styles.draw} />Draw</span><span><i className={styles.loss} />Loss</span></div>
              <div className={styles.formLine}>{fullJourney.map((match, index) => <span key={match.id} className={match.winnerId === result.clubId ? styles.formWin : match.winnerId === null ? styles.formDraw : styles.formLoss} title={`${match.label}: ${match.winnerId === result.clubId ? "Win" : match.winnerId === null ? "Draw" : "Loss"}`}>{index + 1}</span>)}</div>
              <div className={styles.keyMatches}>{userMatches.slice(-5).reverse().map((match) => <MatchRow key={match.id} match={match} userClubId={result.clubId} />)}</div>
            </article>
            <aside className={styles.analysisCard}>
              <span>List DNA</span><h2>{result.metrics.overall} overall</h2><MetricsPanel metrics={result.metrics} />
              <div className={styles.seedBox}><span>Replayable simulation</span><strong>Seed {result.seed}</strong><button type="button" onClick={copySeed}>{copied ? "Copied" : "Copy result"}</button></div>
            </aside>
          </div>
          <div className={styles.resultActions}><button type="button" className={styles.secondaryAction} onClick={onReplay}>Replay same list</button><button type="button" className={styles.primaryAction} onClick={onReset}>Draft a new dynasty <span>Start over →</span></button></div>
        </div>
      )}

      {tab === "fixture" && <div className={styles.tablePanel}><div className={styles.cardHeading}><div><span>Every bounce, every result</span><h2>Your complete campaign journey</h2></div><strong>{fullJourney.length} matches played</strong></div><div className={styles.outcomeLegend} aria-label="Result colours"><span><i className={styles.win} />Win</span><span><i className={styles.draw} />Draw</span><span><i className={styles.loss} />Loss</span></div><section className={styles.journeyStage}><h3>Home-and-away season · Rounds 1–23</h3><div className={styles.matchList}>{userMatches.map((match) => <MatchRow key={match.id} match={match} userClubId={result.clubId} />)}</div></section>{userFinals.length > 0 ? <section className={styles.journeyStage}><h3>Your finals run · {userFinals.length} match{userFinals.length === 1 ? "" : "es"}</h3><div className={styles.matchList}>{userFinals.map((match) => <MatchRow key={match.id} match={match} userClubId={result.clubId} />)}</div></section> : <div className={styles.journeyEmpty}><strong>Season complete</strong><span>Your campaign ended after Round 23, so no finals were added to the journey.</span></div>}</div>}

      {tab === "ladder" && (
        <div className={styles.tablePanel}><div className={styles.cardHeading}><div><span>After round 23</span><h2>League ladder</h2></div><strong>Top 10 alive</strong></div>
          <div className={styles.ladderHead}><span>#</span><span>Club</span><span>P</span><span>W</span><span>L</span><span>D</span><span>PF</span><span>PA</span><span>%</span><span>PTS</span></div>
          {result.ladder.map((row) => { const rowClub = getAflClub(row.clubId); return <div key={row.clubId} className={`${styles.ladderRow} ${row.clubId === result.clubId ? styles.userLadder : ""} ${row.position === 6 || row.position === 10 ? styles.cutLine : ""}`}><strong>{row.position}</strong><span><ClubMark clubId={rowClub.id} compact /><b>{rowClub.name}</b></span><span>{row.played}</span><span>{row.wins}</span><span>{row.losses}</span><span>{row.draws}</span><span>{row.pointsFor}</span><span>{row.pointsAgainst}</span><span>{row.percentage.toFixed(1)}</span><strong>{row.premiershipPoints}</strong></div>; })}
          <p className={styles.ladderNote}>Top six advance directly. Seventh to tenth enter the 2026 wildcard finals round.</p>
        </div>
      )}

      {tab === "finals" && <div className={styles.tablePanel}><div className={styles.cardHeading}><div><span>September</span><h2>2026 finals journey</h2></div><strong>{getAflClub(result.finals.at(-1)!.winnerId!).name} premiers</strong></div><div className={styles.finalsGroups}>{[24, 25, 26, 27, 28].map((round) => <section key={round}><h3>{round === 24 ? "Wildcard round" : round === 25 ? "Finals week one" : round === 26 ? "Semi finals" : round === 27 ? "Preliminary finals" : "Grand Final"}</h3>{result.finals.filter((match) => match.round === round).map((match) => <MatchRow key={match.id} match={match} userClubId={result.clubId} />)}</section>)}</div></div>}

      {tab === "squad" && <div className={styles.tablePanel}><div className={styles.cardHeading}><div><span>All-time starting side</span><h2>Your complete 18</h2></div><strong>{result.metrics.overall} OVR</strong></div><MetricsPanel metrics={result.metrics} /><div className={styles.resultSquad}>{AFL_POSITION_SLOTS.map((slot) => { const pick = lineup.find((entry) => entry.slotId === slot.id)!; return <article key={slot.id}><PlayerAvatar player={pick.player} large /><span>{slot.short} · {slot.label}</span><h3>{pick.player.name}</h3><p>{pick.player.position} · {pick.player.representativeClub}</p><strong>{playerOverall(pick.player)}</strong></article>; })}</div></div>}
    </section>
  );
}

export function Afl23Game() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [clubId, setClubId] = useState("fre");
  const [lineup, setLineup] = useState<LineupPick[]>([]);
  const [rerollsTotal, setRerollsTotal] = useState(2);
  const [rerollsLeft, setRerollsLeft] = useState(2);
  const [result, setResult] = useState<SeasonResult | null>(null);
  const [savedRuns, setSavedRuns] = useState<SavedRun[]>([]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try { setSavedRuns(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]")); } catch { setSavedRuns([]); }
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  const startDraft = (nextClubId: string) => {
    const allowance = 1 + Math.floor(Math.random() * 3);
    setClubId(nextClubId);
    setLineup([]);
    setRerollsTotal(allowance);
    setRerollsLeft(allowance);
    setResult(null);
    setPhase("draft");
    playArcadeSound("swoosh");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const placePlayer = (player: AflPlayer, slotId: string) => {
    const next = [...lineup, { player, slotId, pickNumber: lineup.length + 1 }];
    setLineup(next);
    playArcadeSound("place");
    if (next.length === AFL_POSITION_SLOTS.length) {
      setPhase("review");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };
  const undo = () => { setLineup((picks) => picks.slice(0, -1)); playArcadeSound("click"); };
  const simulate = (forcedSeed?: number) => {
    const seed = forcedSeed ?? Math.floor(100000 + Math.random() * 900000);
    const nextResult = simulateSeason(clubId, lineup.map((pick) => pick.player), seed);
    setResult(nextResult);
    setPhase("simulating");
    playArcadeSound(nextResult.premiership ? "win" : "levelUp");
    const entry: SavedRun = { id: `${Date.now()}`, clubId, wins: nextResult.userWins, losses: nextResult.userLosses, draws: nextResult.userDraws, finish: nextResult.finish, seed, date: new Date().toISOString() };
    const runs = [entry, ...savedRuns].slice(0, 5);
    setSavedRuns(runs);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(runs)); } catch { /* local history is optional */ }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const reset = () => { setPhase("intro"); setLineup([]); setResult(null); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const replay = () => result && simulate();

  return (
    <div className={styles.page}>
      {phase === "intro" && <Intro onStart={startDraft} savedRuns={savedRuns} />}
      {phase === "draft" && <Draft clubId={clubId} lineup={lineup} rerollsLeft={rerollsLeft} rerollsTotal={rerollsTotal} onPlace={placePlayer} onReroll={() => setRerollsLeft((value) => Math.max(0, value - 1))} onUndo={undo} />}
      {phase === "review" && <Review clubId={clubId} lineup={lineup} onBack={() => { setLineup((picks) => picks.slice(0, -1)); setPhase("draft"); }} onSimulate={() => simulate()} />}
      {phase === "simulating" && result && <SportsSimulationReveal accent="#77d68d" entries={aflRevealEntries(result)} eyebrow="AFL 23-0 · Live season simulation" title="Playing every round" onComplete={() => { setPhase("result"); window.scrollTo({ top: 0, behavior: "smooth" }); }} />}
      {phase === "result" && result && <Result result={result} lineup={lineup} onReset={reset} onReplay={replay} />}
      <footer className={styles.disclaimer}>Unofficial fan-made simulator. Not affiliated with or endorsed by the AFL or its clubs. Club names and player career facts are used descriptively; ratings are Sam&apos;s Arcade simulation estimates. No official logos or player likenesses are used.</footer>
    </div>
  );
}
