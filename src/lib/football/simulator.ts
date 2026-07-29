import {
  FOOTBALL_CLUBS,
  type FootballFormationId,
  type FootballPlayer,
  type FootballTactic,
  getFootballClub,
} from "./data";

export interface FootballMetrics {
  overall: number;
  attack: number;
  creation: number;
  control: number;
  defence: number;
  goalkeeping: number;
  pace: number;
  chemistry: number;
}

export interface FootballMatch {
  id: string;
  round: number;
  label: string;
  homeId: string;
  awayId: string;
  homeGoals: number;
  awayGoals: number;
  winnerId: string | null;
  upset: boolean;
}

export interface FootballStanding {
  clubId: string;
  position: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export interface FootballCupTie extends FootballMatch {
  stage: "round-of-16" | "quarter-finals" | "semi-finals" | "final";
  extraTime: boolean;
  penalties: boolean;
}

export interface FootballSeasonResult {
  seed: number;
  clubId: string;
  metrics: FootballMetrics;
  matches: FootballMatch[];
  standings: FootballStanding[];
  cup: FootballCupTie[];
  userWins: number;
  userDraws: number;
  userLosses: number;
  userGoalsFor: number;
  userGoalsAgainst: number;
  userPoints: number;
  leaguePosition: number;
  leagueChampionId: string;
  cupChampionId: string;
  cupFinish: string;
  finish: string;
  unbeaten: boolean;
  perfect: boolean;
  longestWinStreak: number;
  starPlayer: string;
  starGoals: number;
}

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = value + Math.imul(value ^ (value >>> 7), 61 | value) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (min: number, max: number, value: number) => Math.max(min, Math.min(max, value));
const average = (players: FootballPlayer[], key: keyof FootballPlayer) => players.length ? players.reduce((sum, player) => sum + Number(player[key]), 0) / players.length : 72;

export function getFootballMetrics(players: FootballPlayer[], tactic: FootballTactic, formation: FootballFormationId): FootballMetrics {
  const outfield = players.filter((player) => !player.positions.includes("GK"));
  const keepers = players.filter((player) => player.positions.includes("GK"));
  const nationCounts = new Map<string, number>();
  players.forEach((player) => nationCounts.set(player.nation, (nationCounts.get(player.nation) ?? 0) + 1));
  const nationLinks = [...nationCounts.values()].reduce((sum, count) => sum + Math.max(0, count - 1), 0);
  const tacticMods: Record<FootballTactic, Partial<Record<keyof FootballMetrics, number>>> = {
    balanced: { chemistry: 3, defence: 1, attack: 1 },
    possession: { creation: 4, control: 5, pace: -2, chemistry: 1 },
    "high-press": { defence: 3, pace: 4, control: -1, chemistry: -1 },
    counter: { attack: 4, pace: 5, control: -3, defence: 1 },
  };
  const formationMods: Record<FootballFormationId, Partial<Record<keyof FootballMetrics, number>>> = {
    "4-3-3": { attack: 2, creation: 1, pace: 1 },
    "4-4-2": { chemistry: 2, defence: 1 },
    "4-2-3-1": { control: 3, defence: 2, attack: -1 },
    "3-4-3": { attack: 3, pace: 2, defence: -2 },
  };
  const base: Omit<FootballMetrics, "overall"> = {
    attack: Math.round(average(outfield, "attack")),
    creation: Math.round(average(outfield, "creation")),
    control: Math.round(average(outfield, "control")),
    defence: Math.round(average(outfield, "defending")),
    goalkeeping: Math.round(average(keepers, "goalkeeping")),
    pace: Math.round(average(outfield, "pace")),
    chemistry: clamp(70, 100, 78 + nationLinks * 2 + Math.max(0, players.length - 8)),
  };
  const modded = Object.fromEntries(Object.entries(base).map(([key, value]) => {
    const metric = key as keyof FootballMetrics;
    return [key, clamp(55, 100, value + (tacticMods[tactic][metric] ?? 0) + (formationMods[formation][metric] ?? 0))];
  })) as Omit<FootballMetrics, "overall">;
  const overall = Math.round(modded.attack * .18 + modded.creation * .14 + modded.control * .15 + modded.defence * .19 + modded.goalkeeping * .17 + modded.pace * .07 + modded.chemistry * .1);
  return { overall, ...modded };
}

function leagueSchedule() {
  let rotation = FOOTBALL_CLUBS.map((club) => club.id);
  const firstLeg: Array<{ round: number; homeId: string; awayId: string }> = [];
  for (let round = 0; round < rotation.length - 1; round += 1) {
    for (let index = 0; index < rotation.length / 2; index += 1) {
      const left = rotation[index];
      const right = rotation[rotation.length - 1 - index];
      const flip = (round + index) % 2 === 1;
      firstLeg.push({ round: round + 1, homeId: flip ? right : left, awayId: flip ? left : right });
    }
    rotation = [rotation[0], rotation[rotation.length - 1], ...rotation.slice(1, -1)];
  }
  return [
    ...firstLeg,
    ...firstLeg.map((match) => ({ round: match.round + 19, homeId: match.awayId, awayId: match.homeId })),
  ];
}

function poisson(lambda: number, random: () => number) {
  const limit = Math.exp(-lambda);
  let product = 1;
  let goals = 0;
  do { goals += 1; product *= random(); } while (product > limit && goals < 9);
  return goals - 1;
}

function simulateScore(homeId: string, awayId: string, userId: string, metrics: FootballMetrics, tactic: FootballTactic, random: () => number) {
  const userStrength = clamp(84, 99, 79 + (metrics.overall - 78) * .92);
  const rating = (id: string) => id === userId ? userStrength : getFootballClub(id).strength;
  const phase = (id: string, kind: "attack" | "defence") => {
    if (id !== userId) return rating(id);
    return kind === "attack" ? (metrics.attack * .48 + metrics.creation * .24 + metrics.control * .12 + metrics.pace * .16) : (metrics.defence * .48 + metrics.goalkeeping * .37 + metrics.control * .08 + metrics.chemistry * .07);
  };
  const styleAttack = tactic === "counter" ? .13 : tactic === "high-press" ? .09 : tactic === "possession" ? .04 : .06;
  const styleRisk = tactic === "high-press" ? .11 : tactic === "counter" ? .07 : tactic === "possession" ? -.04 : 0;
  const homeExpected = clamp(.18, 4.2, 1.22 + (phase(homeId, "attack") - phase(awayId, "defence")) * .055 + .24 + (homeId === userId ? styleAttack : 0) + (awayId === userId ? styleRisk : 0));
  const awayExpected = clamp(.16, 3.8, 1.04 + (phase(awayId, "attack") - phase(homeId, "defence")) * .055 + (awayId === userId ? styleAttack : 0) + (homeId === userId ? styleRisk : 0));
  const homeGoals = poisson(homeExpected, random);
  const awayGoals = poisson(awayExpected, random);
  return { homeGoals, awayGoals, homeStrength: rating(homeId), awayStrength: rating(awayId) };
}

function buildStandings(matches: FootballMatch[]) {
  const rows = new Map<string, FootballStanding>();
  FOOTBALL_CLUBS.forEach((club) => rows.set(club.id, { clubId: club.id, position: 0, played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0 }));
  matches.forEach((match) => {
    const home = rows.get(match.homeId)!;
    const away = rows.get(match.awayId)!;
    home.played += 1; away.played += 1;
    home.goalsFor += match.homeGoals; home.goalsAgainst += match.awayGoals;
    away.goalsFor += match.awayGoals; away.goalsAgainst += match.homeGoals;
    if (match.homeGoals > match.awayGoals) { home.wins += 1; home.points += 3; away.losses += 1; }
    else if (match.awayGoals > match.homeGoals) { away.wins += 1; away.points += 3; home.losses += 1; }
    else { home.draws += 1; away.draws += 1; home.points += 1; away.points += 1; }
  });
  return [...rows.values()].map((row) => ({ ...row, goalDifference: row.goalsFor - row.goalsAgainst }))
    .sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor || a.clubId.localeCompare(b.clubId))
    .map((row, index) => ({ ...row, position: index + 1 }));
}

function shuffled<T>(items: T[], random: () => number) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

function simulateCup(userId: string, metrics: FootballMetrics, tactic: FootballTactic, random: () => number) {
  let entrants = [userId, ...shuffled(FOOTBALL_CLUBS.filter((club) => club.id !== userId).map((club) => club.id), random).slice(0, 15)];
  entrants = shuffled(entrants, random);
  const ties: FootballCupTie[] = [];
  const stages: FootballCupTie["stage"][] = ["round-of-16", "quarter-finals", "semi-finals", "final"];
  stages.forEach((stage, stageIndex) => {
    const winners: string[] = [];
    for (let index = 0; index < entrants.length; index += 2) {
      const homeId = entrants[index];
      const awayId = entrants[index + 1];
      const score = simulateScore(homeId, awayId, userId, metrics, tactic, random);
      let { homeGoals, awayGoals } = score;
      const { homeStrength, awayStrength } = score;
      let extraTime = false;
      let penalties = false;
      if (homeGoals === awayGoals) {
        extraTime = true;
        const homeChance = clamp(.25, .75, .5 + (homeStrength - awayStrength) * .018);
        if (random() < .6) {
          if (random() < homeChance) homeGoals += 1;
          else awayGoals += 1;
        } else {
          penalties = true;
          if (random() < homeChance) homeGoals += 1;
          else awayGoals += 1;
        }
      }
      const winnerId = homeGoals > awayGoals ? homeId : awayId;
      winners.push(winnerId);
      ties.push({
        id: `cup-${stageIndex}-${index / 2}`, round: stageIndex + 1, label: stage === "final" ? "Cup Final" : stage.split("-").map((word) => word[0].toUpperCase() + word.slice(1)).join(" "),
        homeId, awayId, homeGoals, awayGoals, winnerId, upset: winnerId === homeId ? homeStrength + 4 < awayStrength : awayStrength + 4 < homeStrength,
        stage, extraTime, penalties,
      });
    }
    entrants = winners;
  });
  return ties;
}

function cupFinishFor(clubId: string, ties: FootballCupTie[]) {
  const final = ties.find((tie) => tie.stage === "final")!;
  if (final.winnerId === clubId) return "Cup winners";
  const stage = [...ties].reverse().find((tie) => (tie.homeId === clubId || tie.awayId === clubId) && tie.winnerId !== clubId)?.stage;
  return stage === "final" ? "Cup finalists" : stage === "semi-finals" ? "Cup semi-finalists" : stage === "quarter-finals" ? "Cup quarter-finalists" : "Cup round of 16";
}

export function simulateFootballSeason(clubId: string, players: FootballPlayer[], tactic: FootballTactic, formation: FootballFormationId, seed: number): FootballSeasonResult {
  const random = seededRandom(seed);
  const metrics = getFootballMetrics(players, tactic, formation);
  const matches = leagueSchedule().map((fixture, index): FootballMatch => {
    const score = simulateScore(fixture.homeId, fixture.awayId, clubId, metrics, tactic, random);
    const winnerId = score.homeGoals === score.awayGoals ? null : score.homeGoals > score.awayGoals ? fixture.homeId : fixture.awayId;
    return {
      id: `league-${fixture.round}-${index}`, round: fixture.round, label: `Matchweek ${fixture.round}`,
      homeId: fixture.homeId, awayId: fixture.awayId, homeGoals: score.homeGoals, awayGoals: score.awayGoals, winnerId,
      upset: winnerId ? (winnerId === fixture.homeId ? score.homeStrength + 5 < score.awayStrength : score.awayStrength + 5 < score.homeStrength) : false,
    };
  });
  const standings = buildStandings(matches);
  const userRow = standings.find((row) => row.clubId === clubId)!;
  const userMatches = matches.filter((match) => match.homeId === clubId || match.awayId === clubId).sort((a, b) => a.round - b.round);
  let streak = 0;
  let longestWinStreak = 0;
  userMatches.forEach((match) => {
    if (match.winnerId === clubId) { streak += 1; longestWinStreak = Math.max(longestWinStreak, streak); }
    else streak = 0;
  });
  const cup = simulateCup(clubId, metrics, tactic, random);
  const cupChampionId = cup.find((tie) => tie.stage === "final")!.winnerId!;
  const leagueChampionId = standings[0].clubId;
  const leagueFinish = userRow.position === 1 ? "League champions" : userRow.position <= 4 ? "Champions League qualification" : userRow.position <= 6 ? "European qualification" : userRow.position >= 18 ? "Relegated" : "Mid-table finish";
  const star = [...players].filter((player) => !player.positions.includes("GK")).sort((a, b) => b.attack - a.attack || b.mentality - a.mentality)[0];
  const starGoals = Math.max(4, Math.round(userRow.goalsFor * (.22 + (star?.attack ?? 80) / 850) + random() * 4));
  return {
    seed, clubId, metrics, matches, standings, cup,
    userWins: userRow.wins, userDraws: userRow.draws, userLosses: userRow.losses,
    userGoalsFor: userRow.goalsFor, userGoalsAgainst: userRow.goalsAgainst, userPoints: userRow.points,
    leaguePosition: userRow.position, leagueChampionId, cupChampionId, cupFinish: cupFinishFor(clubId, cup),
    finish: `${leagueFinish} · ${cupFinishFor(clubId, cup)}`,
    unbeaten: userRow.losses === 0, perfect: userRow.wins === 38,
    longestWinStreak, starPlayer: star?.name ?? "Your striker", starGoals,
  };
}
