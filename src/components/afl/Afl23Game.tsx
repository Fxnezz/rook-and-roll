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
type AflDifficulty = "easy" | "normal" | "hard";
type AflDraftMode = "squad" | "position";
type AflEraFilter = "all" | "1990s" | "2000s" | "2010s" | "2020s";
type AflDrawEra = "1930s" | "1940s" | "1950s" | "1960s" | "1970s" | "1980s" | "1990s" | "2000s" | "2010s" | "2020s";

interface DraftConfig {
  difficulty: AflDifficulty;
  draftMode: AflDraftMode;
  era: AflEraFilter;
  showRatings: boolean;
}

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

interface AflDraftDraw {
  club: string;
  era: AflDrawEra;
  number: number;
}

interface AflLeaderboardEntry {
  id: string;
  name: string;
  clubId: string;
  wins: number;
  losses: number;
  draws: number;
  finish: string;
  score: number;
  submittedAt: string;
}

const STORAGE_KEY = "sams-arcade:afl-23-0:runs";
const LEADERBOARD_STORAGE_KEY = "sams-arcade:afl-23-0:leaderboard";
const DEFAULT_DRAFT_CONFIG: DraftConfig = {
  difficulty: "normal",
  draftMode: "squad",
  era: "all",
  showRatings: true,
};
const ERA_OPTIONS: Array<{ id: AflEraFilter; label: string }> = [
  { id: "all", label: "All-time" },
  { id: "1990s", label: "1990s" },
  { id: "2000s", label: "2000s" },
  { id: "2010s", label: "2010s" },
  { id: "2020s", label: "2020s" },
];
const AFL_SKILL_ORDER = [...AFL_PLAYERS].sort((left, right) =>
  playerOverall(right) - playerOverall(left) || right.leadership - left.leadership || left.name.localeCompare(right.name),
);
const AFL_SKILL_RANK = new Map(AFL_SKILL_ORDER.map((player, index) => [player.id, index + 1]));
const AFL_DRAW_ERAS: AflDrawEra[] = ["1930s", "1940s", "1950s", "1960s", "1970s", "1980s", "1990s", "2000s", "2010s", "2020s"];
const AFL_DRAW_CLUBS = [...new Set(AFL_PLAYERS.flatMap((player) => player.representativeClub.split(" / ")))];

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

function skillTier(player: AflPlayer) {
  const overall = playerOverall(player);
  if (overall >= 95) return "Immortal";
  if (overall >= 93) return "Legend";
  if (overall >= 90) return "Elite";
  return "Champion";
}

function definingImpact(player: AflPlayer) {
  const attributes = [
    ["attack", player.attack],
    ["midfield", player.midfield],
    ["defence", player.defence],
    ["athleticism", player.athleticism],
    ["leadership", player.leadership],
  ] as const;
  const best = [...attributes].sort((left, right) => right[1] - left[1])[0][0];
  if (best === "attack") return "Turns half-chances into scoreboard damage.";
  if (best === "midfield") return "Wins territory and creates first use around the contest.";
  if (best === "defence") return "Erases danger and launches the next possession.";
  if (best === "athleticism") return "Breaks the shape of a game with repeat power.";
  return "Raises the composure and standards of every line.";
}

function matchesEra(player: AflPlayer, era: AflEraFilter | AflDrawEra) {
  if (era === "all") return true;
  const targetStart = Number.parseInt(era, 10);
  const years = player.era.match(/\d{4}/g)?.map(Number) ?? [];
  const careerStart = years[0] ?? 1900;
  const careerEnd = player.era.includes("present") ? 2029 : years.at(-1) ?? careerStart;
  return careerStart <= targetStart + 9 && careerEnd >= targetStart;
}

function playerClubs(player: AflPlayer) {
  return player.representativeClub.split(" / ");
}

function playerDraftLine(player: AflPlayer): AflLine {
  const eligibleLines = playerEligibleLines(player);
  if (eligibleLines.length === 1) return eligibleLines[0];
  const ratings: Record<AflLine, number> = {
    forward: player.attack,
    midfield: player.midfield,
    defence: player.defence,
  };
  return [...eligibleLines].sort((left, right) => ratings[right] - ratings[left])[0];
}

function availableDrawPlayers(lineup: LineupPick[], draw: AflDraftDraw | null) {
  if (!draw) return [];
  const usedPlayers = new Set(lineup.map((pick) => pick.player.id));
  const filledSlots = new Set(lineup.map((pick) => pick.slotId));
  const openLines = (["forward", "midfield", "defence"] as AflLine[]).filter((line) =>
    AFL_POSITION_SLOTS.some((slot) => slot.line === line && !filledSlots.has(slot.id)),
  );
  return AFL_PLAYERS.filter((player) =>
    !usedPlayers.has(player.id)
      && playerClubs(player).includes(draw.club)
      && matchesEra(player, draw.era)
      && openLines.includes(playerDraftLine(player)),
  )
    .sort((left, right) => playerOverall(right) - playerOverall(left) || right.leadership - left.leadership);
}

function rollClubAndEra(lineup: LineupPick[], config: DraftConfig, number: number): AflDraftDraw | null {
  const optionsFor = (eras: AflDrawEra[]) => AFL_DRAW_CLUBS.flatMap((club) => eras.map((era) => ({ club, era, number })))
    .map((draw) => ({ draw, players: availableDrawPlayers(lineup, draw) }))
    .filter((option) => option.players.length > 0);
  const preferred = config.era === "all" ? optionsFor(AFL_DRAW_ERAS) : optionsFor([config.era as AflDrawEra]);
  const possible = preferred.length ? preferred : optionsFor(AFL_DRAW_ERAS);
  if (!possible.length) return null;
  const richDraws = possible.filter((option) => option.players.length >= 2);
  const pool = richDraws.length ? richDraws : possible;
  return pool[Math.floor(Math.random() * pool.length)].draw;
}

function leaderboardScore(result: SeasonResult) {
  const ladderPosition = result.ladder.find((row) => row.clubId === result.clubId)?.position ?? 18;
  const finalsWins = result.finals.filter((match) => match.winnerId === result.clubId).length;
  return result.userWins * 100 + result.userDraws * 35 + finalsWins * 180 + (19 - ladderPosition) * 25 + result.metrics.overall + (result.premiership ? 2500 : 0);
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

function PlayerCard({
  player,
  boardRank,
  onPick,
  disabled = false,
  selected = false,
  showRatings = true,
}: {
  player: AflPlayer;
  boardRank?: number;
  onPick?: () => void;
  disabled?: boolean;
  selected?: boolean;
  showRatings?: boolean;
}) {
  const globalRank = AFL_SKILL_RANK.get(player.id) ?? AFL_PLAYERS.length;
  const content = (
    <>
      <div className={styles.scoutLine}>
        <span>{boardRank ? `Board #${boardRank}` : "Scouting file"}</span>
        <strong>{showRatings ? `All-time rank #${globalRank}` : "Ratings hidden"}</strong>
      </div>
      <div className={styles.playerTop}>
        <PlayerAvatar player={player} large />
        <div className={styles.playerIdentity}>
          <span className={styles.playerPosition}>{player.position}</span>
          <h3>{player.name}</h3>
          <p>{player.representativeClub} · {player.era}</p>
        </div>
        <span className={`${styles.overall} ${!showRatings ? styles.overallHidden : ""}`}>
          <small>{showRatings ? "OVR" : "TIER"}</small>{showRatings ? playerOverall(player) : skillTier(player).slice(0, 1)}
        </span>
      </div>
      <div className={styles.definingTrait}>
        <span aria-hidden="true">✦</span>
        <div><small>Defining characteristic</small><strong>{player.trait}</strong><p>{definingImpact(player)}</p></div>
      </div>
      {showRatings ? (
        <div className={styles.ratings}>
          <RatingBar label="ATK" value={player.attack} />
          <RatingBar label="MID" value={player.midfield} />
          <RatingBar label="DEF" value={player.defence} />
          <RatingBar label="ATH" value={player.athleticism} />
          <RatingBar label="LDR" value={player.leadership} />
        </div>
      ) : <div className={styles.blindScout}>Trust the career, role and defining characteristic — the numbers stay in the coaches&apos; box.</div>}
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

function Intro({ onStart, savedRuns }: { onStart: (clubId: string, config: DraftConfig) => void; savedRuns: SavedRun[] }) {
  const [clubId, setClubId] = useState("fre");
  const [difficulty, setDifficulty] = useState<AflDifficulty>("normal");
  const [draftMode, setDraftMode] = useState<AflDraftMode>("squad");
  const [era, setEra] = useState<AflEraFilter>("all");
  const [showRatings, setShowRatings] = useState(true);
  const club = getAflClub(clubId);
  const changeDifficulty = (nextDifficulty: AflDifficulty) => {
    setDifficulty(nextDifficulty);
    if (nextDifficulty === "hard") setShowRatings(false);
    playArcadeSound("click");
  };
  return (
    <>
      <section className={styles.hero} style={{ "--club-primary": club.primary, "--club-secondary": club.secondary } as React.CSSProperties}>
        <div className={styles.heroGlow} />
        <div className={styles.heroCopy}>
          <Link href="/play" className={styles.backLink}>← Games Hub</Link>
          <span className={styles.eyebrow}><span className={styles.liveDot} /> Sam&apos;s Sports Lab · Australian football</span>
          <h1><span>23</span><i>–</i><span>0</span></h1>
          <p className={styles.heroKicker}>Draft history. Chase perfection.</p>
          <p className={styles.heroBody}>Build a complete 18-player starting side from Australian football greats. Every draw is ranked by skill, every legend has a defining edge, and every placement shapes the 23-round season.</p>
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

        <div className={styles.setupDivider} />
        <div className={styles.sectionHeading}>
          <span>02</span><div><p>Set the challenge</p><h2>Choose how this draft fights back</h2></div>
        </div>
        <div className={styles.draftSettings}>
          <section className={styles.settingBlock}>
            <div className={styles.settingHeading}><span>Scouting difficulty</span><strong>{difficulty === "hard" ? "Blind ratings" : difficulty === "easy" ? "Full guidance" : "Balanced"}</strong></div>
            <div className={styles.choiceGrid}>
              {([
                ["easy", "Easy", "Full ratings · clearer scouting"],
                ["normal", "Normal", "Ratings choice · balanced"],
                ["hard", "Hard", "Blind ratings · trust the careers"],
              ] as const).map(([id, label, detail]) => (
                <button key={id} type="button" className={difficulty === id ? styles.activeChoice : ""} onClick={() => changeDifficulty(id)}>
                  <strong>{label}</strong><small>{detail}</small>
                </button>
              ))}
            </div>
          </section>

          <section className={styles.settingBlock}>
            <div className={styles.settingHeading}><span>Draft mode</span><strong>{draftMode === "squad" ? "Player first" : "Position first"}</strong></div>
            <div className={styles.modeGrid}>
              <button type="button" className={draftMode === "squad" ? styles.activeChoice : ""} onClick={() => { setDraftMode("squad"); playArcadeSound("click"); }}>
                <span aria-hidden="true">☰</span><div><strong>Squad first</strong><small>Pick a legend, then place them in any valid slot.</small></div>
              </button>
              <button type="button" className={draftMode === "position" ? styles.activeChoice : ""} onClick={() => { setDraftMode("position"); playArcadeSound("click"); }}>
                <span aria-hidden="true">◎</span><div><strong>Position first</strong><small>Choose a slot, then take one of its ranked options.</small></div>
              </button>
            </div>
          </section>

          <section className={styles.settingBlock}>
            <div className={styles.settingHeading}><span>Era focus</span><strong>{era === "all" ? "Every generation" : era}</strong></div>
            <div className={styles.eraPicker}>
              {ERA_OPTIONS.map((option) => (
                <button key={option.id} type="button" className={era === option.id ? styles.activeChoice : ""} onClick={() => { setEra(option.id); playArcadeSound("click"); }}>{option.label}</button>
              ))}
            </div>
            <p className={styles.settingNote}>The chosen decade is prioritised. The all-time pool fills any position if that era runs out of eligible players.</p>
          </section>

          <section className={styles.settingBlock}>
            <div className={styles.settingHeading}><span>Scouting</span><strong>{showRatings ? "Ratings visible" : "Blind board"}</strong></div>
            <button
              type="button"
              className={`${styles.ratingToggle} ${showRatings ? styles.ratingToggleOn : ""}`}
              aria-pressed={showRatings}
              onClick={() => { setShowRatings((value) => !value); playArcadeSound("click"); }}
            >
              <span><strong>Show ratings</strong><small>Candidate order always stays strongest to weakest.</small></span>
              <i>{showRatings ? "ON" : "OFF"}</i>
            </button>
          </section>
        </div>

        <div className={styles.challengeSummary}>
          <span>YOUR RULES</span>
          <strong>{difficulty.toUpperCase()} · {draftMode === "squad" ? "SQUAD FIRST" : "POSITION FIRST"} · {era === "all" ? "ALL-TIME" : era.toUpperCase()}</strong>
          <small>2 players maximum per club-and-era roll · ratings {showRatings ? "on" : "hidden"} · full rosters ranked by skill</small>
        </div>
        <button type="button" className={styles.primaryAction} onClick={() => onStart(clubId, { difficulty, draftMode, era, showRatings })}>
          Start the ranked draft <span>Build your 18 →</span>
        </button>
      </section>

      <section className={styles.rulesGrid}>
        <article><span>Club + era roll</span><h3>Two picks, then roll again</h3><p>Every roll reveals a historical club, a decade and all available legends from that combination, ordered strongest to weakest.</p></article>
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
  config,
  lineup,
  onPlace,
  onUndo,
}: {
  clubId: string;
  config: DraftConfig;
  lineup: LineupPick[];
  onPlace: (player: AflPlayer, slotId: string) => void;
  onUndo: () => void;
}) {
  const [draw, setDraw] = useState<AflDraftDraw | null>(null);
  const [drawOpened, setDrawOpened] = useState(false);
  const [drawPicks, setDrawPicks] = useState(0);
  const [drawCount, setDrawCount] = useState(0);
  const [activePlayerId, setActivePlayerId] = useState<string | null>(null);
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null);
  const club = getAflClub(clubId);
  const selected = lineup.map((pick) => pick.player);
  const provisional = getTeamMetrics(selected);
  const candidates = availableDrawPlayers(lineup, draw);
  const activePlayer = candidates.find((player) => player.id === activePlayerId) ?? null;
  const filledSlots = new Map(lineup.map((pick) => [pick.slotId, pick]));
  const activeSlot = AFL_POSITION_SLOTS.find((slot) => slot.id === activeSlotId) ?? null;
  const drawLocked = drawPicks >= 2;
  const eligibleCandidateCount = activeSlot
    ? candidates.filter((player) => playerDraftLine(player) === activeSlot.line).length
    : candidates.length;

  const roll = () => {
    const nextDraw = rollClubAndEra(lineup, config, drawCount + 1);
    if (!nextDraw) return;
    setDraw(nextDraw);
    setDrawOpened(false);
    setDrawCount((value) => value + 1);
    setDrawPicks(0);
    setActivePlayerId(null);
    playArcadeSound("swoosh");
  };

  const commitPlayer = (player: AflPlayer, slotId: string) => {
    if (filledSlots.has(slotId)) return;
    const slot = AFL_POSITION_SLOTS.find((option) => option.id === slotId);
    if (!slot || drawLocked || playerDraftLine(player) !== slot.line) return;
    setActivePlayerId(null);
    setActiveSlotId(null);
    setDrawPicks((value) => Math.min(2, value + 1));
    onPlace(player, slotId);
  };

  const placePlayer = (slotId: string) => {
    if (!activePlayer) return;
    commitPlayer(activePlayer, slotId);
  };

  const focusPosition = (slotId: string) => {
    if (filledSlots.has(slotId)) return;
    const slot = AFL_POSITION_SLOTS.find((option) => option.id === slotId);
    if (!slot) return;
    setActiveSlotId(slotId);
    setActivePlayerId(null);
    playArcadeSound("click");
  };

  const selectCandidate = (player: AflPlayer) => {
    if (drawLocked) return;
    if (config.draftMode === "position" && activeSlot) {
      if (playerDraftLine(player) !== activeSlot.line) return;
      commitPlayer(player, activeSlot.id);
    } else {
      setActivePlayerId(player.id);
      playArcadeSound("click");
    }
  };

  const undoDraft = () => {
    const lastPick = lineup.at(-1);
    if (lastPick && draw && playerClubs(lastPick.player).includes(draw.club) && matchesEra(lastPick.player, draw.era)) {
      setDrawPicks((value) => Math.max(0, value - 1));
    }
    setActivePlayerId(null);
    setActiveSlotId(null);
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
        <div><span>{String(lineup.length + 1).padStart(2, "0")}</span><div><p>Selection room · {club.short}</p><h1>{drawLocked ? "Two picks complete" : activePlayer ? `Place ${activePlayer.name}` : activeSlot ? `Draft a ${activeSlot.label}` : draw ? "Choose from this roster" : "Roll your first club and era"}</h1><small>{drawLocked ? "Roll again to reveal your next club and era." : activePlayer ? `${lineLabel(playerDraftLine(activePlayer))} only — choose any open circle in that line.` : activeSlot ? `${activeSlot.label} is selected. Eligible players from the current roster can be drafted.` : draw ? "Every available legend from this club and era is shown in skill order." : "Nothing is dealt automatically — press Roll to reveal the first historical roster."}</small></div></div>
        <strong>{draw ? `${drawPicks}/2 from draw #${draw.number}` : "Waiting for roll"}</strong>
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
              const eligible = Boolean(activePlayer && playerDraftLine(activePlayer) === slot.line);
              const positionTarget = config.draftMode === "position" && !pick;
              const focused = activeSlotId === slot.id;
              return (
                <button
                  key={slot.id}
                  type="button"
                  className={`${styles.positionSlot} ${styles[`position${slot.line[0].toUpperCase()}${slot.line.slice(1)}`]} ${pick ? styles.positionFilled : ""} ${eligible && !pick ? styles.positionEligible : ""} ${positionTarget ? styles.positionTarget : ""} ${focused ? styles.positionFocused : ""}`}
                  style={{ gridRow: slot.row, gridColumn: slot.column }}
                  onClick={() => config.draftMode === "position" ? focusPosition(slot.id) : placePlayer(slot.id)}
                  disabled={Boolean(pick) || (config.draftMode === "squad" && !eligible)}
                  aria-label={pick ? `${slot.label}: ${pick.player.name}` : eligible ? `Place ${activePlayer?.name} at ${slot.label}` : positionTarget ? `Draft for ${slot.label}` : `${slot.label}, empty`}
                >
                  {pick ? <><PlayerAvatar player={pick.player} /><small className={styles.filledSlotLabel}>{slot.short}</small><span><strong>{pick.player.name}</strong><small>{slot.short} · {playerOverall(pick.player)}</small></span></> : <><strong>{slot.short}</strong><small>{slot.label}</small></>}
                </button>
              );
            })}
          </div>
        </div>
        <div className={styles.fieldHint}>{drawLocked ? "Two selections used — choose Roll again in the roster panel" : activePlayer ? `Choose any glowing ${lineLabel(playerDraftLine(activePlayer))} circle` : draw && !drawOpened ? `Click the ${draw.club} ${draw.era} card to open its full roster` : activeSlot ? `${activeSlot.label} locked in — ${eligibleCandidateCount} eligible in this draw` : config.draftMode === "position" ? "Choose a position, then press Roll if no roster is open" : draw ? `${candidates.length} player${candidates.length === 1 ? "" : "s"} remain in this club-and-era roster` : "Press Roll to reveal a club, a decade and its available legends"}</div>
      </div>

      <aside className={styles.candidatePanel}>
        <div className={styles.drawStrip}>
          <span>{draw ? `DRAW ${String(draw.number).padStart(2, "0")}` : "ROLL REQUIRED"}</span>
          <strong>{draw ? draw.club.toUpperCase() : config.difficulty.toUpperCase()}</strong>
          <small>{draw ? draw.era : config.draftMode === "position" ? "CHOOSE SLOT" : "SQUAD FIRST"}</small>
        </div>
        <div className={styles.candidatePanelHeading}>
          <div><span>{draw ? `${draw.club} · ${draw.era}` : "Club + year draw"}</span><strong>{draw ? "Full available roster" : "Press Roll to scout"}</strong></div>
          <div className={styles.rerollCounter}><b>{drawPicks}</b><small>of 2<br />selected</small></div>
        </div>
        {draw && !drawOpened && <button type="button" className={styles.drawRevealCard} onClick={() => { setDrawOpened(true); playArcadeSound("click"); }}><span>{draw.era}</span><strong>{draw.club}</strong><small>{candidates.length} available legend{candidates.length === 1 ? "" : "s"}</small><b>Click to open full roster <i>→</i></b></button>}
        {drawLocked ? (
          <div className={styles.rollAgainPrompt} role="status">
            <span>2/2</span>
            <strong>Roll again?</strong>
            <p>You picked two players from {draw?.club} {draw?.era}. Reveal a new club and era to continue.</p>
            <button type="button" onClick={roll}>Roll next club &amp; era <i>→</i></button>
          </div>
        ) : (
          <>
            <div className={styles.sideCandidates}>
              {drawOpened && candidates.map((player, index) => (
                <PlayerCard key={player.id} player={player} boardRank={index + 1} showRatings={config.showRatings} onPick={() => selectCandidate(player)} disabled={Boolean(activeSlot && playerDraftLine(player) !== activeSlot.line)} selected={activePlayerId === player.id} />
              ))}
              {(!draw || (drawOpened && candidates.length === 0)) && <div className={styles.positionPrompt}><span>↻</span><strong>{draw ? "Roster exhausted" : "No roster open"}</strong><p>Press Roll to reveal the next club, decade and available players.</p></div>}
            </div>
            <button type="button" className={`${styles.rerollButton} ${styles.rollButton}`} onClick={roll}>
              <span aria-hidden="true">↻</span>
              <strong>{!draw ? "Roll club & era" : candidates.length === 0 ? "Roll next club & era" : "Leave this roster and roll"}</strong>
              <small>{draw ? `${drawPicks}/2 picks used · a new roll replaces ${draw.club} ${draw.era}` : "Reveal the year group and everyone available for it"}</small>
            </button>
          </>
        )}
        {lineup.length > 0 && <div className={styles.liveRating}><span>Live team rating</span><strong>{provisional.overall}</strong><small>{18 - lineup.length} spots remaining</small></div>}
      </aside>
    </section>
  );
}

function Review({ clubId, config, lineup, onBack, onSimulate }: { clubId: string; config: DraftConfig; lineup: LineupPick[]; onBack: () => void; onSimulate: () => void }) {
  const club = getAflClub(clubId);
  const selected = lineup.map((pick) => pick.player);
  const metrics = getTeamMetrics(selected);
  const orderedLineup = AFL_POSITION_SLOTS.map((slot) => ({ slot, pick: lineup.find((entry) => entry.slotId === slot.id)! }));
  const rankedLineup = [...lineup].sort((left, right) =>
    playerOverall(right.player) - playerOverall(left.player) || right.player.leadership - left.player.leadership,
  );
  return (
    <section className={styles.review} style={{ "--club-primary": club.primary, "--club-secondary": club.secondary } as React.CSSProperties}>
      <div className={styles.reviewHero}>
        <ClubMark clubId={clubId} />
        <div><span>Draft complete</span><h1>{club.name}&apos;s dream 18</h1><p>Every line is locked: six forwards, six midfielders and six defenders. Your positional balance now drives the full season model.</p></div>
        <div className={styles.overallBig}><small>LIST RATING</small><strong>{metrics.overall}</strong><span>{metrics.overall >= 94 ? "Premiership favourite" : "Finals contender"}</span></div>
      </div>
      <MetricsPanel metrics={metrics} />
      <section className={styles.rosterRanking}>
        <div className={styles.rankingHeading}>
          <div><span>Skill order</span><h2>Your list, strongest first</h2></div>
          <small>{config.difficulty} · {config.draftMode === "squad" ? "squad first" : "position first"} · {config.era}</small>
        </div>
        <div className={styles.rankingList}>
          {rankedLineup.map((pick, index) => (
            <article key={pick.player.id}>
              <b>#{index + 1}</b><PlayerAvatar player={pick.player} />
              <div><strong>{pick.player.name}</strong><small>{pick.player.trait} · {skillTier(pick.player)}</small></div>
              <span>{playerOverall(pick.player)}</span>
            </article>
          ))}
        </div>
      </section>
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
  const [leaderboardChoice, setLeaderboardChoice] = useState<"ask" | "form" | "submitted" | "declined">("ask");
  const [leaderboardName, setLeaderboardName] = useState("");
  const [leaderboard, setLeaderboard] = useState<AflLeaderboardEntry[]>([]);
  const club = getAflClub(result.clubId);
  const userMatches = result.homeAway.filter((match) => match.homeId === result.clubId || match.awayId === result.clubId);
  const ladderRow = result.ladder.find((row) => row.clubId === result.clubId)!;
  const perfect = result.userWins === 23;
  const userFinals = result.finals.filter((match) => match.homeId === result.clubId || match.awayId === result.clubId);
  const fullJourney = [...userMatches, ...userFinals];
  const tabs: Array<{ id: ResultTab; label: string }> = [
    { id: "overview", label: "Season HQ" }, { id: "fixture", label: "Full journey" }, { id: "ladder", label: "Ladder" }, { id: "finals", label: "Finals" }, { id: "squad", label: "Drafted list" },
  ];
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        const entries = JSON.parse(localStorage.getItem(LEADERBOARD_STORAGE_KEY) ?? "[]") as AflLeaderboardEntry[];
        setLeaderboard(entries.sort((left, right) => right.score - left.score || right.wins - left.wins).slice(0, 10));
      } catch { setLeaderboard([]); }
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  const submitLeaderboard = () => {
    const name = leaderboardName.trim().slice(0, 24);
    if (!name) return;
    const entry: AflLeaderboardEntry = {
      id: `${Date.now()}`,
      name,
      clubId: result.clubId,
      wins: result.userWins,
      losses: result.userLosses,
      draws: result.userDraws,
      finish: result.finish,
      score: leaderboardScore(result),
      submittedAt: new Date().toISOString(),
    };
    const next = [entry, ...leaderboard].sort((left, right) => right.score - left.score || right.wins - left.wins).slice(0, 10);
    setLeaderboard(next);
    setLeaderboardChoice("submitted");
    try { localStorage.setItem(LEADERBOARD_STORAGE_KEY, JSON.stringify(next)); } catch { /* device storage is optional */ }
    playArcadeSound("levelUp");
  };
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
          <section className={styles.leaderboardCard} aria-labelledby="afl-leaderboard-title">
            <div className={styles.leaderboardIntro}>
              <span>Sam&apos;s Arcade leaderboard</span>
              <h2 id="afl-leaderboard-title">Submit this campaign?</h2>
              <p>Save your result under a name and compare the top ten runs on this device.</p>
              {leaderboardChoice === "ask" && <div className={styles.leaderboardChoice}><button type="button" onClick={() => setLeaderboardChoice("form")}>Yes, submit my run</button><button type="button" onClick={() => setLeaderboardChoice("declined")}>Not this time</button></div>}
              {leaderboardChoice === "form" && <form className={styles.leaderboardForm} onSubmit={(event) => { event.preventDefault(); submitLeaderboard(); }}><label htmlFor="afl-leaderboard-name">Leaderboard name</label><div><input id="afl-leaderboard-name" value={leaderboardName} onChange={(event) => setLeaderboardName(event.target.value)} maxLength={24} autoComplete="nickname" placeholder="Enter a name" autoFocus /><button type="submit" disabled={!leaderboardName.trim()}>Submit</button></div><small>{leaderboardName.length}/24 characters</small></form>}
              {leaderboardChoice === "submitted" && <div className={styles.leaderboardMessage}><strong>Run submitted ✓</strong><span>Your score is now ranked below.</span></div>}
              {leaderboardChoice === "declined" && <div className={styles.leaderboardMessage}><strong>Run kept private</strong><button type="button" onClick={() => setLeaderboardChoice("form")}>Submit it after all</button></div>}
            </div>
            <div className={styles.leaderboardTable}>
              <div className={styles.leaderboardHead}><span>#</span><span>Name</span><span>Record</span><span>Score</span></div>
              {leaderboard.length ? leaderboard.map((entry, index) => <div key={entry.id}><strong>{index + 1}</strong><span><ClubMark clubId={entry.clubId} compact /><span><b>{entry.name}</b><small>{entry.finish}</small></span></span><span>{entry.wins}-{entry.losses}{entry.draws ? `-${entry.draws}` : ""}</span><b>{entry.score.toLocaleString()}</b></div>) : <div className={styles.emptyLeaderboard}><strong>No entries yet</strong><span>Be the first name on the board.</span></div>}
            </div>
          </section>
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

      {tab === "squad" && <div className={styles.tablePanel}><div className={styles.cardHeading}><div><span>All-time starting side</span><h2>Your complete 18</h2></div><strong>{result.metrics.overall} OVR</strong></div><MetricsPanel metrics={result.metrics} /><div className={styles.resultSquad}>{AFL_POSITION_SLOTS.map((slot) => { const pick = lineup.find((entry) => entry.slotId === slot.id)!; return <article key={slot.id}><PlayerAvatar player={pick.player} large /><span>{slot.short} · {slot.label}</span><h3>{pick.player.name}</h3><p>{pick.player.position} · {pick.player.representativeClub}</p><small>✦ {pick.player.trait}</small><strong>{playerOverall(pick.player)}</strong></article>; })}</div></div>}
    </section>
  );
}

export function Afl23Game() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [clubId, setClubId] = useState("fre");
  const [draftConfig, setDraftConfig] = useState<DraftConfig>(DEFAULT_DRAFT_CONFIG);
  const [lineup, setLineup] = useState<LineupPick[]>([]);
  const [result, setResult] = useState<SeasonResult | null>(null);
  const [savedRuns, setSavedRuns] = useState<SavedRun[]>([]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try { setSavedRuns(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]")); } catch { setSavedRuns([]); }
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  const startDraft = (nextClubId: string, nextConfig: DraftConfig) => {
    setClubId(nextClubId);
    setDraftConfig(nextConfig);
    setLineup([]);
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
      {phase === "draft" && <Draft clubId={clubId} config={draftConfig} lineup={lineup} onPlace={placePlayer} onUndo={undo} />}
      {phase === "review" && <Review clubId={clubId} config={draftConfig} lineup={lineup} onBack={() => { setLineup((picks) => picks.slice(0, -1)); setPhase("draft"); }} onSimulate={() => simulate()} />}
      {phase === "simulating" && result && <SportsSimulationReveal accent="#77d68d" entries={aflRevealEntries(result)} eyebrow="AFL 23-0 · Live season simulation" title="Revealing every result · one per second" intervalMs={1000} lockSpeed allowSkip={false} onComplete={() => { setPhase("result"); window.scrollTo({ top: 0, behavior: "smooth" }); }} />}
      {phase === "result" && result && <Result result={result} lineup={lineup} onReset={reset} onReplay={replay} />}
      <footer className={styles.disclaimer}>Unofficial fan-made simulator. Not affiliated with or endorsed by the AFL or its clubs. Club names and player career facts are used descriptively; ratings are Sam&apos;s Arcade simulation estimates. No official logos or player likenesses are used.</footer>
    </div>
  );
}
