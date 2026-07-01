export interface PuzzleDef {
  id: string;
  /** position with the solver to move */
  fen: string;
  /**
   * Solution line in UCI, starting with the solver's move; even indices are
   * the solver's moves, odd indices are the opponent's forced replies.
   */
  solution: string[];
  themes: string[];
  rating: number;
}

export interface PuzzleProgress {
  rating: number;
  streak: number;
  bestStreak: number;
  solved: string[]; // puzzle ids
  attempts: number;
}

export const DEFAULT_PUZZLE_PROGRESS: PuzzleProgress = {
  rating: 1000,
  streak: 0,
  bestStreak: 0,
  solved: [],
  attempts: 0,
};
