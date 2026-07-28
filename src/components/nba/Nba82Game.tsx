"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  NBA_LINEUP_SLOTS,
  NBA_PLAYERS,
  NBA_PLAYSTYLES,
  NBA_TEAMS,
  getNbaTeam,
  nbaPlayerOverall,
  type NbaPlayer,
  type NbaPlaystyle,
  type NbaPosition,
} from "@/lib/nba/data";
import {
  getNbaTeamMetrics,
  simulateNbaSeason,
  type NbaGame,
  type NbaSeasonResult,
  type NbaSeries,
  type NbaTeamMetrics,
} from "@/lib/nba/simulator";
import { playArcadeSound } from "@/lib/arcade/sound";
import styles from "./Nba82Game.module.css";

type Phase = "intro" | "draft" | "review" | "result";
type ResultTab = "overview" | "schedule" | "standings" | "playoffs" | "lineup";

interface LineupPick {
  position: NbaPosition;
  player: NbaPlayer;
  pickNumber: number;
}

interface SavedRun {
  id: string;
  teamId: string;
  wins: number;
  losses: number;
  finish: string;
  seed: number;
}

const STORAGE_KEY = "sams-arcade:nba-82-0:runs";

function initials(name: string) {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2);
}

function shuffled<T>(items: T[]) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(Math.random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

function candidatePool(lineup: LineupPick[]) {
  const used = new Set(lineup.map((pick) => pick.player.id));
  const filled = new Set(lineup.map((pick) => pick.position));
  const open = NBA_LINEUP_SLOTS.map((slot) => slot.id).filter((position) => !filled.has(position));
  const available = NBA_PLAYERS.filter((player) => !used.has(player.id) && player.positions.some((position) => open.includes(position)));
  const candidates: NbaPlayer[] = [];
  for (const position of shuffled(open)) {
    const player = shuffled(available).find((option) => !candidates.some((candidate) => candidate.id === option.id) && option.positions.includes(position));
    if (player) candidates.push(player);
    if (candidates.length === 3) break;
  }
  for (const player of shuffled(available)) {
    if (candidates.length === 3) break;
    if (!candidates.some((candidate) => candidate.id === player.id)) candidates.push(player);
  }
  return candidates;
}

function TeamMark({ teamId, small = false }: { teamId: string; small?: boolean }) {
  const team = getNbaTeam(teamId);
  return <span className={`${styles.teamMark} ${small ? styles.teamMarkSmall : ""}`} style={{ "--team-primary": team.primary, "--team-secondary": team.secondary } as React.CSSProperties}>{team.short}</span>;
}

function PlayerAvatar({ player, large = false }: { player: NbaPlayer; large?: boolean }) {
  const hue = [...player.id].reduce((sum, character) => sum + character.charCodeAt(0), 0) % 360;
  return <span className={`${styles.avatar} ${large ? styles.avatarLarge : ""}`} style={{ "--player-hue": hue } as React.CSSProperties}><span>{initials(player.name)}</span></span>;
}

function PlayerCard({ player, active, onClick }: { player: NbaPlayer; active: boolean; onClick: () => void }) {
  return (
    <button type="button" className={`${styles.playerCard} ${active ? styles.playerCardActive : ""}`} onClick={onClick}>
      <div className={styles.playerHead}>
        <PlayerAvatar player={player} large />
        <div><span>{player.positions.join(" / ")}</span><h3>{player.name}</h3><p>{player.franchise} · {player.era}</p></div>
        <strong><small>OVR</small>{nbaPlayerOverall(player)}</strong>
      </div>
      <div className={styles.playerTrait}><span>Signature</span><b>{player.trait}</b></div>
      <div className={styles.miniRatings}>
        {[['SCOR', player.scoring], ['SHOT', player.shooting], ['PLAY', player.playmaking], ['DEF', player.defence], ['REB', player.rebounding], ['ATH', player.athleticism]].map(([label, value]) => (
          <div key={label as string}><span>{label}</span><i><b style={{ width: `${value}%` }} /></i><strong>{value}</strong></div>
        ))}
      </div>
      <span className={styles.selectCta}>{active ? "Selected — place on court" : "Select player"}<b>→</b></span>
    </button>
  );
}

function Metrics({ metrics }: { metrics: NbaTeamMetrics }) {
  const entries = [
    ["Scoring", metrics.scoring], ["Shooting", metrics.shooting], ["Playmaking", metrics.playmaking],
    ["Defence", metrics.defence], ["Rebounding", metrics.rebounding], ["Chemistry", metrics.chemistry],
  ] as const;
  return <div className={styles.metrics}>{entries.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong><i><b style={{ width: `${value}%` }} /></i></div>)}</div>;
}

function Intro({ onStart, savedRuns }: { onStart: (teamId: string, playstyle: NbaPlaystyle) => void; savedRuns: SavedRun[] }) {
  const [teamId, setTeamId] = useState("lal");
  const [playstyle, setPlaystyle] = useState<NbaPlaystyle>("balanced");
  const team = getNbaTeam(teamId);
  return (
    <>
      <section className={styles.hero} style={{ "--team-primary": team.primary, "--team-secondary": team.secondary } as React.CSSProperties}>
        <div className={styles.heroCopy}>
          <Link href="/play" className={styles.back}>← Games Hub</Link>
          <span className={styles.eyebrow}>Sam&apos;s Sports Lab · Basketball</span>
          <h1><span>82</span><i>–</i><span>0</span></h1>
          <p className={styles.kicker}>Build five legends. Chase the impossible.</p>
          <p className={styles.heroText}>Draft an all-time starting five, place every legend at a position they played, simulate all 82 games, survive the Play-In and four playoff rounds, then lift the championship.</p>
          <div className={styles.heroStats}><div><strong>50</strong><span>legends</span></div><div><strong>82</strong><span>games</span></div><div><strong>30</strong><span>teams</span></div><div><strong>16</strong><span>playoff field</span></div></div>
        </div>
        <div className={styles.heroCourt} aria-hidden="true">
          <div className={styles.scoreboard}><small>REGULAR SEASON</small><strong>82–0</strong><span>PERFECTION OR NOTHING</span></div>
          <span className={styles.heroBall}>◆</span>
          <span className={styles.heroHoop} />
          <span className={styles.heroArc} />
          <span className={styles.heroPaint} />
        </div>
      </section>

      <section className={styles.setup}>
        <div className={styles.sectionTitle}><span>01</span><div><p>Choose a franchise</p><h2>Who gets your all-time five?</h2></div></div>
        <div className={styles.teamGrid}>{NBA_TEAMS.map((option) => <button key={option.id} type="button" className={option.id === teamId ? styles.teamActive : ""} style={{ "--team-primary": option.primary, "--team-secondary": option.secondary } as React.CSSProperties} onClick={() => { setTeamId(option.id); playArcadeSound("click"); }}><TeamMark teamId={option.id} small /><span><strong>{option.city}</strong><small>{option.name}</small></span><i>{option.id === teamId ? "✓" : ""}</i></button>)}</div>
        <div className={styles.sectionTitle}><span>02</span><div><p>Set the identity</p><h2>How will your five play?</h2></div></div>
        <div className={styles.playstyles}>{NBA_PLAYSTYLES.map((option) => <button key={option.id} type="button" className={option.id === playstyle ? styles.playstyleActive : ""} onClick={() => { setPlaystyle(option.id); playArcadeSound("click"); }}><span>{option.id === "balanced" ? "◇" : option.id === "small-ball" ? "⌁" : option.id === "twin-towers" ? "▥" : "⚡"}</span><strong>{option.label}</strong><small>{option.detail}</small></button>)}</div>
        <button type="button" className={styles.primary} onClick={() => onStart(teamId, playstyle)}>Start the all-time draft <span>Build your five →</span></button>
      </section>

      <section className={styles.featureStrip}><article><span>Draft court</span><h3>Pick, then place</h3><p>Choose from three side-panel candidates. Only positions each legend genuinely played become available.</p></article><article><span>Season model</span><h3>All 1,230 games</h3><p>Every franchise plays 82 games. Team strength, your lineup, style, home court and seeded variance shape every score.</p></article><article><span>Postseason</span><h3>Play-In to Finals</h3><p>Both conferences use seeds, Play-In elimination games and best-of-seven series through the championship.</p></article></section>

      {savedRuns.length > 0 && <section className={styles.history}><div className={styles.sectionTitle}><span>↺</span><div><p>Local history</p><h2>Recent 82-0 attempts</h2></div></div><div>{savedRuns.map((run) => <article key={run.id}><TeamMark teamId={run.teamId} small /><strong>{run.wins}–{run.losses}</strong><span>{run.finish}</span><small>Seed {run.seed}</small></article>)}</div></section>}
    </>
  );
}

function Draft({ teamId, playstyle, lineup, rerollsLeft, rerollsTotal, onPlace, onReroll, onUndo }: { teamId: string; playstyle: NbaPlaystyle; lineup: LineupPick[]; rerollsLeft: number; rerollsTotal: number; onPlace: (player: NbaPlayer, position: NbaPosition) => void; onReroll: () => void; onUndo: () => void }) {
  const [candidates, setCandidates] = useState(() => candidatePool(lineup));
  const [activeId, setActiveId] = useState<string | null>(null);
  const team = getNbaTeam(teamId);
  const active = candidates.find((player) => player.id === activeId) ?? null;
  const filled = new Map(lineup.map((pick) => [pick.position, pick]));
  const metrics = getNbaTeamMetrics(lineup.map((pick) => pick.player), playstyle);
  const reroll = () => { if (!rerollsLeft) return; setCandidates(candidatePool(lineup)); setActiveId(null); onReroll(); playArcadeSound("swoosh"); };
  const placeActive = (position: NbaPosition) => {
    if (!active) return;
    const next = [...lineup, { player: active, position, pickNumber: lineup.length + 1 }];
    setCandidates(candidatePool(next));
    setActiveId(null);
    onPlace(active, position);
  };
  const undoDraft = () => {
    const next = lineup.slice(0, -1);
    setCandidates(candidatePool(next));
    setActiveId(null);
    onUndo();
  };
  return (
    <section className={styles.draft} style={{ "--team-primary": team.primary, "--team-secondary": team.secondary } as React.CSSProperties}>
      <header className={styles.draftHeader}><div><TeamMark teamId={teamId} /><span><small>Sam&apos;s Sports Lab</small><strong>82-0 Draft Night</strong></span></div><div className={styles.progress}><span>Placed {lineup.length} of 5</span><div>{NBA_LINEUP_SLOTS.map((slot, index) => <i key={slot.id} className={index < lineup.length ? styles.done : index === lineup.length ? styles.current : ""} />)}</div></div><button type="button" className={styles.secondary} onClick={undoDraft} disabled={!lineup.length}>Undo last</button></header>
      <div className={styles.draftTitle}><span>{String(lineup.length + 1).padStart(2, "0")}</span><div><p>{NBA_PLAYSTYLES.find((style) => style.id === playstyle)?.label} system</p><h1>{active ? `Place ${active.name}` : "Choose a legend"}</h1><small>{active ? `Eligible at ${active.positions.join(" or ")}. Valid spots are glowing.` : "Select one of the three candidates, then choose their position on the court."}</small></div></div>
      <div className={styles.courtWrap}>
        <div className={styles.draftCourt}>
          <span className={styles.courtHoop} /><span className={styles.courtPaint} /><span className={styles.courtArc} /><span className={styles.halfLine} /><span className={styles.centreCircle} />
          {NBA_LINEUP_SLOTS.map((slot) => { const pick = filled.get(slot.id); const eligible = Boolean(active?.positions.includes(slot.id)); return <button key={slot.id} type="button" className={`${styles.courtSlot} ${pick ? styles.courtFilled : ""} ${eligible && !pick ? styles.courtEligible : ""}`} style={{ left: `${slot.x}%`, top: `${slot.y}%` }} disabled={Boolean(pick) || !eligible} onClick={() => placeActive(slot.id)} aria-label={pick ? `${slot.label}: ${pick.player.name}` : eligible ? `Place ${active?.name} at ${slot.label}` : `${slot.label}, empty`}>{pick ? <><PlayerAvatar player={pick.player} /><span><strong>{pick.player.name}</strong><small>{slot.id} · {nbaPlayerOverall(pick.player)}</small></span></> : <><strong>{slot.id}</strong><small>{slot.label}</small></>}</button>; })}
        </div>
        <div className={styles.courtHint}>{active ? `Choose a glowing ${active.positions.join(" / ")} position` : "Select a candidate to unlock their valid court positions"}</div>
      </div>
      <aside className={styles.candidatePanel}>
        <div className={styles.panelHead}><div><span>Candidate board</span><strong>Pick one legend</strong></div><div><b>{rerollsLeft}</b><small>of {rerollsTotal}<br />rerolls</small></div></div>
        <div className={styles.candidates}>{candidates.map((player) => <PlayerCard key={player.id} player={player} active={activeId === player.id} onClick={() => { setActiveId(player.id); playArcadeSound("click"); }} />)}</div>
        <button type="button" className={styles.reroll} onClick={reroll} disabled={!rerollsLeft}><span>↻</span><strong>{rerollsLeft ? "Reroll all three" : "No rerolls left"}</strong><small>{rerollsLeft ? "Deal a fresh candidate board" : "Finish with this board"}</small></button>
        {lineup.length > 0 && <div className={styles.liveOverall}><span>Live team rating</span><strong>{metrics.overall}</strong><small>{5 - lineup.length} position{5 - lineup.length === 1 ? "" : "s"} open</small></div>}
      </aside>
    </section>
  );
}

function Review({ teamId, playstyle, lineup, onBack, onSimulate }: { teamId: string; playstyle: NbaPlaystyle; lineup: LineupPick[]; onBack: () => void; onSimulate: () => void }) {
  const team = getNbaTeam(teamId);
  const metrics = getNbaTeamMetrics(lineup.map((pick) => pick.player), playstyle);
  return <section className={styles.review} style={{ "--team-primary": team.primary, "--team-secondary": team.secondary } as React.CSSProperties}><div className={styles.reviewHero}><TeamMark teamId={teamId} /><div><span>Draft complete · {NBA_PLAYSTYLES.find((style) => style.id === playstyle)?.label}</span><h1>{team.city}&apos;s impossible five</h1><p>Your rotation is locked. The simulation will play the complete league schedule, seed both conferences, run the Play-In and decide every best-of-seven series.</p></div><div><small>TEAM OVR</small><strong>{metrics.overall}</strong><span>{metrics.overall >= 95 ? "Title favourite" : "Playoff threat"}</span></div></div><Metrics metrics={metrics} /><div className={styles.reviewFive}>{NBA_LINEUP_SLOTS.map((slot) => { const pick = lineup.find((entry) => entry.position === slot.id)!; return <article key={slot.id}><span>{slot.id}</span><PlayerAvatar player={pick.player} large /><h3>{pick.player.name}</h3><p>{pick.player.trait}</p><strong>{nbaPlayerOverall(pick.player)}</strong></article>; })}</div><div className={styles.modelNote}><strong>Seeded, replayable simulation</strong><p>The same seed always returns the same scores and bracket. Ratings, lineup balance, playstyle, home court and controlled game-to-game variance all contribute.</p></div><div className={styles.actions}><button type="button" className={styles.secondary} onClick={onBack}>Change final pick</button><button type="button" className={styles.primary} onClick={onSimulate}>Simulate all 82 games <span>then the playoffs →</span></button></div></section>;
}

function GameRow({ game, userTeamId }: { game: NbaGame; userTeamId: string }) {
  const home = getNbaTeam(game.homeId); const away = getNbaTeam(game.awayId); const userGame = game.homeId === userTeamId || game.awayId === userTeamId;
  return <div className={`${styles.gameRow} ${userGame ? styles.userGame : ""}`}><div><strong>{game.label}</strong><small>{game.overtime ? `${game.overtime}OT` : game.upset ? "Upset" : "Final"}</small></div><span>{away.city} {away.name}</span><TeamMark teamId={away.id} small /><b className={game.winnerId === away.id ? styles.winner : ""}>{game.awayScore}</b><i>–</i><b className={game.winnerId === home.id ? styles.winner : ""}>{game.homeScore}</b><TeamMark teamId={home.id} small /><span>{home.city} {home.name}</span>{userGame && <em className={game.winnerId === userTeamId ? styles.win : styles.loss}>{game.winnerId === userTeamId ? "W" : "L"}</em>}</div>;
}

function SeriesCard({ series, userTeamId }: { series: NbaSeries; userTeamId: string }) {
  const high = getNbaTeam(series.highSeedId); const low = getNbaTeam(series.lowSeedId); const userSeries = series.highSeedId === userTeamId || series.lowSeedId === userTeamId;
  return <article className={userSeries ? styles.userSeries : ""}><div><span>{series.label}</span><small>Best of seven · {series.games.length} games</small></div><div><TeamMark teamId={high.id} small /><strong>{high.city} {high.name}</strong><b className={series.winnerId === high.id ? styles.winner : ""}>{series.highWins}</b></div><div><TeamMark teamId={low.id} small /><strong>{low.city} {low.name}</strong><b className={series.winnerId === low.id ? styles.winner : ""}>{series.lowWins}</b></div></article>;
}

function Result({ result, lineup, onReset, onReplay }: { result: NbaSeasonResult; lineup: LineupPick[]; onReset: () => void; onReplay: () => void }) {
  const [tab, setTab] = useState<ResultTab>("overview");
  const [conference, setConference] = useState<"East" | "West">(getNbaTeam(result.teamId).conference);
  const team = getNbaTeam(result.teamId); const userGames = result.regularSeason.filter((game) => game.homeId === result.teamId || game.awayId === result.teamId); const perfect = result.userWins === 82;
  const tabs: Array<{ id: ResultTab; label: string }> = [{ id: "overview", label: "Season HQ" }, { id: "schedule", label: "82 games" }, { id: "standings", label: "Standings" }, { id: "playoffs", label: "Playoffs" }, { id: "lineup", label: "Starting five" }];
  return <section className={styles.result} style={{ "--team-primary": team.primary, "--team-secondary": team.secondary } as React.CSSProperties}>
    <header className={`${styles.resultHero} ${result.championship ? styles.championHero : ""}`}><TeamMark teamId={team.id} /><div><span>{perfect ? "PERFECT REGULAR SEASON" : "REGULAR-SEASON RECORD"}</span><h1>{result.userWins}<i>–</i>{result.userLosses}</h1><p>{team.city} {team.name} · {result.finish}</p></div><aside><span>{result.championship ? "🏆" : perfect ? "⚡" : "◆"}</span><strong>{result.championship ? "CHAMPIONS" : perfect ? "82–0" : `#${result.conferenceSeed}`}</strong><small>{result.championship ? "The run is complete" : `${team.conference} seed`}</small></aside></header>
    <nav className={styles.tabs}>{tabs.map((item) => <button key={item.id} type="button" className={tab === item.id ? styles.tabActive : ""} onClick={() => setTab(item.id)}>{item.label}</button>)}</nav>
    {tab === "overview" && <div className={styles.overview}><div className={styles.summary}><article><span>{team.conference} seed</span><strong>#{result.conferenceSeed}</strong><small>{result.userWins / 82 >= .5 ? `${(result.userWins / 82 * 100).toFixed(1)} win %` : "Rebuild season"}</small></article><article><span>Points per game</span><strong>{(result.pointsFor / 82).toFixed(1)}</strong><small>{result.pointsFor.toLocaleString()} total</small></article><article><span>Allowed per game</span><strong>{(result.pointsAgainst / 82).toFixed(1)}</strong><small>{result.pointsAgainst.toLocaleString()} total</small></article><article><span>Best streak</span><strong>{result.streak}</strong><small>straight wins</small></article></div><div className={styles.overviewGrid}><article className={styles.formCard}><div className={styles.cardHead}><div><span>Regular season</span><h2>Game-by-game form</h2></div><strong>{result.userWins}/82 wins</strong></div><div className={styles.formGrid}>{userGames.map((game, index) => <i key={game.id} className={game.winnerId === result.teamId ? styles.formWin : styles.formLoss} title={`Game ${index + 1}: ${game.winnerId === result.teamId ? "Win" : "Loss"}`}>{index + 1}</i>)}</div><div className={styles.recentGames}>{userGames.slice(-5).reverse().map((game) => <GameRow key={game.id} game={game} userTeamId={result.teamId} />)}</div></article><aside className={styles.dna}><span>Team DNA</span><h2>{result.metrics.overall} overall</h2><Metrics metrics={result.metrics} /><div><span>Replayable seed</span><strong>{result.seed}</strong></div></aside></div><div className={styles.actions}><button type="button" className={styles.secondary} onClick={onReplay}>Replay same five</button><button type="button" className={styles.primary} onClick={onReset}>Draft another dynasty <span>Start over →</span></button></div></div>}
    {tab === "schedule" && <div className={styles.panel}><div className={styles.cardHead}><div><span>Regular season</span><h2>Your complete 82-game schedule</h2></div><strong>{result.userWins}–{result.userLosses}</strong></div><div className={styles.gameList}>{userGames.map((game) => <GameRow key={game.id} game={game} userTeamId={result.teamId} />)}</div></div>}
    {tab === "standings" && <div className={styles.panel}><div className={styles.cardHead}><div><span>After 82 games</span><h2>{conference} Conference standings</h2></div><div className={styles.conferenceToggle}><button type="button" className={conference === "East" ? styles.toggleActive : ""} onClick={() => setConference("East")}>East</button><button type="button" className={conference === "West" ? styles.toggleActive : ""} onClick={() => setConference("West")}>West</button></div></div><div className={styles.standingHead}><span>#</span><span>Team</span><span>W</span><span>L</span><span>PCT</span><span>PF</span><span>PA</span><span>DIFF</span></div>{result.standings.filter((row) => row.conference === conference).sort((a,b) => a.seed-b.seed).map((row) => { const rowTeam = getNbaTeam(row.teamId); return <div key={row.teamId} className={`${styles.standingRow} ${row.teamId === result.teamId ? styles.userStanding : ""} ${row.seed === 6 || row.seed === 10 ? styles.cutLine : ""}`}><strong>{row.seed}</strong><span><TeamMark teamId={row.teamId} small /><b>{rowTeam.city} {rowTeam.name}</b></span><span>{row.wins}</span><span>{row.losses}</span><span>{row.winPercentage.toFixed(3).replace(/^0/, "")}</span><span>{row.pointsFor}</span><span>{row.pointsAgainst}</span><strong>{row.differential > 0 ? "+" : ""}{row.differential}</strong></div>; })}<p className={styles.standingNote}>Seeds 1–6 qualify directly. Seeds 7–10 enter the Play-In Tournament.</p></div>}
    {tab === "playoffs" && <div className={styles.panel}><div className={styles.cardHead}><div><span>Road to the title</span><h2>Play-In and playoff bracket</h2></div><strong>{getNbaTeam(result.championId).city} champions</strong></div><section className={styles.playIn}><h3>Play-In Tournament</h3>{result.playIn.map((game) => <GameRow key={game.id} game={game} userTeamId={result.teamId} />)}</section>{["first-round","semifinals","conference-finals","finals"].map((stage) => <section key={stage} className={styles.seriesGroup}><h3>{stage === "first-round" ? "First Round" : stage === "semifinals" ? "Conference Semifinals" : stage === "conference-finals" ? "Conference Finals" : "NBA Finals"}</h3><div>{result.series.filter((item) => item.stage === stage).map((item) => <SeriesCard key={item.id} series={item} userTeamId={result.teamId} />)}</div></section>)}</div>}
    {tab === "lineup" && <div className={styles.panel}><div className={styles.cardHead}><div><span>All-time unit</span><h2>Your starting five</h2></div><strong>{result.metrics.overall} OVR</strong></div><Metrics metrics={result.metrics} /><div className={styles.resultFive}>{NBA_LINEUP_SLOTS.map((slot) => { const pick = lineup.find((entry) => entry.position === slot.id)!; return <article key={slot.id}><PlayerAvatar player={pick.player} large /><span>{slot.id} · {slot.label}</span><h3>{pick.player.name}</h3><p>{pick.player.franchise}</p><strong>{nbaPlayerOverall(pick.player)}</strong></article>; })}</div></div>}
  </section>;
}

export function Nba82Game() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [teamId, setTeamId] = useState("lal");
  const [playstyle, setPlaystyle] = useState<NbaPlaystyle>("balanced");
  const [lineup, setLineup] = useState<LineupPick[]>([]);
  const [rerollsTotal, setRerollsTotal] = useState(2);
  const [rerollsLeft, setRerollsLeft] = useState(2);
  const [result, setResult] = useState<NbaSeasonResult | null>(null);
  const [savedRuns, setSavedRuns] = useState<SavedRun[]>([]);
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try { setSavedRuns(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]")); } catch { setSavedRuns([]); }
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);
  const start = (nextTeamId: string, nextPlaystyle: NbaPlaystyle) => { const rerolls = 1 + Math.floor(Math.random() * 3); setTeamId(nextTeamId); setPlaystyle(nextPlaystyle); setLineup([]); setResult(null); setRerollsTotal(rerolls); setRerollsLeft(rerolls); setPhase("draft"); playArcadeSound("swoosh"); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const place = (player: NbaPlayer, position: NbaPosition) => { const next = [...lineup, { player, position, pickNumber: lineup.length + 1 }]; setLineup(next); playArcadeSound("place"); if (next.length === 5) { setPhase("review"); window.scrollTo({ top: 0, behavior: "smooth" }); } };
  const undo = () => { setLineup((picks) => picks.slice(0, -1)); playArcadeSound("click"); };
  const simulate = () => { const seed = Math.floor(100000 + Math.random() * 900000); const next = simulateNbaSeason(teamId, lineup.map((pick) => pick.player), playstyle, seed); setResult(next); setPhase("result"); playArcadeSound(next.championship ? "win" : "levelUp"); const entry: SavedRun = { id: String(Date.now()), teamId, wins: next.userWins, losses: next.userLosses, finish: next.finish, seed }; const runs = [entry, ...savedRuns].slice(0, 5); setSavedRuns(runs); try { localStorage.setItem(STORAGE_KEY, JSON.stringify(runs)); } catch { /* optional */ } window.scrollTo({ top: 0, behavior: "smooth" }); };
  const reset = () => { setPhase("intro"); setLineup([]); setResult(null); window.scrollTo({ top: 0, behavior: "smooth" }); };
  return <div className={styles.page}>{phase === "intro" && <Intro onStart={start} savedRuns={savedRuns} />}{phase === "draft" && <Draft teamId={teamId} playstyle={playstyle} lineup={lineup} rerollsLeft={rerollsLeft} rerollsTotal={rerollsTotal} onPlace={place} onReroll={() => setRerollsLeft((value) => Math.max(0, value - 1))} onUndo={undo} />}{phase === "review" && <Review teamId={teamId} playstyle={playstyle} lineup={lineup} onBack={() => { setLineup((picks) => picks.slice(0, -1)); setPhase("draft"); }} onSimulate={simulate} />}{phase === "result" && result && <Result result={result} lineup={lineup} onReset={reset} onReplay={simulate} />}<footer className={styles.disclaimer}>Unofficial fan-made basketball simulator. Not affiliated with or endorsed by the NBA or its teams. Team and player names are used descriptively; ratings are Sam&apos;s Arcade simulation estimates. No official logos or player likenesses are used.</footer></div>;
}
