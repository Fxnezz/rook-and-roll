import { AFL_CLUBS, type AflClub, type AflPlayer } from "@/lib/afl/data";

export interface TeamMetrics {
  attack: number;
  midfield: number;
  defence: number;
  athleticism: number;
  leadership: number;
  chemistry: number;
  overall: number;
}

export interface AflScore {
  goals: number;
  behinds: number;
  total: number;
}

export interface SimulatedMatch {
  id: string;
  round: number;
  stage: "home-away" | "wildcard" | "qualifying" | "elimination" | "semi" | "preliminary" | "grand-final";
  label: string;
  homeId: string;
  awayId: string;
  homeScore: AflScore;
  awayScore: AflScore;
  winnerId: string | null;
  margin: number;
  extraTime: boolean;
  upset: boolean;
}

export interface LadderRow {
  clubId: string;
  played: number;
  wins: number;
  losses: number;
  draws: number;
  pointsFor: number;
  pointsAgainst: number;
  premiershipPoints: number;
  percentage: number;
  position: number;
}

export interface SeasonResult {
  seed: number;
  clubId: string;
  metrics: TeamMetrics;
  homeAway: SimulatedMatch[];
  ladder: LadderRow[];
  finals: SimulatedMatch[];
  finish: string;
  premiership: boolean;
  userWins: number;
  userLosses: number;
  userDraws: number;
  userPointsFor: number;
  userPointsAgainst: number;
  streak: number;
}

function mulberry32(seed: number) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function normal(random: () => number) {
  const u = Math.max(random(), 0.000001);
  const v = Math.max(random(), 0.000001);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function getTeamMetrics(players: AflPlayer[]): TeamMetrics {
  if (!players.length) {
    return { attack: 70, midfield: 70, defence: 70, athleticism: 70, leadership: 70, chemistry: 70, overall: 70 };
  }
  const average = (key: keyof Pick<AflPlayer, "attack" | "midfield" | "defence" | "athleticism" | "leadership">) =>
    players.reduce((sum, player) => sum + player[key], 0) / players.length;
  const attack = average("attack");
  const midfield = average("midfield");
  const defence = average("defence");
  const athleticism = average("athleticism");
  const leadership = average("leadership");
  const clubCounts = new Map<string, number>();
  for (const player of players) {
    const club = player.representativeClub.split(" / ")[0];
    clubCounts.set(club, (clubCounts.get(club) ?? 0) + 1);
  }
  const familiarPairs = [...clubCounts.values()].reduce((sum, count) => sum + Math.max(0, count - 1), 0);
  const chemistry = Math.min(99, 80 + familiarPairs * 2 + Math.max(0, leadership - 92) * 0.8);
  const overall = attack * 0.24 + midfield * 0.29 + defence * 0.24 + athleticism * 0.1 + leadership * 0.08 + chemistry * 0.05;
  return {
    attack: Math.round(attack),
    midfield: Math.round(midfield),
    defence: Math.round(defence),
    athleticism: Math.round(athleticism),
    leadership: Math.round(leadership),
    chemistry: Math.round(chemistry),
    overall: Math.round(overall),
  };
}

function fixtureRounds(): Array<Array<{ homeId: string; awayId: string }>> {
  const ids = AFL_CLUBS.map((club) => club.id);
  const rotation = [...ids];
  const rounds: Array<Array<{ homeId: string; awayId: string }>> = [];
  for (let round = 0; round < ids.length - 1; round += 1) {
    const games: Array<{ homeId: string; awayId: string }> = [];
    for (let index = 0; index < ids.length / 2; index += 1) {
      const first = rotation[index];
      const second = rotation[rotation.length - 1 - index];
      const flip = (round + index) % 2 === 1;
      games.push({ homeId: flip ? second : first, awayId: flip ? first : second });
    }
    rounds.push(games);
    rotation.splice(1, 0, rotation.pop()!);
  }
  for (let round = 0; round < 6; round += 1) {
    rounds.push(rounds[round].map((game) => ({ homeId: game.awayId, awayId: game.homeId })));
  }
  return rounds;
}

function clubPower(club: AflClub, userClubId: string, metrics: TeamMetrics) {
  if (club.id !== userClubId) return club.strength;
  return metrics.overall - 2 + metrics.chemistry * 0.025;
}

function toAflScore(expectedPoints: number, random: () => number): AflScore {
  const totalAttempts = Math.max(8, Math.round(expectedPoints / 3.65 + normal(random) * 1.8));
  const accuracy = Math.min(0.68, Math.max(0.42, 0.535 + normal(random) * 0.045));
  const goals = Math.max(1, Math.round(totalAttempts * accuracy));
  const behinds = Math.max(1, totalAttempts - goals);
  return { goals, behinds, total: goals * 6 + behinds };
}

function playMatch(
  home: AflClub,
  away: AflClub,
  random: () => number,
  userClubId: string,
  metrics: TeamMetrics,
  meta: Pick<SimulatedMatch, "id" | "round" | "stage" | "label">,
  knockout = false,
): SimulatedMatch {
  const homePower = clubPower(home, userClubId, metrics) + 2.1;
  const awayPower = clubPower(away, userClubId, metrics);
  const tempo = 73 + normal(random) * 7;
  const homeExpected = tempo + (homePower - awayPower) * 2.15 + normal(random) * 7;
  const awayExpected = tempo + (awayPower - homePower) * 2.15 + normal(random) * 7;
  let homeScore = toAflScore(homeExpected, random);
  let awayScore = toAflScore(awayExpected, random);
  let extraTime = false;
  if (knockout && homeScore.total === awayScore.total) {
    extraTime = true;
    if (random() >= 0.5) homeScore = { ...homeScore, behinds: homeScore.behinds + 1, total: homeScore.total + 1 };
    else awayScore = { ...awayScore, behinds: awayScore.behinds + 1, total: awayScore.total + 1 };
  }
  const winnerId = homeScore.total === awayScore.total ? null : homeScore.total > awayScore.total ? home.id : away.id;
  const favouriteId = homePower >= awayPower ? home.id : away.id;
  return {
    ...meta,
    homeId: home.id,
    awayId: away.id,
    homeScore,
    awayScore,
    winnerId,
    margin: Math.abs(homeScore.total - awayScore.total),
    extraTime,
    upset: winnerId !== null && winnerId !== favouriteId,
  };
}

function buildLadder(matches: SimulatedMatch[]): LadderRow[] {
  const rows = new Map<string, LadderRow>(AFL_CLUBS.map((club) => [club.id, {
    clubId: club.id, played: 0, wins: 0, losses: 0, draws: 0, pointsFor: 0, pointsAgainst: 0, premiershipPoints: 0, percentage: 0, position: 0,
  }]));
  for (const match of matches) {
    const home = rows.get(match.homeId)!;
    const away = rows.get(match.awayId)!;
    home.played += 1;
    away.played += 1;
    home.pointsFor += match.homeScore.total;
    home.pointsAgainst += match.awayScore.total;
    away.pointsFor += match.awayScore.total;
    away.pointsAgainst += match.homeScore.total;
    if (match.winnerId === null) {
      home.draws += 1;
      away.draws += 1;
      home.premiershipPoints += 2;
      away.premiershipPoints += 2;
    } else if (match.winnerId === match.homeId) {
      home.wins += 1;
      away.losses += 1;
      home.premiershipPoints += 4;
    } else {
      away.wins += 1;
      home.losses += 1;
      away.premiershipPoints += 4;
    }
  }
  return [...rows.values()]
    .map((row) => ({ ...row, percentage: row.pointsAgainst ? (row.pointsFor / row.pointsAgainst) * 100 : 0 }))
    .sort((a, b) => b.premiershipPoints - a.premiershipPoints || b.percentage - a.percentage || b.pointsFor - a.pointsFor)
    .map((row, index) => ({ ...row, position: index + 1 }));
}

function longestWinStreak(matches: SimulatedMatch[], clubId: string) {
  let best = 0;
  let current = 0;
  for (const match of matches.filter((game) => game.homeId === clubId || game.awayId === clubId).sort((a, b) => a.round - b.round)) {
    if (match.winnerId === clubId) {
      current += 1;
      best = Math.max(best, current);
    } else current = 0;
  }
  return best;
}

export function simulateSeason(clubId: string, players: AflPlayer[], seed: number): SeasonResult {
  const random = mulberry32(seed);
  const metrics = getTeamMetrics(players);
  const clubMap = new Map(AFL_CLUBS.map((club) => [club.id, club]));
  const rounds = fixtureRounds();
  const homeAway: SimulatedMatch[] = [];
  rounds.forEach((games, roundIndex) => {
    games.forEach((game, gameIndex) => {
      homeAway.push(playMatch(clubMap.get(game.homeId)!, clubMap.get(game.awayId)!, random, clubId, metrics, {
        id: `r${roundIndex + 1}-${gameIndex + 1}`,
        round: roundIndex + 1,
        stage: "home-away",
        label: `Round ${roundIndex + 1}`,
      }));
    });
  });
  const ladder = buildLadder(homeAway);
  const finals: SimulatedMatch[] = [];
  const playFinal = (homeId: string, awayId: string, stage: SimulatedMatch["stage"], label: string, round: number) => {
    const match = playMatch(clubMap.get(homeId)!, clubMap.get(awayId)!, random, clubId, metrics, {
      id: `f${finals.length + 1}`,
      round,
      stage,
      label,
    }, true);
    finals.push(match);
    return match;
  };

  const ranking = (id: string) => ladder.find((row) => row.clubId === id)!.position;
  const top = ladder.slice(0, 10).map((row) => row.clubId);
  const wildcardA = playFinal(top[6], top[9], "wildcard", "Wildcard Final · 7th v 10th", 24);
  const wildcardB = playFinal(top[7], top[8], "wildcard", "Wildcard Final · 8th v 9th", 24);
  const wildcardWinners = [wildcardA.winnerId!, wildcardB.winnerId!].sort((a, b) => ranking(a) - ranking(b));
  const finalEight = [...top.slice(0, 6), ...wildcardWinners];

  const qf1 = playFinal(finalEight[0], finalEight[3], "qualifying", "Qualifying Final · 1st v 4th", 25);
  const qf2 = playFinal(finalEight[1], finalEight[2], "qualifying", "Qualifying Final · 2nd v 3rd", 25);
  const ef1 = playFinal(finalEight[4], finalEight[7], "elimination", "Elimination Final · 5th v 8th", 25);
  const ef2 = playFinal(finalEight[5], finalEight[6], "elimination", "Elimination Final · 6th v 7th", 25);
  const loser = (match: SimulatedMatch) => match.winnerId === match.homeId ? match.awayId : match.homeId;
  const sf1 = playFinal(loser(qf1), ef1.winnerId!, "semi", "Semi Final 1", 26);
  const sf2 = playFinal(loser(qf2), ef2.winnerId!, "semi", "Semi Final 2", 26);
  const pf1 = playFinal(qf1.winnerId!, sf2.winnerId!, "preliminary", "Preliminary Final 1", 27);
  const pf2 = playFinal(qf2.winnerId!, sf1.winnerId!, "preliminary", "Preliminary Final 2", 27);
  const grandFinal = playFinal(pf1.winnerId!, pf2.winnerId!, "grand-final", "Grand Final", 28);

  const userMatches = homeAway.filter((match) => match.homeId === clubId || match.awayId === clubId);
  const userWins = userMatches.filter((match) => match.winnerId === clubId).length;
  const userDraws = userMatches.filter((match) => match.winnerId === null).length;
  const userLosses = userMatches.length - userWins - userDraws;
  const userPointsFor = userMatches.reduce((sum, match) => sum + (match.homeId === clubId ? match.homeScore.total : match.awayScore.total), 0);
  const userPointsAgainst = userMatches.reduce((sum, match) => sum + (match.homeId === clubId ? match.awayScore.total : match.homeScore.total), 0);
  const ladderPosition = ladder.find((row) => row.clubId === clubId)!.position;
  const userFinals = finals.filter((match) => match.homeId === clubId || match.awayId === clubId);
  const lastUserFinal = userFinals.at(-1);
  let finish = `${ladderPosition}${ladderPosition === 1 ? "st" : ladderPosition === 2 ? "nd" : ladderPosition === 3 ? "rd" : "th"} after home-and-away`;
  if (grandFinal.winnerId === clubId) finish = "Premiers";
  else if (lastUserFinal?.stage === "grand-final") finish = "Grand Finalists";
  else if (lastUserFinal?.stage === "preliminary") finish = "Preliminary Finalists";
  else if (lastUserFinal?.stage === "semi") finish = "Semi Finalists";
  else if (lastUserFinal?.stage === "elimination" || lastUserFinal?.stage === "qualifying") finish = "Finalists";
  else if (lastUserFinal?.stage === "wildcard") finish = "Wildcard Finalists";

  return {
    seed,
    clubId,
    metrics,
    homeAway,
    ladder,
    finals,
    finish,
    premiership: grandFinal.winnerId === clubId,
    userWins,
    userLosses,
    userDraws,
    userPointsFor,
    userPointsAgainst,
    streak: longestWinStreak(homeAway, clubId),
  };
}

export function scoreText(score: AflScore) {
  return `${score.goals}.${score.behinds} (${score.total})`;
}
