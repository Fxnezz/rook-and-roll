"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AFL_CLUBS, AFL_PLAYERS, DRAFT_ROUNDS, getAflClub, playerOverall, type AflPlayer } from "@/lib/afl/data";
import { getTeamMetrics, scoreText, simulateSeason, type SeasonResult, type SimulatedMatch, type TeamMetrics } from "@/lib/afl/simulator";
import { playArcadeSound } from "@/lib/arcade/sound";
import styles from "./Afl23Game.module.css";

type Phase = "intro" | "draft" | "review" | "result";
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

const STORAGE_KEY = "sams-arcade:afl-23-0:runs";

function initials(name: string) {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2);
}

function metricTone(value: number) {
  if (value >= 95) return "var(--good)";
  if (value >= 90) return "var(--accent)";
  return "var(--info)";
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

function PlayerCard({ player, onPick, disabled = false }: { player: AflPlayer; onPick?: () => void; disabled?: boolean }) {
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
  return <button type="button" className={styles.playerCard} onClick={onPick} disabled={disabled}>{content}</button>;
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
  return (
    <div className={`${styles.matchRow} ${userPlayed ? styles.userMatch : ""}`}>
      <div className={styles.matchMeta}>
        {showRound && <strong>{match.label}</strong>}
        <span>{match.extraTime ? "After extra time" : match.upset ? "Upset" : "Final"}</span>
      </div>
      <div className={styles.matchTeam}><span>{home.name}</span><ClubMark clubId={home.id} compact /></div>
      <strong className={match.winnerId === home.id ? styles.winnerScore : ""}>{scoreText(match.homeScore)}</strong>
      <span className={styles.versus}>v</span>
      <strong className={match.winnerId === away.id ? styles.winnerScore : ""}>{scoreText(match.awayScore)}</strong>
      <div className={styles.matchTeam}><ClubMark clubId={away.id} compact /><span>{away.name}</span></div>
      {userPlayed && <span className={`${styles.resultPill} ${won ? styles.win : draw ? styles.draw : styles.loss}`}>{won ? "W" : draw ? "D" : "L"}</span>}
    </div>
  );
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
          <p className={styles.heroBody}>Build a 12-star core from Australian football greats, play a complete 23-match season, climb the ladder, then survive the current wildcard and finals system.</p>
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
          Start the all-time draft <span>12 picks</span>
        </button>
      </section>

      <section className={styles.rulesGrid}>
        <article><span>Draft room</span><h3>One specialist per line</h3><p>Every pick fills a distinct tactical job. Ratings cover attack, midfield impact, defence, athleticism and leadership.</p></article>
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

function Draft({ clubId, selected, onPick, onUndo }: { clubId: string; selected: AflPlayer[]; onPick: (player: AflPlayer) => void; onUndo: () => void }) {
  const round = DRAFT_ROUNDS[selected.length];
  const candidates = AFL_PLAYERS.filter((player) => player.role === round.role);
  const club = getAflClub(clubId);
  const provisional = getTeamMetrics(selected);
  return (
    <section className={styles.draftShell} style={{ "--club-primary": club.primary, "--club-secondary": club.secondary } as React.CSSProperties}>
      <header className={styles.draftHeader}>
        <div className={styles.draftBrand}><ClubMark clubId={clubId} /><div><small>Sam&apos;s Sports Lab</small><strong>All-time draft</strong></div></div>
        <div className={styles.draftProgress}><span>Pick {selected.length + 1} of {DRAFT_ROUNDS.length}</span><div>{DRAFT_ROUNDS.map((_, index) => <i key={index} className={index < selected.length ? styles.complete : index === selected.length ? styles.current : ""} />)}</div></div>
        <button type="button" className={styles.secondaryAction} disabled={!selected.length} onClick={onUndo}>Undo last</button>
      </header>
      <div className={styles.draftTitle}>
        <div><span>{String(selected.length + 1).padStart(2, "0")}</span><div><p>On the clock · {club.short}</p><h1>Choose your {round.label}</h1><small>{round.detail}</small></div></div>
        <strong>4 candidates</strong>
      </div>
      <div className={styles.candidateGrid}>
        {candidates.map((player) => <PlayerCard key={player.id} player={player} onPick={() => onPick(player)} disabled={selected.some((pick) => pick.id === player.id)} />)}
      </div>
      <aside className={styles.draftBoard}>
        <div className={styles.draftBoardTitle}><span>Draft board</span><strong>{selected.length}/{DRAFT_ROUNDS.length}</strong></div>
        <div className={styles.pickRail}>
          {DRAFT_ROUNDS.map((slot, index) => {
            const pick = selected[index];
            return <div key={slot.role} className={pick ? styles.filledPick : ""}><span>{index + 1}</span>{pick ? <><PlayerAvatar player={pick} /><p><strong>{pick.name}</strong><small>{slot.label}</small></p><b>{playerOverall(pick)}</b></> : <p><strong>{slot.label}</strong><small>Waiting</small></p>}</div>;
          })}
        </div>
        {selected.length > 0 && <><div className={styles.provisional}><span>Live list rating</span><strong>{provisional.overall}</strong></div><MetricsPanel metrics={provisional} /></>}
      </aside>
    </section>
  );
}

function Review({ clubId, selected, onBack, onSimulate }: { clubId: string; selected: AflPlayer[]; onBack: () => void; onSimulate: () => void }) {
  const club = getAflClub(clubId);
  const metrics = getTeamMetrics(selected);
  return (
    <section className={styles.review} style={{ "--club-primary": club.primary, "--club-secondary": club.secondary } as React.CSSProperties}>
      <div className={styles.reviewHero}>
        <ClubMark clubId={clubId} />
        <div><span>Draft complete</span><h1>{club.name}&apos;s dream core</h1><p>Your stars are locked in. The rest of the 22-player side is filled by league-standard role players, with this core driving the model.</p></div>
        <div className={styles.overallBig}><small>LIST RATING</small><strong>{metrics.overall}</strong><span>{metrics.overall >= 94 ? "Premiership favourite" : "Finals contender"}</span></div>
      </div>
      <MetricsPanel metrics={metrics} />
      <div className={styles.reviewGrid}>
        {selected.map((player, index) => (
          <article key={player.id}><span>{index + 1}</span><PlayerAvatar player={player} /><div><strong>{player.name}</strong><small>{DRAFT_ROUNDS[index].label} · {player.trait}</small></div><b>{playerOverall(player)}</b></article>
        ))}
      </div>
      <div className={styles.modelNote}><strong>How the simulation works</strong><p>Every fixture uses the same shareable seed. Team-line strength, home advantage, list chemistry and controlled variance determine scoring shots and accuracy. Finals are higher pressure and cannot finish level.</p></div>
      <div className={styles.reviewActions}><button type="button" className={styles.secondaryAction} onClick={onBack}>Change final pick</button><button type="button" className={styles.primaryAction} onClick={onSimulate}>Simulate the 23-game season <span>then finals →</span></button></div>
    </section>
  );
}

function Result({ result, selected, onReset, onReplay }: { result: SeasonResult; selected: AflPlayer[]; onReset: () => void; onReplay: () => void }) {
  const [tab, setTab] = useState<ResultTab>("overview");
  const [copied, setCopied] = useState(false);
  const club = getAflClub(result.clubId);
  const userMatches = result.homeAway.filter((match) => match.homeId === result.clubId || match.awayId === result.clubId);
  const ladderRow = result.ladder.find((row) => row.clubId === result.clubId)!;
  const perfect = result.userWins === 23;
  const tabs: Array<{ id: ResultTab; label: string }> = [
    { id: "overview", label: "Season HQ" }, { id: "fixture", label: "23 matches" }, { id: "ladder", label: "Ladder" }, { id: "finals", label: "Finals" }, { id: "squad", label: "Drafted list" },
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
              <div className={styles.formLine}>{userMatches.map((match) => <span key={match.id} className={match.winnerId === result.clubId ? styles.formWin : match.winnerId === null ? styles.formDraw : styles.formLoss} title={`${match.label}: ${match.winnerId === result.clubId ? "Win" : match.winnerId === null ? "Draw" : "Loss"}`}>{match.round}</span>)}</div>
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

      {tab === "fixture" && <div className={styles.tablePanel}><div className={styles.cardHeading}><div><span>Home and away</span><h2>Your complete fixture</h2></div><strong>{result.userWins}-{result.userLosses}{result.userDraws ? `-${result.userDraws}` : ""}</strong></div><div className={styles.matchList}>{userMatches.map((match) => <MatchRow key={match.id} match={match} userClubId={result.clubId} />)}</div></div>}

      {tab === "ladder" && (
        <div className={styles.tablePanel}><div className={styles.cardHeading}><div><span>After round 23</span><h2>League ladder</h2></div><strong>Top 10 alive</strong></div>
          <div className={styles.ladderHead}><span>#</span><span>Club</span><span>P</span><span>W</span><span>L</span><span>D</span><span>PF</span><span>PA</span><span>%</span><span>PTS</span></div>
          {result.ladder.map((row) => { const rowClub = getAflClub(row.clubId); return <div key={row.clubId} className={`${styles.ladderRow} ${row.clubId === result.clubId ? styles.userLadder : ""} ${row.position === 6 || row.position === 10 ? styles.cutLine : ""}`}><strong>{row.position}</strong><span><ClubMark clubId={rowClub.id} compact /><b>{rowClub.name}</b></span><span>{row.played}</span><span>{row.wins}</span><span>{row.losses}</span><span>{row.draws}</span><span>{row.pointsFor}</span><span>{row.pointsAgainst}</span><span>{row.percentage.toFixed(1)}</span><strong>{row.premiershipPoints}</strong></div>; })}
          <p className={styles.ladderNote}>Top six advance directly. Seventh to tenth enter the 2026 wildcard finals round.</p>
        </div>
      )}

      {tab === "finals" && <div className={styles.tablePanel}><div className={styles.cardHeading}><div><span>September</span><h2>2026 finals journey</h2></div><strong>{getAflClub(result.finals.at(-1)!.winnerId!).name} premiers</strong></div><div className={styles.finalsGroups}>{[24, 25, 26, 27, 28].map((round) => <section key={round}><h3>{round === 24 ? "Wildcard round" : round === 25 ? "Finals week one" : round === 26 ? "Semi finals" : round === 27 ? "Preliminary finals" : "Grand Final"}</h3>{result.finals.filter((match) => match.round === round).map((match) => <MatchRow key={match.id} match={match} userClubId={result.clubId} />)}</section>)}</div></div>}

      {tab === "squad" && <div className={styles.tablePanel}><div className={styles.cardHeading}><div><span>All-time core</span><h2>Your 12 draft picks</h2></div><strong>{result.metrics.overall} OVR</strong></div><MetricsPanel metrics={result.metrics} /><div className={styles.resultSquad}>{selected.map((player, index) => <article key={player.id}><PlayerAvatar player={player} large /><span>{DRAFT_ROUNDS[index].label}</span><h3>{player.name}</h3><p>{player.position} · {player.representativeClub}</p><strong>{playerOverall(player)}</strong></article>)}</div></div>}
    </section>
  );
}

export function Afl23Game() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [clubId, setClubId] = useState("fre");
  const [selected, setSelected] = useState<AflPlayer[]>([]);
  const [result, setResult] = useState<SeasonResult | null>(null);
  const [savedRuns, setSavedRuns] = useState<SavedRun[]>([]);

  useEffect(() => {
    try { setSavedRuns(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]")); } catch { setSavedRuns([]); }
  }, []);

  const startDraft = (nextClubId: string) => { setClubId(nextClubId); setSelected([]); setResult(null); setPhase("draft"); playArcadeSound("swoosh"); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const pickPlayer = (player: AflPlayer) => {
    const next = [...selected, player];
    setSelected(next);
    playArcadeSound("place");
    if (next.length === DRAFT_ROUNDS.length) { window.setTimeout(() => { setPhase("review"); window.scrollTo({ top: 0, behavior: "smooth" }); }, 260); }
  };
  const undo = () => { setSelected((players) => players.slice(0, -1)); playArcadeSound("click"); };
  const simulate = (forcedSeed?: number) => {
    const seed = forcedSeed ?? Math.floor(100000 + Math.random() * 900000);
    const nextResult = simulateSeason(clubId, selected, seed);
    setResult(nextResult);
    setPhase("result");
    playArcadeSound(nextResult.premiership ? "win" : "levelUp");
    const entry: SavedRun = { id: `${Date.now()}`, clubId, wins: nextResult.userWins, losses: nextResult.userLosses, draws: nextResult.userDraws, finish: nextResult.finish, seed, date: new Date().toISOString() };
    const runs = [entry, ...savedRuns].slice(0, 5);
    setSavedRuns(runs);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(runs)); } catch { /* local history is optional */ }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const reset = () => { setPhase("intro"); setSelected([]); setResult(null); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const replay = () => result && simulate();

  return (
    <div className={styles.page}>
      {phase === "intro" && <Intro onStart={startDraft} savedRuns={savedRuns} />}
      {phase === "draft" && <Draft clubId={clubId} selected={selected} onPick={pickPlayer} onUndo={undo} />}
      {phase === "review" && <Review clubId={clubId} selected={selected} onBack={() => { setSelected((players) => players.slice(0, -1)); setPhase("draft"); }} onSimulate={() => simulate()} />}
      {phase === "result" && result && <Result result={result} selected={selected} onReset={reset} onReplay={replay} />}
      <footer className={styles.disclaimer}>Unofficial fan-made simulator. Not affiliated with or endorsed by the AFL or its clubs. Club names and player career facts are used descriptively; ratings are Sam&apos;s Arcade simulation estimates. No official logos or player likenesses are used.</footer>
    </div>
  );
}
