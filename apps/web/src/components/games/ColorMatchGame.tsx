import { useState, useEffect, useRef, useCallback } from 'react';
import ShareGame from './ShareGame';
import { trackToolUse, trackConversion, trackToolError, trackPerformance } from '../../lib/analytics';

// ============================================
// TYPES
// ============================================

type GameState = 'idle' | 'watching' | 'playing' | 'finished';
type Difficulty = 'normal' | 'hard';

interface ColorButton {
  id: number;
  name: string;
  color: string;
  activeColor: string;
  sound: number; // frequency
}

interface LeaderboardEntry {
  score: number;
  level: number;
  difficulty: Difficulty;
  date: string;
}

// ============================================
// CONSTANTS
// ============================================

// Game configuration
const GAME_CONFIG = {
  NORMAL_COLORS: 4,
  HARD_COLORS: 6,
  HARD_MODE_UNLOCK_LEVEL: 10,
  LEADERBOARD_MAX_ENTRIES: 10
} as const;

// Color definitions
const COLORS_NORMAL: ColorButton[] = [
  { id: 0, name: 'Green', color: '#22c55e', activeColor: '#4ade80', sound: 392 },    // G4
  { id: 1, name: 'Red', color: '#ef4444', activeColor: '#f87171', sound: 329.63 },   // E4
  { id: 2, name: 'Yellow', color: '#eab308', activeColor: '#facc15', sound: 261.63 }, // C4
  { id: 3, name: 'Blue', color: '#3b82f6', activeColor: '#60a5fa', sound: 196 },     // G3
];

const COLORS_HARD: ColorButton[] = [
  ...COLORS_NORMAL,
  { id: 4, name: 'Orange', color: '#f97316', activeColor: '#fb923c', sound: 440 },   // A4
  { id: 5, name: 'Purple', color: '#a855f7', activeColor: '#c084fc', sound: 523.25 }, // C5
];

// Speed progression settings (milliseconds)
const SPEED_LEVELS = {
  normal: { base: 600, min: 300, decrease: 20 },
  hard: { base: 500, min: 200, decrease: 25 },
} as const;

// Audio settings
const AUDIO_CONFIG = {
  CORRECT_TONE_DURATION: 0.2,
  SEQUENCE_TONE_DURATION: 0.3,
  ERROR_TONE_DURATION: 0.5,
  TONE_FADE_OUT: 0.01
} as const;

// Animation timings
const ANIMATION_CONFIG = {
  BUTTON_ACTIVE_DURATION: 200,
  SEQUENCE_DELAY: 500,
  BETWEEN_TONES_DELAY: 300,
  SUCCESS_NEXT_ROUND_DELAY: 1000
} as const;

// ============================================
// SOUND MANAGER
// ============================================

class SoundManager {
  private audioContext: AudioContext | null = null;
  private enabled: boolean = false;
  private isInitialized: boolean = false;

  async setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (enabled && !this.isInitialized) {
      try {
        if (!this.audioContext) {
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
          if (!AudioCtx) {
            console.warn('Web Audio API not supported');
            return;
          }
          this.audioContext = new AudioCtx();
        }

        // Handle suspended state (common on mobile)
        if (this.audioContext.state === 'suspended') {
          await this.audioContext.resume().catch(() => {
            console.warn('AudioContext resume failed - user interaction required');
          });
        }

        this.isInitialized = true;
      } catch (error) {
        console.error('Failed to initialize AudioContext:', error);
        this.enabled = false;
        this.isInitialized = false;
      }
    }
  }

  private safePlay(callback: (ctx: AudioContext) => void) {
    if (!this.enabled || !this.audioContext || !this.isInitialized) return;

    try {
      // Resume if suspended
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(() => {});
      }

      callback(this.audioContext);
    } catch (error) {
      console.error('Audio playback failed:', error);
    }
  }

  playTone(frequency: number, duration: number = 0.3) {
    this.safePlay((ctx) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';

      const now = ctx.currentTime;
      gainNode.gain.setValueAtTime(0.3, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);

      oscillator.start(now);
      oscillator.stop(now + duration);
    });
  }

  playError() {
    this.safePlay((ctx) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.value = 150;
      oscillator.type = 'sawtooth';

      const now = ctx.currentTime;
      gainNode.gain.setValueAtTime(0.3, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

      oscillator.start(now);
      oscillator.stop(now + 0.5);
    });
  }

  playSuccess() {
    this.safePlay((ctx) => {
      const frequencies = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      frequencies.forEach((freq, i) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        oscillator.frequency.value = freq;
        oscillator.type = 'sine';
        const startTime = ctx.currentTime + i * 0.1;
        gainNode.gain.setValueAtTime(0.15, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15);
        oscillator.start(startTime);
        oscillator.stop(startTime + 0.15);
      });
    });
  }
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function ColorMatchGame() {
  // Game state
  const [gameState, setGameState] = useState<GameState>('idle');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [sequence, setSequence] = useState<number[]>([]);
  const [playerIndex, setPlayerIndex] = useState(0);
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);

  // UI state
  const [activeButton, setActiveButton] = useState<number | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [showHardMode, setShowHardMode] = useState(false);

  // Refs
  const soundManager = useRef(new SoundManager());
  const playbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get current color set
  const colors = difficulty === 'hard' || level > GAME_CONFIG.HARD_MODE_UNLOCK_LEVEL ? COLORS_HARD : COLORS_NORMAL;
  const actualDifficulty = level > GAME_CONFIG.HARD_MODE_UNLOCK_LEVEL ? 'hard' : difficulty;

  // Component mounted ref
  const isMounted = useRef(false);

  // Calculate speed based on level
  const getSpeed = useCallback(() => {
    const config = SPEED_LEVELS[actualDifficulty];
    return Math.max(config.min, config.base - (level - 1) * config.decrease);
  }, [level, actualDifficulty]);

  // Component mount/unmount
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Load leaderboard and high score
  useEffect(() => {
    if (!isMounted.current) return;

    const stored = localStorage.getItem('color-match-leaderboard');
    if (stored) {
      try {
        const data = JSON.parse(stored);
        setLeaderboard(data);
        if (data.length > 0) {
          setHighScore(data[0].score);
        }
      } catch (e) {
        console.error('Failed to load leaderboard:', e);
      }
    }

    // Check if hard mode was unlocked
    const hardUnlocked = localStorage.getItem('color-match-hard-unlocked');
    if (hardUnlocked === 'true') {
      setShowHardMode(true);
    }
  }, []);

  // Update sound manager
  useEffect(() => {
    soundManager.current.setEnabled(soundEnabled);
  }, [soundEnabled]);

  // Cleanup timeouts and intervals
  useEffect(() => {
    return () => {
      // Clear all timeouts
      if (playbackTimeoutRef.current) {
        clearTimeout(playbackTimeoutRef.current);
      }

      // Stop any playing audio
      if (soundManager.current) {
        soundManager.current.setEnabled(false);
      }
    };
  }, []);

  // Play the sequence
  const playSequence = useCallback((seq: number[]) => {
    if (!isMounted.current) return;

    setGameState('watching');
    setActiveButton(null);

    const speed = getSpeed();
    let i = 0;

    const playNext = () => {
      if (!isMounted.current) return;

      if (i < seq.length) {
        const colorIndex = seq[i];
        const color = colors[colorIndex];

        setActiveButton(colorIndex);
        soundManager.current.playTone(color.sound, speed / 1000);

        playbackTimeoutRef.current = setTimeout(() => {
          if (!isMounted.current) return;
          setActiveButton(null);

          playbackTimeoutRef.current = setTimeout(() => {
            i++;
            playNext();
          }, speed / 3);
        }, speed);
      } else {
        // Sequence finished, player's turn
        if (!isMounted.current) return;
        setGameState('playing');
        setPlayerIndex(0);
      }
    };

    // Small delay before starting
    playbackTimeoutRef.current = setTimeout(playNext, 500);
  }, [colors, getSpeed]);

  // Start new game
  const startGame = useCallback(() => {
    // Track game start
    trackToolUse('color-match', 'tool_opened', {
      difficulty,
      level: 1,
      timestamp: Date.now()
    });

    setLevel(1);
    setScore(0);
    setSequence([]);
    setPlayerIndex(0);

    // Generate first color
    const maxColorIndex = difficulty === 'hard' ? GAME_CONFIG.HARD_COLORS - 1 : GAME_CONFIG.NORMAL_COLORS - 1;
    const firstColor = Math.floor(Math.random() * (maxColorIndex + 1));
    const newSequence = [firstColor];
    setSequence(newSequence);

    // Play it
    setTimeout(() => playSequence(newSequence), 300);
  }, [difficulty, playSequence]);

  // Handle player click
  const handleColorClick = useCallback((colorIndex: number) => {
    if (gameState !== 'playing' || !isMounted.current) return;

    // Prevent ghost clicks - disable button immediately
    const color = colors[colorIndex];
    setActiveButton(colorIndex);
    soundManager.current.playTone(color.sound, 0.2);

    setTimeout(() => {
      if (!isMounted.current) return;
      setActiveButton(null);
    }, 200);

    // Check if correct
    if (colorIndex === sequence[playerIndex]) {
      // Correct!
      const newIndex = playerIndex + 1;

      if (newIndex === sequence.length) {
        // Completed the sequence!
        const pointsEarned = level * 10 * (actualDifficulty === 'hard' ? 2 : 1);
        setScore(prev => prev + pointsEarned);
        setLevel(prev => prev + 1);

        // Track level completion
        trackToolUse('color-match', 'feature_used', {
          level_completed: level,
          score: score + pointsEarned,
          difficulty: actualDifficulty
        });

        // Check for hard mode unlock
        if (level === GAME_CONFIG.HARD_MODE_UNLOCK_LEVEL && !showHardMode) {
          setShowHardMode(true);
          localStorage.setItem('color-match-hard-unlocked', 'true');
        }

        // Add new color and play sequence
        const maxColorIndex = level + 1 > GAME_CONFIG.HARD_MODE_UNLOCK_LEVEL || difficulty === 'hard' ? GAME_CONFIG.HARD_COLORS - 1 : GAME_CONFIG.NORMAL_COLORS - 1;
        const newColor = Math.floor(Math.random() * (maxColorIndex + 1));
        const newSequence = [...sequence, newColor];
        setSequence(newSequence);

        soundManager.current.playSuccess();

        setTimeout(() => playSequence(newSequence), 1000);
      } else {
        setPlayerIndex(newIndex);
      }
    } else {
      // Wrong! Game over
      soundManager.current.playError();
      endGame();
    }
  }, [gameState, colors, sequence, playerIndex, level, actualDifficulty, showHardMode, difficulty, playSequence]);

  // End game
  const endGame = useCallback(() => {
    if (playbackTimeoutRef.current) {
      clearTimeout(playbackTimeoutRef.current);
    }

    setGameState('finished');

    // Track game completion
    trackConversion('color-match', 'tool_completed', {
      final_level: level,
      final_score: score,
      difficulty: actualDifficulty,
      sequence_length: sequence.length
    });

    // Update high score
    if (score > highScore) {
      setHighScore(score);
      trackToolUse('color-match', 'settings_changed', {
        event: 'new_high_score',
        score: score,
        previous_high: highScore
      });
    }

    // Save to leaderboard
    const entry: LeaderboardEntry = {
      score,
      level,
      difficulty: actualDifficulty,
      date: new Date().toISOString()
    };

    const newLeaderboard = [...leaderboard, entry]
      .sort((a, b) => b.score - a.score)
      .slice(0, GAME_CONFIG.LEADERBOARD_MAX_ENTRIES);

    setLeaderboard(newLeaderboard);
    localStorage.setItem('color-match-leaderboard', JSON.stringify(newLeaderboard));
  }, [score, level, actualDifficulty, highScore, leaderboard, sequence.length]);


  // Render color button
  const renderColorButton = (color: ColorButton, position: string) => {
    const isActive = activeButton === color.id;
    const isClickable = gameState === 'playing';

    return (
      <button
        key={color.id}
        onClick={() => handleColorClick(color.id)}
        disabled={gameState !== 'playing'}
        className={`
          ${position}
          w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32
          rounded-2xl
          transition-all duration-100
          border-4 border-transparent
          ${isClickable ? 'cursor-pointer hover:scale-105 active:scale-95' : 'cursor-default'}
          ${isActive ? 'scale-110 brightness-125 shadow-lg shadow-current' : 'brightness-75 hover:brightness-90'}
        `}
        style={{
          backgroundColor: isActive ? color.activeColor : color.color,
          boxShadow: isActive ? `0 0 30px ${color.color}` : 'none',
        }}
        aria-label={color.name}
      />
    );
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* IDLE STATE */}
      {gameState === 'idle' && (
        <div className="space-y-6">
          {/* Difficulty Selection */}
          <div className="glass-card p-6 rounded-lg">
            <h3 className="text-sm uppercase tracking-wider text-[var(--text-muted)] mb-4">
              Difficulty
            </h3>
            <div className="flex gap-3">
              <button
                onClick={() => setDifficulty('normal')}
                className={`flex-1 px-4 py-3 rounded-lg font-mono transition-all ${
                  difficulty === 'normal'
                    ? 'bg-[var(--accent)] text-[var(--bg)] font-bold'
                    : 'glass-card hover:border-[var(--border-hover)]'
                }`}
              >
                Normal
                <span className="block text-xs opacity-70 mt-1">4 colors</span>
              </button>

              {showHardMode ? (
                <button
                  onClick={() => setDifficulty('hard')}
                  className={`flex-1 px-4 py-3 rounded-lg font-mono transition-all ${
                    difficulty === 'hard'
                      ? 'bg-[var(--error)] text-white font-bold'
                      : 'glass-card hover:border-[var(--border-hover)]'
                  }`}
                >
                  Hard 🔥
                  <span className="block text-xs opacity-70 mt-1">6 colors</span>
                </button>
              ) : (
                <div className="flex-1 px-4 py-3 rounded-lg glass-card opacity-50">
                  <span className="text-[var(--text-muted)]">Hard 🔒</span>
                  <span className="block text-xs opacity-70 mt-1">Reach level 11</span>
                </div>
              )}
            </div>
          </div>

          {/* Sound Toggle */}
          <div className="glass-card p-4 rounded-lg flex items-center justify-between">
            <span className="text-[var(--text-dim)]">Sound Effects</span>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              aria-label={soundEnabled ? 'Disable sound effects' : 'Enable sound effects'}
              aria-pressed={soundEnabled}
              className={`w-12 h-6 rounded-full transition-all relative ${
                soundEnabled ? 'bg-[var(--success)]' : 'bg-[var(--border)]'
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                  soundEnabled ? 'left-7' : 'left-1'
                }`}
              />
            </button>
          </div>

          {/* High Score */}
          {highScore > 0 && (
            <div className="glass-card p-4 rounded-lg text-center">
              <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider">High Score</span>
              <div className="text-3xl font-mono font-bold text-[var(--accent)]">{highScore}</div>
            </div>
          )}

          {/* Start Button */}
          <button
            onClick={startGame}
            className="btn-primary w-full py-4 text-lg"
          >
            Start Game
          </button>

          {/* How to Play */}
          <div className="glass-card p-6 rounded-lg">
            <h3 className="text-sm uppercase tracking-wider text-[var(--text-muted)] mb-3">
              How to Play
            </h3>
            <ol className="text-sm text-[var(--text-dim)] space-y-2 list-decimal list-inside">
              <li>Watch the color sequence carefully</li>
              <li>Repeat the sequence by clicking the colors</li>
              <li>Each round adds one more color</li>
              <li>Make a mistake and it's game over!</li>
            </ol>
          </div>

          {/* Leaderboard */}
          {leaderboard.length > 0 && (
            <div className="glass-card p-6 rounded-lg">
              <h3 className="text-sm uppercase tracking-wider text-[var(--text-muted)] mb-4">
                Leaderboard
              </h3>
              <div className="space-y-2">
                {leaderboard.slice(0, 5).map((entry, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 flex items-center justify-center bg-[var(--bg-hover)] rounded text-xs">
                        {i + 1}
                      </span>
                      <span className="font-mono text-lg text-[var(--text)]">{entry.score}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm text-[var(--text-dim)]">Lvl {entry.level}</span>
                      <span className="text-xs text-[var(--text-muted)] ml-2">
                        {entry.difficulty === 'hard' ? '🔥' : ''}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* PLAYING/WATCHING STATE */}
      {(gameState === 'watching' || gameState === 'playing') && (
        <div className="space-y-6">
          {/* Stats Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="glass-card px-4 py-2 rounded-lg">
                <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Level</span>
                <div className="text-2xl font-mono font-bold text-[var(--text)]">{level}</div>
              </div>
              <div className="glass-card px-4 py-2 rounded-lg">
                <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Score</span>
                <div className="text-2xl font-mono font-bold text-[var(--success)]">{score}</div>
              </div>
            </div>
            <div className="text-sm text-[var(--text-muted)]">
              {gameState === 'watching' ? '👀 Watch...' : '👆 Your turn!'}
            </div>
          </div>

          {/* Game Board - Cross Layout */}
          <div className="glass-card p-8 rounded-lg">
            <div className="relative w-full aspect-square max-w-[320px] mx-auto">
              {/* Top - Green */}
              {renderColorButton(colors[0], 'absolute top-0 left-1/2 -translate-x-1/2')}

              {/* Left - Red */}
              {renderColorButton(colors[1], 'absolute left-0 top-1/2 -translate-y-1/2')}

              {/* Center - Level Display */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-[var(--bg-secondary)] border border-[var(--border)] flex items-center justify-center">
                <span className="text-2xl font-mono font-bold text-[var(--text)]">{level}</span>
              </div>

              {/* Right - Yellow */}
              {renderColorButton(colors[2], 'absolute right-0 top-1/2 -translate-y-1/2')}

              {/* Bottom - Blue */}
              {renderColorButton(colors[3], 'absolute bottom-0 left-1/2 -translate-x-1/2')}

              {/* Hard mode extra colors - corners */}
              {colors.length > 4 && (
                <>
                  {/* Top-Left - Orange */}
                  {renderColorButton(colors[4], 'absolute top-4 left-4 !w-16 !h-16 sm:!w-20 sm:!h-20')}

                  {/* Top-Right - Purple */}
                  {renderColorButton(colors[5], 'absolute top-4 right-4 !w-16 !h-16 sm:!w-20 sm:!h-20')}
                </>
              )}
            </div>
          </div>

          {/* Sequence Progress */}
          <div className="flex justify-center gap-1">
            {sequence.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-all ${
                  i < playerIndex
                    ? 'bg-[var(--success)]'
                    : i === playerIndex && gameState === 'playing'
                    ? 'bg-[var(--accent)] animate-pulse'
                    : 'bg-[var(--border)]'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* FINISHED STATE */}
      {gameState === 'finished' && (
        <div className="space-y-6">
          {/* Main Result */}
          <div className="glass-card p-8 rounded-lg text-center">
            <div className="text-4xl mb-4">
              {level >= 15 ? '🏆' : level >= 10 ? '⭐' : level >= 5 ? '👍' : '🎮'}
            </div>
            <div className="text-xl text-[var(--text-muted)] mb-2">
              {level >= 15 ? 'Legendary!' : level >= 10 ? 'Expert!' : level >= 5 ? 'Nice!' : 'Good Try!'}
            </div>
            <div className="text-5xl font-mono font-bold text-[var(--text)] mb-2">
              {score}
            </div>
            <div className="text-sm text-[var(--text-dim)]">
              points
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="glass-card p-4 rounded-lg text-center">
              <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Level Reached</div>
              <div className="text-2xl font-mono font-bold text-[var(--text)]">{level}</div>
            </div>
            <div className="glass-card p-4 rounded-lg text-center">
              <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Sequence Length</div>
              <div className="text-2xl font-mono font-bold text-[var(--text)]">{sequence.length}</div>
            </div>
          </div>

          {/* New High Score */}
          {score === highScore && score > 0 && (
            <div className="glass-card p-4 rounded-lg text-center border border-[var(--success)]">
              <span className="text-[var(--success)] font-bold">🎉 New High Score!</span>
            </div>
          )}

          {/* Hard Mode Unlocked */}
          {level > 10 && difficulty === 'normal' && (
            <div className="glass-card p-4 rounded-lg text-center border border-[var(--warning)]">
              <span className="text-[var(--warning)] font-bold">🔓 Hard Mode Unlocked!</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4">
            {/* Share Game Component */}
            <ShareGame
              gameName="Color Match"
              score={score}
              scoreLabel="Score"
              customMessage={`Color Match - Simon Says

Level: ${level}
Score: ${score}
Mode: ${actualDifficulty === 'hard' ? '🔥 Hard' : 'Normal'}

${level >= 15 ? '🏆 Legend!' : level >= 10 ? '⭐ Expert!' : level >= 5 ? '👍 Nice!' : '🎮 Good try!'}

Play at newlifesolutions.dev/games/color-match`}
              className="flex-1"
            />
            <button
              onClick={startGame}
              className="btn-primary flex-1 py-3"
            >
              Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
