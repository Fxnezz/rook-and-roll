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
  const ratings: Record<AflLine, number> = {
    forward: player.attack,
    midfield: player.midfield,
    defence: player.defence,
  };
  const assignedLine = [...ROLE_LINES[player.role]].sort((left, right) => ratings[right] - ratings[left])[0];
  return [assignedLine];
}

export function playerEligibleSlotIds(player: AflPlayer): string[] {
  const assignedLine = playerEligibleLines(player)[0];
  return AFL_POSITION_SLOTS.filter((slot) => slot.line === assignedLine).map((slot) => slot.id);
}

const CORE_AFL_PLAYERS: AflPlayer[] = [
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

export type AflRosterEra = "1930s" | "1940s" | "1950s" | "1960s" | "1970s" | "1980s" | "1990s" | "2000s" | "2010s" | "2020s";

type RosterPlayerSeed = readonly [
  id: string,
  name: string,
  line: AflLine,
  overall: number,
  trait: string,
];

interface ClubEraRosterSeed {
  club: string;
  era: AflRosterEra;
  existingIds: string[];
  players: RosterPlayerSeed[];
}

const CLUB_ERA_ROSTER_SEEDS: ClubEraRosterSeed[] = [
  { club: "Collingwood", era: "1930s", existingIds: ["regan"], players: [
    ["gordon-coventry", "Gordon Coventry", "forward", 96, "Record spearhead"], ["syd-coventry", "Syd Coventry", "midfield", 95, "Machine-team captain"],
    ["albert-collier", "Albert Collier", "midfield", 95, "Contest enforcer"], ["harry-collier", "Harry Collier", "midfield", 94, "Clearance authority"],
    ["des-fothergill", "Des Fothergill", "forward", 94, "Brilliant ball winner"], ["charlie-dibbs", "Charlie Dibbs", "defence", 92, "Reliable last line"],
    ["jack-makeham", "Jack Makeham", "defence", 91, "Disciplined defender"], ["harold-rumney", "Harold Rumney", "defence", 91, "Tough back-pocket craft"],
  ] },
  { club: "Essendon", era: "1940s", existingIds: ["reynolds"], players: [
    ["john-coleman", "John Coleman", "forward", 99, "Goal-square phenomenon"], ["bill-hutchison", "Bill Hutchison", "midfield", 97, "Rover with complete command"],
    ["wally-buttsworth", "Wally Buttsworth", "defence", 94, "Grand Final interceptor"], ["jack-cassidy", "Jack Cassidy", "forward", 91, "Clever attacking foil"],
    ["harold-lambert", "Harold Lambert", "defence", 92, "Composed half-back"], ["george-hassell", "George Hassell", "midfield", 91, "Relentless wing runner"],
    ["tom-reynolds", "Tom Reynolds", "forward", 91, "Sharp goal sense"], ["norm-mcclure", "Norm McClure", "defence", 90, "Strong key-position stopper"],
  ] },
  { club: "Melbourne", era: "1950s", existingIds: ["barassi"], players: [
    ["john-beckwith", "John Beckwith", "defence", 95, "Dynasty captain"], ["brian-dixon", "Brian Dixon", "midfield", 94, "Wing endurance"],
    ["stuart-spencer", "Stuart Spencer", "forward", 93, "Dynamic half-forward"], ["laurie-mithen", "Laurie Mithen", "midfield", 93, "Big-game ball winner"],
    ["don-williams", "Don Williams", "defence", 92, "Finals reliability"], ["bob-johnson", "Bob Johnson", "forward", 94, "Towering full-forward"],
    ["ian-ridley", "Ian Ridley", "forward", 92, "Roving goalkicker"], ["brian-wilson-50s", "Brian Wilson", "defence", 90, "Dependable premiership defender"],
  ] },
  { club: "Richmond", era: "1960s", existingIds: ["hart", "bartlett"], players: [
    ["francis-bourke", "Francis Bourke", "midfield", 96, "Tough two-way wing"], ["roger-dean", "Roger Dean", "forward", 93, "Fearless rover-forward"],
    ["bill-barrot", "Bill Barrot", "midfield", 94, "Long-kicking centre"], ["barry-richardson", "Barry Richardson", "forward", 92, "Powerful key target"],
    ["mike-patterson", "Mike Patterson", "defence", 91, "Ruck-defence versatility"], ["tony-jewell", "Tony Jewell", "defence", 90, "Back-pocket discipline"],
    ["michael-green", "Michael Green", "midfield", 93, "Mobile ruck influence"], ["dick-clay", "Dick Clay", "defence", 94, "Elite utility defender"],
  ] },
  { club: "Carlton", era: "1970s", existingIds: ["doull"], players: [
    ["alex-jesaulenko", "Alex Jesaulenko", "forward", 98, "Spectacular match winner"], ["john-nicholls", "John Nicholls", "midfield", 97, "Ruck leadership"],
    ["brent-crosswell", "Brent Crosswell", "midfield", 94, "Finals intensity"], ["geoff-southby", "Geoff Southby", "defence", 96, "Champion full-back"],
    ["wayne-harmes", "Wayne Harmes", "defence", 93, "September desperation"], ["robert-walls", "Robert Walls", "forward", 94, "Intelligent key forward"],
    ["jim-buckley", "Jim Buckley", "midfield", 92, "Hard-running rover"], ["mark-maclure", "Mark Maclure", "forward", 93, "Competitive centre half-forward"],
  ] },
  { club: "Hawthorn", era: "1980s", existingIds: ["dunstall", "tuck"], players: [
    ["dermott-brereton", "Dermott Brereton", "forward", 97, "Finals intimidation"], ["john-platten", "John Platten", "midfield", 96, "Roving accumulator"],
    ["gary-ayres", "Gary Ayres", "defence", 96, "September specialist"], ["chris-mew", "Chris Mew", "defence", 94, "Composed centre half-back"],
    ["chris-langford", "Chris Langford", "defence", 94, "Power key defender"], ["robert-dipierdomenico", "Robert DiPierdomenico", "midfield", 94, "Fearless wing pressure"],
    ["gary-buckenara", "Gary Buckenara", "forward", 93, "Classy half-forward"], ["russell-greene", "Russell Greene", "midfield", 92, "Repeat-running wingman"],
  ] },
  { club: "West Coast", era: "1990s", existingIds: ["matera", "jakovich", "mckenna"], players: [
    ["john-worsfold", "John Worsfold", "defence", 95, "Defensive captaincy"], ["dean-kemp", "Dean Kemp", "midfield", 96, "Silky finals midfielder"],
    ["chris-mainwaring", "Chris Mainwaring", "midfield", 94, "Hard-running wing"], ["brett-heady", "Brett Heady", "forward", 93, "Creative goal threat"],
    ["peter-sumich", "Peter Sumich", "forward", 94, "Left-foot spearhead"], ["michael-brennan", "Michael Brennan", "defence", 91, "Dependable stopper"],
    ["chris-lewis", "Chris Lewis", "forward", 93, "Explosive forward craft"],
  ] },
  { club: "Adelaide", era: "1990s", existingIds: ["mcleod"], players: [
    ["mark-ricciuto", "Mark Ricciuto", "midfield", 97, "Powerful midfield leadership"], ["darren-jarman", "Darren Jarman", "forward", 97, "Grand Final precision"],
    ["nigel-smart", "Nigel Smart", "defence", 94, "Athletic rebound"], ["ben-hart", "Ben Hart", "defence", 95, "Elite one-on-one defence"],
    ["shaun-rehn", "Shaun Rehn", "midfield", 94, "Premier ruck craft"], ["tony-modra", "Tony Modra", "forward", 96, "Spectacular full-forward"],
    ["tyson-edwards", "Tyson Edwards", "midfield", 94, "Two-way consistency"], ["mark-bickley", "Mark Bickley", "defence", 93, "Premiership captain"],
  ] },
  { club: "Carlton", era: "1990s", existingIds: ["silvagni", "koutoufides", "bradley", "williams"], players: [
    ["stephen-kernahan", "Stephen Kernahan", "forward", 97, "Captain and spearhead"], ["brett-ratten", "Brett Ratten", "midfield", 94, "Clearance accumulator"],
    ["michael-sexton", "Michael Sexton", "defence", 93, "Reliable key defender"], ["mil-hanna", "Mil Hanna", "midfield", 92, "Pace and rebound"],
    ["peter-dean", "Peter Dean", "defence", 92, "Finals toughness"], ["earl-spalding", "Earl Spalding", "forward", 91, "Physical centre half-forward"],
  ] },
  { club: "Geelong", era: "2000s", existingIds: ["ablett-jr", "bartel", "scarlett", "enright"], players: [
    ["joel-corey", "Joel Corey", "midfield", 96, "Two-way midfield engine"], ["cameron-mooney", "Cameron Mooney", "forward", 92, "Combative key target"],
    ["steve-johnson", "Steve Johnson", "forward", 96, "Unpredictable scoring craft"], ["james-kelly", "James Kelly", "midfield", 93, "Clean contested distributor"],
    ["joel-selwood", "Joel Selwood", "midfield", 98, "Relentless contested captain"], ["brad-ottens", "Brad Ottens", "midfield", 94, "Finals ruck influence"],
    ["tom-harley", "Tom Harley", "defence", 93, "Premiership organiser"], ["paul-chapman", "Paul Chapman", "forward", 96, "Big-game finisher"],
    ["cameron-ling", "Cameron Ling", "midfield", 94, "Elite shutdown leadership"],
  ] },
  { club: "Brisbane", era: "2000s", existingIds: ["voss", "black"], players: [
    ["jonathan-brown", "Jonathan Brown", "forward", 97, "Pack-crashing spearhead"], ["jason-akermanis", "Jason Akermanis", "forward", 97, "Two-sided match winner"],
    ["nigel-lappin", "Nigel Lappin", "midfield", 96, "Endless outside run"], ["alastair-lynch", "Alastair Lynch", "forward", 94, "Power full-forward"],
    ["luke-power", "Luke Power", "midfield", 94, "Class around stoppage"], ["justin-leppitsch", "Justin Leppitsch", "defence", 95, "Rebounding key defender"],
    ["mal-michael", "Mal Michael", "defence", 95, "Powerful one-on-one stopper"], ["chris-johnson", "Chris Johnson", "defence", 95, "Creative backline rebound"],
    ["clark-keating", "Clark Keating", "midfield", 91, "September ruck specialist"], ["chris-scott", "Chris Scott", "defence", 92, "Hard-edged defender"],
  ] },
  { club: "Essendon", era: "2000s", existingIds: ["hird"], players: [
    ["dustin-fletcher", "Dustin Fletcher", "defence", 96, "Long-range defensive control"], ["matthew-lloyd", "Matthew Lloyd", "forward", 98, "Precision full-forward"],
    ["scott-lucas", "Scott Lucas", "forward", 94, "Long-kicking key target"], ["mark-mercuri", "Mark Mercuri", "midfield", 93, "Creative midfield class"],
    ["jason-johnson", "Jason Johnson", "midfield", 93, "Contested ball force"], ["adam-ramanauskas", "Adam Ramanauskas", "defence", 92, "Smooth defensive transition"],
    ["adam-mcphee", "Adam McPhee", "defence", 92, "Athletic intercepting"], ["dean-solomon", "Dean Solomon", "defence", 91, "Physical defensive edge"],
    ["mark-mcveigh-ess", "Mark McVeigh", "midfield", 91, "Reliable ball use"],
  ] },
  { club: "Hawthorn", era: "2010s", existingIds: ["franklin", "mitchell", "rioli", "hodge"], players: [
    ["jarryd-roughead", "Jarryd Roughead", "forward", 96, "Versatile premiership spearhead"], ["jordan-lewis", "Jordan Lewis", "midfield", 95, "Hard-running distributor"],
    ["grant-birchall", "Grant Birchall", "defence", 94, "Precision rebound"], ["josh-gibson", "Josh Gibson", "defence", 95, "Team-defence organiser"],
    ["luke-breust", "Luke Breust", "forward", 95, "Efficient small-forward craft"], ["shaun-burgoyne", "Shaun Burgoyne", "midfield", 96, "Silk under finals pressure"],
  ] },
  { club: "Richmond", era: "2010s", existingIds: ["martin", "rance"], players: [
    ["trent-cotchin", "Trent Cotchin", "midfield", 96, "Contested captaincy"], ["jack-riewoldt", "Jack Riewoldt", "forward", 96, "Clever key-forward craft"],
    ["shane-edwards", "Shane Edwards", "midfield", 94, "Fast-hands connection"], ["dion-prestia", "Dion Prestia", "midfield", 93, "Clearance pressure"],
    ["bachar-houli", "Bachar Houli", "defence", 94, "Grand Final rebound"], ["dylan-grimes", "Dylan Grimes", "defence", 95, "Flexible shutdown defence"],
    ["nick-vlastuin", "Nick Vlastuin", "defence", 94, "Brave intercept marking"], ["kane-lambert", "Kane Lambert", "midfield", 92, "System-running discipline"],
    ["daniel-rioli", "Daniel Rioli", "forward", 92, "Speed and pressure"],
  ] },
  { club: "Sydney", era: "2010s", existingIds: ["franklin", "goodes"], players: [
    ["josh-kennedy-syd", "Josh Kennedy", "midfield", 97, "Clearance powerhouse"], ["dan-hannebery", "Dan Hannebery", "midfield", 95, "High-volume running"],
    ["luke-parker", "Luke Parker", "midfield", 95, "Aerial contested midfielder"], ["jarrad-mcveigh", "Jarrad McVeigh", "defence", 94, "Composed field leadership"],
    ["heath-grundy", "Heath Grundy", "defence", 93, "Dependable key stopper"], ["ted-richards", "Ted Richards", "defence", 94, "Premiership key defender"],
    ["nick-malceski", "Nick Malceski", "defence", 93, "Damaging rebound kick"], ["lewis-jetta", "Lewis Jetta", "forward", 92, "Breakaway speed"],
  ] },
  { club: "Melbourne", era: "2020s", existingIds: ["lever"], players: [
    ["christian-petracca", "Christian Petracca", "midfield", 98, "Grand Final power"], ["clayton-oliver", "Clayton Oliver", "midfield", 97, "Clearance accumulation"],
    ["max-gawn", "Max Gawn", "midfield", 98, "Dominant ruck captain"], ["steven-may", "Steven May", "defence", 96, "Power key defender"],
    ["christian-salem", "Christian Salem", "defence", 94, "Precise defensive exit"], ["jack-viney", "Jack Viney", "midfield", 95, "Inside pressure leader"],
    ["bayley-fritsch", "Bayley Fritsch", "forward", 95, "Finals goal craft"], ["kysaiah-pickett", "Kysaiah Pickett", "forward", 94, "Explosive forward pressure"],
    ["angus-brayshaw", "Angus Brayshaw", "defence", 93, "Flexible two-way coverage"],
  ] },
  { club: "Collingwood", era: "2020s", existingIds: [], players: [
    ["scott-pendlebury", "Scott Pendlebury", "midfield", 98, "Time-bending composure"], ["steele-sidebottom", "Steele Sidebottom", "midfield", 95, "Endurance and skill"],
    ["jordan-de-goey", "Jordan De Goey", "forward", 95, "Explosive finals impact"], ["darcy-moore", "Darcy Moore", "defence", 97, "Intercepting captain"],
    ["nick-daicos", "Nick Daicos", "midfield", 97, "Creative ball movement"], ["josh-daicos", "Josh Daicos", "midfield", 94, "Wing precision"],
    ["brayden-maynard", "Brayden Maynard", "defence", 94, "Physical defensive edge"], ["jack-crisp", "Jack Crisp", "defence", 94, "Relentless rebound"],
    ["mason-cox", "Mason Cox", "forward", 91, "Aerial finals presence"], ["isaac-quaynor", "Isaac Quaynor", "defence", 93, "Athletic lockdown"],
  ] },
  { club: "Brisbane", era: "2020s", existingIds: [], players: [
    ["lachie-neale", "Lachie Neale", "midfield", 98, "Elite clearance volume"], ["harris-andrews", "Harris Andrews", "defence", 97, "Aerial defensive command"],
    ["charlie-cameron", "Charlie Cameron", "forward", 96, "Electric goal pressure"], ["joe-daniher", "Joe Daniher", "forward", 94, "Long-range key target"],
    ["hugh-mccluggage", "Hugh McCluggage", "midfield", 95, "Classy two-way running"], ["dayne-zorko", "Dayne Zorko", "defence", 94, "Aggressive rebound leadership"],
    ["cam-rayner", "Cam Rayner", "forward", 93, "Explosive contest power"], ["zac-bailey", "Zac Bailey", "forward", 93, "Fast scoreboard impact"],
    ["josh-dunkley", "Josh Dunkley", "midfield", 95, "Defensive midfield strength"], ["keidean-coleman", "Keidean Coleman", "defence", 93, "Line-breaking kick"],
  ] },
];

function clampRating(value: number) {
  return Math.max(70, Math.min(99, value));
}

function createRosterPlayer(club: string, era: AflRosterEra, [id, name, line, overall, trait]: RosterPlayerSeed): AflPlayer {
  const role: AflRole = line === "forward" ? "half-forward" : line === "midfield" ? "inside-mid" : "intercept-defender";
  return {
    id,
    name,
    role,
    position: line === "forward" ? "Forward" : line === "midfield" ? "Midfielder" : "Defender",
    representativeClub: club,
    era: `${era.slice(0, 4)}–${Number(era.slice(0, 4)) + 9}`,
    attack: clampRating(overall + (line === "forward" ? 3 : line === "midfield" ? -1 : -5)),
    midfield: clampRating(overall + (line === "midfield" ? 3 : -1)),
    defence: clampRating(overall + (line === "defence" ? 3 : line === "midfield" ? -1 : -5)),
    athleticism: clampRating(overall),
    leadership: clampRating(overall),
    trait,
  };
}

const ERA_ROSTER_PLAYERS = CLUB_ERA_ROSTER_SEEDS.flatMap((roster) =>
  roster.players.map((player) => createRosterPlayer(roster.club, roster.era, player)),
);

export const AFL_PLAYERS: AflPlayer[] = [...CORE_AFL_PLAYERS, ...ERA_ROSTER_PLAYERS];

export const AFL_CLUB_ERA_ROSTERS = CLUB_ERA_ROSTER_SEEDS.map((roster) => ({
  club: roster.club,
  era: roster.era,
  playerIds: [...roster.existingIds, ...roster.players.map(([id]) => id)],
}));

export function getAflClub(id: string): AflClub {
  return AFL_CLUBS.find((club) => club.id === id) ?? AFL_CLUBS[0];
}

export function playerOverall(player: AflPlayer): number {
  return Math.round((player.attack + player.midfield + player.defence + player.athleticism + player.leadership) / 5);
}
