export type FootballPosition = "GK" | "RB" | "CB" | "LB" | "DM" | "CM" | "AM" | "RW" | "LW" | "ST";
export type FootballTactic = "balanced" | "possession" | "high-press" | "counter";
export type FootballFormationId = "4-3-3" | "4-4-2" | "4-2-3-1" | "3-4-3";

export interface FootballClub {
  id: string;
  city: string;
  name: string;
  short: string;
  primary: string;
  secondary: string;
  strength: number;
}

export interface FootballPlayer {
  id: string;
  name: string;
  positions: FootballPosition[];
  nation: string;
  clubs: string;
  era: string;
  attack: number;
  creation: number;
  control: number;
  defending: number;
  pace: number;
  physical: number;
  mentality: number;
  goalkeeping: number;
  trait: string;
}

export interface FootballSlot {
  id: string;
  label: string;
  short: string;
  accepts: FootballPosition[];
  x: number;
  y: number;
}

export interface FootballFormation {
  id: FootballFormationId;
  label: string;
  detail: string;
  identity: string;
  slots: FootballSlot[];
}

const slot = (id: string, label: string, short: string, accepts: FootballPosition[], x: number, y: number): FootballSlot => ({ id, label, short, accepts, x, y });

export const FOOTBALL_FORMATIONS: FootballFormation[] = [
  {
    id: "4-3-3", label: "4-3-3", detail: "Width, a midfield triangle and three genuine forwards.", identity: "Relentless width",
    slots: [
      slot("gk", "Goalkeeper", "GK", ["GK"], 50, 92), slot("lb", "Left Back", "LB", ["LB"], 15, 75),
      slot("lcb", "Left Centre Back", "CB", ["CB"], 38, 77), slot("rcb", "Right Centre Back", "CB", ["CB"], 62, 77),
      slot("rb", "Right Back", "RB", ["RB"], 85, 75), slot("dm", "Holding Midfielder", "DM", ["DM", "CM"], 50, 59),
      slot("lcm", "Left Central Midfielder", "CM", ["CM", "AM"], 32, 46), slot("rcm", "Right Central Midfielder", "CM", ["CM", "AM"], 68, 46),
      slot("lw", "Left Wing", "LW", ["LW", "ST"], 18, 22), slot("st", "Striker", "ST", ["ST"], 50, 13), slot("rw", "Right Wing", "RW", ["RW", "ST"], 82, 22),
    ],
  },
  {
    id: "4-4-2", label: "4-4-2", detail: "Classic balance, two banks of four and a strike partnership.", identity: "Two-striker pressure",
    slots: [
      slot("gk", "Goalkeeper", "GK", ["GK"], 50, 92), slot("lb", "Left Back", "LB", ["LB"], 15, 75),
      slot("lcb", "Left Centre Back", "CB", ["CB"], 38, 77), slot("rcb", "Right Centre Back", "CB", ["CB"], 62, 77), slot("rb", "Right Back", "RB", ["RB"], 85, 75),
      slot("lm", "Left Midfielder", "LM", ["LW", "CM"], 17, 50), slot("lcm", "Left Central Midfielder", "CM", ["CM", "DM"], 40, 53),
      slot("rcm", "Right Central Midfielder", "CM", ["CM", "DM"], 60, 53), slot("rm", "Right Midfielder", "RM", ["RW", "CM"], 83, 50),
      slot("lst", "Left Striker", "ST", ["ST", "LW"], 39, 17), slot("rst", "Right Striker", "ST", ["ST", "RW"], 61, 17),
    ],
  },
  {
    id: "4-2-3-1", label: "4-2-3-1", detail: "Double pivot security behind a fluid creative line.", identity: "Control between lines",
    slots: [
      slot("gk", "Goalkeeper", "GK", ["GK"], 50, 92), slot("lb", "Left Back", "LB", ["LB"], 15, 75),
      slot("lcb", "Left Centre Back", "CB", ["CB"], 38, 77), slot("rcb", "Right Centre Back", "CB", ["CB"], 62, 77), slot("rb", "Right Back", "RB", ["RB"], 85, 75),
      slot("ldm", "Left Holding Midfielder", "DM", ["DM", "CM"], 38, 59), slot("rdm", "Right Holding Midfielder", "DM", ["DM", "CM"], 62, 59),
      slot("lam", "Left Attacking Midfielder", "LW", ["LW", "AM"], 19, 34), slot("am", "Number Ten", "AM", ["AM", "CM"], 50, 36),
      slot("ram", "Right Attacking Midfielder", "RW", ["RW", "AM"], 81, 34), slot("st", "Striker", "ST", ["ST"], 50, 13),
    ],
  },
  {
    id: "3-4-3", label: "3-4-3", detail: "Three centre backs, aggressive wing-backs and a front three.", identity: "Front-foot overloads",
    slots: [
      slot("gk", "Goalkeeper", "GK", ["GK"], 50, 92), slot("lcb", "Left Centre Back", "CB", ["CB", "LB"], 27, 76),
      slot("cb", "Central Centre Back", "CB", ["CB"], 50, 80), slot("rcb", "Right Centre Back", "CB", ["CB", "RB"], 73, 76),
      slot("lwb", "Left Wing Back", "LWB", ["LB", "LW"], 13, 53), slot("lcm", "Left Central Midfielder", "CM", ["CM", "DM"], 39, 55),
      slot("rcm", "Right Central Midfielder", "CM", ["CM", "DM"], 61, 55), slot("rwb", "Right Wing Back", "RWB", ["RB", "RW"], 87, 53),
      slot("lw", "Left Forward", "LW", ["LW", "ST"], 20, 22), slot("st", "Striker", "ST", ["ST"], 50, 13), slot("rw", "Right Forward", "RW", ["RW", "ST"], 80, 22),
    ],
  },
];

export const FOOTBALL_TACTICS: Array<{ id: FootballTactic; label: string; icon: string; detail: string }> = [
  { id: "balanced", label: "Balanced", icon: "◇", detail: "Adapt to the match without exposing a single phase." },
  { id: "possession", label: "Possession", icon: "◎", detail: "Dominate the ball, compress the pitch and create patiently." },
  { id: "high-press", label: "High Press", icon: "⚡", detail: "Win it back immediately and turn territory into chances." },
  { id: "counter", label: "Counter Attack", icon: "↗", detail: "Defend compactly, then explode into open grass." },
];

export const FOOTBALL_CLUBS: FootballClub[] = [
  { id: "ars", city: "North London", name: "Arsenal", short: "ARS", primary: "#d71920", secondary: "#f7f7f7", strength: 91 },
  { id: "avl", city: "Birmingham", name: "Aston Villa", short: "AVL", primary: "#670e36", secondary: "#95bfe5", strength: 84 },
  { id: "bou", city: "Bournemouth", name: "Cherries", short: "BOU", primary: "#da291c", secondary: "#111111", strength: 79 },
  { id: "bre", city: "West London", name: "Brentford", short: "BRE", primary: "#e30613", secondary: "#f7d117", strength: 80 },
  { id: "bha", city: "Brighton", name: "Seagulls", short: "BHA", primary: "#0057b8", secondary: "#ffffff", strength: 82 },
  { id: "bur", city: "Burnley", name: "Clarets", short: "BUR", primary: "#6c1d45", secondary: "#99d6ea", strength: 75 },
  { id: "che", city: "West London", name: "Chelsea", short: "CHE", primary: "#034694", secondary: "#ffffff", strength: 87 },
  { id: "cry", city: "South London", name: "Crystal Palace", short: "CRY", primary: "#1b458f", secondary: "#c4122e", strength: 80 },
  { id: "eve", city: "Liverpool", name: "Everton", short: "EVE", primary: "#003399", secondary: "#ffffff", strength: 78 },
  { id: "ful", city: "West London", name: "Fulham", short: "FUL", primary: "#f5f5f5", secondary: "#111111", strength: 81 },
  { id: "lee", city: "Leeds", name: "United", short: "LEE", primary: "#ffffff", secondary: "#ffcd00", strength: 77 },
  { id: "liv", city: "Liverpool", name: "Reds", short: "LIV", primary: "#c8102e", secondary: "#f6eb61", strength: 92 },
  { id: "mci", city: "Manchester", name: "City", short: "MCI", primary: "#6cabdd", secondary: "#ffffff", strength: 93 },
  { id: "mun", city: "Manchester", name: "United", short: "MUN", primary: "#da291c", secondary: "#fbe122", strength: 84 },
  { id: "new", city: "Newcastle", name: "United", short: "NEW", primary: "#111111", secondary: "#ffffff", strength: 87 },
  { id: "nfo", city: "Nottingham", name: "Forest", short: "NFO", primary: "#dd0000", secondary: "#ffffff", strength: 83 },
  { id: "sun", city: "Sunderland", name: "Black Cats", short: "SUN", primary: "#eb172b", secondary: "#ffffff", strength: 76 },
  { id: "tot", city: "North London", name: "Tottenham", short: "TOT", primary: "#132257", secondary: "#ffffff", strength: 85 },
  { id: "whu", city: "East London", name: "West Ham", short: "WHU", primary: "#7a263a", secondary: "#1bb1e7", strength: 80 },
  { id: "wol", city: "Wolverhampton", name: "Wolves", short: "WOL", primary: "#fdb913", secondary: "#231f20", strength: 77 },
];

type PlayerTuple = [string, string, FootballPosition[], string, string, string, number, number, number, number, number, number, number, number, string];
const rawPlayers: PlayerTuple[] = [
  ["yashin","Lev Yashin",["GK"],"Soviet Union","Dynamo Moscow","1950–1970",18,42,70,40,79,88,100,100,"The original sweeping wall"],
  ["buffon","Gianluigi Buffon",["GK"],"Italy","Parma / Juventus","1995–2023",15,45,74,42,70,91,100,99,"Big-match penalty guardian"],
  ["casillas","Iker Casillas",["GK"],"Spain","Real Madrid","1999–2020",14,48,73,38,91,78,99,98,"Lightning reflex captain"],
  ["neuer","Manuel Neuer",["GK"],"Germany","Bayern Munich","2005–present",22,72,88,57,89,86,98,99,"Sweeper-keeper revolution"],
  ["schmeichel","Peter Schmeichel",["GK"],"Denmark","Manchester United","1981–2003",18,47,70,41,76,97,100,99,"Penalty-box authority"],
  ["cech","Petr Cech",["GK"],"Czech Republic","Chelsea / Arsenal","1999–2019",16,50,73,43,71,92,99,98,"Angles and impossible reach"],
  ["cafu","Cafu",["RB"],"Brazil","Roma / Milan","1989–2008",83,87,91,93,98,90,99,8,"Endless overlapping captain"],
  ["alves","Dani Alves",["RB","CM"],"Brazil","Barcelona / Sevilla","2001–2023",88,96,96,87,94,78,97,8,"Playmaker from full-back"],
  ["lahm","Philipp Lahm",["RB","LB","DM"],"Germany","Bayern Munich","2002–2017",76,92,98,98,88,80,100,8,"Positionally flawless"],
  ["zanetti","Javier Zanetti",["RB","LB","DM"],"Argentina","Inter Milan","1992–2014",78,88,94,98,94,96,100,8,"Two-decade engine"],
  ["walker","Kyle Walker",["RB","CB"],"England","Tottenham / Manchester City","2008–present",76,82,87,93,100,94,93,8,"Recovery-speed eraser"],
  ["trent","Trent Alexander-Arnold",["RB","CM"],"England","Liverpool","2016–present",82,99,95,80,88,77,91,8,"Quarterback distribution"],
  ["maldini","Paolo Maldini",["CB","LB"],"Italy","AC Milan","1984–2009",65,80,93,100,94,90,100,8,"Defensive geometry"],
  ["beckenbauer","Franz Beckenbauer",["CB","DM"],"Germany","Bayern Munich","1964–1983",82,95,98,100,91,90,100,8,"Libero conductor"],
  ["baresi","Franco Baresi",["CB"],"Italy","AC Milan","1977–1997",55,79,94,100,87,88,100,8,"Offside-line mastermind"],
  ["ramos","Sergio Ramos",["CB","RB"],"Spain","Real Madrid / Sevilla","2003–present",78,82,88,97,91,97,100,8,"Final-minute warrior"],
  ["nesta","Alessandro Nesta",["CB"],"Italy","Lazio / AC Milan","1993–2014",52,75,91,100,86,91,98,8,"Silken one-on-one defender"],
  ["vvd","Virgil van Dijk",["CB"],"Netherlands","Liverpool / Southampton","2011–present",73,83,92,99,94,99,97,8,"Aerial command centre"],
  ["ferdinand","Rio Ferdinand",["CB"],"England","Manchester United","1996–2015",58,83,94,98,92,93,98,8,"Press-resistant organiser"],
  ["terry","John Terry",["CB"],"England","Chelsea","1998–2018",72,72,86,99,74,99,100,8,"Last-ditch leader"],
  ["cannavaro","Fabio Cannavaro",["CB"],"Italy","Parma / Juventus / Real Madrid","1992–2011",54,72,88,100,89,96,100,8,"Anticipation over height"],
  ["roberto-carlos","Roberto Carlos",["LB"],"Brazil","Real Madrid","1991–2015",92,86,90,90,100,99,97,8,"Explosive left-foot force"],
  ["marcelo","Marcelo",["LB","LW"],"Brazil","Real Madrid","2005–2024",88,96,98,84,93,79,96,8,"Street football full-back"],
  ["ashley-cole","Ashley Cole",["LB"],"England","Arsenal / Chelsea","1999–2019",78,84,91,98,96,88,98,8,"Elite winger stopper"],
  ["evra","Patrice Evra",["LB"],"France","Manchester United / Monaco","1998–2018",78,84,89,94,94,92,98,8,"High-energy left channel"],
  ["busquets","Sergio Busquets",["DM","CM"],"Spain","Barcelona","2008–present",68,96,100,96,67,84,100,8,"Press-escape metronome"],
  ["makelele","Claude Makelele",["DM","CM"],"France","Chelsea / Real Madrid","1991–2011",58,87,94,100,84,92,100,8,"The role named after him"],
  ["kante","N'Golo Kante",["DM","CM"],"France","Chelsea / Leicester","2011–present",73,86,94,100,96,94,100,8,"Midfield everywhere at once"],
  ["rodri","Rodri",["DM","CM"],"Spain","Manchester City","2015–present",81,96,99,97,76,95,99,8,"Tempo and territory controller"],
  ["vieira","Patrick Vieira",["DM","CM"],"France","Arsenal / Inter Milan","1993–2011",83,89,94,98,91,100,100,8,"Midfield power sovereign"],
  ["matthaus","Lothar Matthaus",["DM","CM","AM"],"Germany","Bayern Munich / Inter Milan","1979–2000",92,94,97,97,94,96,100,8,"Complete box-to-box captain"],
  ["casemiro","Casemiro",["DM","CM"],"Brazil","Real Madrid / Manchester United","2010–present",77,82,88,98,77,98,99,8,"Knockout-stage shield"],
  ["xavi","Xavi",["CM","AM"],"Spain","Barcelona","1998–2019",82,100,100,84,78,73,100,8,"Possession's compass"],
  ["iniesta","Andres Iniesta",["CM","AM","LW"],"Spain","Barcelona","2002–2023",88,99,100,81,90,74,100,8,"Pressure-proof illusionist"],
  ["modric","Luka Modric",["CM","AM"],"Croatia","Real Madrid / Tottenham","2003–present",86,99,100,90,88,79,100,8,"Outside-foot orchestration"],
  ["kroos","Toni Kroos",["CM","DM"],"Germany","Real Madrid / Bayern Munich","2007–2024",83,100,100,84,70,79,100,8,"Millimetre passing range"],
  ["gerrard","Steven Gerrard",["CM","DM","AM"],"England","Liverpool","1998–2016",93,95,96,92,91,96,100,8,"One-man comeback engine"],
  ["lampard","Frank Lampard",["CM","AM"],"England","Chelsea","1995–2016",97,92,94,84,83,90,100,8,"Midfield goal avalanche"],
  ["scholes","Paul Scholes",["CM","DM"],"England","Manchester United","1993–2013",88,99,99,78,74,82,99,8,"Long-range passing master"],
  ["de-bruyne","Kevin De Bruyne",["CM","AM","RW"],"Belgium","Manchester City","2008–present",94,100,98,78,88,88,99,8,"Final-ball machine"],
  ["zidane","Zinedine Zidane",["AM","CM"],"France","Juventus / Real Madrid","1989–2006",95,100,100,79,88,90,100,8,"Big-stage elegance"],
  ["maradona","Diego Maradona",["AM","RW","ST"],"Argentina","Napoli / Barcelona","1976–1997",99,100,100,65,97,86,100,8,"Solo-match takeover"],
  ["cruyff","Johan Cruyff",["AM","ST","LW"],"Netherlands","Ajax / Barcelona","1964–1984",99,100,100,72,98,82,100,8,"Total-football brain"],
  ["kaka","Kaka",["AM","CM"],"Brazil","AC Milan / Real Madrid","2001–2017",96,97,98,73,99,87,98,8,"Gliding transition creator"],
  ["bergkamp","Dennis Bergkamp",["AM","ST"],"Netherlands","Arsenal / Inter Milan","1986–2006",96,99,100,68,83,83,100,8,"First-touch architect"],
  ["platini","Michel Platini",["AM","CM"],"France","Juventus","1972–1987",97,99,99,73,84,79,100,8,"Scoring playmaker"],
  ["messi","Lionel Messi",["RW","AM","ST"],"Argentina","Barcelona / Paris","2004–present",100,100,100,66,97,79,100,8,"Unsolvable left-foot genius"],
  ["garrincha","Garrincha",["RW"],"Brazil","Botafogo","1953–1972",98,96,100,61,100,76,98,8,"Joyful one-on-one destroyer"],
  ["salah","Mohamed Salah",["RW","ST"],"Egypt","Liverpool / Roma","2010–present",99,94,96,73,99,89,99,8,"Inside-forward scoring storm"],
  ["figo","Luis Figo",["RW","AM"],"Portugal","Barcelona / Real Madrid / Inter","1989–2009",94,98,99,76,92,84,99,8,"Elite touchline creator"],
  ["best","George Best",["RW","LW","ST"],"Northern Ireland","Manchester United","1963–1984",99,96,100,66,100,83,98,8,"The original superstar winger"],
  ["beckham","David Beckham",["RW","CM"],"England","Manchester United / Real Madrid","1992–2013",87,100,96,79,80,86,100,8,"Crossing and dead-ball precision"],
  ["cristiano","Cristiano Ronaldo",["LW","ST","RW"],"Portugal","Manchester United / Real Madrid","2002–present",100,94,96,70,100,100,100,8,"Historic goal obsession"],
  ["ronaldinho","Ronaldinho",["LW","AM","RW"],"Brazil","Barcelona / AC Milan","1998–2015",98,100,100,63,96,80,98,8,"Improvisation without limits"],
  ["neymar","Neymar",["LW","AM","ST"],"Brazil","Barcelona / Paris","2009–present",98,99,100,62,97,78,96,8,"Elastic-space creator"],
  ["henry","Thierry Henry",["LW","ST"],"France","Arsenal / Barcelona","1994–2014",100,96,98,69,100,92,100,8,"Gliding left-channel finisher"],
  ["giggs","Ryan Giggs",["LW","CM"],"Wales","Manchester United","1990–2014",91,97,96,76,98,79,100,8,"Two decades of left-wing threat"],
  ["ribery","Franck Ribery",["LW","AM"],"France","Bayern Munich","2000–2022",95,97,99,76,96,86,98,8,"Relentless combination winger"],
  ["pele","Pele",["ST","AM"],"Brazil","Santos","1956–1977",100,98,99,76,100,96,100,8,"Complete attacking phenomenon"],
  ["ronaldo-r9","Ronaldo Nazario",["ST"],"Brazil","Inter / Real Madrid / Barcelona","1993–2011",100,93,99,61,100,98,99,8,"Peak unstoppable number nine"],
  ["van-basten","Marco van Basten",["ST"],"Netherlands","Ajax / AC Milan","1981–1995",100,92,98,67,91,94,100,8,"Perfect technique in the box"],
  ["lewandowski","Robert Lewandowski",["ST"],"Poland","Bayern Munich / Barcelona","2006–present",100,90,96,70,88,98,100,8,"Complete penalty-box machine"],
  ["benzema","Karim Benzema",["ST","AM"],"France","Real Madrid / Lyon","2004–present",99,97,98,67,89,92,100,8,"Connector and decisive finisher"],
  ["suarez","Luis Suarez",["ST"],"Uruguay","Liverpool / Barcelona","2005–present",100,94,97,74,92,96,100,8,"Relentless chaos striker"],
  ["haaland","Erling Haaland",["ST"],"Norway","Manchester City / Dortmund","2016–present",100,79,90,60,98,100,98,8,"Penalty-box inevitability"],
  ["shearer","Alan Shearer",["ST"],"England","Newcastle / Blackburn","1988–2006",100,84,92,72,88,100,100,8,"Premier League power finisher"],
  ["rooney","Wayne Rooney",["ST","AM"],"England","Manchester United / Everton","2002–2021",97,95,97,82,91,97,100,8,"Complete street-football forward"],
  ["drogba","Didier Drogba",["ST"],"Ivory Coast","Chelsea / Marseille","1998–2018",97,87,92,75,88,100,100,8,"Finals and physical dominance"],
];

export const FOOTBALL_PLAYERS: FootballPlayer[] = rawPlayers.map(([id,name,positions,nation,clubs,era,attack,creation,control,defending,pace,physical,mentality,goalkeeping,trait]) => ({
  id,name,positions,nation,clubs,era,attack,creation,control,defending,pace,physical,mentality,goalkeeping,trait,
}));

export function getFootballClub(id: string) {
  return FOOTBALL_CLUBS.find((club) => club.id === id) ?? FOOTBALL_CLUBS[0];
}

export function getFootballFormation(id: FootballFormationId) {
  return FOOTBALL_FORMATIONS.find((formation) => formation.id === id) ?? FOOTBALL_FORMATIONS[0];
}

export function footballPlayerOverall(player: FootballPlayer) {
  if (player.positions.includes("GK")) return Math.round(player.goalkeeping * .62 + player.mentality * .18 + player.control * .1 + player.physical * .1);
  return Math.round(player.attack * .22 + player.creation * .18 + player.control * .18 + player.defending * .13 + player.pace * .1 + player.physical * .08 + player.mentality * .11);
}
