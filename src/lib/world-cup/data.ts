import { FOOTBALL_PLAYERS, type FootballPlayer } from "@/lib/football/data";

export interface WorldCupNation {
  id: string;
  name: string;
  short: string;
  confederation: string;
  primary: string;
  secondary: string;
  strength: number;
}

export const WORLD_CUP_NATIONS: WorldCupNation[] = [
  { id:"arg", name:"Argentina", short:"ARG", confederation:"CONMEBOL", primary:"#75aadb", secondary:"#ffffff", strength:95 },
  { id:"aus", name:"Australia", short:"AUS", confederation:"AFC", primary:"#0b6b3a", secondary:"#ffcf2e", strength:80 },
  { id:"bel", name:"Belgium", short:"BEL", confederation:"UEFA", primary:"#d71920", secondary:"#f8d34a", strength:87 },
  { id:"bra", name:"Brazil", short:"BRA", confederation:"CONMEBOL", primary:"#ffdf00", secondary:"#009c3b", strength:96 },
  { id:"cmr", name:"Cameroon", short:"CMR", confederation:"CAF", primary:"#007a5e", secondary:"#fcd116", strength:82 },
  { id:"can", name:"Canada", short:"CAN", confederation:"CONCACAF", primary:"#d80621", secondary:"#ffffff", strength:78 },
  { id:"chi", name:"Chile", short:"CHI", confederation:"CONMEBOL", primary:"#d52b1e", secondary:"#ffffff", strength:82 },
  { id:"col", name:"Colombia", short:"COL", confederation:"CONMEBOL", primary:"#fcd116", secondary:"#003893", strength:85 },
  { id:"crc", name:"Costa Rica", short:"CRC", confederation:"CONCACAF", primary:"#ce1126", secondary:"#ffffff", strength:78 },
  { id:"cro", name:"Croatia", short:"CRO", confederation:"UEFA", primary:"#d7141a", secondary:"#ffffff", strength:90 },
  { id:"den", name:"Denmark", short:"DEN", confederation:"UEFA", primary:"#c60c30", secondary:"#ffffff", strength:84 },
  { id:"ecu", name:"Ecuador", short:"ECU", confederation:"CONMEBOL", primary:"#ffd100", secondary:"#034ea2", strength:82 },
  { id:"egy", name:"Egypt", short:"EGY", confederation:"CAF", primary:"#ce1126", secondary:"#ffffff", strength:80 },
  { id:"eng", name:"England", short:"ENG", confederation:"UEFA", primary:"#ffffff", secondary:"#cf081f", strength:92 },
  { id:"fra", name:"France", short:"FRA", confederation:"UEFA", primary:"#1b2f6b", secondary:"#ffffff", strength:95 },
  { id:"ger", name:"Germany", short:"GER", confederation:"UEFA", primary:"#ffffff", secondary:"#111111", strength:94 },
  { id:"gha", name:"Ghana", short:"GHA", confederation:"CAF", primary:"#fcd116", secondary:"#006b3f", strength:80 },
  { id:"ita", name:"Italy", short:"ITA", confederation:"UEFA", primary:"#0066b3", secondary:"#ffffff", strength:93 },
  { id:"jpn", name:"Japan", short:"JPN", confederation:"AFC", primary:"#163f8c", secondary:"#ffffff", strength:84 },
  { id:"mex", name:"Mexico", short:"MEX", confederation:"CONCACAF", primary:"#006847", secondary:"#ffffff", strength:84 },
  { id:"mar", name:"Morocco", short:"MAR", confederation:"CAF", primary:"#c1272d", secondary:"#006233", strength:88 },
  { id:"ned", name:"Netherlands", short:"NED", confederation:"UEFA", primary:"#f36c21", secondary:"#ffffff", strength:92 },
  { id:"nga", name:"Nigeria", short:"NGA", confederation:"CAF", primary:"#008751", secondary:"#ffffff", strength:82 },
  { id:"pol", name:"Poland", short:"POL", confederation:"UEFA", primary:"#ffffff", secondary:"#dc143c", strength:83 },
  { id:"por", name:"Portugal", short:"POR", confederation:"UEFA", primary:"#046a38", secondary:"#da291c", strength:92 },
  { id:"sen", name:"Senegal", short:"SEN", confederation:"CAF", primary:"#00853f", secondary:"#fdef42", strength:84 },
  { id:"kor", name:"South Korea", short:"KOR", confederation:"AFC", primary:"#e51b23", secondary:"#ffffff", strength:82 },
  { id:"esp", name:"Spain", short:"ESP", confederation:"UEFA", primary:"#aa151b", secondary:"#f1bf00", strength:94 },
  { id:"swe", name:"Sweden", short:"SWE", confederation:"UEFA", primary:"#006aa7", secondary:"#fecc00", strength:83 },
  { id:"sui", name:"Switzerland", short:"SUI", confederation:"UEFA", primary:"#d52b1e", secondary:"#ffffff", strength:85 },
  { id:"uru", name:"Uruguay", short:"URU", confederation:"CONMEBOL", primary:"#5bbbea", secondary:"#ffffff", strength:90 },
  { id:"usa", name:"United States", short:"USA", confederation:"CONCACAF", primary:"#163f8c", secondary:"#ffffff", strength:82 },
];

const nationAliases: Record<string, string> = {
  Argentina:"arg", Australia:"aus", Belgium:"bel", Brazil:"bra", Cameroon:"cmr", Canada:"can", Chile:"chi", Colombia:"col",
  Croatia:"cro", Denmark:"den", Ecuador:"ecu", Egypt:"egy", England:"eng", France:"fra", Germany:"ger", Ghana:"gha", Italy:"ita",
  Japan:"jpn", Mexico:"mex", Morocco:"mar", Netherlands:"ned", Nigeria:"nga", Poland:"pol", Portugal:"por", Senegal:"sen",
  "South Korea":"kor", Spain:"esp", Sweden:"swe", Switzerland:"sui", Uruguay:"uru", USA:"usa", "United States":"usa",
};

export function getWorldCupNation(id: string) {
  return WORLD_CUP_NATIONS.find((nation) => nation.id === id) ?? WORLD_CUP_NATIONS[0];
}

export function playerNationId(player: FootballPlayer) {
  return nationAliases[player.nation] ?? null;
}

export const WORLD_CUP_PLAYERS = FOOTBALL_PLAYERS;
