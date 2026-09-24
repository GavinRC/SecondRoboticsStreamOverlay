import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, statSync } from 'fs';
import path from 'path';
import { OverlayState } from '../../lib/overlayState';

// Fuel count files inside the game file folder.
// Change these if your sim writes fuel counts under different names.
const FUEL_FILE_RED = 'Fuel_R.txt';
const FUEL_FILE_BLUE = 'Fuel_B.txt';

// File cache to avoid unnecessary reads
interface FileCacheEntry {
  content: string | { red: { username: string; score: number }[], blue: { username: string; score: number }[] };
  mtime: number;
}

const fileCache = new Map<string, FileCacheEntry>();

let lastTournamentUpdate = 0;

let overlayState: OverlayState = {
  mode: 'starting-soon',
  matchTitle: 'FRC Stream Overlay',
  matchTime: '00:00',
  startingTime: '',
  gameFileLocation: '',
  gameState: '',
  redScore: 0,
  blueScore: 0,
  redOPR: [],
  blueOPR: [],
  lastUpdated: Date.now(),
  seriesEnabled: false,
  seriesType: 'bo3',
  redAllianceName: 'Red Alliance',
  blueAllianceName: 'Blue Alliance',
  redSeriesScore: 0,
  blueSeriesScore: 0,
  allianceBranding: false,
  // Fuel RP
  fuelRPEnabled: true,
  fuelRPThresholds: [100],
  redFuel: 0,
  blueFuel: 0,
  // Tournament mode
  tournamentModeEnabled: false,
  tournamentPath: '',
  matchNumber: '',
  tournamentRedPlayers: [],
  tournamentBluePlayers: [],
  // Field 2 properties
  field2Enabled: false,
  field2MatchTime: '00:00',
  field2GameFileLocation: '',
  field2GameState: '',
  field2RedScore: 0,
  field2BlueScore: 0,
  field2RedFuel: 0,
  field2BlueFuel: 0,
  field2RedOPR: [],
  field2BlueOPR: [],
  field2SeriesEnabled: false,
  field2SeriesType: 'bo3',
  field2RedAllianceName: 'Red Alliance',
  field2BlueAllianceName: 'Blue Alliance',
  field2RedSeriesScore: 0,
  field2BlueSeriesScore: 0,
  field2AllianceBranding: false,
};

const readCachedFile = (filePath: string): string => {
  try {
    const stat = statSync(filePath);
    const mtime = stat.mtimeMs;
    const cached = fileCache.get(filePath);
    
    if (cached && cached.mtime === mtime && typeof cached.content === 'string') {
      // Promote to most-recently-used
      fileCache.delete(filePath);
      fileCache.set(filePath, cached);
      return cached.content;
    }

    const content = readFileSync(filePath, 'utf-8');
    fileCache.set(filePath, { content, mtime });
    
    // Clean cache if too large
    if (fileCache.size > 100) {
      const firstKey = fileCache.keys().next().value;
      if (firstKey) fileCache.delete(firstKey);
    }
    
    return content;
  } catch {
    return '';
  }
};

const readScore = (filePath: string): number => {
  const content = readCachedFile(filePath);
  return parseInt(content.trim()) || 0;
};

const readTimer = (filePath: string): string => {
  const content = readCachedFile(filePath);
  return content.trim() || '00:00';
};

const readOPR = (filePath: string): { red: { username: string; score: number }[], blue: { username: string; score: number }[] } => {
  try {
    const stat = statSync(filePath);
    const mtime = stat.mtimeMs;
    const cached = fileCache.get(filePath);
    
    if (cached && cached.mtime === mtime && typeof cached.content === 'object') {
      // Promote to most-recently-used
      fileCache.delete(filePath);
      fileCache.set(filePath, cached);
      const c = cached.content as { red: { username: string; score: number }[], blue: { username: string; score: number }[] };
      return { red: c.red.slice(), blue: c.blue.slice() };
    }
    
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').map(line => line.trim()).filter(line => line);
    
    const result = { red: [] as { username: string; score: number }[], blue: [] as { username: string; score: number }[] };
    
    if (lines.length > 0) {
      const parseOPRLine = (line: string): { username: string; score: number } => {
        // Parse "username: score" format
        const colonIndex = line.indexOf(':');
        if (colonIndex !== -1) {
          const username = line.substring(0, colonIndex).trim();
          const scoreStr = line.substring(colonIndex + 1).trim();
          return { username, score: parseFloat(scoreStr) || 0 };
        }
        // Fallback - treat whole line as username with score 0
        return { username: line, score: 0 };
      };

      // Split lines between red and blue teams dynamically
      const midpoint = Math.ceil(lines.length / 2);
      result.red = lines.slice(0, midpoint).map(line => parseOPRLine(line));
      result.blue = lines.slice(midpoint).map(line => parseOPRLine(line));
    }
    
    fileCache.set(filePath, { content: result, mtime });
    
    // Clean cache if too large
    if (fileCache.size > 100) {
      const firstKey = fileCache.keys().next().value;
      if (firstKey) fileCache.delete(firstKey);
    }
    
    return result;
  } catch {
    // Return defaults on error
    return { 
      red: [], 
      blue: [] 
    };
  }
};

// Efficient OPR comparison without JSON.stringify
const oprArraysEqual = (
  a: { username: string; score: number }[], 
  b: { username: string; score: number }[]
): boolean => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].username !== b[i].username || a[i].score !== b[i].score) {
      return false;
    }
  }
  return true;
};

export async function GET() {
  let hasChanges = false;

  // Read tournament files less frequently (every 5 seconds)
  const now = Date.now();
  if (overlayState.tournamentModeEnabled && overlayState.tournamentPath && (now - lastTournamentUpdate > 5000)) {
    const tournamentPath = overlayState.tournamentPath;
    lastTournamentUpdate = now;
    
    const newMatchNumber = readTimer(path.join(tournamentPath, 'MatchNumber.txt'));
    if (overlayState.matchNumber !== newMatchNumber) {
      hasChanges = true;
      overlayState = { ...overlayState, matchNumber: newMatchNumber };
    }
    
    // Read player files
    try {
      const redContent = readCachedFile(path.join(tournamentPath, 'RedPlayers.txt'));
      const newRedPlayers = redContent.split('\n').filter(line => line.trim());
      if (JSON.stringify(overlayState.tournamentRedPlayers) !== JSON.stringify(newRedPlayers)) {
        hasChanges = true;
        overlayState = { ...overlayState, tournamentRedPlayers: newRedPlayers };
      }
    } catch {
      // Keep existing or set empty array
      if (overlayState.tournamentRedPlayers?.length) {
        hasChanges = true;
        overlayState = { ...overlayState, tournamentRedPlayers: [] };
      }
    }
    
    try {
      const blueContent = readCachedFile(path.join(tournamentPath, 'BluePlayers.txt'));
      const newBluePlayers = blueContent.split('\n').filter(line => line.trim());
      if (JSON.stringify(overlayState.tournamentBluePlayers) !== JSON.stringify(newBluePlayers)) {
        hasChanges = true;
        overlayState = { ...overlayState, tournamentBluePlayers: newBluePlayers };
      }
    } catch {
      // Keep existing or set empty array
      if (overlayState.tournamentBluePlayers?.length) {
        hasChanges = true;
        overlayState = { ...overlayState, tournamentBluePlayers: [] };
      }
    }
  }
  
  // Early exit if no files configured
  if (!overlayState.gameFileLocation && !overlayState.field2GameFileLocation) {
    return NextResponse.json(overlayState);
  }
  
  // Auto-update data from files for Field 1
  if (overlayState.gameFileLocation) {
    try {
      const basePath = overlayState.gameFileLocation;
      
      // Read all files in parallel for maximum speed
      const [newRedScore, newBlueScore, newMatchTime, newOPR, newGameState, newRedFuel, newBlueFuel] = await Promise.all([
        Promise.resolve(readScore(path.join(basePath, 'Score_R.txt'))),
        Promise.resolve(readScore(path.join(basePath, 'Score_B.txt'))),
        Promise.resolve(readTimer(path.join(basePath, 'Timer.txt'))),
        Promise.resolve(readOPR(path.join(basePath, 'OPR.txt'))),
        Promise.resolve(readTimer(path.join(basePath, 'GameState.txt'))),
        Promise.resolve(readScore(path.join(basePath, FUEL_FILE_RED))),
        Promise.resolve(readScore(path.join(basePath, FUEL_FILE_BLUE)))
      ]);
      
      // Check if values actually changed using efficient comparison
      if (
        overlayState.redScore !== newRedScore ||
        overlayState.blueScore !== newBlueScore ||
        overlayState.matchTime !== newMatchTime ||
        overlayState.gameState !== newGameState ||
        overlayState.redFuel !== newRedFuel ||
        overlayState.blueFuel !== newBlueFuel ||
        !oprArraysEqual(overlayState.redOPR || [], newOPR.red) ||
        !oprArraysEqual(overlayState.blueOPR || [], newOPR.blue)
      ) {
        hasChanges = true;
        overlayState = {
          ...overlayState,
          redScore: newRedScore,
          blueScore: newBlueScore,
          matchTime: newMatchTime,
          gameState: newGameState,
          redFuel: newRedFuel,
          blueFuel: newBlueFuel,
          redOPR: newOPR.red,
          blueOPR: newOPR.blue,
        };
      }
    } catch {
      // Keep existing values if file reading fails
    }
  }
  
  // Auto-update data from files for Field 2
  if (overlayState.field2GameFileLocation) {
    try {
      const basePath = overlayState.field2GameFileLocation;
      
      // Read all files in parallel for maximum speed
      const [newRedScore, newBlueScore, newMatchTime, newOPR, newGameState, newRedFuel, newBlueFuel] = await Promise.all([
        Promise.resolve(readScore(path.join(basePath, 'Score_R.txt'))),
        Promise.resolve(readScore(path.join(basePath, 'Score_B.txt'))),
        Promise.resolve(readTimer(path.join(basePath, 'Timer.txt'))),
        Promise.resolve(readOPR(path.join(basePath, 'OPR.txt'))),
        Promise.resolve(readTimer(path.join(basePath, 'GameState.txt'))),
        Promise.resolve(readScore(path.join(basePath, FUEL_FILE_RED))),
        Promise.resolve(readScore(path.join(basePath, FUEL_FILE_BLUE)))
      ]);
      
      // Check if values actually changed using efficient comparison
      if (
        overlayState.field2RedScore !== newRedScore ||
        overlayState.field2BlueScore !== newBlueScore ||
        overlayState.field2MatchTime !== newMatchTime ||
        overlayState.field2GameState !== newGameState ||
        overlayState.field2RedFuel !== newRedFuel ||
        overlayState.field2BlueFuel !== newBlueFuel ||
        !oprArraysEqual(overlayState.field2RedOPR || [], newOPR.red) ||
        !oprArraysEqual(overlayState.field2BlueOPR || [], newOPR.blue)
      ) {
        hasChanges = true;
        overlayState = {
          ...overlayState,
          field2RedScore: newRedScore,
          field2BlueScore: newBlueScore,
          field2MatchTime: newMatchTime,
          field2GameState: newGameState,
          field2RedFuel: newRedFuel,
          field2BlueFuel: newBlueFuel,
          field2RedOPR: newOPR.red,
          field2BlueOPR: newOPR.blue,
        };
      }
    } catch {
      // Keep existing values if file reading fails
    }
  }

  
  // Update lastUpdated only if there were changes
  if (hasChanges) {
    overlayState = {
      ...overlayState,
      lastUpdated: Date.now()
    };
  }
  
  return NextResponse.json(overlayState);
}

export async function POST(request: NextRequest) {
  try {
    const updates = await request.json();
    if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
      return NextResponse.json({ error: 'Invalid update payload' }, { status: 400 });
    }
    overlayState = {
      ...overlayState,
      ...updates,
      lastUpdated: Date.now(),
    };
    return NextResponse.json(overlayState);
  } catch (error) {
    console.error('Error parsing JSON:', error);
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
}