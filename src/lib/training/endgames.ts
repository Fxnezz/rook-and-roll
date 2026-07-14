export interface EndgameDrill {
  id: string;
  name: string;
  description: string;
  /** position with the trainee to move */
  fen: string;
  goal: "win" | "draw";
}

/** Curated endgame technique positions. All FENs are legal and the trainee is always to move. */
export const ENDGAME_DRILLS: EndgameDrill[] = [
  {
    id: "kp-opposition",
    name: "K+P vs K: taking the opposition",
    description: "Basic king-and-pawn technique — win the opposition to escort the pawn home.",
    fen: "8/8/4k3/4P3/4K3/8/8/8 w - - 0 1",
    goal: "win",
  },
  {
    id: "kp-rook-pawn",
    name: "K+P vs K: rook pawn draw",
    description: "Rook-pawn endings are notoriously drawish once the defending king reaches the corner — try to force a win anyway.",
    fen: "8/8/8/8/k7/8/P7/K7 w - - 0 1",
    goal: "win",
  },
  {
    id: "lucena",
    name: "Lucena position",
    description: "The single most important rook-endgame win: build a bridge to shield your king from checks.",
    fen: "1K6/1P1k4/8/8/8/8/r7/2R5 w - - 0 1",
    goal: "win",
  },
  {
    id: "philidor",
    name: "Philidor position",
    description: "The classic rook-endgame draw: hold the third rank until the pawn advances, then check from behind.",
    fen: "8/8/1k6/8/2K1P3/8/r7/4R3 b - - 0 1",
    goal: "draw",
  },
  {
    id: "kq-vs-k",
    name: "K+Q vs K",
    description: "Corner the lone king with your queen and king without stalemating it.",
    fen: "8/8/8/4k3/8/8/8/K6Q w - - 0 1",
    goal: "win",
  },
  {
    id: "kr-vs-k",
    name: "K+R vs K",
    description: "The rook-and-king basic mate — box the king to the edge, then bring your king up.",
    fen: "8/8/8/4k3/8/8/8/K6R w - - 0 1",
    goal: "win",
  },
  {
    id: "two-bishops",
    name: "Two bishops vs K",
    description: "Corner the king using both bishops' diagonals together.",
    fen: "8/8/8/4k3/8/8/8/K3BB2 w - - 0 1",
    goal: "win",
  },
  {
    id: "bn-vs-k",
    name: "Bishop + knight vs K (into the correct corner)",
    description: "The hardest basic mate — you must drive the king into the corner matching your bishop's color.",
    fen: "8/8/8/4k3/8/8/8/K2BN3 w - - 0 1",
    goal: "win",
  },
  {
    id: "rook-vs-bishop-fortress",
    name: "R vs B: holding the fortress",
    description: "Down the exchange with no pawns — keep your king and bishop coordinated to hold the draw.",
    fen: "8/8/3k4/8/3b4/8/3K4/3R4 b - - 0 1",
    goal: "draw",
  },
  {
    id: "qvsp-7th",
    name: "Q vs pawn on the 7th",
    description: "A lone queen usually beats an advanced pawn, except rook/bishop pawns — technique matters.",
    fen: "8/3P4/8/8/8/6k1/8/4KQ2 w - - 0 1",
    goal: "win",
  },
];
