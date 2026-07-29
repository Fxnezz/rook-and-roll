"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  FOOTBALL_CLUBS,
  FOOTBALL_FORMATIONS,
  FOOTBALL_PLAYERS,
  FOOTBALL_TACTICS,
  footballPlayerOverall,
  getFootballClub,
  getFootballFormation,
  type FootballFormationId,
  type FootballPlayer,
  type FootballSlot,
  type FootballTactic,
} from "@/lib/football/data";
import {
  getFootballMetrics,
  simulateFootballSeason,
  type FootballCupTie,
  type FootballMatch,
  type FootballMetrics,
  type FootballSeasonResult,
} from "@/lib/football/simulator";
import { playArcadeSound } from "@/lib/arcade/sound";
import styles from "./Football38Game.module.css";

type Phase = "intro" | "draft" | "review" | "result";
type ResultTab = "overview" | "fixtures" | "table" | "cup" | "lineup";

interface LineupPick {
  slotId: string;
  player: FootballPlayer;
  pickNumber: number;
}

interface SavedRun {
  id: string;
  clubId: string;
  wins: number;
  draws: number;
  losses: number;
  position: number;
  cupFinish: string;
}

const STORAGE_KEY = "sams-arcade:football-38-0:runs";

function initials(name: string) {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function shuffled<T>(items: T[]) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

function canFill(player: FootballPlayer, slot: FootballSlot) {
  return player.positions.some((position) => slot.accepts.includes(position));
}

function candidatePool(lineup: LineupPick[], formationId: FootballFormationId) {
  const slots = getFootballFormation(formationId).slots;
  const used = new Set(lineup.map((pick) => pick.player.id));
  const filled = new Set(lineup.map((pick) => pick.slotId));
  const open = slots.filter((slot) => !filled.has(slot.id));
  const available = FOOTBALL_PLAYERS.filter((player) => !used.has(player.id) && open.some((slot) => canFill(player, slot)));
  const candidates: FootballPlayer[] = [];
  for (const target of shuffled(open)) {
    const player = shuffled(available).find((option) => canFill(option, target) && !candidates.some((candidate) => candidate.id === option.id));
    if (player) candidates.push(player);
    if (candidates.length === 3) break;
  }
  for (const player of shuffled(available)) {
    if (candidates.length === 3) break;
    if (!candidates.some((candidate) => candidate.id === player.id)) candidates.push(player);
  }
  return candidates;
}

function ClubMark({ clubId, small = false }: { clubId: string; small?: boolean }) {
  const club = getFootballClub(clubId);
  return <span className={`${styles.clubMark} ${small ? styles.clubMarkSmall : ""}`} style={{ "--club-primary": club.primary, "--club-secondary": club.secondary } as React.CSSProperties}>{club.short}</span>;
}

function PlayerAvatar({ player, large = false }: { player: FootballPlayer; large?: boolean }) {
  const hue = [...player.id].reduce((sum, character) => sum + character.charCodeAt(0), 0) % 360;
  return <span className={`${styles.avatar} ${large ? styles.avatarLarge : ""}`} style={{ "--player-hue": hue } as React.CSSProperties}><span>{initials(player.name)}</span></span>;
}

function RatingBars({ player }: { player: FootballPlayer }) {
  const values = player.positions.includes("GK")
    ? [["KEEP", player.goalkeeping], ["CTRL", player.control], ["PHYS", player.physical], ["MENT", player.mentality]]
    : [["ATK", player.attack], ["CREATE", player.creation], ["CTRL", player.control], ["DEF", player.defending]];
  return <div className={styles.miniRatings}>{values.map(([label, value]) => <div key={label}><span>{label}</span><i><b style={{ width: `${value}%` }} /></i><strong>{value}</strong></div>)}</div>;
}

function PlayerCard({ player, active, onClick }: { player: FootballPlayer; active: boolean; onClick: () => void }) {
  return <button type="button" className={`${styles.playerCard} ${active ? styles.playerCardActive : ""}`} onClick={onClick}>
    <div className={styles.playerHead}><PlayerAvatar player={player} large /><div><span>{player.positions.join(" / ")} · {player.nation}</span><h3>{player.name}</h3><p>{player.clubs} · {player.era}</p></div><strong><small>OVR</small>{footballPlayerOverall(player)}</strong></div>
    <div className={styles.playerTrait}><span>Signature</span>{player.trait}</div><RatingBars player={player} />
    <div className={styles.selectCta}>{active ? "Selected — place on pitch" : "Select player"}<span>→</span></div>
  </button>;
}

function Metrics({ metrics }: { metrics: FootballMetrics }) {
  const values: Array<[string, number]> = [["Attack", metrics.attack], ["Creation", metrics.creation], ["Control", metrics.control], ["Defence", metrics.defence], ["Goalkeeping", metrics.goalkeeping], ["Chemistry", metrics.chemistry]];
  return <div className={styles.metrics}>{values.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong><i><b style={{ width: `${value}%` }} /></i></div>)}</div>;
}

function Intro({ onStart, savedRuns }: { onStart: (clubId: string, formation: FootballFormationId, tactic: FootballTactic) => void; savedRuns: SavedRun[] }) {
  const [clubId, setClubId] = useState("ars");
  const [formationId, setFormationId] = useState<FootballFormationId>("4-3-3");
  const [tactic, setTactic] = useState<FootballTactic>("balanced");
  const club = getFootballClub(clubId);
  const formation = getFootballFormation(formationId);
  return <>
    <section className={styles.hero} style={{ "--club-primary": club.primary, "--club-secondary": club.secondary } as React.CSSProperties}>
      <div><Link className={styles.back} href="/play">← Games Hub</Link><p className={styles.eyebrow}>Sam&apos;s Sports Lab · World Football</p><h1><span>38</span><i>–</i><span>0</span></h1><h2>Build eleven legends. Own every matchweek.</h2><p className={styles.heroText}>Draft an all-time XI into real positions, select a tactical identity, play every one of the league&apos;s 380 fixtures and chase a flawless 38-win campaign plus the cup.</p><div className={styles.heroStats}><div><strong>66</strong><span>legends</span></div><div><strong>38</strong><span>fixtures</span></div><div><strong>20</strong><span>clubs</span></div><div><strong>11</strong><span>positions</span></div></div></div>
      <div className={styles.heroPitch}><span className={styles.pitchHalf} /><span className={styles.pitchCircle} /><span className={styles.pitchBoxTop} /><span className={styles.pitchBoxBottom} /><span className={styles.heroBall}>◆</span><div className={styles.scoreboard}><span>MATCHWEEK 38</span><strong>38–0</strong><small>PERFECTION</small></div></div>
    </section>
    <section className={styles.setup} style={{ "--club-primary": club.primary, "--club-secondary": club.secondary } as React.CSSProperties}>
      <div className={styles.sectionTitle}><span>01</span><div><p>Choose a club</p><h2>Who gets your impossible XI?</h2></div></div>
      <div className={styles.clubGrid}>{FOOTBALL_CLUBS.map((option) => <button key={option.id} type="button" className={option.id === clubId ? styles.clubActive : ""} onClick={() => { setClubId(option.id); playArcadeSound("click"); }}><ClubMark clubId={option.id} small /><span><strong>{option.name}</strong><small>{option.city}</small></span>{option.id === clubId && <i>✓</i>}</button>)}</div>
      <div className={styles.sectionTitle}><span>02</span><div><p>Shape the pitch</p><h2>Pick a formation</h2></div></div>
      <div className={styles.formations}>{FOOTBALL_FORMATIONS.map((option) => <button key={option.id} type="button" className={option.id === formationId ? styles.formationActive : ""} onClick={() => { setFormationId(option.id); playArcadeSound("click"); }}><strong>{option.label}</strong><span>{option.identity}</span><small>{option.detail}</small></button>)}</div>
      <div className={styles.formationPreview}><div>{formation.slots.map((spot) => <i key={spot.id} style={{ left: `${spot.x}%`, top: `${spot.y}%` }}>{spot.short}</i>)}</div><p><strong>{formation.label}</strong><span>{formation.identity}</span></p></div>
      <div className={styles.sectionTitle}><span>03</span><div><p>Write the game plan</p><h2>Choose a tactical identity</h2></div></div>
      <div className={styles.tactics}>{FOOTBALL_TACTICS.map((option) => <button key={option.id} type="button" className={option.id === tactic ? styles.tacticActive : ""} onClick={() => { setTactic(option.id); playArcadeSound("click"); }}><span>{option.icon}</span><strong>{option.label}</strong><small>{option.detail}</small></button>)}</div>
      <button type="button" className={styles.primary} onClick={() => onStart(clubId, formationId, tactic)}>Start the all-time draft <span>Build your XI →</span></button>
    </section>
    <section className={styles.featureStrip}><article><span>Draft pitch</span><h3>Pick, then position</h3><p>Three candidates appear each round. Only slots matching a legend&apos;s genuine roles light up.</p></article><article><span>League engine</span><h3>Every one of 380 matches</h3><p>Home advantage, tactics, squad balance, club strength and seeded variance decide every score.</p></article><article><span>Double chase</span><h3>League plus knockout cup</h3><p>Win the table on points and goal difference, then survive four one-match cup rounds.</p></article></section>
    {savedRuns.length > 0 && <section className={styles.history}><div className={styles.sectionTitle}><span>↺</span><div><p>Local history</p><h2>Recent 38-0 attempts</h2></div></div><div>{savedRuns.map((run) => <article key={run.id}><ClubMark clubId={run.clubId} small /><strong>{run.wins}W {run.draws}D {run.losses}L</strong><span>League #{run.position}</span><small>{run.cupFinish}</small></article>)}</div></section>}
  </>;
}

function Draft({ clubId, formationId, tactic, lineup, rerollsLeft, rerollsTotal, onPlace, onReroll, onUndo }: { clubId: string; formationId: FootballFormationId; tactic: FootballTactic; lineup: LineupPick[]; rerollsLeft: number; rerollsTotal: number; onPlace: (player: FootballPlayer, slotId: string) => void; onReroll: () => void; onUndo: () => void }) {
  const formation = getFootballFormation(formationId);
  const club = getFootballClub(clubId);
  const [candidates, setCandidates] = useState(() => candidatePool(lineup, formationId));
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = candidates.find((player) => player.id === activeId) ?? null;
  const filled = new Map(lineup.map((pick) => [pick.slotId, pick]));
  const metrics = getFootballMetrics(lineup.map((pick) => pick.player), tactic, formationId);
  const eligibleLabels = active ? formation.slots.filter((spot) => !filled.has(spot.id) && canFill(active, spot)).map((spot) => spot.short) : [];
  const reroll = () => { if (!rerollsLeft) return; setCandidates(candidatePool(lineup, formationId)); setActiveId(null); onReroll(); playArcadeSound("swoosh"); };
  const placeActive = (slotId: string) => { if (!active) return; const next = [...lineup, { player: active, slotId, pickNumber: lineup.length + 1 }]; setCandidates(candidatePool(next, formationId)); setActiveId(null); onPlace(active, slotId); };
  const undoDraft = () => { const next = lineup.slice(0, -1); setCandidates(candidatePool(next, formationId)); setActiveId(null); onUndo(); };
  return <section className={styles.draft} style={{ "--club-primary": club.primary, "--club-secondary": club.secondary } as React.CSSProperties}>
    <header className={styles.draftHeader}><div><ClubMark clubId={clubId} /><span><small>Sam&apos;s Sports Lab</small><strong>38-0 Selection Room</strong></span></div><div className={styles.progress}><span>Signed {lineup.length} of 11 · {formation.label}</span><div>{formation.slots.map((spot, index) => <i key={spot.id} className={index < lineup.length ? styles.done : index === lineup.length ? styles.current : ""} />)}</div></div><button type="button" className={styles.secondary} onClick={undoDraft} disabled={!lineup.length}>Undo last</button></header>
    <div className={styles.draftTitle}><span>{String(lineup.length + 1).padStart(2, "0")}</span><div><p>{FOOTBALL_TACTICS.find((option) => option.id === tactic)?.label} · {formation.label}</p><h1>{active ? `Place ${active.name}` : "Choose a legend"}</h1><small>{active ? `Eligible at ${eligibleLabels.join(" or ")}. Valid positions are glowing.` : "Select one of the three candidates, then place them on the pitch."}</small></div></div>
    <div className={styles.pitchWrap}><div className={styles.draftPitch}><span className={styles.pitchHalf} /><span className={styles.pitchCircle} /><span className={styles.pitchBoxTop} /><span className={styles.pitchBoxBottom} />{formation.slots.map((spot) => { const pick = filled.get(spot.id); const eligible = Boolean(active && canFill(active, spot) && !pick); return <button key={spot.id} type="button" className={`${styles.pitchSlot} ${pick ? styles.pitchFilled : ""} ${eligible ? styles.pitchEligible : ""}`} style={{ left: `${spot.x}%`, top: `${spot.y}%` }} disabled={Boolean(pick) || !eligible} onClick={() => placeActive(spot.id)} aria-label={pick ? `${spot.label}: ${pick.player.name}` : eligible ? `Place ${active?.name} at ${spot.label}` : `${spot.label}, empty`}>{pick ? <><PlayerAvatar player={pick.player} /><span><strong>{pick.player.name}</strong><small>{spot.short} · {footballPlayerOverall(pick.player)}</small></span></> : <><strong>{spot.short}</strong><small>{spot.label}</small></>}</button>; })}</div><div className={styles.pitchHint}>{active ? `Choose a glowing ${eligibleLabels.join(" / ")} position` : "Select a candidate to unlock their valid pitch positions"}</div></div>
    <aside className={styles.candidatePanel}><div className={styles.panelHead}><div><span>Transfer shortlist</span><strong>Pick one legend</strong></div><div><b>{rerollsLeft}</b><small>of {rerollsTotal}<br />rerolls</small></div></div><div className={styles.candidates}>{candidates.map((player) => <PlayerCard key={player.id} player={player} active={activeId === player.id} onClick={() => { setActiveId(player.id); playArcadeSound("click"); }} />)}</div><button type="button" className={styles.reroll} onClick={reroll} disabled={!rerollsLeft}><span>↻</span><strong>{rerollsLeft ? "Refresh all three" : "No rerolls left"}</strong><small>{rerollsLeft ? "Scout a new shortlist" : "Finish with this board"}</small></button>{lineup.length > 0 && <div className={styles.liveOverall}><span>Live squad rating</span><strong>{metrics.overall}</strong><small>{11 - lineup.length} position{11 - lineup.length === 1 ? "" : "s"} open</small></div>}</aside>
  </section>;
}

function Review({ clubId, formationId, tactic, lineup, onBack, onSimulate }: { clubId: string; formationId: FootballFormationId; tactic: FootballTactic; lineup: LineupPick[]; onBack: () => void; onSimulate: () => void }) {
  const club = getFootballClub(clubId);
  const formation = getFootballFormation(formationId);
  const metrics = getFootballMetrics(lineup.map((pick) => pick.player), tactic, formationId);
  return <section className={styles.review} style={{ "--club-primary": club.primary, "--club-secondary": club.secondary } as React.CSSProperties}><div className={styles.reviewHero}><ClubMark clubId={clubId} /><div><span>Team sheet locked · {formation.label} · {FOOTBALL_TACTICS.find((option) => option.id === tactic)?.label}</span><h1>{club.name}&apos;s impossible XI</h1><p>The league engine will play every club home and away, calculate the full table, then send your side into a four-round knockout cup.</p></div><div><small>SQUAD OVR</small><strong>{metrics.overall}</strong><span>{metrics.overall >= 94 ? "Generational favourite" : "Title contender"}</span></div></div><Metrics metrics={metrics} /><div className={styles.reviewXI}>{formation.slots.map((spot) => { const pick = lineup.find((entry) => entry.slotId === spot.id)!; return <article key={spot.id}><span>{spot.short}</span><PlayerAvatar player={pick.player} large /><h3>{pick.player.name}</h3><p>{pick.player.trait}</p><strong>{footballPlayerOverall(pick.player)}</strong></article>; })}</div><div className={styles.modelNote}><strong>Seeded match engine</strong><p>The same seed reproduces all 380 league scores and the complete cup bracket. Ratings, formation, tactical risk, home advantage and match variance all contribute.</p></div><div className={styles.actions}><button type="button" className={styles.secondary} onClick={onBack}>Change final signing</button><button type="button" className={styles.primary} onClick={onSimulate}>Play all 38 matchweeks <span>then the cup →</span></button></div></section>;
}

function MatchRow({ match, userClubId }: { match: FootballMatch; userClubId: string }) {
  const home = getFootballClub(match.homeId);
  const away = getFootballClub(match.awayId);
  const userMatch = match.homeId === userClubId || match.awayId === userClubId;
  const userGoals = match.homeId === userClubId ? match.homeGoals : match.awayGoals;
  const opponentGoals = match.homeId === userClubId ? match.awayGoals : match.homeGoals;
  const outcome = userGoals > opponentGoals ? "W" : userGoals < opponentGoals ? "L" : "D";
  const cup = match as FootballCupTie;
  return <div className={`${styles.matchRow} ${userMatch ? styles.userMatch : ""}`}><div><strong>{match.label}</strong><small>{cup.penalties ? "Pens" : cup.extraTime ? "AET" : match.upset ? "Upset" : "Full time"}</small></div><span>{home.name}</span><ClubMark clubId={home.id} small /><b className={match.winnerId === home.id ? styles.winner : ""}>{match.homeGoals}</b><i>–</i><b className={match.winnerId === away.id ? styles.winner : ""}>{match.awayGoals}</b><ClubMark clubId={away.id} small /><span>{away.name}</span>{userMatch && <em className={outcome === "W" ? styles.win : outcome === "L" ? styles.loss : styles.draw}>{outcome}</em>}</div>;
}

function Result({ result, lineup, formationId, onReset, onReplay }: { result: FootballSeasonResult; lineup: LineupPick[]; formationId: FootballFormationId; onReset: () => void; onReplay: () => void }) {
  const [tab, setTab] = useState<ResultTab>("overview");
  const club = getFootballClub(result.clubId);
  const formation = getFootballFormation(formationId);
  const userMatches = result.matches.filter((match) => match.homeId === result.clubId || match.awayId === result.clubId).sort((a, b) => a.round - b.round);
  const leagueChampion = getFootballClub(result.leagueChampionId);
  const cupChampion = getFootballClub(result.cupChampionId);
  const tabs: Array<{ id: ResultTab; label: string }> = [{ id: "overview", label: "Season HQ" }, { id: "fixtures", label: "38 fixtures" }, { id: "table", label: "League table" }, { id: "cup", label: "Cup run" }, { id: "lineup", label: "Starting XI" }];
  return <section className={styles.result} style={{ "--club-primary": club.primary, "--club-secondary": club.secondary } as React.CSSProperties}>
    <header className={`${styles.resultHero} ${result.leaguePosition === 1 ? styles.championHero : ""}`}><ClubMark clubId={club.id} /><div><span>{result.perfect ? "PERFECT LEAGUE SEASON" : result.unbeaten ? "UNBEATEN LEAGUE SEASON" : "FINAL LEAGUE RECORD"}</span><h1>{result.userWins}<i>–</i>{result.userDraws}<i>–</i>{result.userLosses}</h1><p>{club.name} · {result.finish}</p></div><aside><span>{result.leaguePosition === 1 ? "🏆" : result.unbeaten ? "⚡" : "◆"}</span><strong>{result.perfect ? "38–0" : result.leaguePosition === 1 ? "CHAMPIONS" : `#${result.leaguePosition}`}</strong><small>{result.userPoints} points</small></aside></header>
    <nav className={styles.tabs}>{tabs.map((item) => <button key={item.id} type="button" className={tab === item.id ? styles.tabActive : ""} onClick={() => setTab(item.id)}>{item.label}</button>)}</nav>
    {tab === "overview" && <div className={styles.overview}><div className={styles.summary}><article><span>League position</span><strong>#{result.leaguePosition}</strong><small>{result.userPoints} points</small></article><article><span>Goals scored</span><strong>{result.userGoalsFor}</strong><small>{(result.userGoalsFor / 38).toFixed(2)} per match</small></article><article><span>Goal difference</span><strong>{result.userGoalsFor - result.userGoalsAgainst > 0 ? "+" : ""}{result.userGoalsFor - result.userGoalsAgainst}</strong><small>{result.userGoalsAgainst} conceded</small></article><article><span>Top scorer</span><strong>{result.starGoals}</strong><small>{result.starPlayer}</small></article></div><div className={styles.overviewGrid}><article className={styles.formCard}><div className={styles.cardHead}><div><span>League campaign</span><h2>Matchweek-by-matchweek form</h2></div><strong>{result.longestWinStreak} best win streak</strong></div><div className={styles.formGrid}>{userMatches.map((match) => { const userGoals = match.homeId === result.clubId ? match.homeGoals : match.awayGoals; const opponentGoals = match.homeId === result.clubId ? match.awayGoals : match.homeGoals; const outcome = userGoals > opponentGoals ? "Win" : userGoals < opponentGoals ? "Loss" : "Draw"; return <i key={match.id} className={outcome === "Win" ? styles.formWin : outcome === "Loss" ? styles.formLoss : styles.formDraw} title={`Matchweek ${match.round}: ${outcome}`}>{match.round}</i>; })}</div><div className={styles.recentMatches}>{userMatches.slice(-5).reverse().map((match) => <MatchRow key={match.id} match={match} userClubId={result.clubId} />)}</div></article><aside className={styles.dna}><span>Team DNA</span><h2>{result.metrics.overall} overall</h2><Metrics metrics={result.metrics} /><div><span>Replayable seed</span><strong>{result.seed}</strong></div></aside></div><div className={styles.trophyStrip}><article><span>League</span><strong>{leagueChampion.name}</strong><small>{result.leaguePosition === 1 ? "Your club lifted the title" : "Finished champions"}</small></article><article><span>Knockout cup</span><strong>{cupChampion.name}</strong><small>{result.cupFinish}</small></article></div><div className={styles.actions}><button type="button" className={styles.secondary} onClick={onReplay}>Replay same XI</button><button type="button" className={styles.primary} onClick={onReset}>Draft another dynasty <span>Start over →</span></button></div></div>}
    {tab === "fixtures" && <div className={styles.panel}><div className={styles.cardHead}><div><span>Home and away</span><h2>Your complete 38-match campaign</h2></div><strong>{result.userWins}W · {result.userDraws}D · {result.userLosses}L</strong></div><div className={styles.matchList}>{userMatches.map((match) => <MatchRow key={match.id} match={match} userClubId={result.clubId} />)}</div></div>}
    {tab === "table" && <div className={styles.panel}><div className={styles.cardHead}><div><span>After matchweek 38</span><h2>Final league table</h2></div><strong>{leagueChampion.name} champions</strong></div><div className={styles.tableHead}><span>#</span><span>Club</span><span>P</span><span>W</span><span>D</span><span>L</span><span>GF</span><span>GA</span><span>GD</span><span>PTS</span></div>{result.standings.map((row) => { const rowClub = getFootballClub(row.clubId); return <div key={row.clubId} className={`${styles.tableRow} ${row.clubId === result.clubId ? styles.userStanding : ""} ${[4, 6, 17].includes(row.position) ? styles.cutLine : ""}`}><strong>{row.position}</strong><span><ClubMark clubId={rowClub.id} small /><b>{rowClub.name}</b></span><span>{row.played}</span><span>{row.wins}</span><span>{row.draws}</span><span>{row.losses}</span><span>{row.goalsFor}</span><span>{row.goalsAgainst}</span><span>{row.goalDifference > 0 ? "+" : ""}{row.goalDifference}</span><strong>{row.points}</strong></div>; })}<p className={styles.tableNote}>Top four: Champions League · 5–6: Europe · Bottom three: relegation</p></div>}
    {tab === "cup" && <div className={styles.panel}><div className={styles.cardHead}><div><span>One match. No second chances.</span><h2>Domestic knockout cup</h2></div><strong>{cupChampion.name} winners</strong></div>{(["round-of-16", "quarter-finals", "semi-finals", "final"] as FootballCupTie["stage"][]).map((stage) => <section key={stage} className={styles.cupStage}><h3>{stage === "round-of-16" ? "Round of 16" : stage === "quarter-finals" ? "Quarter-finals" : stage === "semi-finals" ? "Semi-finals" : "Cup Final"}</h3><div>{result.cup.filter((tie) => tie.stage === stage).map((tie) => <MatchRow key={tie.id} match={tie} userClubId={result.clubId} />)}</div></section>)}</div>}
    {tab === "lineup" && <div className={styles.panel}><div className={styles.cardHead}><div><span>{formation.label} team sheet</span><h2>Your all-time starting XI</h2></div><strong>{result.metrics.overall} OVR</strong></div><Metrics metrics={result.metrics} /><div className={styles.resultXI}>{formation.slots.map((spot) => { const pick = lineup.find((entry) => entry.slotId === spot.id)!; return <article key={spot.id}><PlayerAvatar player={pick.player} large /><span>{spot.short} · {spot.label}</span><h3>{pick.player.name}</h3><p>{pick.player.nation} · {pick.player.clubs}</p><strong>{footballPlayerOverall(pick.player)}</strong></article>; })}</div></div>}
  </section>;
}

export function Football38Game() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [clubId, setClubId] = useState("ars");
  const [formationId, setFormationId] = useState<FootballFormationId>("4-3-3");
  const [tactic, setTactic] = useState<FootballTactic>("balanced");
  const [lineup, setLineup] = useState<LineupPick[]>([]);
  const [rerollsTotal, setRerollsTotal] = useState(2);
  const [rerollsLeft, setRerollsLeft] = useState(2);
  const [result, setResult] = useState<FootballSeasonResult | null>(null);
  const [savedRuns, setSavedRuns] = useState<SavedRun[]>([]);
  useEffect(() => { const timeout = window.setTimeout(() => { try { setSavedRuns(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]")); } catch { setSavedRuns([]); } }, 0); return () => window.clearTimeout(timeout); }, []);
  const start = (nextClubId: string, nextFormation: FootballFormationId, nextTactic: FootballTactic) => { const rerolls = 1 + Math.floor(Math.random() * 3); setClubId(nextClubId); setFormationId(nextFormation); setTactic(nextTactic); setLineup([]); setResult(null); setRerollsTotal(rerolls); setRerollsLeft(rerolls); setPhase("draft"); playArcadeSound("swoosh"); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const place = (player: FootballPlayer, slotId: string) => { const next = [...lineup, { player, slotId, pickNumber: lineup.length + 1 }]; setLineup(next); playArcadeSound("place"); if (next.length === 11) { setPhase("review"); window.scrollTo({ top: 0, behavior: "smooth" }); } };
  const undo = () => { setLineup((picks) => picks.slice(0, -1)); playArcadeSound("click"); };
  const simulate = () => { const seed = Math.floor(100000 + Math.random() * 900000); const next = simulateFootballSeason(clubId, lineup.map((pick) => pick.player), tactic, formationId, seed); setResult(next); setPhase("result"); playArcadeSound(next.leaguePosition === 1 || next.cupChampionId === clubId ? "win" : "levelUp"); const entry: SavedRun = { id: String(Date.now()), clubId, wins: next.userWins, draws: next.userDraws, losses: next.userLosses, position: next.leaguePosition, cupFinish: next.cupFinish }; const runs = [entry, ...savedRuns].slice(0, 5); setSavedRuns(runs); try { localStorage.setItem(STORAGE_KEY, JSON.stringify(runs)); } catch { /* optional */ } window.scrollTo({ top: 0, behavior: "smooth" }); };
  const reset = () => { setPhase("intro"); setLineup([]); setResult(null); window.scrollTo({ top: 0, behavior: "smooth" }); };
  return <div className={styles.page}>{phase === "intro" && <Intro onStart={start} savedRuns={savedRuns} />}{phase === "draft" && <Draft clubId={clubId} formationId={formationId} tactic={tactic} lineup={lineup} rerollsLeft={rerollsLeft} rerollsTotal={rerollsTotal} onPlace={place} onReroll={() => setRerollsLeft((value) => Math.max(0, value - 1))} onUndo={undo} />}{phase === "review" && <Review clubId={clubId} formationId={formationId} tactic={tactic} lineup={lineup} onBack={() => { setLineup((picks) => picks.slice(0, -1)); setPhase("draft"); }} onSimulate={simulate} />}{phase === "result" && result && <Result result={result} lineup={lineup} formationId={formationId} onReset={reset} onReplay={simulate} />}<footer className={styles.disclaimer}>Unofficial fan-made football simulator. Not affiliated with or endorsed by FIFA, the Premier League, any club or any player. Names are used descriptively; ratings are Sam&apos;s Arcade simulation estimates. No official logos or player likenesses are used.</footer></div>;
}
