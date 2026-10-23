"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { getOverlayState, setOverlayState, subscribeToOverlayState, OverlayState } from "./lib/overlayState";
import FileViewer from "./components/FileViewer";
import { Team, loadTeams } from "./lib/teams";
import { GameMode, GAME_MODE, GAME_MODES } from "./lib/gameConfig";

export default function Dashboard() {
  const [overlayUrl, setOverlayUrl] = useState("");
  const [teams, setTeams] = useState<Team[]>([]);
  const [redPlayers, setRedPlayers] = useState<string>('');
  const [bluePlayers, setBluePlayers] = useState<string>('');
  const [overlayState, setLocalOverlayState] = useState<OverlayState>({
    mode: 'starting-soon',
    gameMode: GAME_MODE,
    matchTitle: 'FRC Stream Overlay',
    matchTime: '00:00',
    startingTime: '',
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
    // Tournament mode
    tournamentModeEnabled: false,
    tournamentPath: '',
    matchNumber: '',
    // Field 2
    field2Enabled: false,
    field2MatchTime: '00:00',
    field2GameFileLocation: '',
    field2GameState: '',
    field2RedScore: 0,
    field2BlueScore: 0,
    field2RedOPR: [{ username: '', score: 0 }, { username: '', score: 0 }, { username: '', score: 0 }],
    field2BlueOPR: [{ username: '', score: 0 }, { username: '', score: 0 }, { username: '', score: 0 }],
    field2SeriesEnabled: false,
    field2SeriesType: 'bo3',
    field2RedAllianceName: 'Red Alliance',
    field2BlueAllianceName: 'Blue Alliance',
    field2RedSeriesScore: 0,
    field2BlueSeriesScore: 0,
    field2AllianceBranding: false,
  });
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const isEditingRef = useRef(isEditing);
  
  // Keep ref in sync with state
  useEffect(() => {
    isEditingRef.current = isEditing;
  }, [isEditing]);


  // Use players from overlay state instead of loading separately
  useEffect(() => {
    if (overlayState.tournamentRedPlayers) {
      setRedPlayers(overlayState.tournamentRedPlayers.join('\n'));
    } else {
      setRedPlayers('');
    }
    
    if (overlayState.tournamentBluePlayers) {
      setBluePlayers(overlayState.tournamentBluePlayers.join('\n'));
    } else {
      setBluePlayers('');
    }
  }, [overlayState.tournamentRedPlayers, overlayState.tournamentBluePlayers]);

  useEffect(() => {
    // Load initial state and teams
    const loadInitialData = async () => {
      const [state, teamsData] = await Promise.all([
        getOverlayState(),
        loadTeams()
      ]);
      setLocalOverlayState(state);
      setTeams(teamsData);
    };
    
    loadInitialData();
    
    // Subscribe to state changes with high-speed polling for tournament updates
    const cleanup = subscribeToOverlayState((state) => {
      // Only update state if user isn't currently editing a field, but always update tournament data
      if (!isEditingRef.current) {
        setLocalOverlayState(state);
      } else {
        // Always update tournament data even when editing other fields
        setLocalOverlayState(prev => ({
          ...prev,
          matchNumber: state.matchNumber,
          tournamentRedPlayers: state.tournamentRedPlayers,
          tournamentBluePlayers: state.tournamentBluePlayers
        }));
      }
    }, { forceHighSpeed: true });
    
    return cleanup;
  }, []);

  const copyOverlayUrl = async (path = '/overlay') => {
    const url = `${window.location.origin}${path}`;
    setOverlayUrl(url);
    await navigator.clipboard.writeText(url);
    alert("URL copied to clipboard!");
  };

  const copyMatchPreviewUrl = async () => {
    const url = `${window.location.origin}/match-preview`;
    await navigator.clipboard.writeText(url);
    alert("Match Preview URL copied to clipboard!");
  };


  const updateOverlayData = async (field: string, value: string | number) => {
    // Update local state immediately for instant UI feedback
    setLocalOverlayState(prev => ({ ...prev, [field]: value }));
    // Then update server state
    await setOverlayState({ [field]: value });
  };

  return (
    <div className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Stream Overlay Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Configure and manage your stream overlay settings
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Field 1 Overlay Management
            </h2>
            <div className="space-y-3">
              <div className="flex gap-2">
                <Link
                  href="/overlay/starting-soon"
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-md text-center transition-colors"
                >
                  Starting Soon (Both Fields)
                </Link>
                <button
                  onClick={() => copyOverlayUrl('/overlay/starting-soon')}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-3 rounded-md transition-colors"
                  title="Copy Starting Soon URL"
                >
                  📋
                </button>
              </div>
              <div className="flex gap-2">
                <Link
                  href="/overlay/match-view"
                  className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-4 rounded-md text-center transition-colors"
                >
                  F1 Match View
                </Link>
                <button
                  onClick={() => copyOverlayUrl('/overlay/match-view')}
                  className="bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-3 rounded-md transition-colors"
                  title="Copy Match View URL"
                >
                  📋
                </button>
              </div>
              <div className="flex gap-2">
                <Link
                  href="/overlay/results"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md text-center transition-colors"
                >
                  F1 Results
                </Link>
                <button
                  onClick={() => copyOverlayUrl('/overlay/results')}
                  className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-3 rounded-md transition-colors"
                  title="Copy Results URL"
                >
                  📋
                </button>
              </div>
              <div className="flex gap-2">
                <Link
                  href="/match-preview"
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-md text-center transition-colors"
                >
                  View Match Preview
                </Link>
                <button
                  onClick={copyMatchPreviewUrl}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-3 rounded-md transition-colors"
                  title="Copy Match Preview URL"
                >
                  📋
                </button>
              </div>
              {overlayUrl && (
                <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-700 rounded text-sm text-gray-700 dark:text-gray-300 break-all">
                  {overlayUrl}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Display Settings
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Game
                </label>
                <select
                  value={overlayState.gameMode || GAME_MODE}
                  onChange={(e) => {
                    const gameMode = e.target.value as GameMode;
                    setLocalOverlayState(prev => ({ ...prev, gameMode }));
                    setOverlayState({ gameMode });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {GAME_MODES.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Event Name
                </label>
                <input
                  type="text"
                  value={overlayState.matchTitle}
                  onChange={(e) => setLocalOverlayState(prev => ({ ...prev, matchTitle: e.target.value }))}
                  onFocus={() => setIsEditing('matchTitle')}
                  onBlur={(e) => {
                    setIsEditing(null);
                    updateOverlayData('matchTitle', e.target.value);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Enter event name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Starting Time
                </label>
                <input
                  type="datetime-local"
                  value={overlayState.startingTime || ''}
                  onChange={(e) => setLocalOverlayState(prev => ({ ...prev, startingTime: e.target.value }))}
                  onFocus={() => setIsEditing('startingTime')}
                  onBlur={(e) => {
                    setIsEditing(null);
                    updateOverlayData('startingTime', e.target.value);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div className="flex items-center justify-between">
                <label htmlFor="flippedTeams" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Flip Team Sides
                </label>
                <button
                  type="button"
                  role="switch"
                  aria-checked={overlayState.flippedTeams}
                  onClick={() => {
                    const flipped = !overlayState.flippedTeams;
                    setLocalOverlayState(prev => ({ ...prev, flippedTeams: flipped }));
                    setOverlayState({ flippedTeams: flipped });
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    overlayState.flippedTeams ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
                  }`}
                >
                  <span className="sr-only">Flip Team Sides</span>
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      overlayState.flippedTeams ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <label htmlFor="allianceBranding" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Alliance Branding
                </label>
                <button
                  type="button"
                  role="switch"
                  aria-checked={overlayState.allianceBranding}
                  onClick={() => {
                    const enabled = !overlayState.allianceBranding;
                    setLocalOverlayState(prev => ({ ...prev, allianceBranding: enabled }));
                    setOverlayState({ allianceBranding: enabled });
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    overlayState.allianceBranding ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
                  }`}
                >
                  <span className="sr-only">Enable Alliance Branding</span>
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      overlayState.allianceBranding ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-3 mt-4">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Game Status</div>
                <div className="text-lg font-bold text-green-600 dark:text-green-400">
                  {overlayState.gameState && overlayState.gameState.trim() ? overlayState.gameState : 'Ready'}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">From GameState.txt</div>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-3">
                Scores are automatically read from Score_R.txt and Score_B.txt files in the game file location.
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Game File Settings
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Game File Location
                </label>
                <input
                  type="text"
                  value={overlayState.gameFileLocation}
                  onChange={(e) => setLocalOverlayState(prev => ({ ...prev, gameFileLocation: e.target.value }))}
                  onFocus={() => setIsEditing('gameFileLocation')}
                  onBlur={(e) => {
                    setIsEditing(null);
                    updateOverlayData('gameFileLocation', e.target.value);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Enter game file path or URL"
                />
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Path to your game data file (e.g., /path/to/game.json or https://example.com/game.json)
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Best-of Series Settings
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label htmlFor="seriesEnabled" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Enable Best-of Series
                </label>
                <button
                  type="button"
                  role="switch"
                  aria-checked={overlayState.seriesEnabled}
                  onClick={() => {
                    const enabled = !overlayState.seriesEnabled;
                    setLocalOverlayState(prev => ({ ...prev, seriesEnabled: enabled }));
                    setOverlayState({ seriesEnabled: enabled });
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    overlayState.seriesEnabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
                  }`}
                >
                  <span className="sr-only">Enable Best-of Series</span>
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      overlayState.seriesEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              
              {overlayState.seriesEnabled && (
                <>
                  
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Series Type
                    </label>
                    <select
                      value={overlayState.seriesType}
                      onChange={(e) => {
                        const seriesType = e.target.value as 'bo3' | 'bo5' | 'bo7';
                        setLocalOverlayState(prev => ({ ...prev, seriesType, redSeriesScore: 0, blueSeriesScore: 0 }));
                        setOverlayState({ seriesType, redSeriesScore: 0, blueSeriesScore: 0 });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="bo3">Best of 3</option>
                      <option value="bo5">Best of 5</option>
                      <option value="bo7">Best of 7</option>
                    </select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-red-600 dark:text-red-400 mb-1">
                        Red Alliance Name
                      </label>
                      <input
                        type="text"
                        value={overlayState.redAllianceName}
                        onChange={(e) => setLocalOverlayState(prev => ({ ...prev, redAllianceName: e.target.value }))}
                        onFocus={() => setIsEditing('redAllianceName')}
                        onBlur={(e) => {
                          setIsEditing(null);
                          updateOverlayData('redAllianceName', e.target.value);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="Red Alliance"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">
                        Blue Alliance Name
                      </label>
                      <input
                        type="text"
                        value={overlayState.blueAllianceName}
                        onChange={(e) => setLocalOverlayState(prev => ({ ...prev, blueAllianceName: e.target.value }))}
                        onFocus={() => setIsEditing('blueAllianceName')}
                        onBlur={(e) => {
                          setIsEditing(null);
                          updateOverlayData('blueAllianceName', e.target.value);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="Blue Alliance"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-red-600 dark:text-red-400 mb-1">
                        Red Team
                      </label>
                      <select
                        value={overlayState.redTeamId || ''}
                        onChange={(e) => {
                          const teamId = e.target.value;
                          const team = teams.find(t => t.id === teamId);
                          if (team) {
                            setLocalOverlayState(prev => ({ 
                              ...prev, 
                              redTeamId: team.id,
                              redAllianceName: team.name,
                              redPrimaryColor: team.primaryColor,
                              redSecondaryColor: team.secondaryColor
                            }));
                            setOverlayState({ 
                              redTeamId: team.id,
                              redAllianceName: team.name,
                              redPrimaryColor: team.primaryColor,
                              redSecondaryColor: team.secondaryColor
                            });
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="">Custom Team</option>
                        {teams.length > 0 ? teams.map(team => (
                          <option key={team.id} value={team.id}>{team.name}</option>
                        )) : <option disabled>Loading teams...</option>}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">
                        Blue Team
                      </label>
                      <select
                        value={overlayState.blueTeamId || ''}
                        onChange={(e) => {
                          const teamId = e.target.value;
                          const team = teams.find(t => t.id === teamId);
                          if (team) {
                            setLocalOverlayState(prev => ({ 
                              ...prev, 
                              blueTeamId: team.id,
                              blueAllianceName: team.name,
                              bluePrimaryColor: team.primaryColor,
                              blueSecondaryColor: team.secondaryColor
                            }));
                            setOverlayState({ 
                              blueTeamId: team.id,
                              blueAllianceName: team.name,
                              bluePrimaryColor: team.primaryColor,
                              blueSecondaryColor: team.secondaryColor
                            });
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="">Custom Team</option>
                        {teams.length > 0 ? teams.map(team => (
                          <option key={team.id} value={team.id}>{team.name}</option>
                        )) : <option disabled>Loading teams...</option>}
                      </select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-red-600 dark:text-red-400 mb-1">
                        Red Series Score
                      </label>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            const newScore = Math.max(0, overlayState.redSeriesScore - 1);
                            setLocalOverlayState(prev => ({ ...prev, redSeriesScore: newScore }));
                            setOverlayState({ redSeriesScore: newScore });
                          }}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded"
                        >
                          -
                        </button>
                        <span className="w-12 text-center font-bold text-lg">{overlayState.redSeriesScore}</span>
                        <button
                          onClick={() => {
                            const maxWins = overlayState.seriesType === 'bo3' ? 2 : overlayState.seriesType === 'bo5' ? 3 : 4;
                            const newScore = Math.min(maxWins, overlayState.redSeriesScore + 1);
                            setLocalOverlayState(prev => ({ ...prev, redSeriesScore: newScore }));
                            setOverlayState({ redSeriesScore: newScore });
                          }}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">
                        Blue Series Score
                      </label>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            const newScore = Math.max(0, overlayState.blueSeriesScore - 1);
                            setLocalOverlayState(prev => ({ ...prev, blueSeriesScore: newScore }));
                            setOverlayState({ blueSeriesScore: newScore });
                          }}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded"
                        >
                          -
                        </button>
                        <span className="w-12 text-center font-bold text-lg">{overlayState.blueSeriesScore}</span>
                        <button
                          onClick={() => {
                            const maxWins = overlayState.seriesType === 'bo3' ? 2 : overlayState.seriesType === 'bo5' ? 3 : 4;
                            const newScore = Math.min(maxWins, overlayState.blueSeriesScore + 1);
                            setLocalOverlayState(prev => ({ ...prev, blueSeriesScore: newScore }));
                            setOverlayState({ blueSeriesScore: newScore });
                          }}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

        </div>

        {/* Tournament Mode Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Tournament Mode Configuration
            </h2>
            <button
              type="button"
              role="switch"
              aria-checked={overlayState.tournamentModeEnabled}
              onClick={() => {
                const enabled = !overlayState.tournamentModeEnabled;
                setLocalOverlayState(prev => ({ ...prev, tournamentModeEnabled: enabled }));
                setOverlayState({ tournamentModeEnabled: enabled });
              }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                overlayState.tournamentModeEnabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
              }`}
            >
              <span className="sr-only">Enable Tournament Mode</span>
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  overlayState.tournamentModeEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {overlayState.tournamentModeEnabled && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tournament Path
                </label>
                <input
                  type="text"
                  value={overlayState.tournamentPath || ''}
                  onChange={(e) => {
                    const path = e.target.value;
                    setLocalOverlayState(prev => ({ ...prev, tournamentPath: path }));
                    setOverlayState({ tournamentPath: path });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="C:\Tournament\"
                />
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Directory containing <code>MatchNumber.txt</code>, <code>RedPlayers.txt</code>, and <code>BluePlayers.txt</code> files
                </p>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Tournament Files Status:</h4>
                <div className="grid grid-cols-3 gap-4 mb-3">
                  <div className="text-center">
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Match Number</div>
                    <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      {overlayState.matchNumber && overlayState.matchNumber.trim() ? overlayState.matchNumber : 'Not Set'}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">MatchNumber.txt</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium text-red-600 dark:text-red-400">Red Players</div>
                    <div className="text-lg font-bold text-red-600 dark:text-red-400">
                      {redPlayers ? redPlayers.split('\n').filter(p => p.trim()).length : 0}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">RedPlayers.txt</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium text-blue-600 dark:text-blue-400">Blue Players</div>
                    <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      {bluePlayers ? bluePlayers.split('\n').filter(p => p.trim()).length : 0}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">BluePlayers.txt</div>
                  </div>
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Files are managed externally and update automatically
                </div>
              </div>

              {overlayState.tournamentPath && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-red-600 dark:text-red-400 mb-2">
                      Red Team Players
                    </label>
                    <div className="w-full px-3 py-2 border border-red-300 dark:border-red-600 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white min-h-[100px]">
                      {redPlayers ? (
                        redPlayers.split('\n').filter(p => p.trim()).map((player, index) => (
                          <div key={index} className="text-sm py-1">
                            {player}
                          </div>
                        ))
                      ) : (
                        <div className="text-gray-500 dark:text-gray-400 text-sm italic">
                          No players loaded
                        </div>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      File: RedPlayers.txt (read-only)
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-600 dark:text-blue-400 mb-2">
                      Blue Team Players
                    </label>
                    <div className="w-full px-3 py-2 border border-blue-300 dark:border-blue-600 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white min-h-[100px]">
                      {bluePlayers ? (
                        bluePlayers.split('\n').filter(p => p.trim()).map((player, index) => (
                          <div key={index} className="text-sm py-1">
                            {player}
                          </div>
                        ))
                      ) : (
                        <div className="text-gray-500 dark:text-gray-400 text-sm italic">
                          No players loaded
                        </div>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      File: BluePlayers.txt (read-only)
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Field 2 Section */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Field 2 Configuration
            </h2>
            <button
              type="button"
              role="switch"
              aria-checked={overlayState.field2Enabled}
              onClick={() => {
                const enabled = !overlayState.field2Enabled;
                setLocalOverlayState(prev => ({ ...prev, field2Enabled: enabled }));
                setOverlayState({ field2Enabled: enabled });
              }}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                overlayState.field2Enabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
              }`}
            >
              <span className="sr-only">Enable Field 2</span>
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                  overlayState.field2Enabled ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          
          {overlayState.field2Enabled && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Field 2 Overlay Management
                </h3>
                <div className="space-y-3">
                  <div className="text-sm text-gray-600 dark:text-gray-400 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md mb-3">
                    <strong>Note:</strong> Starting Soon uses shared event data - use the main Starting Soon overlay for both fields.
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href="/overlay/field2/match-view"
                      className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-4 rounded-md text-center transition-colors"
                    >
                      F2 Match View
                    </Link>
                    <button
                      onClick={() => copyOverlayUrl('/overlay/field2/match-view')}
                      className="bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-3 rounded-md transition-colors"
                      title="Copy Field 2 Match View URL"
                    >
                      📋
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href="/overlay/field2/results"
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md text-center transition-colors"
                    >
                      F2 Results
                    </Link>
                    <button
                      onClick={() => copyOverlayUrl('/overlay/field2/results')}
                      className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-3 rounded-md transition-colors"
                      title="Copy Field 2 Results URL"
                    >
                      📋
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Field 2 Display Settings
                </h3>
                <div className="space-y-3">
                  <div className="text-sm text-gray-600 dark:text-gray-400 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                    <strong>Note:</strong> Event name and starting time are shared between both fields and can be configured in the main Display Settings.
                  </div>
                  <div className="flex items-center justify-between">
                    <label htmlFor="field2FlippedTeams" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Flip Team Sides
                    </label>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={overlayState.field2FlippedTeams}
                      onClick={() => {
                        const flipped = !overlayState.field2FlippedTeams;
                        setLocalOverlayState(prev => ({ ...prev, field2FlippedTeams: flipped }));
                        setOverlayState({ field2FlippedTeams: flipped });
                      }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        overlayState.field2FlippedTeams ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
                      }`}
                    >
                      <span className="sr-only">Flip Team Sides</span>
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          overlayState.field2FlippedTeams ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <label htmlFor="field2AllianceBranding" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Alliance Branding
                    </label>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={overlayState.field2AllianceBranding}
                      onClick={() => {
                        const enabled = !overlayState.field2AllianceBranding;
                        setLocalOverlayState(prev => ({ ...prev, field2AllianceBranding: enabled }));
                        setOverlayState({ field2AllianceBranding: enabled });
                      }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        overlayState.field2AllianceBranding ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
                      }`}
                    >
                      <span className="sr-only">Enable Alliance Branding</span>
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          overlayState.field2AllianceBranding ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Field 2 Game File Settings
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Game File Location
                    </label>
                    <input
                      type="text"
                      value={overlayState.field2GameFileLocation || ''}
                      onChange={(e) => setLocalOverlayState(prev => ({ ...prev, field2GameFileLocation: e.target.value }))}
                      onFocus={() => setIsEditing('field2GameFileLocation')}
                      onBlur={(e) => {
                        setIsEditing(null);
                        updateOverlayData('field2GameFileLocation', e.target.value);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Enter game file path or URL"
                    />
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Path to Field 2 game data file
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Field 2 Best-of Series Settings
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label htmlFor="field2SeriesEnabled" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Enable Best-of Series
                    </label>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={overlayState.field2SeriesEnabled}
                      onClick={() => {
                        const enabled = !overlayState.field2SeriesEnabled;
                        setLocalOverlayState(prev => ({ ...prev, field2SeriesEnabled: enabled }));
                        setOverlayState({ field2SeriesEnabled: enabled });
                      }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        overlayState.field2SeriesEnabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
                      }`}
                    >
                      <span className="sr-only">Enable Best-of Series</span>
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          overlayState.field2SeriesEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  
                  {overlayState.field2SeriesEnabled && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Series Type
                        </label>
                        <select
                          value={overlayState.field2SeriesType || 'bo3'}
                          onChange={(e) => {
                            const seriesType = e.target.value as 'bo3' | 'bo5' | 'bo7';
                            setLocalOverlayState(prev => ({ ...prev, field2SeriesType: seriesType, field2RedSeriesScore: 0, field2BlueSeriesScore: 0 }));
                            setOverlayState({ field2SeriesType: seriesType, field2RedSeriesScore: 0, field2BlueSeriesScore: 0 });
                          }}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          <option value="bo3">Best of 3</option>
                          <option value="bo5">Best of 5</option>
                          <option value="bo7">Best of 7</option>
                        </select>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-red-600 dark:text-red-400 mb-1">
                            Red Alliance Name
                          </label>
                          <input
                            type="text"
                            value={overlayState.field2RedAllianceName || ''}
                            onChange={(e) => setLocalOverlayState(prev => ({ ...prev, field2RedAllianceName: e.target.value }))}
                            onFocus={() => setIsEditing('field2RedAllianceName')}
                            onBlur={(e) => {
                              setIsEditing(null);
                              updateOverlayData('field2RedAllianceName', e.target.value);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            placeholder="Red Alliance"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">
                            Blue Alliance Name
                          </label>
                          <input
                            type="text"
                            value={overlayState.field2BlueAllianceName || ''}
                            onChange={(e) => setLocalOverlayState(prev => ({ ...prev, field2BlueAllianceName: e.target.value }))}
                            onFocus={() => setIsEditing('field2BlueAllianceName')}
                            onBlur={(e) => {
                              setIsEditing(null);
                              updateOverlayData('field2BlueAllianceName', e.target.value);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            placeholder="Blue Alliance"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-red-600 dark:text-red-400 mb-1">
                            Red Team
                          </label>
                          <select
                            value={overlayState.field2RedTeamId || ''}
                            onChange={(e) => {
                              const teamId = e.target.value;
                              const team = teams.find(t => t.id === teamId);
                              if (team) {
                                setLocalOverlayState(prev => ({ 
                                  ...prev, 
                                  field2RedTeamId: team.id,
                                  field2RedAllianceName: team.name,
                                  field2RedPrimaryColor: team.primaryColor,
                                  field2RedSecondaryColor: team.secondaryColor
                                }));
                                setOverlayState({ 
                                  field2RedTeamId: team.id,
                                  field2RedAllianceName: team.name,
                                  field2RedPrimaryColor: team.primaryColor,
                                  field2RedSecondaryColor: team.secondaryColor
                                });
                              }
                            }}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          >
                            <option value="">Custom Team</option>
                            {teams.length > 0 ? teams.map(team => (
                              <option key={team.id} value={team.id}>{team.name}</option>
                            )) : <option disabled>Loading teams...</option>}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">
                            Blue Team
                          </label>
                          <select
                            value={overlayState.field2BlueTeamId || ''}
                            onChange={(e) => {
                              const teamId = e.target.value;
                              const team = teams.find(t => t.id === teamId);
                              if (team) {
                                setLocalOverlayState(prev => ({ 
                                  ...prev, 
                                  field2BlueTeamId: team.id,
                                  field2BlueAllianceName: team.name,
                                  field2BluePrimaryColor: team.primaryColor,
                                  field2BlueSecondaryColor: team.secondaryColor
                                }));
                                setOverlayState({ 
                                  field2BlueTeamId: team.id,
                                  field2BlueAllianceName: team.name,
                                  field2BluePrimaryColor: team.primaryColor,
                                  field2BlueSecondaryColor: team.secondaryColor
                                });
                              }
                            }}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          >
                            <option value="">Custom Team</option>
                            {teams.length > 0 ? teams.map(team => (
                              <option key={team.id} value={team.id}>{team.name}</option>
                            )) : <option disabled>Loading teams...</option>}
                          </select>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-red-600 dark:text-red-400 mb-1">
                            Red Series Score
                          </label>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => {
                                const newScore = Math.max(0, (overlayState.field2RedSeriesScore || 0) - 1);
                                setLocalOverlayState(prev => ({ ...prev, field2RedSeriesScore: newScore }));
                                setOverlayState({ field2RedSeriesScore: newScore });
                              }}
                              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded"
                            >
                              -
                            </button>
                            <span className="w-12 text-center font-bold text-lg">{overlayState.field2RedSeriesScore || 0}</span>
                            <button
                              onClick={() => {
                                const maxWins = overlayState.field2SeriesType === 'bo3' ? 2 : overlayState.field2SeriesType === 'bo5' ? 3 : 4;
                                const newScore = Math.min(maxWins, (overlayState.field2RedSeriesScore || 0) + 1);
                                setLocalOverlayState(prev => ({ ...prev, field2RedSeriesScore: newScore }));
                                setOverlayState({ field2RedSeriesScore: newScore });
                              }}
                              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded"
                            >
                              +
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">
                            Blue Series Score
                          </label>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => {
                                const newScore = Math.max(0, (overlayState.field2BlueSeriesScore || 0) - 1);
                                setLocalOverlayState(prev => ({ ...prev, field2BlueSeriesScore: newScore }));
                                setOverlayState({ field2BlueSeriesScore: newScore });
                              }}
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded"
                            >
                              -
                            </button>
                            <span className="w-12 text-center font-bold text-lg">{overlayState.field2BlueSeriesScore || 0}</span>
                            <button
                              onClick={() => {
                                const maxWins = overlayState.field2SeriesType === 'bo3' ? 2 : overlayState.field2SeriesType === 'bo5' ? 3 : 4;
                                const newScore = Math.min(maxWins, (overlayState.field2BlueSeriesScore || 0) + 1);
                                setLocalOverlayState(prev => ({ ...prev, field2BlueSeriesScore: newScore }));
                                setOverlayState({ field2BlueSeriesScore: newScore });
                              }}
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* File Viewer Widgets */}
        <div className="mt-8 space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Field 1 Files</h3>
            <FileViewer key={`field1-${overlayState.gameFileLocation}`} gameFileLocation={overlayState.gameFileLocation} />
          </div>
          {overlayState.field2Enabled && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Field 2 Files</h3>
              <FileViewer key={`field2-${overlayState.field2GameFileLocation}`} gameFileLocation={overlayState.field2GameFileLocation || ''} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
