export type AflRole =
  | "key-forward"
  | "forward-craft"
  | "half-forward"
  | "inside-mid"
  | "outside-mid"
  | "ruck"
  | "key-defender"
  | "intercept-defender"
  | "running-defender"
  | "utility"
  | "match-winner"
  | "captain";

export interface AflPlayer {
  id: string;
  name: string;
  role: AflRole;
  position: string;
  representativeClub: string;
  era: string;
  attack: number;
  midfield: number;
  defence: number;
  athleticism: number;
  leadership: number;
  trait: string;
}

export interface AflClub {
  id: string;
  name: string;
  short: string;
  city: string;
  primary: string;
  secondary: string;
  strength: number;
}

export type AflLine = "forward" | "midfield" | "defence";

export interface AflPositionSlot {
  id: string;
  short: string;
  label: string;
  line: AflLine;
  row: number;
  column: number;
}

export const AFL_CLUBS: AflClub[] = [
  { id: "adel", name: "Adelaide Crows", short: "ADE", city: "Adelaide", primary: "#0b3a68", secondary: "#e21b2d", strength: 86 },
  { id: "bris", name: "Brisbane Lions", short: "BL", city: "Brisbane", primary: "#7a1431", secondary: "#f3b323", strength: 89 },
  { id: "carl", name: "Carlton", short: "CAR", city: "Melbourne", primary: "#102c4e", secondary: "#ffffff", strength: 84 },
  { id: "coll", name: "Collingwood", short: "COL", city: "Melbourne", primary: "#111111", secondary: "#ffffff", strength: 87 },
  { id: "ess", name: "Essendon", short: "ESS", city: "Melbourne", primary: "#151515", secondary: "#e21b2d", strength: 78 },
  { id: "fre", name: "Fremantle", short: "FRE", city: "Perth", primary: "#2b165b", secondary: "#ffffff", strength: 86 },
  { id: "gee", name: "Geelong", short: "GEE", city: "Geelong", primary: "#13294b", secondary: "#ffffff", strength: 88 },
  { id: "gc", name: "Gold Coast Suns", short: "GC", city: "Gold Coast", primary: "#d6202f", secondary: "#f6c344", strength: 84 },
  { id: "gws", name: "GWS Giants", short: "GWS", city: "Sydney", primary: "#f47b20", secondary: "#343434", strength: 85 },
  { id: "haw", name: "Hawthorn", short: "HAW", city: "Melbourne", primary: "#4d2004", secondary: "#f4b942", strength: 86 },
  { id: "mel", name: "Melbourne", short: "MEL", city: "Melbourne", primary: "#0e2a47", secondary: "#d8172f", strength: 80 },
  { id: "nm", name: "North Melbourne", short: "NM", city: "Melbourne", primary: "#1261a0", secondary: "#ffffff", strength: 76 },
  { id: "pa", name: "Port Adelaide", short: "PA", city: "Adelaide", primary: "#008aab", secondary: "#171717", strength: 81 },
  { id: "rich", name: "Richmond", short: "RIC", city: "Melbourne", primary: "#171717", secondary: "#f6c945", strength: 75 },
  { id: "stk", name: "St Kilda", short: "STK", city: "Melbourne", primary: "#d71920", secondary: "#171717", strength: 80 },
  { id: "syd", name: "Sydney Swans", short: "SYD", city: "Sydney", primary: "#e1252f", secondary: "#ffffff", strength: 84 },
  { id: "wc", name: "West Coast Eagles", short: "WCE", city: "Perth", primary: "#183e72", secondary: "#f2b720", strength: 74 },
  { id: "wb", name: "Western Bulldogs", short: "WB", city: "Melbourne", primary: "#1c5aa6", secondary: "#e2272f", strength: 83 },
];

export const DRAFT_ROUNDS: Array<{ role: AflRole; label: string; detail: string }> = [
  { role: "key-forward", label: "Spearhead", detail: "The key target who turns territory into six points." },
  { role: "forward-craft", label: "Forward craft", detail: "Pressure, ground-ball skill and scoreboard instinct." },
  { role: "half-forward", label: "Half-forward", detail: "The link between midfield control and the goal square." },
  { role: "inside-mid", label: "Inside bull", detail: "Wins first possession when the game is at its hottest." },
  { role: "outside-mid", label: "Line breaker", detail: "Carries, kicks and opens the ground from the outside." },
  { role: "ruck", label: "Ruck", detail: "Controls the aerial contest and feeds the midfield." },
  { role: "key-defender", label: "Key stopper", detail: "Takes the opposition's most dangerous tall forward." },
  { role: "intercept-defender", label: "Interceptor", detail: "Reads the play early and turns defence into attack." },
  { role: "running-defender", label: "Running defender", detail: "Rebounds with clean hands and damaging use." },
  { role: "utility", label: "Utility", detail: "Solves whatever problem the match presents." },
  { role: "match-winner", label: "Match-winner", detail: "The player trusted to break a final open." },
  { role: "captain", label: "Captain", detail: "Sets standards and steadies the side under pressure." },
];

export const AFL_POSITION_SLOTS: AflPositionSlot[] = [
  { id: "lfp", short: "LFP", label: "Left forward pocket", line: "forward", row: 1, column: 1 },
  { id: "ff", short: "FF", label: "Full forward", line: "forward", row: 1, column: 2 },
  { id: "rfp", short: "RFP", label: "Right forward pocket", line: "forward", row: 1, column: 3 },
  { id: "lhf", short: "LHF", label: "Left half-forward", line: "forward", row: 2, column: 1 },
  { id: "chf", short: "CHF", label: "Centre half-forward", line: "forward", row: 2, column: 2 },
  { id: "rhf", short: "RHF", label: "Right half-forward", line: "forward", row: 2, column: 3 },
  { id: "lw", short: "LW", label: "Left wing", line: "midfield", row: 3, column: 1 },
  { id: "c", short: "C", label: "Centre", line: "midfield", row: 3, column: 2 },
  { id: "rw", short: "RW", label: "Right wing", line: "midfield", row: 3, column: 3 },
  { id: "rk", short: "RK", label: "Ruck", line: "midfield", row: 4, column: 1 },
  { id: "rr", short: "RR", label: "Ruck-rover", line: "midfield", row: 4, column: 2 },
  { id: "rov", short: "ROV", label: "Rover", line: "midfield", row: 4, column: 3 },
  { id: "lhb", short: "LHB", label: "Left half-back", line: "defence", row: 5, column: 1 },
  { id: "chb", short: "CHB", label: "Centre half-back", line: "defence", row: 5, column: 2 },
  { id: "rhb", short: "RHB", label: "Right half-back", line: "defence", row: 5, column: 3 },
  { id: "lbp", short: "LBP", label: "Left back pocket", line: "defence", row: 6, column: 1 },
  { id: "fb", short: "FB", label: "Full-back", line: "defence", row: 6, column: 2 },
  { id: "rbp", short: "RBP", label: "Right back pocket", line: "defence", row: 6, column: 3 },
];

const ROLE_LINES: Record<AflRole, AflLine[]> = {
  "key-forward": ["forward"],
  "forward-craft": ["forward"],
  "half-forward": ["forward"],
  "inside-mid": ["midfield"],
  "outside-mid": ["midfield"],
  ruck: ["midfield"],
  "key-defender": ["defence"],
  "intercept-defender": ["defence"],
  "running-defender": ["defence"],
  utility: ["forward", "midfield", "defence"],
  "match-winner": ["forward", "midfield"],
  captain: ["forward", "midfield", "defence"],
};

export function playerEligibleLines(player: AflPlayer): AflLine[] {
  return ROLE_LINES[player.role];
}

export const AFL_PLAYERS: AflPlayer[] = [
  { id: "lockett", name: "Tony Lockett", role: "key-forward", position: "Full forward", representativeClub: "Sydney / St Kilda", era: "1983–2002", attack: 99, midfield: 70, defence: 63, athleticism: 90, leadership: 88, trait: "Record goalkicker" },
  { id: "dunstall", name: "Jason Dunstall", role: "key-forward", position: "Full forward", representativeClub: "Hawthorn", era: "1985–1998", attack: 98, midfield: 73, defence: 76, athleticism: 91, leadership: 92, trait: "Lead and pressure" },
  { id: "carey", name: "Wayne Carey", role: "key-forward", position: "Centre half-forward", representativeClub: "North Melbourne", era: "1989–2004", attack: 98, midfield: 85, defence: 74, athleticism: 96, leadership: 92, trait: "Aerial command" },
  { id: "franklin", name: "Lance Franklin", role: "key-forward", position: "Key forward", representativeClub: "Hawthorn / Sydney", era: "2005–2023", attack: 98, midfield: 80, defence: 68, athleticism: 97, leadership: 87, trait: "Long-range threat" },

  { id: "betts", name: "Eddie Betts", role: "forward-craft", position: "Small forward", representativeClub: "Carlton / Adelaide", era: "2005–2021", attack: 95, midfield: 78, defence: 81, athleticism: 94, leadership: 91, trait: "Pocket magician" },
  { id: "bartlett", name: "Kevin Bartlett", role: "forward-craft", position: "Rover / forward", representativeClub: "Richmond", era: "1965–1983", attack: 96, midfield: 91, defence: 73, athleticism: 95, leadership: 92, trait: "Relentless runner" },
  { id: "rioli", name: "Cyril Rioli", role: "forward-craft", position: "Forward / midfielder", representativeClub: "Hawthorn", era: "2008–2018", attack: 94, midfield: 84, defence: 90, athleticism: 97, leadership: 85, trait: "Pressure artist" },
  { id: "daicos", name: "Peter Daicos", role: "forward-craft", position: "Forward / midfielder", representativeClub: "Collingwood", era: "1979–1993", attack: 97, midfield: 87, defence: 69, athleticism: 93, leadership: 87, trait: "Impossible angles" },

  { id: "hird", name: "James Hird", role: "half-forward", position: "Half-forward / midfielder", representativeClub: "Essendon", era: "1992–2007", attack: 95, midfield: 94, defence: 83, athleticism: 92, leadership: 96, trait: "Big-moment poise" },
  { id: "hart", name: "Royce Hart", role: "half-forward", position: "Centre half-forward", representativeClub: "Richmond", era: "1967–1977", attack: 96, midfield: 86, defence: 76, athleticism: 94, leadership: 92, trait: "High-marking link" },
  { id: "blight", name: "Malcolm Blight", role: "half-forward", position: "Forward / utility", representativeClub: "North Melbourne", era: "1968–1982", attack: 97, midfield: 90, defence: 81, athleticism: 95, leadership: 94, trait: "Distance and daring" },
  { id: "bartel", name: "Jimmy Bartel", role: "half-forward", position: "Midfielder / forward", representativeClub: "Geelong", era: "2002–2016", attack: 91, midfield: 94, defence: 86, athleticism: 90, leadership: 94, trait: "Wet-weather master" },

  { id: "williams", name: "Greg Williams", role: "inside-mid", position: "Inside midfielder", representativeClub: "Sydney / Carlton", era: "1984–1997", attack: 87, midfield: 99, defence: 82, athleticism: 84, leadership: 93, trait: "Clearance vision" },
  { id: "voss", name: "Michael Voss", role: "inside-mid", position: "Inside midfielder", representativeClub: "Brisbane", era: "1992–2006", attack: 90, midfield: 97, defence: 90, athleticism: 93, leadership: 99, trait: "Contact balance" },
  { id: "black", name: "Simon Black", role: "inside-mid", position: "Inside midfielder", representativeClub: "Brisbane", era: "1998–2013", attack: 87, midfield: 98, defence: 84, athleticism: 90, leadership: 95, trait: "Clean extraction" },
  { id: "mitchell", name: "Sam Mitchell", role: "inside-mid", position: "Inside midfielder", representativeClub: "Hawthorn", era: "2002–2017", attack: 86, midfield: 97, defence: 86, athleticism: 87, leadership: 96, trait: "Two-sided distributor" },

  { id: "matera", name: "Peter Matera", role: "outside-mid", position: "Wing", representativeClub: "West Coast", era: "1990–2002", attack: 92, midfield: 95, defence: 80, athleticism: 98, leadership: 91, trait: "Explosive carry" },
  { id: "greig", name: "Keith Greig", role: "outside-mid", position: "Wing", representativeClub: "North Melbourne", era: "1971–1985", attack: 90, midfield: 97, defence: 79, athleticism: 97, leadership: 92, trait: "Gliding wingman" },
  { id: "mcleod", name: "Andrew McLeod", role: "outside-mid", position: "Midfielder / half-back", representativeClub: "Adelaide", era: "1995–2010", attack: 91, midfield: 96, defence: 91, athleticism: 98, leadership: 94, trait: "Finals accelerator" },
  { id: "bradley", name: "Craig Bradley", role: "outside-mid", position: "Wing / midfielder", representativeClub: "Carlton", era: "1981–2002", attack: 86, midfield: 95, defence: 82, athleticism: 96, leadership: 94, trait: "Endless running" },

  { id: "farmer", name: "Graham Farmer", role: "ruck", position: "Ruck", representativeClub: "Geelong / East Perth", era: "1953–1971", attack: 86, midfield: 98, defence: 86, athleticism: 96, leadership: 97, trait: "Ruck innovation" },
  { id: "cox", name: "Dean Cox", role: "ruck", position: "Ruck", representativeClub: "West Coast", era: "2001–2014", attack: 86, midfield: 95, defence: 87, athleticism: 95, leadership: 94, trait: "Extra midfielder" },
  { id: "madden", name: "Simon Madden", role: "ruck", position: "Ruck / forward", representativeClub: "Essendon", era: "1974–1992", attack: 92, midfield: 93, defence: 85, athleticism: 94, leadership: 96, trait: "Goal-kicking ruck" },
  { id: "stynes", name: "Jim Stynes", role: "ruck", position: "Ruck", representativeClub: "Melbourne", era: "1987–1998", attack: 84, midfield: 94, defence: 88, athleticism: 98, leadership: 98, trait: "Unbreakable endurance" },

  { id: "silvagni", name: "Stephen Silvagni", role: "key-defender", position: "Full-back", representativeClub: "Carlton", era: "1985–2001", attack: 76, midfield: 80, defence: 99, athleticism: 95, leadership: 94, trait: "One-on-one master" },
  { id: "jakovich", name: "Glen Jakovich", role: "key-defender", position: "Centre half-back", representativeClub: "West Coast", era: "1991–2004", attack: 75, midfield: 82, defence: 98, athleticism: 95, leadership: 95, trait: "Power stopper" },
  { id: "scarlett", name: "Matthew Scarlett", role: "key-defender", position: "Full-back", representativeClub: "Geelong", era: "1998–2012", attack: 79, midfield: 86, defence: 98, athleticism: 94, leadership: 94, trait: "Attack from defence" },
  { id: "rance", name: "Alex Rance", role: "key-defender", position: "Key defender", representativeClub: "Richmond", era: "2009–2019", attack: 73, midfield: 83, defence: 97, athleticism: 97, leadership: 94, trait: "Recovery speed" },

  { id: "regan", name: "Jack Regan", role: "intercept-defender", position: "Full-back", representativeClub: "Collingwood", era: "1930–1946", attack: 72, midfield: 81, defence: 98, athleticism: 93, leadership: 94, trait: "Prince of full-backs" },
  { id: "roos", name: "Paul Roos", role: "intercept-defender", position: "Centre half-back", representativeClub: "Fitzroy / Sydney", era: "1982–1998", attack: 80, midfield: 89, defence: 97, athleticism: 93, leadership: 98, trait: "Reading the flight" },
  { id: "enright", name: "Corey Enright", role: "intercept-defender", position: "Half-back", representativeClub: "Geelong", era: "2001–2016", attack: 82, midfield: 90, defence: 97, athleticism: 92, leadership: 95, trait: "Calm interception" },
  { id: "lever", name: "Jake Lever", role: "intercept-defender", position: "Key defender", representativeClub: "Melbourne", era: "2015–present", attack: 72, midfield: 84, defence: 95, athleticism: 90, leadership: 91, trait: "Aerial organiser" },

  { id: "doull", name: "Bruce Doull", role: "running-defender", position: "Half-back", representativeClub: "Carlton", era: "1969–1986", attack: 83, midfield: 91, defence: 98, athleticism: 95, leadership: 94, trait: "Silent rebound" },
  { id: "wanganneen", name: "Gavin Wanganeen", role: "running-defender", position: "Back / midfielder", representativeClub: "Essendon / Port Adelaide", era: "1991–2006", attack: 90, midfield: 93, defence: 95, athleticism: 97, leadership: 95, trait: "Evasive rebound" },
  { id: "mckenna", name: "Guy McKenna", role: "running-defender", position: "Half-back", representativeClub: "West Coast", era: "1988–2000", attack: 82, midfield: 91, defence: 96, athleticism: 93, leadership: 95, trait: "Precise exit kick" },
  { id: "shaw", name: "Heath Shaw", role: "running-defender", position: "Half-back", representativeClub: "Collingwood / GWS", era: "2005–2020", attack: 83, midfield: 90, defence: 94, athleticism: 94, leadership: 90, trait: "Bold ball use" },

  { id: "whitten", name: "Ted Whitten", role: "utility", position: "Centre half-back / forward", representativeClub: "Footscray", era: "1951–1970", attack: 94, midfield: 95, defence: 97, athleticism: 96, leadership: 99, trait: "Mr Football" },
  { id: "goodes", name: "Adam Goodes", role: "utility", position: "Ruck / midfield / forward", representativeClub: "Sydney", era: "1999–2015", attack: 94, midfield: 96, defence: 87, athleticism: 99, leadership: 98, trait: "Positionless champion" },
  { id: "koutoufides", name: "Anthony Koutoufides", role: "utility", position: "Utility", representativeClub: "Carlton", era: "1992–2007", attack: 92, midfield: 95, defence: 92, athleticism: 99, leadership: 95, trait: "Total-ground impact" },
  { id: "pavlich", name: "Matthew Pavlich", role: "utility", position: "Key forward / midfielder", representativeClub: "Fremantle", era: "2000–2016", attack: 95, midfield: 93, defence: 88, athleticism: 96, leadership: 99, trait: "Six-position leader" },

  { id: "ablett-sr", name: "Gary Ablett Sr", role: "match-winner", position: "Forward / wing", representativeClub: "Geelong", era: "1982–1996", attack: 99, midfield: 92, defence: 73, athleticism: 99, leadership: 88, trait: "Explosive brilliance" },
  { id: "ablett-jr", name: "Gary Ablett Jr", role: "match-winner", position: "Midfielder / forward", representativeClub: "Geelong / Gold Coast", era: "2002–2020", attack: 95, midfield: 99, defence: 86, athleticism: 98, leadership: 96, trait: "Complete midfielder" },
  { id: "judd", name: "Chris Judd", role: "match-winner", position: "Midfielder", representativeClub: "West Coast / Carlton", era: "2002–2015", attack: 92, midfield: 99, defence: 84, athleticism: 99, leadership: 98, trait: "Clearance burst" },
  { id: "martin", name: "Dustin Martin", role: "match-winner", position: "Midfielder / forward", representativeClub: "Richmond", era: "2010–2024", attack: 97, midfield: 97, defence: 78, athleticism: 98, leadership: 94, trait: "Finals force" },

  { id: "reynolds", name: "Dick Reynolds", role: "captain", position: "Rover / forward", representativeClub: "Essendon", era: "1933–1951", attack: 94, midfield: 98, defence: 86, athleticism: 95, leadership: 99, trait: "Dynasty standard" },
  { id: "barassi", name: "Ron Barassi", role: "captain", position: "Ruck-rover", representativeClub: "Melbourne / Carlton", era: "1953–1969", attack: 91, midfield: 97, defence: 90, athleticism: 96, leadership: 99, trait: "Competitive fire" },
  { id: "tuck", name: "Michael Tuck", role: "captain", position: "Midfielder / utility", representativeClub: "Hawthorn", era: "1972–1991", attack: 88, midfield: 95, defence: 88, athleticism: 97, leadership: 99, trait: "September experience" },
  { id: "hodge", name: "Luke Hodge", role: "captain", position: "Midfielder / half-back", representativeClub: "Hawthorn / Brisbane", era: "2002–2019", attack: 89, midfield: 95, defence: 95, athleticism: 91, leadership: 99, trait: "On-field general" },
];

export function getAflClub(id: string): AflClub {
  return AFL_CLUBS.find((club) => club.id === id) ?? AFL_CLUBS[0];
}

export function playerOverall(player: AflPlayer): number {
  return Math.round((player.attack + player.midfield + player.defence + player.athleticism + player.leadership) / 5);
}
