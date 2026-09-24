import { OverlayState } from "../../lib/overlayState";
import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import { pointsDifferentialTracker } from "../../lib/pointsDifferentialTracker";
import { Team, loadTeams } from "../../lib/teams";
import { setOverlayState } from "../../lib/overlayState";
import AllianceIndicators from './AllianceIndicators';
import FuelGauge from './FuelGauge';
import { GAME_MODE } from '../../lib/gameConfig';

interface MatchViewProps {
  state: OverlayState;
  currentTime: string;
}

// ─── Fuel RP thresholds (used by both the RP indicators and the fuel gauge) ────
const ENERGIZED_FUEL = 560;
const SUPERCHARGED_FUEL = 700;
const FUEL_RP_THRESHOLDS = [ENERGIZED_FUEL, SUPERCHARGED_FUEL];

// Fuel gauge tile colors (same as the score boxes: bg-red-600/80 and bg-blue-600/80)
const RED_TILE = 'rgba(220, 38, 38, 0.8)';
const BLUE_TILE = 'rgba(37, 99, 235, 0.8)';
const SCORE_BOX_HEIGHT = 124; // p-8 (32px top + bottom) + text-6xl line (60px)

export default function MatchView({ state, currentTime }: MatchViewProps) {

  // ─── UI State ───────────────────────────────────────────────────────────────
  const isRebuilt = GAME_MODE === 'REBUILT';
  const [isVisible, setIsVisible] = useState(false);
  const [showAutonomous, setShowAutonomous] = useState(false);
  const [showTimer, setShowTimer] = useState(false);
  const [gameState, setGameState] = useState<string>('');
  const [teams, setTeams] = useState<Team[]>([]);

  // ─── Score Animation State ───────────────────────────────────────────────────
  const [prevScores, setPrevScores] = useState({ red: state.redScore, blue: state.blueScore });
  const [scoreChanged, setScoreChanged] = useState({ red: false, blue: false });
  const [animatingScores, setAnimatingScores] = useState({ red: state.redScore, blue: state.blueScore });

  // ─── OPR Animation State ─────────────────────────────────────────────────────
  const [prevOPR, setPrevOPR] = useState({ red: state.redOPR, blue: state.blueOPR });
  const [oprChanged, setOprChanged] = useState({ red: new Set<string>(), blue: new Set<string>() });
  const [animatingOPR, setAnimatingOPR] = useState({ red: state.redOPR, blue: state.blueOPR });

  // ─── RP / Shift State ────────────────────────────────────────────────────────
  const [autoFuelRed, setAutoFuelRed] = useState(0);
  const [autoFuelBlue, setAutoFuelBlue] = useState(0);
  const [totalFuelRed, setTotalFuelRed] = useState(0);
  const [totalFuelBlue, setTotalFuelBlue] = useState(0);
  const [towerPointsRed, setTowerPointsRed] = useState(0);
  const [towerPointsBlue, setTowerPointsBlue] = useState(0);

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  const parseTimeToSeconds = (timeStr: string): number => {
    const [minutes, seconds] = timeStr.split(':').map(Number);
    return (minutes || 0) * 60 + (seconds || 0);
  };

  // ─── Memoized OPR Arrays ─────────────────────────────────────────────────────
  const sortedRedOPR = useMemo(() =>
    [...animatingOPR.red]
      .filter(p => p.username && p.username.trim() !== '')
      .sort((a, b) => b.score - a.score)
      .slice(0, 3),
    [animatingOPR.red]
  );

  const sortedBlueOPR = useMemo(() =>
    [...animatingOPR.blue]
      .filter(p => p.username && p.username.trim() !== '')
      .sort((a, b) => b.score - a.score)
      .slice(0, 3),
    [animatingOPR.blue]
  );

  // ─── Team Lookups ─────────────────────────────────────────────────────────────
  const redTeam = useMemo(() =>
    teams.find(t => t.id === state.redTeamId),
    [teams, state.redTeamId]
  );

  const blueTeam = useMemo(() =>
    teams.find(t => t.id === state.blueTeamId),
    [teams, state.blueTeamId]
  );

  // ─── Flip-aware Derived Values ───────────────────────────────────────────────
  const leftIsRed = !state.flippedTeams;
  const rightIsRed = !!state.flippedTeams;

  const leftTeam          = state.flippedTeams ? blueTeam        : redTeam;
  const rightTeam         = state.flippedTeams ? redTeam         : blueTeam;
  const leftOPR           = state.flippedTeams ? sortedBlueOPR   : sortedRedOPR;
  const rightOPR          = state.flippedTeams ? sortedRedOPR    : sortedBlueOPR;
  const leftOPRChanged    = state.flippedTeams ? oprChanged.blue  : oprChanged.red;
  const rightOPRChanged   = state.flippedTeams ? oprChanged.red   : oprChanged.blue;
  const leftAnimatingScore  = state.flippedTeams ? animatingScores.blue : animatingScores.red;
  const rightAnimatingScore = state.flippedTeams ? animatingScores.red  : animatingScores.blue;
  const leftScoreChanged  = state.flippedTeams ? scoreChanged.blue : scoreChanged.red;
  const rightScoreChanged = state.flippedTeams ? scoreChanged.red  : scoreChanged.blue;
  const leftAllianceName  = state.flippedTeams ? state.blueAllianceName : state.redAllianceName;
  const rightAllianceName = state.flippedTeams ? state.redAllianceName  : state.blueAllianceName;

  // ─── RP / Shift Computed Values ──────────────────────────────────────────────
  const autoWinner: 'red' | 'blue' | null = useMemo(() =>
    autoFuelRed > autoFuelBlue ? 'red' :
    autoFuelBlue > autoFuelRed ? 'blue' : null,
    [autoFuelRed, autoFuelBlue]
  );

  const totalSeconds = parseTimeToSeconds(state.matchTime);

  const redHubActive = useMemo(() => {
    if (totalSeconds === 0) return false;
    if (totalSeconds > 140) return true;  // AUTO
    if (totalSeconds > 130) return true;  // TRANSITION
    if (totalSeconds > 105) return autoWinner === 'blue';  // SHIFT 1
    if (totalSeconds > 80)  return autoWinner !== 'blue';  // SHIFT 2
    if (totalSeconds > 55)  return autoWinner === 'blue';  // SHIFT 3
    if (totalSeconds > 30)  return autoWinner !== 'blue';  // SHIFT 4
    return true; // END GAME
  }, [totalSeconds, autoWinner]);

  const blueHubActive = useMemo(() => {
    if (totalSeconds === 0) return false;
    if (totalSeconds > 140) return true;
    if (totalSeconds > 130) return true;
    if (totalSeconds > 105) return autoWinner !== 'blue';  // SHIFT 1
    if (totalSeconds > 80)  return autoWinner === 'blue';  // SHIFT 2
    if (totalSeconds > 55)  return autoWinner !== 'blue';  // SHIFT 3
    if (totalSeconds > 30)  return autoWinner === 'blue';  // SHIFT 4
    return true;
  }, [totalSeconds, autoWinner]);

  const redEnergized    = totalFuelRed >= ENERGIZED_FUEL;
  const redSupercharged = totalFuelRed >= SUPERCHARGED_FUEL;
  const redTraversal    = towerPointsRed >= 50;
  const blueEnergized    = totalFuelBlue >= ENERGIZED_FUEL;
  const blueSupercharged = totalFuelBlue >= SUPERCHARGED_FUEL;
  const blueTraversal    = towerPointsBlue >= 50;

  const leftHubActive     = state.flippedTeams ? blueHubActive    : redHubActive;
  const rightHubActive    = state.flippedTeams ? redHubActive     : blueHubActive;
  const leftEnergized     = state.flippedTeams ? blueEnergized    : redEnergized;
  const leftSupercharged  = state.flippedTeams ? blueSupercharged : redSupercharged;
  const leftTraversal     = state.flippedTeams ? blueTraversal    : redTraversal;
  const rightEnergized    = state.flippedTeams ? redEnergized     : blueEnergized;
  const rightSupercharged = state.flippedTeams ? redSupercharged  : blueSupercharged;
  const rightTraversal    = state.flippedTeams ? redTraversal     : blueTraversal;

  // Fuel gauge values (gauge always sits on the outer side of each score)
  const leftFuel  = state.flippedTeams ? totalFuelBlue : totalFuelRed;
  const rightFuel = state.flippedTeams ? totalFuelRed  : totalFuelBlue;

  // ─── Timer Color ─────────────────────────────────────────────────────────────
  const getTimerColor = useMemo(() => {
    if (totalSeconds === 0) return 'text-red-500';
    if (totalSeconds <= 30) return 'text-yellow-400';
    if (totalSeconds <= 160 && totalSeconds > 140) return 'text-green-400';
    return 'text-white';
  }, [totalSeconds]);

  // Load teams
  useEffect(() => {
    loadTeams().then(setTeams);
  }, []);

  // Entrance animation
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Auto banner
  useEffect(() => {
    const secs = parseTimeToSeconds(state.matchTime);
    setShowAutonomous(secs <= 160 && secs > 145);
  }, [state.matchTime]);

  // Game state polling
  useEffect(() => {
    if (!state.gameFileLocation) {
      setShowTimer(true);
      setGameState('');
      return;
    }

    const readGameState = async () => {
      try {
        const response = await fetch(
          `/api/read-file?path=${encodeURIComponent(state.gameFileLocation + '/GameState.txt')}`,
          { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } }
        );
        if (response.ok) {
          const trimmedState = (await response.text()).trim();
          setGameState(trimmedState);
          setShowTimer(trimmedState !== 'FINISHED');

          if (trimmedState !== 'FINISHED' && !pointsDifferentialTracker.isActive()) {
            pointsDifferentialTracker.startLogging(state.gameFileLocation);
          } else if (trimmedState === 'FINISHED' && pointsDifferentialTracker.isActive()) {
            pointsDifferentialTracker.stopLogging();
            setOverlayState({ differentialData: pointsDifferentialTracker.getData() });
          }
        }
      } catch {
        setGameState('Error reading GameState.txt');
        setShowTimer(true);
      }
    };

    readGameState();
    const interval = setInterval(readGameState, 100);
    return () => clearInterval(interval);
  }, [state.gameFileLocation]);

  // Score animation
  useEffect(() => {
    if (prevScores.red !== state.redScore) {
      setScoreChanged(prev => ({ ...prev, red: true }));
      setAnimatingScores(prev => ({ ...prev, red: state.redScore }));
      setTimeout(() => setScoreChanged(prev => ({ ...prev, red: false })), 500);
    }
    if (prevScores.blue !== state.blueScore) {
      setScoreChanged(prev => ({ ...prev, blue: true }));
      setAnimatingScores(prev => ({ ...prev, blue: state.blueScore }));
      setTimeout(() => setScoreChanged(prev => ({ ...prev, blue: false })), 500);
    }
    pointsDifferentialTracker.logPoint(state.redScore, state.blueScore, state.matchTime, gameState);
    setPrevScores({ red: state.redScore, blue: state.blueScore });
  }, [state.redScore, state.blueScore, state.matchTime, gameState]);

  // OPR animation
  useEffect(() => {
    setAnimatingOPR({ red: state.redOPR, blue: state.blueOPR });

    const animateOPRChanges = (alliance: 'red' | 'blue') => {
      const currentOPR = state[alliance === 'red' ? 'redOPR' : 'blueOPR'];
      const prevOPRData = prevOPR[alliance];
      const changedPlayers = new Set<string>();

      currentOPR.forEach((player, index) => {
        const prevPlayer = prevOPRData[index];
        if (prevPlayer && prevPlayer.username === player.username && prevPlayer.score !== player.score) {
          changedPlayers.add(player.username);

          const startScore = prevPlayer.score;
          const endScore = player.score;
          const startTime = Date.now();
          const duration = 200;

          const animateScore = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeOutCubic = 1 - Math.pow(1 - progress, 3);
            const currentScore = Math.round(startScore + (endScore - startScore) * easeOutCubic);

            setAnimatingOPR(prev => ({
              ...prev,
              [alliance]: prev[alliance].map(p =>
                p.username === player.username ? { ...p, score: currentScore } : p
              )
            }));

            if (progress < 1) {
              requestAnimationFrame(animateScore);
            } else {
              setOprChanged(prev => ({
                ...prev,
                [alliance]: new Set([...prev[alliance]].filter(n => n !== player.username))
              }));
            }
          };

          requestAnimationFrame(animateScore);
        }
      });

      if (changedPlayers.size > 0) {
        setOprChanged(prev => ({
          ...prev,
          [alliance]: new Set([...prev[alliance], ...changedPlayers])
        }));
      }
    };

    animateOPRChanges('red');
    animateOPRChanges('blue');
    setPrevOPR({ red: state.redOPR, blue: state.blueOPR });
  }, [state.redOPR, state.blueOPR]);

  // RP file polling (REBUILT only)
  useEffect(() => {
    if (!isRebuilt) return;
    if (!state.gameFileLocation || !state.gameFileLocation.trim()) return;

    const read = (file: string) =>
      fetch(`/api/read-file?path=${encodeURIComponent(state.gameFileLocation + '/' + file)}`, {
        cache: 'no-store', headers: { 'Cache-Control': 'no-cache' }
      })
      .then(r => r.ok ? r.text() : '0')
      .then(t => parseFloat(t.trim()) || 0)
      .catch(() => 0);

    const readRPFiles = async () => {
      const [autoFR, autoFB, teleFR, teleFB, endR, endB, autoL1R, autoL1B] = await Promise.all([
        read('Auto_Fuel_R.txt'),
        read('Auto_Fuel_B.txt'),
        read('Tele_Fuel_R.txt'),
        read('Tele_Fuel_B.txt'),
        read('End_R.txt'),
        read('End_B.txt'),
        read('Auto_lvl_1_R.txt'),
        read('Auto_lvl_1_B.txt'),
      ]);

      setAutoFuelRed(autoFR);
      setAutoFuelBlue(autoFB);
      setTotalFuelRed(autoFR + teleFR);
      setTotalFuelBlue(autoFB + teleFB);
      setTowerPointsRed(endR + autoL1R * 15);
      setTowerPointsBlue(endB + autoL1B * 15);
    };

    readRPFiles();
    const interval = setInterval(readRPFiles, 500);
    return () => clearInterval(interval);
  }, [isRebuilt, state.gameFileLocation]);

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="absolute top-4 left-4 bg-gray-900/85 backdrop-blur-sm rounded-lg p-3 border border-white/30 animate-fade-in">
        <div className="text-lg font-bold">{state.matchTitle}</div>
        {state.matchNumber && state.matchNumber.trim() && (
          <div className="text-sm text-white/80 mt-1">{state.matchNumber}</div>
        )}
      </div>

      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <div className="bg-gray-900/85 backdrop-blur-sm rounded-lg p-3 border border-white/30 animate-fade-in">
          <div className="text-sm font-mono">{currentTime}</div>
        </div>
      </div>

      <div className={`absolute bottom-4 left-4 right-4 transition-all duration-700 ease-out ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
      }`}>
        <div className="flex flex-col items-center gap-2">

          {/* Timer Container */}
          <div className={`relative transition-all duration-700 ${
            showTimer ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
          }`}>
            <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-green-600/90 rounded-lg px-6 py-2 transition-all duration-700 ${
              showAutonomous ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
            }`}>
              <span className="text-lg font-bold text-white">AUTO</span>
            </div>
            <div className="bg-gray-900/85 backdrop-blur-sm rounded-lg px-8 py-3 border border-white/30">
              <div className={`text-6xl font-bold font-mono animate-pulse transition-colors duration-300 ${getTimerColor}`}>
                {state.matchTime}
              </div>
            </div>
          </div>

          {/* Score Container */}
          <div
            className="backdrop-blur-sm rounded-lg p-6 border border-white/30 shadow-2xl w-full relative"
            style={{
              background: state.allianceBranding && state.redPrimaryColor && state.bluePrimaryColor
                ? `linear-gradient(135deg,
                    ${state.redPrimaryColor}40 0%,
                    ${state.redSecondaryColor || state.redPrimaryColor}25 30%,
                    rgba(17, 24, 39, 0.85) 50%,
                    ${state.blueSecondaryColor || state.bluePrimaryColor}25 70%,
                    ${state.bluePrimaryColor}40 100%)`
                : 'rgba(17, 24, 39, 0.85)'
            }}
          >
            {/* Team Logos */}
            {state.allianceBranding && (
              <>
                {leftTeam?.logo && (
                  <div className="absolute left-0 top-0 bottom-0 w-80 z-15 rounded-lg overflow-hidden">
                    <Image
                      src={`/Team_Logos/${leftTeam.logo}`}
                      alt={`${leftAllianceName} Logo`}
                      fill
                      style={{ objectFit: 'contain' }}
                      className="drop-shadow-lg"
                    />
                  </div>
                )}
                {rightTeam?.logo && (
                  <div className="absolute right-0 top-0 bottom-0 w-80 z-15 rounded-lg overflow-hidden">
                    <Image
                      src={`/Team_Logos/${rightTeam.logo}`}
                      alt={`${rightAllianceName} Logo`}
                      fill
                      style={{ objectFit: 'contain' }}
                      className="drop-shadow-lg"
                    />
                  </div>
                )}
              </>
            )}

            {/* Center Logo */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 z-10">
              <Image
                src="/assets/src-light-logo.png"
                alt="SRC Logo"
                fill
                style={{ objectFit: 'contain' }}
                className="drop-shadow-lg"
              />
            </div>

            <div className="flex items-center justify-center">

              {/* Left side */}
              <div className="flex items-center justify-end gap-4 flex-1">
                {/* Left OPR */}
                <div className={`text-sm opacity-90 space-y-2 text-right ${leftIsRed ? 'text-red-100' : 'text-blue-100'}`}>
                  {leftOPR.map((player, index) => (
                    <div key={player.username || `left-player-${index}`} className="flex items-center justify-end gap-2">
                      <span className="truncate max-w-[120px]">{player.username}</span>
                      <span className={`font-mono px-3 py-1.5 rounded text-sm ${
                        leftIsRed ? 'bg-red-700/50' : 'bg-blue-700/50'
                      } ${leftOPRChanged.has(player.username) ? 'animate-score-text-change' : ''}`}>
                        {player.score}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Left Score + Indicators */}
                <div className="flex flex-col items-end gap-2 mr-16">
                  {isRebuilt && (
                    <AllianceIndicators
                      isRed={leftIsRed}
                      hubActive={leftHubActive}
                      energized={leftEnergized}
                      supercharged={leftSupercharged}
                      traversal={leftTraversal}
                      align="left"
                    />
                  )}
                  <div className="flex items-center gap-2">
                    {/* Left Fuel Gauge (outer side) */}
                    {isRebuilt && (
                      <div className="rounded-lg overflow-hidden">
                        <FuelGauge
                          value={leftFuel}
                          thresholds={FUEL_RP_THRESHOLDS}
                          backgroundColor={leftIsRed ? RED_TILE : BLUE_TILE}
                          height={SCORE_BOX_HEIGHT}
                        />
                      </div>
                    )}
                    <div className={`rounded-lg p-8 text-center min-w-[180px] ${
                      leftIsRed ? 'bg-red-600/80 animate-red-glow' : 'bg-blue-600/80 animate-blue-glow'
                    }`}>
                      <div className={`text-6xl font-mono font-bold text-white ${
                        leftScoreChanged ? 'animate-score-text-change' : ''
                      }`}>{leftAnimatingScore}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Center space */}
              <div className="w-24"></div>

              {/* Right side */}
              <div className="flex items-center justify-start gap-4 flex-1">
                {/* Right Score + Indicators */}
                <div className="flex flex-col items-start gap-2 ml-16">
                  {isRebuilt && (
                    <AllianceIndicators
                      isRed={rightIsRed}
                      hubActive={rightHubActive}
                      energized={rightEnergized}
                      supercharged={rightSupercharged}
                      traversal={rightTraversal}
                      align="right"
                    />
                  )}
                  <div className="flex items-center gap-2">
                    <div className={`rounded-lg p-8 text-center min-w-[180px] ${
                      rightIsRed ? 'bg-red-600/80 animate-red-glow' : 'bg-blue-600/80 animate-blue-glow'
                    }`}>
                      <div className={`text-6xl font-mono font-bold text-white ${
                        rightScoreChanged ? 'animate-score-text-change' : ''
                      }`}>{rightAnimatingScore}</div>
                    </div>
                    {/* Right Fuel Gauge (outer side) */}
                    {isRebuilt && (
                      <div className="rounded-lg overflow-hidden">
                        <FuelGauge
                          value={rightFuel}
                          thresholds={FUEL_RP_THRESHOLDS}
                          backgroundColor={rightIsRed ? RED_TILE : BLUE_TILE}
                          height={SCORE_BOX_HEIGHT}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Right OPR */}
                <div className={`text-sm opacity-90 space-y-2 text-left ${rightIsRed ? 'text-red-100' : 'text-blue-100'}`}>
                  {rightOPR.map((player, index) => (
                    <div key={player.username || `right-player-${index}`} className="flex items-center justify-start gap-2">
                      <span className={`font-mono px-3 py-1.5 rounded text-sm ${
                        rightIsRed ? 'bg-red-700/50' : 'bg-blue-700/50'
                      } ${rightOPRChanged.has(player.username) ? 'animate-score-text-change' : ''}`}>
                        {player.score}
                      </span>
                      <span className="truncate max-w-[120px]">{player.username}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes score-text-change {
          0%   { transform: scale(1);   text-shadow: 0 0 0px rgba(255,255,255,0); }
          50%  { transform: scale(1.1); text-shadow: 0 0 20px rgba(255,255,255,0.8), 0 0 40px rgba(255,255,255,0.6); }
          100% { transform: scale(1);   text-shadow: 0 0 0px rgba(255,255,255,0); }
        }
        @keyframes red-glow {
          0%, 100% { box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06); }
          50%       { box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06), 0 0 30px rgba(239,68,68,0.6), 0 0 60px rgba(239,68,68,0.3); }
        }
        @keyframes blue-glow {
          0%, 100% { box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06); }
          50%       { box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06), 0 0 30px rgba(59,130,246,0.6), 0 0 60px rgba(59,130,246,0.3); }
        }
        @keyframes pulse-border {
          0%, 100% { filter: brightness(1); }
          50%       { filter: brightness(1.3); }
        }
        .animate-fade-in          { animation: fade-in 0.5s ease-out; }
        .animate-score-text-change { animation: score-text-change 0.5s ease-out; }
        .animate-red-glow          { animation: red-glow 3s ease-in-out infinite; }
        .animate-blue-glow         { animation: blue-glow 3s ease-in-out infinite; }
        .animate-pulse-border      { animation: pulse-border 2s ease-in-out infinite; }
      `}</style>
    </>
  );
}