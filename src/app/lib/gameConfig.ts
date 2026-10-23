export type GameMode = 'REBUILT' | 'OVERRIDE';

// Default game mode when none has been picked on the dashboard
export const GAME_MODE: GameMode = 'REBUILT';

export const GAME_MODES: { value: GameMode; label: string }[] = [
  { value: 'REBUILT', label: 'FRC REBUILT (3v3)' },
  { value: 'OVERRIDE', label: 'VEX Override (2v2)' },
];

// Match timing in seconds remaining on Timer.txt
export interface GameTiming {
  matchLength: number;   // Timer value at match start
  autoEnd: number;       // Timer value when auto ends
  autoBannerEnd: number; // Timer value when the AUTO banner hides
  endgame: number;       // Timer turns yellow at or below this
}

export const GAME_TIMING: Record<GameMode, GameTiming> = {
  REBUILT:  { matchLength: 160, autoEnd: 140, autoBannerEnd: 145, endgame: 30 },
  OVERRIDE: { matchLength: 120, autoEnd: 105, autoBannerEnd: 105, endgame: 15 },
};
