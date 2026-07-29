import { getFootballMetrics, type FootballMetrics } from "@/lib/football/simulator";
import type { FootballFormationId, FootballPlayer, FootballTactic } from "@/lib/football/data";
import { WORLD_CUP_NATIONS, getWorldCupNation, playerNationId } from "./data";

export interface WorldCupMatch {
  id: string;
  stage: "group" | "round-of-16" | "quarter-finals" | "semi-finals" | "third-place" | "final";
  label: string;
  round: number;
  group?: string;
  homeId: string;
  awayId: string;
  homeGoals: number;
  awayGoals: number;
  winnerId: string | null;
  extraTime: boolean;
  penalties: boolean;
}

export interface WorldCupStanding {
  nationId: string;
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

export interface WorldCupGroup {
  id: string;
  nationIds: string[];
  standings: WorldCupStanding[];
}

export interface WorldCupMetrics extends FootballMetrics {
  nationalCore: number;
}

export interface WorldCupResult {
  seed: number;
  nationId: string;
  metrics: WorldCupMetrics;
  groups: WorldCupGroup[];
  groupMatches: WorldCupMatch[];
  knockouts: WorldCupMatch[];
  userMatches: WorldCupMatch[];
  championId: string;
  runnerUpId: string;
  thirdPlaceId: string;
  finish: string;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  perfect: boolean;
}

const clamp = (min: number, max: number, value: number) => Math.max(min, Math.min(max, value));

function randomFor(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = value + Math.imul(value ^ (value >>> 7), 61 | value) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(items: T[], random: () => number) {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [next[index], next[swap]] = [next[swap], next[index]];
  }
  return next;
}

function poisson(lambda: number, random: () => number) {
  const limit = Math.exp(-lambda);
  let product = 1;
  let goals = 0;
  do { goals += 1; product *= random(); } while (product > limit && goals < 9);
  return goals - 1;
}

export function getWorldCupMetrics(players: FootballPlayer[], tactic: FootballTactic, formation: FootballFormationId, nationId: string): WorldCupMetrics {
  const base = getFootballMetrics(players, tactic, formation);
  const nationalCore = players.filter((player) => playerNationId(player) === nationId).length;
  const nationCounts = new Map<string, number>();
  players.forEach((player) => nationCounts.set(player.nation, (nationCounts.get(player.nation) ?? 0) + 1));
  const links = [...nationCounts.values()].reduce((sum, count) => sum + Math.max(0, count - 1), 0);
  const chemistry = clamp(65, 100, base.chemistry + nationalCore * 2 + links);
  const overall = clamp(70, 99, Math.round(base.overall * .88 + chemistry * .12));
  return { ...base, chemistry, overall, nationalCore };
}

function drawGroups(random: () => number) {
  const sorted = [...WORLD_CUP_NATIONS].sort((a, b) => b.strength - a.strength);
  const pots = [0, 1, 2, 3].map((pot) => shuffled(sorted.slice(pot * 8, pot * 8 + 8), random));
  return Array.from({ length: 8 }, (_, index) => ({ id: String.fromCharCode(65 + index), nationIds: pots.map((pot) => pot[index].id) }));
}

function scoreMatch(homeId: string, awayId: string, userId: string, metrics: WorldCupMetrics, tactic: FootballTactic, random: () => number, knockout: boolean, meta: Omit<WorldCupMatch, "homeId" | "awayId" | "homeGoals" | "awayGoals" | "winnerId" | "extraTime" | "penalties">): WorldCupMatch {
  const power = (id: string) => id === userId ? clamp(84, 99, 78 + (metrics.overall - 77) * .95) : getWorldCupNation(id).strength;
  const homePower = power(homeId) + 1.1;
  const awayPower = power(awayId);
  const risk = tactic === "high-press" ? .16 : tactic === "counter" ? .08 : tactic === "possession" ? -.03 : .03;
  let homeGoals = poisson(clamp(.2, 4.3, 1.15 + (homePower - awayPower) * .06 + (homeId === userId ? .12 : 0) + (awayId === userId ? risk : 0)), random);
  let awayGoals = poisson(clamp(.2, 4.1, 1.05 + (awayPower - homePower) * .06 + (awayId === userId ? .12 : 0) + (homeId === userId ? risk : 0)), random);
  let extraTime = false;
  let penalties = false;
  if (knockout && homeGoals === awayGoals) {
    extraTime = true;
    const homeChance = clamp(.28, .72, .5 + (homePower - awayPower) * .018);
    if (random() < .58) {
      if (random() < homeChance) homeGoals += 1; else awayGoals += 1;
    } else {
      penalties = true;
      if (random() < homeChance) homeGoals += 1; else awayGoals += 1;
    }
  }
  const winnerId = homeGoals === awayGoals ? null : homeGoals > awayGoals ? homeId : awayId;
  return { ...meta, homeId, awayId, homeGoals, awayGoals, winnerId, extraTime, penalties };
}

function standingsFor(nationIds: string[], matches: WorldCupMatch[]) {
  const rows = new Map<string, WorldCupStanding>(nationIds.map((nationId) => [nationId, { nationId, position:0, played:0, wins:0, draws:0, losses:0, goalsFor:0, goalsAgainst:0, goalDifference:0, points:0 }]));
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
    .sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor || a.nationId.localeCompare(b.nationId))
    .map((row, index) => ({ ...row, position: index + 1 }));
}

export function simulateWorldCup(nationId: string, players: FootballPlayer[], tactic: FootballTactic, formation: FootballFormationId, seed: number): WorldCupResult {
  const random = randomFor(seed);
  const metrics = getWorldCupMetrics(players, tactic, formation, nationId);
  const groupDraw = drawGroups(random);
  const groupMatches: WorldCupMatch[] = [];
  const groups: WorldCupGroup[] = groupDraw.map((group) => {
    const schedule = [[0,3],[1,2],[0,2],[3,1],[0,1],[2,3]];
    const matches = schedule.map(([home, away], index) => scoreMatch(group.nationIds[home], group.nationIds[away], nationId, metrics, tactic, random, false, {
      id:`group-${group.id}-${index + 1}`, stage:"group", group:group.id, label:`Group ${group.id} · Matchday ${Math.floor(index / 2) + 1}`, round:Math.floor(index / 2) + 1,
    }));
    groupMatches.push(...matches);
    return { ...group, standings: standingsFor(group.nationIds, matches) };
  });

  const qualifiers = Object.fromEntries(groups.flatMap((group) => [[`${group.id}1`, group.standings[0].nationId], [`${group.id}2`, group.standings[1].nationId]]));
  const roundOf16Pairs = [["A1","B2"],["C1","D2"],["E1","F2"],["G1","H2"],["B1","A2"],["D1","C2"],["F1","E2"],["H1","G2"]];
  const knockouts: WorldCupMatch[] = [];
  const playRound = (pairs: Array<[string,string]>, stage: WorldCupMatch["stage"], round: number) => pairs.map(([homeId, awayId], index) => {
    const match = scoreMatch(homeId, awayId, nationId, metrics, tactic, random, true, { id:`${stage}-${index + 1}`, stage, label:stage === "final" ? "World Cup Final" : stage === "third-place" ? "Third-place play-off" : stage.split("-").map((word) => word[0].toUpperCase() + word.slice(1)).join(" "), round });
    knockouts.push(match);
    return match;
  });
  const roundOf16 = playRound(roundOf16Pairs.map(([a,b]) => [qualifiers[a], qualifiers[b]]), "round-of-16", 4);
  const quarterFinals = playRound([[roundOf16[0].winnerId!,roundOf16[1].winnerId!],[roundOf16[2].winnerId!,roundOf16[3].winnerId!],[roundOf16[4].winnerId!,roundOf16[5].winnerId!],[roundOf16[6].winnerId!,roundOf16[7].winnerId!]], "quarter-finals", 5);
  const semiFinals = playRound([[quarterFinals[0].winnerId!,quarterFinals[1].winnerId!],[quarterFinals[2].winnerId!,quarterFinals[3].winnerId!]], "semi-finals", 6);
  const semiLosers = semiFinals.map((match) => match.winnerId === match.homeId ? match.awayId : match.homeId);
  const thirdPlace = playRound([[semiLosers[0], semiLosers[1]]], "third-place", 7)[0];
  const final = playRound([[semiFinals[0].winnerId!, semiFinals[1].winnerId!]], "final", 7)[0];
  const userMatches = [...groupMatches, ...knockouts].filter((match) => match.homeId === nationId || match.awayId === nationId).sort((a,b) => a.round-b.round || a.id.localeCompare(b.id));
  const outcome = (match: WorldCupMatch) => match.winnerId === nationId ? "win" : match.winnerId === null ? "draw" : "loss";
  const wins = userMatches.filter((match) => outcome(match) === "win").length;
  const draws = userMatches.filter((match) => outcome(match) === "draw").length;
  const losses = userMatches.filter((match) => outcome(match) === "loss").length;
  const userGroup = groups.find((group) => group.nationIds.includes(nationId))!;
  const groupPosition = userGroup.standings.find((row) => row.nationId === nationId)!.position;
  const elimination = [...userMatches].reverse().find((match) => match.stage !== "group" && match.winnerId !== nationId);
  const finish = final.winnerId === nationId ? "World champions" : final.homeId === nationId || final.awayId === nationId ? "Runners-up" : thirdPlace.winnerId === nationId ? "Third place" : thirdPlace.homeId === nationId || thirdPlace.awayId === nationId ? "Fourth place" : elimination?.stage === "quarter-finals" ? "Quarter-finalists" : elimination?.stage === "round-of-16" ? "Round of 16" : groupPosition > 2 ? `Group-stage exit · ${groupPosition}${groupPosition === 3 ? "rd" : "th"}` : "Tournament complete";
  const goalsFor = userMatches.reduce((sum, match) => sum + (match.homeId === nationId ? match.homeGoals : match.awayGoals), 0);
  const goalsAgainst = userMatches.reduce((sum, match) => sum + (match.homeId === nationId ? match.awayGoals : match.homeGoals), 0);
  return { seed, nationId, metrics, groups, groupMatches, knockouts, userMatches, championId:final.winnerId!, runnerUpId:final.winnerId === final.homeId ? final.awayId : final.homeId, thirdPlaceId:thirdPlace.winnerId!, finish, wins, draws, losses, goalsFor, goalsAgainst, perfect:final.winnerId === nationId && wins === 7 && draws === 0 };
}
