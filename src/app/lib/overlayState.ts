export type OverlayMode = 'match' | 'starting-soon' | 'results';

export interface OverlayState {
  mode: OverlayMode;
  matchTitle: string;
  matchTime: string;
  startingTime?: string;
  gameFileLocation: string;
  gameState?: string; // Track current game state
  redScore: number;
  blueScore: number;
  redOPR: { username: string; score: number }[];
  blueOPR: { username: string; score: number }[];
  lastUpdated: number;
  seriesEnabled: boolean;
  seriesType: 'bo3' | 'bo5' | 'bo7';
  redAllianceName: string;
  blueAllianceName: string;
  redSeriesScore: number;
  blueSeriesScore: number;
  redTeamId?: string;
  blueTeamId?: string;
  redPrimaryColor?: string;
  redSecondaryColor?: string;
  bluePrimaryColor?: string;
  blueSecondaryColor?: string;
  allianceBranding: boolean;
  flippedTeams?: boolean;
  // Fuel RP
  fuelRPEnabled?: boolean;
  fuelRPThresholds?: number[]; // Fuel counts that earn an RP, e.g. [100] or [100, 360]
  redFuel?: number;
  blueFuel?: number;
  // Tournament mode
  tournamentModeEnabled?: boolean;
  tournamentPath?: string;
  matchNumber?: string;
  tournamentRedPlayers?: string[];
  tournamentBluePlayers?: string[];
  // Field 2 properties
  field2Enabled?: boolean;
  field2MatchTime?: string;
  field2GameFileLocation?: string;
  field2GameState?: string; // Track Field 2 game state
  field2RedScore?: number;
  field2BlueScore?: number;
  field2RedFuel?: number;
  field2BlueFuel?: number;
  field2RedOPR?: { username: string; score: number }[];
  field2BlueOPR?: { username: string; score: number }[];
  field2SeriesEnabled?: boolean;
  field2SeriesType?: 'bo3' | 'bo5' | 'bo7';
  field2RedAllianceName?: string;
  field2BlueAllianceName?: string;
  field2RedSeriesScore?: number;
  field2BlueSeriesScore?: number;
  field2RedTeamId?: string;
  field2BlueTeamId?: string;
  field2RedPrimaryColor?: string;
  field2RedSecondaryColor?: string;
  field2BluePrimaryColor?: string;
  field2BlueSecondaryColor?: string;
  field2AllianceBranding?: boolean;
  field2FlippedTeams?: boolean;
  differentialData?: { redScore: number; blueScore: number; differential: number; gameTime: string; timestamp: number }[];
}

const defaultState: OverlayState = {
  mode: 'starting-soon',
  matchTitle: 'FRC Stream Overlay',
  matchTime: '00:00',
  gameFileLocation: '',
  gameState: '',
  redScore: 0,
  blueScore: 0,
  redOPR: [{ username: '', score: 0 }, { username: '', score: 0 }, { username: '', score: 0 }],
  blueOPR: [{ username: '', score: 0 }, { username: '', score: 0 }, { username: '', score: 0 }],
  lastUpdated: Date.now(),
  seriesEnabled: false,
  seriesType: 'bo3',
  redAllianceName: 'Red Alliance',
  blueAllianceName: 'Blue Alliance',
  redSeriesScore: 0,
  blueSeriesScore: 0,
  allianceBranding: false,
  flippedTeams: false,
  // Fuel RP defaults
  fuelRPEnabled: true,
  fuelRPThresholds: [100],
  redFuel: 0,
  blueFuel: 0,
  // Tournament mode defaults
  tournamentModeEnabled: false,
  tournamentPath: '',
  matchNumber: '',
  tournamentRedPlayers: [],
  tournamentBluePlayers: [],
  // Field 2 defaults
  field2Enabled: false,
  field2MatchTime: '00:00',
  field2GameFileLocation: '',
  field2RedScore: 0,
  field2BlueScore: 0,
  field2RedFuel: 0,
  field2BlueFuel: 0,
  field2RedOPR: [{ username: '', score: 0 }, { username: '', score: 0 }, { username: '', score: 0 }],
  field2BlueOPR: [{ username: '', score: 0 }, { username: '', score: 0 }, { username: '', score: 0 }],
  field2SeriesEnabled: false,
  field2SeriesType: 'bo3',
  field2RedAllianceName: 'Red Alliance',
  field2BlueAllianceName: 'Blue Alliance',
  field2RedSeriesScore: 0,
  field2BlueSeriesScore: 0,
  field2AllianceBranding: false,
  field2FlippedTeams: false,
  differentialData: [],
};

// Only log the first failure of a streak, so a restarting dev server
// doesn't flood the console 10x per second.
let overlayFetchFailing = false;

const fetchOverlayState = async (): Promise<OverlayState> => {
  const response = await fetch('/api/overlay-state', { cache: 'no-store' });
  if (!response.ok) throw new Error(`overlay-state responded ${response.status}`);
  return await response.json();
};

export const getOverlayState = async (): Promise<OverlayState> => {
  if (typeof window === 'undefined') return defaultState;

  try {
    const state = await fetchOverlayState();
    overlayFetchFailing = false;
    return state;
  } catch (error) {
    if (!overlayFetchFailing) {
      console.warn('Failed to load overlay state (will keep retrying):', error);
      overlayFetchFailing = true;
    }
  }

  return defaultState;
};

export const setOverlayState = async (state: Partial<OverlayState>): Promise<void> => {
  if (typeof window === 'undefined') return;
  
  try {
    const response = await fetch('/api/overlay-state', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(state),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update overlay state');
    }
  } catch (error) {
    console.error('Failed to save overlay state:', error);
  }
};

export const subscribeToOverlayState = (callback: (state: OverlayState) => void, options?: { forceHighSpeed?: boolean; useFileWatcher?: boolean }) => {
  if (typeof window === 'undefined') return;
  
  let lastUpdated = 0;
  let isFirstCall = true;
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pollRate = 1000; // start slow, speed up once we know a match is active

  // Sequential polling: the next request is scheduled only after the previous one
  // finishes, so a slow server can never pile up overlapping requests.
  const poll = async () => {
    let failed = false;
    try {
      const state = await fetchOverlayState();
      overlayFetchFailing = false;

      // Determine if we should be in high-speed mode using game state from the overlay state
      const field1Active = state.gameState && state.gameState.trim() !== '' && state.gameState.trim() !== 'FINISHED';
      const field2Active = state.field2Enabled && state.field2GameState &&
                          state.field2GameState.trim() !== '' && state.field2GameState.trim() !== 'FINISHED';
      const shouldBeHighSpeed = options?.forceHighSpeed || field1Active || field2Active || state.mode === 'match';
      pollRate = shouldBeHighSpeed ? 100 : 1000; // 100ms when active, 1s when idle

      // Call callback on first call or if state has actually changed
      if (!stopped && (isFirstCall || (state.lastUpdated && state.lastUpdated !== lastUpdated))) {
        lastUpdated = state.lastUpdated || 0;
        isFirstCall = false;
        callback(state);
      }
    } catch (error) {
      failed = true;
      if (!overlayFetchFailing) {
        console.warn('Failed to poll overlay state (will keep retrying):', error);
        overlayFetchFailing = true;
      }
    }

    if (!stopped) {
      // Back off to 1s while the server is unreachable
      timer = setTimeout(poll, failed ? 1000 : pollRate);
    }
  };

  timer = setTimeout(poll, pollRate);

  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
  };
};