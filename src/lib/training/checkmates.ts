import type { PuzzleDef } from "@/lib/puzzles/types";

export interface MatePattern {
  id: string;
  name: string;
  description: string;
  /** find-the-mate-in-1 drills, PuzzleDef-shaped so PuzzlePlayer renders them as-is */
  puzzles: PuzzleDef[];
}

/**
 * Classic checkmate patterns as mate-in-1 drills. Every position and solution
 * is machine-verified (see the validation step in the repo history): the
 * solution move is legal and produces checkmate.
 */
export const MATE_PATTERNS: MatePattern[] = [
  {
    id: "back-rank",
    name: "Back-rank mate",
    description: "A rook or queen delivers mate along the home rank while the king is boxed in by its own pawns.",
    puzzles: [
      {
        id: "mate-backrank-1",
        fen: "6k1/5ppp/8/8/8/8/8/4R2K w - - 0 1",
        solution: ["e1e8"],
        themes: ["backRankMate", "mateIn1"],
        rating: 800,
      },
      {
        id: "mate-backrank-2",
        fen: "3r2k1/5ppp/8/8/8/8/5PPP/3Q2K1 w - - 0 1",
        solution: ["d1d8"],
        themes: ["backRankMate", "mateIn1"],
        rating: 900,
      },
    ],
  },
  {
    id: "smothered",
    name: "Smothered mate",
    description: "A knight mates a king completely boxed in by its own pieces.",
    puzzles: [
      {
        id: "mate-smothered-1",
        fen: "6rk/6pp/8/6N1/8/8/8/7K w - - 0 1",
        solution: ["g5f7"],
        themes: ["smotheredMate", "mateIn1"],
        rating: 1000,
      },
    ],
  },
  {
    id: "arabian",
    name: "Arabian mate",
    description: "Rook and knight team up against a cornered king — the knight guards the rook and the escape square.",
    puzzles: [
      {
        id: "mate-arabian-1",
        fen: "7k/8/5N2/8/8/8/6R1/7K w - - 0 1",
        solution: ["g2g8"],
        themes: ["arabianMate", "mateIn1"],
        rating: 1000,
      },
    ],
  },
  {
    id: "anastasia",
    name: "Anastasia's mate",
    description: "A knight seals the escape squares on the g-file while a rook mates along the h-file.",
    puzzles: [
      {
        id: "mate-anastasia-1",
        fen: "8/4N1pk/8/8/3R4/8/8/K7 w - - 0 1",
        solution: ["d4h4"],
        themes: ["anastasiaMate", "mateIn1"],
        rating: 1100,
      },
    ],
  },
  {
    id: "boden",
    name: "Boden's mate",
    description: "Two bishops on crossing diagonals mate a king blocked by its own pieces — usually after castling long.",
    puzzles: [
      {
        id: "mate-boden-1",
        fen: "2kr4/3p4/8/8/2B2B2/8/8/4K3 w - - 0 1",
        solution: ["c4a6"],
        themes: ["bodenMate", "mateIn1"],
        rating: 1300,
      },
    ],
  },
  {
    id: "hook",
    name: "Hook mate",
    description: "Rook, knight, and pawn form a hook around the enemy king.",
    puzzles: [
      {
        id: "mate-hook-1",
        fen: "3k4/2pppR2/1N6/8/8/8/8/4K3 w - - 0 1",
        solution: ["f7f8"],
        themes: ["hookMate", "mateIn1"],
        rating: 1200,
      },
    ],
  },
  {
    id: "queen-kiss",
    name: "Support mate (queen)",
    description: "The queen mates adjacent to the king, protected by another piece or pawn.",
    puzzles: [
      {
        id: "mate-support-1",
        fen: "3k4/8/3K4/1Q6/8/8/8/8 w - - 0 1",
        solution: ["b5d7"],
        themes: ["queenMate", "mateIn1"],
        rating: 700,
      },
    ],
  },
  {
    id: "epaulette",
    name: "Epaulette mate",
    description: "The king's own rooks flank it like epaulettes, leaving no escape from a frontal queen check.",
    puzzles: [
      {
        id: "mate-epaulette-1",
        fen: "3rkr2/8/8/3Q4/8/8/8/4K3 w - - 0 1",
        solution: ["d5e6"],
        themes: ["epauletteMate", "mateIn1"],
        rating: 1100,
      },
    ],
  },
  {
    id: "ladder",
    name: "Ladder mate",
    description: "Two major pieces walk the enemy king to the edge rank by rank.",
    puzzles: [
      {
        id: "mate-ladder-1",
        fen: "4k3/7R/6Q1/8/8/8/8/4K3 w - - 0 1",
        solution: ["g6g8"],
        themes: ["ladderMate", "mateIn1"],
        rating: 700,
      },
    ],
  },
  {
    id: "scholars",
    name: "Scholar's-style f7 mate",
    description: "Queen and bishop converge on the weakest square on the board: f7.",
    puzzles: [
      {
        id: "mate-scholars-1",
        fen: "r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 0 1",
        solution: ["h5f7"],
        themes: ["scholarsMate", "mateIn1"],
        rating: 600,
      },
    ],
  },
];

export const ALL_MATE_PUZZLES: PuzzleDef[] = MATE_PATTERNS.flatMap((p) => p.puzzles);
