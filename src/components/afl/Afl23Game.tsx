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

const STORAGE_KEY = "sams-arcade:afl-23-0:runs";
const DEFAULT_DRAFT_CONFIG: DraftConfig = {
  difficulty: "normal",
  draftMode: "squad",
  era: "all",
  showRatings: true,
};
const REROLLS_BY_DIFFICULTY: Record<AflDifficulty, number> = { easy: 3, normal: 1, hard: 0 };
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

function matchesEra(player: AflPlayer, era: AflEraFilter) {
  if (era === "all") return true;
  const targetStart = Number.parseInt(era, 10);
  const years = player.era.match(/\d{4}/g)?.map(Number) ?? [];
  const careerStart = years[0] ?? 1900;
  const careerEnd = player.era.includes("present") ? 2029 : years.at(-1) ?? careerStart;
  return careerStart <= targetStart + 9 && careerEnd >= targetStart;
}

function shuffled<T>(items: T[]) {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

function buildCandidatePool(lineup: LineupPick[], era: AflEraFilter, focusLine?: AflLine) {
  const usedPlayers = new Set(lineup.map((pick) => pick.player.id));
  const filledSlots = new Set(lineup.map((pick) => pick.slotId));
  const availableLines = (["forward", "midfield", "defence"] as AflLine[]).filter((line) =>
    AFL_POSITION_SLOTS.some((slot) => slot.line === line && !filledSlots.has(slot.id)),
  );
  const openLines = focusLine && availableLines.includes(focusLine) ? [focusLine] : availableLines;
  const available = AFL_PLAYERS.filter((player) =>
    !usedPlayers.has(player.id) && playerEligibleLines(player).some((line) => openLines.includes(line)),
  );
  const eraPool = available.filter((player) => matchesEra(player, era));
  const candidates: AflPlayer[] = [];
  for (const line of shuffled(openLines)) {
    const option = [...shuffled(eraPool), ...shuffled(available)].find((player) =>
      !candidates.some((candidate) => candidate.id === player.id) && playerEligibleLines(player).includes(line),
    );
    if (option) candidates.push(option);
  }
  for (const option of [...shuffled(eraPool), ...shuffled(available)]) {
    if (candidates.length >= 3) break;
    if (!candidates.some((candidate) => candidate.id === option.id)) candidates.push(option);
  }
  return candidates
    .slice(0, 3)
    .sort((left, right) => playerOverall(right) - playerOverall(left) || right.leadership - left.leadership);
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
            <div className={styles.settingHeading}><span>Difficulty</span><strong>{REROLLS_BY_DIFFICULTY[difficulty]} reroll{REROLLS_BY_DIFFICULTY[difficulty] === 1 ? "" : "s"}</strong></div>
            <div className={styles.choiceGrid}>
              {([
                ["easy", "Easy", "3 rerolls · full ratings"],
                ["normal", "Normal", "1 reroll · balanced"],
                ["hard", "Hard", "No rerolls · blind board"],
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
          <small>{REROLLS_BY_DIFFICULTY[difficulty]} reroll{REROLLS_BY_DIFFICULTY[difficulty] === 1 ? "" : "s"} · ratings {showRatings ? "on" : "hidden"} · skill-ranked candidate boards</small>
        </div>
        <button type="button" className={styles.primaryAction} onClick={() => onStart(clubId, { difficulty, draftMode, era, showRatings })}>
          Start the ranked draft <span>Build your 18 →</span>
        </button>
      </section>

      <section className={styles.rulesGrid}>
        <article><span>Ranked board</span><h3>Best option always appears first</h3><p>Each three-player draw is ordered by overall skill, with a clear all-time rank, tier and defining match-day characteristic.</p></article>
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
  rerollsLeft,
  rerollsTotal,
  onPlace,
  onReroll,
  onUndo,
}: {
  clubId: string;
  config: DraftConfig;
  lineup: LineupPick[];
  rerollsLeft: number;
  rerollsTotal: number;
  onPlace: (player: AflPlayer, slotId: string) => void;
  onReroll: () => void;
  onUndo: () => void;
}) {
  const [candidates, setCandidates] = useState<AflPlayer[]>(() =>
    config.draftMode === "position" ? [] : buildCandidatePool(lineup, config.era),
  );
  const [activePlayerId, setActivePlayerId] = useState<string | null>(null);
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null);
  const club = getAflClub(clubId);
  const selected = lineup.map((pick) => pick.player);
  const provisional = getTeamMetrics(selected);
  const activePlayer = candidates.find((player) => player.id === activePlayerId) ?? null;
  const filledSlots = new Map(lineup.map((pick) => [pick.slotId, pick]));
  const activeSlot = AFL_POSITION_SLOTS.find((slot) => slot.id === activeSlotId) ?? null;

  const reroll = () => {
    if (!rerollsLeft || (config.draftMode === "position" && !activeSlot)) return;
    setCandidates(buildCandidatePool(lineup, config.era, activeSlot?.line));
    setActivePlayerId(null);
    onReroll();
    playArcadeSound("swoosh");
  };

  const commitPlayer = (player: AflPlayer, slotId: string) => {
    if (filledSlots.has(slotId)) return;
    const slot = AFL_POSITION_SLOTS.find((option) => option.id === slotId);
    if (!slot || !playerEligibleLines(player).includes(slot.line)) return;
    const next = [...lineup, { player, slotId, pickNumber: lineup.length + 1 }];
    setCandidates(config.draftMode === "position" ? [] : buildCandidatePool(next, config.era));
    setActivePlayerId(null);
    setActiveSlotId(null);
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
    setCandidates(buildCandidatePool(lineup, config.era, slot.line));
    playArcadeSound("click");
  };

  const selectCandidate = (player: AflPlayer) => {
    if (config.draftMode === "position" && activeSlot) {
      commitPlayer(player, activeSlot.id);
    } else {
      setActivePlayerId(player.id);
      playArcadeSound("click");
    }
  };

  const undoDraft = () => {
    const next = lineup.slice(0, -1);
    setCandidates(config.draftMode === "position" ? [] : buildCandidatePool(next, config.era));
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
        <div><span>{String(lineup.length + 1).padStart(2, "0")}</span><div><p>Selection room · {club.short}</p><h1>{activePlayer ? `Place ${activePlayer.name}` : activeSlot ? `Draft a ${activeSlot.label}` : config.draftMode === "position" ? "Choose a position" : "Choose a player"}</h1><small>{activePlayer ? `${lineLabel(playerEligibleLines(activePlayer)[0])} selected — every valid slot is glowing.` : activeSlot ? `The best available ${lineLabel(activeSlot.line).toLowerCase()} options are ranked on the right.` : config.draftMode === "position" ? "Pick any empty oval position to reveal its ranked candidate board." : "Pick a player on the right, then click any highlighted position on the oval."}</small></div></div>
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
                  {pick ? <><PlayerAvatar player={pick.player} /><span><strong>{pick.player.name}</strong><small>{slot.short} · {playerOverall(pick.player)}</small></span></> : <><strong>{slot.short}</strong><small>{slot.label}</small></>}
                </button>
              );
            })}
          </div>
        </div>
        <div className={styles.fieldHint}>{activePlayer ? `Choose any glowing ${playerEligibleLines(activePlayer).map(lineLabel).join(" / ")} slot` : activeSlot ? `${activeSlot.label} locked in — choose one ranked candidate` : config.draftMode === "position" ? "Choose an empty position first" : "Select a candidate to reveal their valid positions"}</div>
      </div>

      <aside className={styles.candidatePanel}>
        <div className={styles.drawStrip}>
          <span>{config.era === "all" ? "ALL-TIME DRAW" : `${config.era} FOCUS`}</span>
          <strong>{config.difficulty.toUpperCase()}</strong>
          <small>{config.draftMode === "position" ? activeSlot?.short ?? "CHOOSE SLOT" : "SQUAD FIRST"}</small>
        </div>
        <div className={styles.candidatePanelHeading}>
          <div><span>Ranked candidate board</span><strong>Strongest available first</strong></div>
          <div className={styles.rerollCounter}><b>{rerollsLeft}</b><small>of {rerollsTotal}<br />rerolls</small></div>
        </div>
        <div className={styles.sideCandidates}>
          {candidates.map((player, index) => (
            <PlayerCard key={player.id} player={player} boardRank={index + 1} showRatings={config.showRatings} onPick={() => selectCandidate(player)} selected={activePlayerId === player.id} />
          ))}
          {candidates.length === 0 && <div className={styles.positionPrompt}><span>◎</span><strong>Choose a position</strong><p>Your ranked three-player board will appear here.</p></div>}
        </div>
        <button type="button" className={styles.rerollButton} onClick={reroll} disabled={!rerollsLeft || (config.draftMode === "position" && !activeSlot)}>
          <span aria-hidden="true">↻</span>
          <strong>{rerollsLeft ? "Reroll all three" : "No rerolls left"}</strong>
          <small>{rerollsLeft ? "Deal a fresh candidate board" : "Make this board count"}</small>
        </button>
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

      {tab === "squad" && <div className={styles.tablePanel}><div className={styles.cardHeading}><div><span>All-time starting side</span><h2>Your complete 18</h2></div><strong>{result.metrics.overall} OVR</strong></div><MetricsPanel metrics={result.metrics} /><div className={styles.resultSquad}>{AFL_POSITION_SLOTS.map((slot) => { const pick = lineup.find((entry) => entry.slotId === slot.id)!; return <article key={slot.id}><PlayerAvatar player={pick.player} large /><span>{slot.short} · {slot.label}</span><h3>{pick.player.name}</h3><p>{pick.player.position} · {pick.player.representativeClub}</p><small>✦ {pick.player.trait}</small><strong>{playerOverall(pick.player)}</strong></article>; })}</div></div>}
    </section>
  );
}

export function Afl23Game() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [clubId, setClubId] = useState("fre");
  const [draftConfig, setDraftConfig] = useState<DraftConfig>(DEFAULT_DRAFT_CONFIG);
  const [lineup, setLineup] = useState<LineupPick[]>([]);
  const [rerollsTotal, setRerollsTotal] = useState(REROLLS_BY_DIFFICULTY.normal);
  const [rerollsLeft, setRerollsLeft] = useState(REROLLS_BY_DIFFICULTY.normal);
  const [result, setResult] = useState<SeasonResult | null>(null);
  const [savedRuns, setSavedRuns] = useState<SavedRun[]>([]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try { setSavedRuns(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]")); } catch { setSavedRuns([]); }
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  const startDraft = (nextClubId: string, nextConfig: DraftConfig) => {
    const allowance = REROLLS_BY_DIFFICULTY[nextConfig.difficulty];
    setClubId(nextClubId);
    setDraftConfig(nextConfig);
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
      {phase === "draft" && <Draft clubId={clubId} config={draftConfig} lineup={lineup} rerollsLeft={rerollsLeft} rerollsTotal={rerollsTotal} onPlace={placePlayer} onReroll={() => setRerollsLeft((value) => Math.max(0, value - 1))} onUndo={undo} />}
      {phase === "review" && <Review clubId={clubId} config={draftConfig} lineup={lineup} onBack={() => { setLineup((picks) => picks.slice(0, -1)); setPhase("draft"); }} onSimulate={() => simulate()} />}
      {phase === "simulating" && result && <SportsSimulationReveal accent="#77d68d" entries={aflRevealEntries(result)} eyebrow="AFL 23-0 · Live season simulation" title="Playing every round" onComplete={() => { setPhase("result"); window.scrollTo({ top: 0, behavior: "smooth" }); }} />}
      {phase === "result" && result && <Result result={result} lineup={lineup} onReset={reset} onReplay={replay} />}
      <footer className={styles.disclaimer}>Unofficial fan-made simulator. Not affiliated with or endorsed by the AFL or its clubs. Club names and player career facts are used descriptively; ratings are Sam&apos;s Arcade simulation estimates. No official logos or player likenesses are used.</footer>
    </div>
  );
}
