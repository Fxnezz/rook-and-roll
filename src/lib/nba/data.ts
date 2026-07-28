export type NbaPosition = "PG" | "SG" | "SF" | "PF" | "C";
export type NbaConference = "East" | "West";
export type NbaPlaystyle = "balanced" | "small-ball" | "twin-towers" | "run-and-gun";

export interface NbaTeam {
  id: string;
  city: string;
  name: string;
  short: string;
  conference: NbaConference;
  primary: string;
  secondary: string;
  strength: number;
}

export interface NbaPlayer {
  id: string;
  name: string;
  positions: NbaPosition[];
  franchise: string;
  era: string;
  scoring: number;
  shooting: number;
  playmaking: number;
  defence: number;
  rebounding: number;
  athleticism: number;
  leadership: number;
  trait: string;
}

export interface NbaLineupSlot {
  id: NbaPosition;
  label: string;
  role: string;
  x: number;
  y: number;
}

export const NBA_LINEUP_SLOTS: NbaLineupSlot[] = [
  { id: "PG", label: "Point Guard", role: "Primary organiser", x: 50, y: 78 },
  { id: "SG", label: "Shooting Guard", role: "Perimeter scorer", x: 22, y: 55 },
  { id: "SF", label: "Small Forward", role: "Two-way wing", x: 78, y: 55 },
  { id: "PF", label: "Power Forward", role: "Interior connector", x: 31, y: 24 },
  { id: "C", label: "Center", role: "Rim anchor", x: 69, y: 24 },
];

export const NBA_PLAYSTYLES: Array<{ id: NbaPlaystyle; label: string; detail: string }> = [
  { id: "balanced", label: "Balanced", detail: "No weak links. Every phase matters." },
  { id: "small-ball", label: "Small Ball", detail: "Spacing, switching and extra pace." },
  { id: "twin-towers", label: "Twin Towers", detail: "Rim protection and dominant rebounding." },
  { id: "run-and-gun", label: "Run & Gun", detail: "Maximum tempo, transition scoring and variance." },
];

export const NBA_TEAMS: NbaTeam[] = [
  { id: "atl", city: "Atlanta", name: "Hawks", short: "ATL", conference: "East", primary: "#c8102e", secondary: "#fdb927", strength: 80 },
  { id: "bos", city: "Boston", name: "Celtics", short: "BOS", conference: "East", primary: "#007a33", secondary: "#ba9653", strength: 92 },
  { id: "bkn", city: "Brooklyn", name: "Nets", short: "BKN", conference: "East", primary: "#111111", secondary: "#ffffff", strength: 75 },
  { id: "cha", city: "Charlotte", name: "Hornets", short: "CHA", conference: "East", primary: "#1d1160", secondary: "#00788c", strength: 74 },
  { id: "chi", city: "Chicago", name: "Bulls", short: "CHI", conference: "East", primary: "#ce1141", secondary: "#111111", strength: 78 },
  { id: "cle", city: "Cleveland", name: "Cavaliers", short: "CLE", conference: "East", primary: "#860038", secondary: "#fdbb30", strength: 90 },
  { id: "det", city: "Detroit", name: "Pistons", short: "DET", conference: "East", primary: "#c8102e", secondary: "#1d42ba", strength: 81 },
  { id: "ind", city: "Indiana", name: "Pacers", short: "IND", conference: "East", primary: "#002d62", secondary: "#fdbb30", strength: 87 },
  { id: "mia", city: "Miami", name: "Heat", short: "MIA", conference: "East", primary: "#98002e", secondary: "#f9a01b", strength: 84 },
  { id: "mil", city: "Milwaukee", name: "Bucks", short: "MIL", conference: "East", primary: "#00471b", secondary: "#eee1c6", strength: 87 },
  { id: "nyk", city: "New York", name: "Knicks", short: "NYK", conference: "East", primary: "#006bb6", secondary: "#f58426", strength: 89 },
  { id: "orl", city: "Orlando", name: "Magic", short: "ORL", conference: "East", primary: "#0077c0", secondary: "#c4ced4", strength: 84 },
  { id: "phi", city: "Philadelphia", name: "76ers", short: "PHI", conference: "East", primary: "#006bb6", secondary: "#ed174c", strength: 82 },
  { id: "tor", city: "Toronto", name: "Raptors", short: "TOR", conference: "East", primary: "#ce1141", secondary: "#b4975a", strength: 76 },
  { id: "was", city: "Washington", name: "Wizards", short: "WAS", conference: "East", primary: "#002b5c", secondary: "#e31837", strength: 73 },
  { id: "dal", city: "Dallas", name: "Mavericks", short: "DAL", conference: "West", primary: "#00538c", secondary: "#b8c4ca", strength: 82 },
  { id: "den", city: "Denver", name: "Nuggets", short: "DEN", conference: "West", primary: "#0e2240", secondary: "#fec524", strength: 90 },
  { id: "gsw", city: "Golden State", name: "Warriors", short: "GSW", conference: "West", primary: "#1d428a", secondary: "#ffc72c", strength: 84 },
  { id: "hou", city: "Houston", name: "Rockets", short: "HOU", conference: "West", primary: "#ce1141", secondary: "#c4ced4", strength: 87 },
  { id: "lac", city: "Los Angeles", name: "Clippers", short: "LAC", conference: "West", primary: "#c8102e", secondary: "#1d428a", strength: 84 },
  { id: "lal", city: "Los Angeles", name: "Lakers", short: "LAL", conference: "West", primary: "#552583", secondary: "#fdb927", strength: 86 },
  { id: "mem", city: "Memphis", name: "Grizzlies", short: "MEM", conference: "West", primary: "#5d76a9", secondary: "#f5b112", strength: 82 },
  { id: "min", city: "Minnesota", name: "Timberwolves", short: "MIN", conference: "West", primary: "#0c2340", secondary: "#78be20", strength: 88 },
  { id: "nop", city: "New Orleans", name: "Pelicans", short: "NOP", conference: "West", primary: "#0c2340", secondary: "#c8102e", strength: 79 },
  { id: "okc", city: "Oklahoma City", name: "Thunder", short: "OKC", conference: "West", primary: "#007ac1", secondary: "#ef3b24", strength: 94 },
  { id: "phx", city: "Phoenix", name: "Suns", short: "PHX", conference: "West", primary: "#1d1160", secondary: "#e56020", strength: 83 },
  { id: "por", city: "Portland", name: "Trail Blazers", short: "POR", conference: "West", primary: "#e03a3e", secondary: "#111111", strength: 77 },
  { id: "sac", city: "Sacramento", name: "Kings", short: "SAC", conference: "West", primary: "#5a2d81", secondary: "#63727a", strength: 81 },
  { id: "sas", city: "San Antonio", name: "Spurs", short: "SAS", conference: "West", primary: "#c4ced4", secondary: "#111111", strength: 88 },
  { id: "uta", city: "Utah", name: "Jazz", short: "UTA", conference: "West", primary: "#002b5c", secondary: "#f9a01b", strength: 74 },
];

export const NBA_PLAYERS: NbaPlayer[] = [
  { id: "magic", name: "Magic Johnson", positions: ["PG"], franchise: "Los Angeles Lakers", era: "1979–1991", scoring: 94, shooting: 84, playmaking: 100, defence: 88, rebounding: 94, athleticism: 95, leadership: 100, trait: "Showtime conductor" },
  { id: "curry", name: "Stephen Curry", positions: ["PG", "SG"], franchise: "Golden State Warriors", era: "2009–present", scoring: 98, shooting: 100, playmaking: 95, defence: 78, rebounding: 77, athleticism: 92, leadership: 97, trait: "Gravity beyond the arc" },
  { id: "oscar", name: "Oscar Robertson", positions: ["PG"], franchise: "Cincinnati Royals / Milwaukee Bucks", era: "1960–1974", scoring: 97, shooting: 88, playmaking: 99, defence: 86, rebounding: 96, athleticism: 96, leadership: 98, trait: "Triple-double engine" },
  { id: "stockton", name: "John Stockton", positions: ["PG"], franchise: "Utah Jazz", era: "1984–2003", scoring: 86, shooting: 94, playmaking: 100, defence: 95, rebounding: 70, athleticism: 86, leadership: 98, trait: "Precision pick-and-roll" },
  { id: "isiah", name: "Isiah Thomas", positions: ["PG"], franchise: "Detroit Pistons", era: "1981–1994", scoring: 94, shooting: 87, playmaking: 98, defence: 91, rebounding: 76, athleticism: 95, leadership: 100, trait: "Big-game floor general" },
  { id: "paul", name: "Chris Paul", positions: ["PG"], franchise: "New Orleans / LA Clippers", era: "2005–present", scoring: 89, shooting: 93, playmaking: 99, defence: 96, rebounding: 75, athleticism: 90, leadership: 98, trait: "Possession controller" },
  { id: "nash", name: "Steve Nash", positions: ["PG"], franchise: "Phoenix Suns", era: "1996–2015", scoring: 89, shooting: 98, playmaking: 99, defence: 70, rebounding: 72, athleticism: 89, leadership: 97, trait: "Seven-seconds architect" },
  { id: "kidd", name: "Jason Kidd", positions: ["PG"], franchise: "New Jersey Nets", era: "1994–2013", scoring: 84, shooting: 85, playmaking: 98, defence: 97, rebounding: 92, athleticism: 93, leadership: 98, trait: "Full-court processor" },
  { id: "westbrook", name: "Russell Westbrook", positions: ["PG"], franchise: "Oklahoma City Thunder", era: "2008–present", scoring: 95, shooting: 77, playmaking: 94, defence: 84, rebounding: 96, athleticism: 100, leadership: 93, trait: "Relentless rim pressure" },
  { id: "cousy", name: "Bob Cousy", positions: ["PG"], franchise: "Boston Celtics", era: "1950–1970", scoring: 88, shooting: 82, playmaking: 98, defence: 84, rebounding: 78, athleticism: 90, leadership: 98, trait: "Early-era creator" },

  { id: "jordan", name: "Michael Jordan", positions: ["SG", "SF"], franchise: "Chicago Bulls", era: "1984–2003", scoring: 100, shooting: 94, playmaking: 92, defence: 99, rebounding: 89, athleticism: 100, leadership: 100, trait: "Championship closer" },
  { id: "kobe", name: "Kobe Bryant", positions: ["SG", "SF"], franchise: "Los Angeles Lakers", era: "1996–2016", scoring: 99, shooting: 94, playmaking: 90, defence: 97, rebounding: 85, athleticism: 98, leadership: 98, trait: "Impossible-shot maker" },
  { id: "wade", name: "Dwyane Wade", positions: ["SG", "PG"], franchise: "Miami Heat", era: "2003–2019", scoring: 97, shooting: 84, playmaking: 93, defence: 96, rebounding: 84, athleticism: 99, leadership: 98, trait: "Rim-attacking guard" },
  { id: "harden", name: "James Harden", positions: ["SG", "PG"], franchise: "Houston Rockets", era: "2009–present", scoring: 99, shooting: 95, playmaking: 98, defence: 78, rebounding: 84, athleticism: 93, leadership: 90, trait: "Isolation system" },
  { id: "iverson", name: "Allen Iverson", positions: ["SG", "PG"], franchise: "Philadelphia 76ers", era: "1996–2010", scoring: 98, shooting: 86, playmaking: 91, defence: 84, rebounding: 74, athleticism: 100, leadership: 96, trait: "Fearless volume scorer" },
  { id: "drexler", name: "Clyde Drexler", positions: ["SG", "SF"], franchise: "Portland Trail Blazers", era: "1983–1998", scoring: 95, shooting: 86, playmaking: 90, defence: 91, rebounding: 91, athleticism: 98, leadership: 96, trait: "Open-floor glide" },
  { id: "west", name: "Jerry West", positions: ["SG", "PG"], franchise: "Los Angeles Lakers", era: "1960–1974", scoring: 97, shooting: 94, playmaking: 95, defence: 96, rebounding: 84, athleticism: 94, leadership: 99, trait: "Perimeter standard" },
  { id: "gervin", name: "George Gervin", positions: ["SG", "SF"], franchise: "San Antonio Spurs", era: "1972–1986", scoring: 98, shooting: 94, playmaking: 82, defence: 78, rebounding: 82, athleticism: 95, leadership: 91, trait: "Silken scoring touch" },
  { id: "allen", name: "Ray Allen", positions: ["SG"], franchise: "Seattle / Boston / Miami", era: "1996–2014", scoring: 94, shooting: 99, playmaking: 84, defence: 86, rebounding: 78, athleticism: 92, leadership: 96, trait: "Movement shooting" },
  { id: "miller", name: "Reggie Miller", positions: ["SG"], franchise: "Indiana Pacers", era: "1987–2005", scoring: 95, shooting: 99, playmaking: 80, defence: 82, rebounding: 73, athleticism: 90, leadership: 97, trait: "Clutch off-ball threat" },

  { id: "lebron", name: "LeBron James", positions: ["SF", "PF", "PG"], franchise: "Cleveland / Miami / LA Lakers", era: "2003–present", scoring: 99, shooting: 91, playmaking: 99, defence: 96, rebounding: 95, athleticism: 100, leadership: 100, trait: "Positionless command" },
  { id: "bird", name: "Larry Bird", positions: ["SF", "PF"], franchise: "Boston Celtics", era: "1979–1992", scoring: 98, shooting: 99, playmaking: 96, defence: 90, rebounding: 96, athleticism: 88, leadership: 100, trait: "Anticipation and nerve" },
  { id: "durant", name: "Kevin Durant", positions: ["SF", "PF"], franchise: "Oklahoma City / Golden State", era: "2007–present", scoring: 100, shooting: 99, playmaking: 90, defence: 90, rebounding: 88, athleticism: 97, leadership: 94, trait: "Unblockable release" },
  { id: "erving", name: "Julius Erving", positions: ["SF"], franchise: "Philadelphia 76ers", era: "1971–1987", scoring: 97, shooting: 88, playmaking: 88, defence: 92, rebounding: 91, athleticism: 100, leadership: 98, trait: "Aerial pioneer" },
  { id: "kawhi", name: "Kawhi Leonard", positions: ["SF", "SG"], franchise: "San Antonio / Toronto / LA Clippers", era: "2011–present", scoring: 96, shooting: 96, playmaking: 87, defence: 100, rebounding: 88, athleticism: 95, leadership: 94, trait: "Two-way playoff machine" },
  { id: "pippen", name: "Scottie Pippen", positions: ["SF", "PG"], franchise: "Chicago Bulls", era: "1987–2004", scoring: 90, shooting: 85, playmaking: 94, defence: 100, rebounding: 91, athleticism: 98, leadership: 96, trait: "Switchable point forward" },
  { id: "baylor", name: "Elgin Baylor", positions: ["SF"], franchise: "Los Angeles Lakers", era: "1958–1972", scoring: 98, shooting: 87, playmaking: 87, defence: 87, rebounding: 98, athleticism: 98, leadership: 96, trait: "Explosive scoring wing" },
  { id: "havlicek", name: "John Havlicek", positions: ["SF", "SG"], franchise: "Boston Celtics", era: "1962–1978", scoring: 93, shooting: 90, playmaking: 89, defence: 97, rebounding: 88, athleticism: 99, leadership: 99, trait: "Endless two-way motion" },
  { id: "wilkins", name: "Dominique Wilkins", positions: ["SF"], franchise: "Atlanta Hawks", era: "1982–1999", scoring: 98, shooting: 88, playmaking: 82, defence: 80, rebounding: 88, athleticism: 100, leadership: 94, trait: "Human highlight reel" },
  { id: "pierce", name: "Paul Pierce", positions: ["SF", "SG"], franchise: "Boston Celtics", era: "1998–2017", scoring: 95, shooting: 95, playmaking: 88, defence: 88, rebounding: 86, athleticism: 87, leadership: 98, trait: "Half-court closer" },

  { id: "duncan", name: "Tim Duncan", positions: ["PF", "C"], franchise: "San Antonio Spurs", era: "1997–2016", scoring: 94, shooting: 88, playmaking: 88, defence: 100, rebounding: 99, athleticism: 91, leadership: 100, trait: "Structural perfection" },
  { id: "malone", name: "Karl Malone", positions: ["PF"], franchise: "Utah Jazz", era: "1985–2004", scoring: 98, shooting: 92, playmaking: 86, defence: 93, rebounding: 96, athleticism: 98, leadership: 95, trait: "Power roll finisher" },
  { id: "garnett", name: "Kevin Garnett", positions: ["PF", "C"], franchise: "Minnesota / Boston", era: "1995–2016", scoring: 94, shooting: 90, playmaking: 92, defence: 100, rebounding: 98, athleticism: 98, leadership: 100, trait: "Defensive system unto himself" },
  { id: "dirk", name: "Dirk Nowitzki", positions: ["PF", "C"], franchise: "Dallas Mavericks", era: "1998–2019", scoring: 98, shooting: 99, playmaking: 83, defence: 79, rebounding: 91, athleticism: 86, leadership: 99, trait: "Stretch-big blueprint" },
  { id: "giannis", name: "Giannis Antetokounmpo", positions: ["PF", "C", "SF"], franchise: "Milwaukee Bucks", era: "2013–present", scoring: 98, shooting: 80, playmaking: 92, defence: 99, rebounding: 98, athleticism: 100, leadership: 98, trait: "Transition avalanche" },
  { id: "barkley", name: "Charles Barkley", positions: ["PF", "SF"], franchise: "Philadelphia / Phoenix", era: "1984–2000", scoring: 97, shooting: 88, playmaking: 90, defence: 86, rebounding: 100, athleticism: 99, leadership: 96, trait: "Undersized force" },
  { id: "pettit", name: "Bob Pettit", positions: ["PF", "C"], franchise: "St. Louis Hawks", era: "1954–1965", scoring: 96, shooting: 89, playmaking: 80, defence: 88, rebounding: 99, athleticism: 92, leadership: 98, trait: "Relentless glass work" },
  { id: "hayes", name: "Elvin Hayes", positions: ["PF", "C"], franchise: "Washington Bullets", era: "1968–1984", scoring: 95, shooting: 88, playmaking: 77, defence: 95, rebounding: 98, athleticism: 96, leadership: 95, trait: "Ironman interior star" },
  { id: "mchale", name: "Kevin McHale", positions: ["PF", "C"], franchise: "Boston Celtics", era: "1980–1993", scoring: 95, shooting: 94, playmaking: 79, defence: 97, rebounding: 92, athleticism: 90, leadership: 96, trait: "Post-move laboratory" },
  { id: "webber", name: "Chris Webber", positions: ["PF", "C"], franchise: "Sacramento Kings", era: "1993–2008", scoring: 94, shooting: 88, playmaking: 94, defence: 88, rebounding: 96, athleticism: 97, leadership: 92, trait: "High-post creator" },

  { id: "kareem", name: "Kareem Abdul-Jabbar", positions: ["C"], franchise: "Milwaukee / LA Lakers", era: "1969–1989", scoring: 100, shooting: 97, playmaking: 87, defence: 99, rebounding: 99, athleticism: 96, leadership: 100, trait: "Unanswerable skyhook" },
  { id: "russell", name: "Bill Russell", positions: ["C"], franchise: "Boston Celtics", era: "1956–1969", scoring: 84, shooting: 72, playmaking: 91, defence: 100, rebounding: 100, athleticism: 99, leadership: 100, trait: "Championship defence" },
  { id: "wilt", name: "Wilt Chamberlain", positions: ["C"], franchise: "Philadelphia / LA Lakers", era: "1959–1973", scoring: 100, shooting: 87, playmaking: 91, defence: 98, rebounding: 100, athleticism: 100, leadership: 95, trait: "Record-book force" },
  { id: "shaq", name: "Shaquille O'Neal", positions: ["C"], franchise: "Orlando / LA Lakers", era: "1992–2011", scoring: 100, shooting: 73, playmaking: 83, defence: 96, rebounding: 99, athleticism: 100, leadership: 97, trait: "Paint-breaking power" },
  { id: "hakeem", name: "Hakeem Olajuwon", positions: ["C"], franchise: "Houston Rockets", era: "1984–2002", scoring: 97, shooting: 91, playmaking: 84, defence: 100, rebounding: 99, athleticism: 99, leadership: 99, trait: "Dream Shake and erasure" },
  { id: "jokic", name: "Nikola Jokic", positions: ["C"], franchise: "Denver Nuggets", era: "2015–present", scoring: 98, shooting: 97, playmaking: 100, defence: 85, rebounding: 99, athleticism: 82, leadership: 99, trait: "Offensive hub" },
  { id: "robinson", name: "David Robinson", positions: ["C"], franchise: "San Antonio Spurs", era: "1989–2003", scoring: 96, shooting: 89, playmaking: 84, defence: 100, rebounding: 98, athleticism: 100, leadership: 99, trait: "Two-way speed center" },
  { id: "moses", name: "Moses Malone", positions: ["C"], franchise: "Houston / Philadelphia", era: "1974–1995", scoring: 96, shooting: 86, playmaking: 74, defence: 95, rebounding: 100, athleticism: 97, leadership: 98, trait: "Offensive-glass machine" },
  { id: "ewing", name: "Patrick Ewing", positions: ["C"], franchise: "New York Knicks", era: "1985–2002", scoring: 94, shooting: 90, playmaking: 78, defence: 98, rebounding: 97, athleticism: 96, leadership: 98, trait: "New York rim anchor" },
  { id: "mikan", name: "George Mikan", positions: ["C"], franchise: "Minneapolis Lakers", era: "1948–1956", scoring: 95, shooting: 82, playmaking: 76, defence: 98, rebounding: 99, athleticism: 92, leadership: 99, trait: "Original dominant big" },
];

export function getNbaTeam(id: string): NbaTeam {
  return NBA_TEAMS.find((team) => team.id === id) ?? NBA_TEAMS[0];
}

export function nbaPlayerOverall(player: NbaPlayer): number {
  return Math.round(
    player.scoring * 0.19 +
    player.shooting * 0.13 +
    player.playmaking * 0.17 +
    player.defence * 0.18 +
    player.rebounding * 0.12 +
    player.athleticism * 0.1 +
    player.leadership * 0.11,
  );
}
