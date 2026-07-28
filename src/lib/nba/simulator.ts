import { NBA_TEAMS, getNbaTeam, type NbaPlaystyle, type NbaPlayer, type NbaTeam } from "@/lib/nba/data";

export interface NbaTeamMetrics {
  scoring: number;
  shooting: number;
  playmaking: number;
  defence: number;
  rebounding: number;
  athleticism: number;
  leadership: number;
  chemistry: number;
  pace: number;
  overall: number;
}

export interface NbaGame {
  id: string;
  gameNumber: number;
  stage: "regular" | "play-in" | "first-round" | "semifinals" | "conference-finals" | "finals";
  label: string;
  homeId: string;
  awayId: string;
  homeScore: number;
  awayScore: number;
  winnerId: string;
  overtime: number;
  upset: boolean;
}

export interface NbaStanding {
  teamId: string;
  conference: "East" | "West";
  played: number;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  differential: number;
  winPercentage: number;
  seed: number;
}

export interface NbaSeries {
  id: string;
  stage: "first-round" | "semifinals" | "conference-finals" | "finals";
  conference: "East" | "West" | "Finals";
  label: string;
  highSeedId: string;
  lowSeedId: string;
  highWins: number;
  lowWins: number;
  winnerId: string;
  games: NbaGame[];
}

export interface NbaSeasonResult {
  seed: number;
  teamId: string;
  playstyle: NbaPlaystyle;
  metrics: NbaTeamMetrics;
  regularSeason: NbaGame[];
  standings: NbaStanding[];
  playIn: NbaGame[];
  series: NbaSeries[];
  finish: string;
  championId: string;
  championship: boolean;
  userWins: number;
  userLosses: number;
  pointsFor: number;
  pointsAgainst: number;
  streak: number;
  conferenceSeed: number;
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

export function getNbaTeamMetrics(players: NbaPlayer[], playstyle: NbaPlaystyle): NbaTeamMetrics {
  if (!players.length) {
    return { scoring: 72, shooting: 72, playmaking: 72, defence: 72, rebounding: 72, athleticism: 72, leadership: 72, chemistry: 72, pace: 98, overall: 72 };
  }
  const average = (key: keyof Pick<NbaPlayer, "scoring" | "shooting" | "playmaking" | "defence" | "rebounding" | "athleticism" | "leadership">) =>
    players.reduce((sum, player) => sum + player[key], 0) / players.length;
  let scoring = average("scoring");
  let shooting = average("shooting");
  let playmaking = average("playmaking");
  let defence = average("defence");
  let rebounding = average("rebounding");
  const athleticism = average("athleticism");
  const leadership = average("leadership");
  let pace = 98;
  if (playstyle === "small-ball") {
    shooting += 2.5;
    playmaking += 2;
    defence += 0.5;
    pace = 102;
  } else if (playstyle === "twin-towers") {
    defence += 2;
    rebounding += 3.5;
    pace = 94;
  } else if (playstyle === "run-and-gun") {
    scoring += 2.5;
    playmaking += 1;
    defence -= 1.5;
    pace = 106;
  }
  const franchiseCounts = new Map<string, number>();
  for (const player of players) {
    const franchise = player.franchise.split(" / ")[0];
    franchiseCounts.set(franchise, (franchiseCounts.get(franchise) ?? 0) + 1);
  }
  const familiarPairs = [...franchiseCounts.values()].reduce((sum, count) => sum + Math.max(0, count - 1), 0);
  const chemistry = Math.min(99, 82 + familiarPairs * 2 + Math.max(0, playmaking - 91) * 0.45 + Math.max(0, leadership - 94) * 0.55);
  const overall = scoring * 0.17 + shooting * 0.13 + playmaking * 0.15 + defence * 0.19 + rebounding * 0.12 + athleticism * 0.08 + leadership * 0.08 + chemistry * 0.08;
  return {
    scoring: Math.round(Math.min(100, scoring)),
    shooting: Math.round(Math.min(100, shooting)),
    playmaking: Math.round(Math.min(100, playmaking)),
    defence: Math.round(Math.min(100, defence)),
    rebounding: Math.round(Math.min(100, rebounding)),
    athleticism: Math.round(athleticism),
    leadership: Math.round(leadership),
    chemistry: Math.round(chemistry),
    pace,
    overall: Math.round(Math.min(99, overall)),
  };
}

function roundRobin() {
  const rotation = NBA_TEAMS.map((team) => team.id);
  const rounds: Array<Array<{ homeId: string; awayId: string }>> = [];
  for (let round = 0; round < rotation.length - 1; round += 1) {
    const games: Array<{ homeId: string; awayId: string }> = [];
    for (let index = 0; index < rotation.length / 2; index += 1) {
      const first = rotation[index];
      const second = rotation[rotation.length - 1 - index];
      const flip = (round + index) % 2 === 1;
      games.push({ homeId: flip ? second : first, awayId: flip ? first : second });
    }
    rounds.push(games);
    rotation.splice(1, 0, rotation.pop()!);
  }
  return rounds;
}

function regularSchedule() {
  const base = roundRobin();
  const rounds = [
    ...base,
    ...base.map((games) => games.map((game) => ({ homeId: game.awayId, awayId: game.homeId }))),
    ...base.slice(0, 24).map((games, round) => games.map((game) => round % 2 ? game : ({ homeId: game.awayId, awayId: game.homeId }))),
  ];
  return rounds.flatMap((games, round) => games.map((game) => ({ ...game, round: round + 1 })));
}

function teamPower(team: NbaTeam, userTeamId: string, metrics: NbaTeamMetrics) {
  return team.id === userTeamId ? metrics.overall + metrics.chemistry * 0.018 : team.strength;
}

function playGame(
  homeId: string,
  awayId: string,
  random: () => number,
  userTeamId: string,
  metrics: NbaTeamMetrics,
  meta: Pick<NbaGame, "id" | "gameNumber" | "stage" | "label">,
): NbaGame {
  const home = getNbaTeam(homeId);
  const away = getNbaTeam(awayId);
  const homePower = teamPower(home, userTeamId, metrics) + 1.7;
  const awayPower = teamPower(away, userTeamId, metrics);
  const paceEffect = (metrics.pace - 98) * 0.22;
  const baseline = 112 + (homeId === userTeamId || awayId === userTeamId ? paceEffect : 0) + normal(random) * 3.5;
  let homeScore = Math.max(82, Math.round(baseline + (homePower - awayPower) * 1.25 + normal(random) * 8.5));
  let awayScore = Math.max(82, Math.round(baseline + (awayPower - homePower) * 1.25 + normal(random) * 8.5));
  let overtime = 0;
  while (homeScore === awayScore) {
    overtime += 1;
    homeScore += 4 + Math.floor(random() * 9);
    awayScore += 4 + Math.floor(random() * 9);
  }
  const winnerId = homeScore > awayScore ? homeId : awayId;
  const favouriteId = homePower >= awayPower ? homeId : awayId;
  return { ...meta, homeId, awayId, homeScore, awayScore, winnerId, overtime, upset: winnerId !== favouriteId };
}

function buildStandings(games: NbaGame[]) {
  const rows = new Map<string, NbaStanding>(NBA_TEAMS.map((team) => [team.id, {
    teamId: team.id,
    conference: team.conference,
    played: 0,
    wins: 0,
    losses: 0,
    pointsFor: 0,
    pointsAgainst: 0,
    differential: 0,
    winPercentage: 0,
    seed: 0,
  }]));
  for (const game of games) {
    const home = rows.get(game.homeId)!;
    const away = rows.get(game.awayId)!;
    home.played += 1;
    away.played += 1;
    home.pointsFor += game.homeScore;
    home.pointsAgainst += game.awayScore;
    away.pointsFor += game.awayScore;
    away.pointsAgainst += game.homeScore;
    if (game.winnerId === game.homeId) {
      home.wins += 1;
      away.losses += 1;
    } else {
      away.wins += 1;
      home.losses += 1;
    }
  }
  const ranked: NbaStanding[] = [];
  for (const conference of ["East", "West"] as const) {
    ranked.push(...[...rows.values()]
      .filter((row) => row.conference === conference)
      .map((row) => ({ ...row, differential: row.pointsFor - row.pointsAgainst, winPercentage: row.wins / row.played }))
      .sort((a, b) => b.wins - a.wins || b.differential - a.differential || b.pointsFor - a.pointsFor)
      .map((row, index) => ({ ...row, seed: index + 1 })));
  }
  return ranked;
}

function longestWinStreak(games: NbaGame[], teamId: string) {
  let current = 0;
  let best = 0;
  for (const game of games.filter((match) => match.homeId === teamId || match.awayId === teamId).sort((a, b) => a.gameNumber - b.gameNumber)) {
    if (game.winnerId === teamId) {
      current += 1;
      best = Math.max(best, current);
    } else current = 0;
  }
  return best;
}

export function simulateNbaSeason(teamId: string, players: NbaPlayer[], playstyle: NbaPlaystyle, seed: number): NbaSeasonResult {
  const random = mulberry32(seed);
  const metrics = getNbaTeamMetrics(players, playstyle);
  const schedule = regularSchedule();
  const regularSeason = schedule.map((game, index) => playGame(game.homeId, game.awayId, random, teamId, metrics, {
    id: `reg-${index + 1}`,
    gameNumber: game.round,
    stage: "regular",
    label: `Game ${game.round}`,
  }));
  const standings = buildStandings(regularSeason);
  const playIn: NbaGame[] = [];
  const series: NbaSeries[] = [];
  let knockoutGame = 0;

  const singleElimination = (homeId: string, awayId: string, label: string) => {
    knockoutGame += 1;
    const game = playGame(homeId, awayId, random, teamId, metrics, {
      id: `pi-${knockoutGame}`,
      gameNumber: 82 + knockoutGame,
      stage: "play-in",
      label,
    });
    playIn.push(game);
    return game;
  };

  const playSeries = (
    highSeedId: string,
    lowSeedId: string,
    stage: NbaSeries["stage"],
    conference: NbaSeries["conference"],
    label: string,
  ) => {
    let highWins = 0;
    let lowWins = 0;
    const games: NbaGame[] = [];
    const homePattern = [highSeedId, highSeedId, lowSeedId, lowSeedId, highSeedId, lowSeedId, highSeedId];
    while (highWins < 4 && lowWins < 4) {
      const gameIndex = games.length;
      const homeId = homePattern[gameIndex];
      const awayId = homeId === highSeedId ? lowSeedId : highSeedId;
      const game = playGame(homeId, awayId, random, teamId, metrics, {
        id: `po-${series.length + 1}-${gameIndex + 1}`,
        gameNumber: 90 + series.reduce((sum, item) => sum + item.games.length, 0) + gameIndex,
        stage,
        label: `${label} · Game ${gameIndex + 1}`,
      });
      games.push(game);
      if (game.winnerId === highSeedId) highWins += 1;
      else lowWins += 1;
    }
    const item: NbaSeries = {
      id: `series-${series.length + 1}`,
      stage,
      conference,
      label,
      highSeedId,
      lowSeedId,
      highWins,
      lowWins,
      winnerId: highWins === 4 ? highSeedId : lowSeedId,
      games,
    };
    series.push(item);
    return item;
  };

  const conferenceWinners: string[] = [];
  for (const conference of ["East", "West"] as const) {
    const conferenceRows = standings.filter((row) => row.conference === conference).sort((a, b) => a.seed - b.seed);
    const sevenEight = singleElimination(conferenceRows[6].teamId, conferenceRows[7].teamId, `${conference} Play-In · 7 v 8`);
    const nineTen = singleElimination(conferenceRows[8].teamId, conferenceRows[9].teamId, `${conference} Play-In · 9 v 10`);
    const sevenSeed = sevenEight.winnerId;
    const sevenEightLoser = sevenEight.winnerId === sevenEight.homeId ? sevenEight.awayId : sevenEight.homeId;
    const eightDecider = singleElimination(sevenEightLoser, nineTen.winnerId, `${conference} Play-In · 8th seed game`);
    const eightSeed = eightDecider.winnerId;
    const firstRound = [
      playSeries(conferenceRows[0].teamId, eightSeed, "first-round", conference, `${conference} First Round · 1 v 8`),
      playSeries(conferenceRows[3].teamId, conferenceRows[4].teamId, "first-round", conference, `${conference} First Round · 4 v 5`),
      playSeries(conferenceRows[1].teamId, sevenSeed, "first-round", conference, `${conference} First Round · 2 v 7`),
      playSeries(conferenceRows[2].teamId, conferenceRows[5].teamId, "first-round", conference, `${conference} First Round · 3 v 6`),
    ];
    const semiA = playSeries(firstRound[0].winnerId, firstRound[1].winnerId, "semifinals", conference, `${conference} Semifinal 1`);
    const semiB = playSeries(firstRound[2].winnerId, firstRound[3].winnerId, "semifinals", conference, `${conference} Semifinal 2`);
    const conferenceFinal = playSeries(semiA.winnerId, semiB.winnerId, "conference-finals", conference, `${conference} Conference Finals`);
    conferenceWinners.push(conferenceFinal.winnerId);
  }

  const winnerA = standings.find((row) => row.teamId === conferenceWinners[0])!;
  const winnerB = standings.find((row) => row.teamId === conferenceWinners[1])!;
  const finalsHigh = winnerA.wins >= winnerB.wins ? winnerA.teamId : winnerB.teamId;
  const finalsLow = finalsHigh === winnerA.teamId ? winnerB.teamId : winnerA.teamId;
  const finals = playSeries(finalsHigh, finalsLow, "finals", "Finals", "NBA Finals");

  const userGames = regularSeason.filter((game) => game.homeId === teamId || game.awayId === teamId);
  const userWins = userGames.filter((game) => game.winnerId === teamId).length;
  const pointsFor = userGames.reduce((sum, game) => sum + (game.homeId === teamId ? game.homeScore : game.awayScore), 0);
  const pointsAgainst = userGames.reduce((sum, game) => sum + (game.homeId === teamId ? game.awayScore : game.homeScore), 0);
  const userStanding = standings.find((row) => row.teamId === teamId)!;
  const userSeries = series.filter((item) => item.highSeedId === teamId || item.lowSeedId === teamId);
  const userPlayIn = playIn.filter((game) => game.homeId === teamId || game.awayId === teamId);
  const lastSeries = userSeries.at(-1);
  let finish = `${userStanding.conference} #${userStanding.seed}`;
  if (finals.winnerId === teamId) finish = "NBA Champions";
  else if (lastSeries?.stage === "finals") finish = "NBA Finalists";
  else if (lastSeries?.stage === "conference-finals") finish = "Conference Finalists";
  else if (lastSeries?.stage === "semifinals") finish = "Conference Semifinalists";
  else if (lastSeries?.stage === "first-round") finish = "First Round";
  else if (userPlayIn.length) finish = "Play-In Tournament";

  return {
    seed,
    teamId,
    playstyle,
    metrics,
    regularSeason,
    standings,
    playIn,
    series,
    finish,
    championId: finals.winnerId,
    championship: finals.winnerId === teamId,
    userWins,
    userLosses: 82 - userWins,
    pointsFor,
    pointsAgainst,
    streak: longestWinStreak(regularSeason, teamId),
    conferenceSeed: userStanding.seed,
  };
}
