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

export const getOverlayState = async (): Promise<OverlayState> => {
  if (typeof window === 'undefined') return defaultState;
  
  try {
    const response = await fetch('/api/overlay-state');
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('Failed to load overlay state:', error);
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
  let currentInterval: NodeJS.Timeout | null = null;
  let lastPollRate = 0;
  
  const startPolling = (pollRate: number) => {
    // Only restart if poll rate changed
    if (lastPollRate === pollRate && currentInterval) return;
    
    if (currentInterval) {
      clearInterval(currentInterval);
    }
    
    lastPollRate = pollRate;
    currentInterval = setInterval(async () => {
      try {
        const state = await getOverlayState();
        
        // Determine if we should be in high-speed mode using game state from the overlay state
        const field1Active = state.gameState && state.gameState.trim() !== '' && state.gameState.trim() !== 'FINISHED';
        const field2Active = state.field2Enabled && state.field2GameState && 
                            state.field2GameState.trim() !== '' && state.field2GameState.trim() !== 'FINISHED';
        
        const shouldBeHighSpeed = options?.forceHighSpeed || field1Active || field2Active || state.mode === 'match';
        
        // Switch polling rate if needed
        const desiredPollRate = shouldBeHighSpeed ? 100 : 1000; // 100ms when active, 1s when idle
        if (desiredPollRate !== lastPollRate) {
          startPolling(desiredPollRate);
        }
        
        // Call callback on first call or if state has actually changed
        if (isFirstCall || (state.lastUpdated && state.lastUpdated !== lastUpdated)) {
          lastUpdated = state.lastUpdated || 0;
          isFirstCall = false;
          callback(state);
        }
      } catch (error) {
        console.error('Failed to poll overlay state:', error);
      }
    }, pollRate);
  };
  
  // Start with slow polling initially
  startPolling(1000);
  
  return () => {
    if (currentInterval) {
      clearInterval(currentInterval);
    }
  };
};