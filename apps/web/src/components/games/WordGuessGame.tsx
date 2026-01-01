import { useState, useEffect, useCallback, useRef } from 'react';
import ShareGame from './ShareGame';
import { getDailyWord, isValidWord, getGameNumber, type Language } from '../../lib/wordlist';

// Types
type LetterStatus = 'correct' | 'present' | 'absent' | 'empty' | 'pending';
type GameStatus = 'playing' | 'won' | 'lost';

interface LetterResult {
  letter: string;
  status: LetterStatus;
}

interface GameStats {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
  guessDistribution: number[];
  lastPlayedDate: string;
  lastWonDate: string;
}

interface SavedGameState {
  guesses: string[];
  date: string;
  gameStatus: GameStatus;
}

// Constants
const WORD_LENGTH = 5;
const MAX_ATTEMPTS = 6;

const KEYBOARD_ROWS_EN = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACK']
];

const KEYBOARD_ROWS_ES = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ñ'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACK']
];

// Storage keys
const STATS_KEY = 'wordguess-stats';
const GAME_STATE_KEY = 'wordguess-state';
const LANGUAGE_KEY = 'wordguess-language';

// Default stats
const defaultStats: GameStats = {
  gamesPlayed: 0,
  gamesWon: 0,
  currentStreak: 0,
  maxStreak: 0,
  guessDistribution: [0, 0, 0, 0, 0, 0],
  lastPlayedDate: '',
  lastWonDate: ''
};

// Evaluate a guess against the target word
function evaluateGuess(guess: string, target: string): LetterResult[] {
  const result: LetterResult[] = [];
  const targetLetters = target.split('');
  const guessLetters = guess.split('');
  const used = new Array(WORD_LENGTH).fill(false);

  // First pass: mark correct letters
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guessLetters[i] === targetLetters[i]) {
      result[i] = { letter: guessLetters[i], status: 'correct' };
      used[i] = true;
    } else {
      result[i] = { letter: guessLetters[i], status: 'absent' };
    }
  }

  // Second pass: mark present letters
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (result[i].status !== 'correct') {
      for (let j = 0; j < WORD_LENGTH; j++) {
        if (!used[j] && guessLetters[i] === targetLetters[j]) {
          result[i].status = 'present';
          used[j] = true;
          break;
        }
      }
    }
  }

  return result;
}

export default function WordGuessGame() {
  const today = new Date().toISOString().slice(0, 10);
  const gameNumber = getGameNumber();

  // Language state - loaded from localStorage
  const [language, setLanguage] = useState<Language>('en');
  const [targetWord, setTargetWord] = useState(() => getDailyWord(today, 'en'));

  // Game state
  const [guesses, setGuesses] = useState<string[]>([]);
  const [currentGuess, setCurrentGuess] = useState('');
  const [gameStatus, setGameStatus] = useState<GameStatus>('playing');
  const [stats, setStats] = useState<GameStats>(defaultStats);
  const [showStats, setShowStats] = useState(false);
  const [shake, setShake] = useState(false);
  const [revealRow, setRevealRow] = useState(-1);
  const [error, setError] = useState('');
  const [keyboardStatus, setKeyboardStatus] = useState<Record<string, LetterStatus>>({});

  // Keyboard rows based on language
  const KEYBOARD_ROWS = language === 'es' ? KEYBOARD_ROWS_ES : KEYBOARD_ROWS_EN;

  // Refs for animations
  const inputRef = useRef<HTMLInputElement>(null);

  // Load language preference on mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem(LANGUAGE_KEY) as Language | null;
    if (savedLanguage === 'es' || savedLanguage === 'en') {
      setLanguage(savedLanguage);
      setTargetWord(getDailyWord(today, savedLanguage));
    }
  }, [today]);

  // Load saved state and stats on mount
  useEffect(() => {
    // Load stats (language-specific)
    const statsKey = `${STATS_KEY}-${language}`;
    const savedStats = localStorage.getItem(statsKey);
    if (savedStats) {
      try {
        setStats(JSON.parse(savedStats));
      } catch {
        setStats(defaultStats);
      }
    } else {
      setStats(defaultStats);
    }

    // Load game state for today (language-specific)
    const stateKey = `${GAME_STATE_KEY}-${language}`;
    const savedState = localStorage.getItem(stateKey);
    if (savedState) {
      try {
        const parsed: SavedGameState = JSON.parse(savedState);
        if (parsed.date === today) {
          setGuesses(parsed.guesses);
          setGameStatus(parsed.gameStatus);

          // Rebuild keyboard status
          const currentTarget = getDailyWord(today, language);
          const newKeyboardStatus: Record<string, LetterStatus> = {};
          parsed.guesses.forEach(guess => {
            const result = evaluateGuess(guess, currentTarget);
            result.forEach(({ letter, status }) => {
              const upper = letter.toUpperCase();
              const current = newKeyboardStatus[upper];
              if (status === 'correct' || (status === 'present' && current !== 'correct') ||
                  (status === 'absent' && !current)) {
                newKeyboardStatus[upper] = status;
              }
            });
          });
          setKeyboardStatus(newKeyboardStatus);
        } else {
          // New day, reset game
          setGuesses([]);
          setCurrentGuess('');
          setGameStatus('playing');
          setKeyboardStatus({});
        }
      } catch {
        // Invalid state, start fresh
        setGuesses([]);
        setCurrentGuess('');
        setGameStatus('playing');
        setKeyboardStatus({});
      }
    } else {
      // No saved state for this language, reset
      setGuesses([]);
      setCurrentGuess('');
      setGameStatus('playing');
      setKeyboardStatus({});
    }
  }, [today, language]);

  // Save game state whenever it changes (language-specific)
  useEffect(() => {
    const state: SavedGameState = {
      guesses,
      date: today,
      gameStatus
    };
    const stateKey = `${GAME_STATE_KEY}-${language}`;
    localStorage.setItem(stateKey, JSON.stringify(state));
  }, [guesses, gameStatus, today, language]);

  // Save stats (language-specific)
  const saveStats = useCallback((newStats: GameStats) => {
    setStats(newStats);
    const statsKey = `${STATS_KEY}-${language}`;
    localStorage.setItem(statsKey, JSON.stringify(newStats));
  }, [language]);

  // Handle language change
  const handleLanguageChange = useCallback((newLanguage: Language) => {
    if (newLanguage === language) return;

    // Save current language preference
    localStorage.setItem(LANGUAGE_KEY, newLanguage);
    setLanguage(newLanguage);
    setTargetWord(getDailyWord(today, newLanguage));
  }, [language, today]);

  // Handle winning or losing
  const handleGameEnd = useCallback((won: boolean, attempts: number) => {
    const newStats = { ...stats };
    newStats.gamesPlayed++;
    newStats.lastPlayedDate = today;

    if (won) {
      newStats.gamesWon++;
      newStats.currentStreak++;
      newStats.maxStreak = Math.max(newStats.maxStreak, newStats.currentStreak);
      newStats.guessDistribution[attempts - 1]++;
      newStats.lastWonDate = today;
    } else {
      newStats.currentStreak = 0;
    }

    saveStats(newStats);
    setTimeout(() => setShowStats(true), 2000);
  }, [stats, today, saveStats]);

  // Submit a guess
  const submitGuess = useCallback(() => {
    if (gameStatus !== 'playing') return;
    if (currentGuess.length !== WORD_LENGTH) {
      setError(language === 'es' ? 'Faltan letras' : 'Not enough letters');
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }

    if (!isValidWord(currentGuess, language)) {
      setError(language === 'es' ? 'Palabra no válida' : 'Not in word list');
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }

    setError('');
    const newGuesses = [...guesses, currentGuess.toLowerCase()];
    setGuesses(newGuesses);
    setRevealRow(newGuesses.length - 1);

    // Update keyboard status
    const result = evaluateGuess(currentGuess.toLowerCase(), targetWord);
    const newKeyboardStatus = { ...keyboardStatus };
    result.forEach(({ letter, status }) => {
      const upper = letter.toUpperCase();
      const current = newKeyboardStatus[upper];
      // Only upgrade status: absent -> present -> correct
      if (status === 'correct') {
        newKeyboardStatus[upper] = 'correct';
      } else if (status === 'present' && current !== 'correct') {
        newKeyboardStatus[upper] = 'present';
      } else if (status === 'absent' && !current) {
        newKeyboardStatus[upper] = 'absent';
      }
    });
    setKeyboardStatus(newKeyboardStatus);

    setCurrentGuess('');

    // Check win/lose after animation
    setTimeout(() => {
      setRevealRow(-1);
      if (currentGuess.toLowerCase() === targetWord) {
        setGameStatus('won');
        handleGameEnd(true, newGuesses.length);
      } else if (newGuesses.length >= MAX_ATTEMPTS) {
        setGameStatus('lost');
        handleGameEnd(false, newGuesses.length);
      }
    }, 1500);
  }, [currentGuess, gameStatus, guesses, targetWord, keyboardStatus, handleGameEnd, language]);

  // Handle keyboard input
  const handleKeyPress = useCallback((key: string) => {
    if (gameStatus !== 'playing') return;

    if (key === 'ENTER') {
      submitGuess();
    } else if (key === 'BACK' || key === 'BACKSPACE') {
      setCurrentGuess(prev => prev.slice(0, -1));
      setError('');
    } else if (key.length === 1 && /^[A-Za-zÑñ]$/.test(key)) {
      if (currentGuess.length < WORD_LENGTH) {
        setCurrentGuess(prev => prev + key.toUpperCase());
        setError('');
      }
    }
  }, [gameStatus, currentGuess, submitGuess]);

  // Physical keyboard handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const key = e.key.toUpperCase();
      if (key === 'ENTER' || key === 'BACKSPACE' || /^[A-ZÑ]$/.test(key)) {
        e.preventDefault();
        handleKeyPress(key);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleKeyPress]);

  // Generate share text
  const generateShareText = useCallback(() => {
    const emojiGrid = guesses.map(guess => {
      const result = evaluateGuess(guess, targetWord);
      return result.map(({ status }) => {
        switch (status) {
          case 'correct': return '\u{1F7E9}'; // Green square
          case 'present': return '\u{1F7E8}'; // Yellow square
          default: return '\u{2B1B}'; // Black square
        }
      }).join('');
    }).join('\n');

    const attemptsText = gameStatus === 'won' ? `${guesses.length}/6` : 'X/6';

    return `Word Guess #${gameNumber} ${attemptsText}\n\n${emojiGrid}\n\nPlay at newlifesolutions.dev/games/word-guess`;
  }, [guesses, targetWord, gameNumber, gameStatus]);

  // Render a single tile
  const renderTile = (letter: string, status: LetterStatus, index: number, isRevealing: boolean) => {
    const baseClasses = 'w-[52px] h-[52px] sm:w-[62px] sm:h-[62px] flex items-center justify-center text-2xl sm:text-3xl font-bold uppercase border-2 transition-all';

    let statusClasses = '';
    switch (status) {
      case 'correct':
        statusClasses = 'bg-[#538d4e] border-[#538d4e] text-white';
        break;
      case 'present':
        statusClasses = 'bg-[#b59f3b] border-[#b59f3b] text-white';
        break;
      case 'absent':
        statusClasses = 'bg-[#3a3a3c] border-[#3a3a3c] text-white';
        break;
      case 'pending':
        statusClasses = 'border-[var(--border-hover)] text-[var(--text)]';
        break;
      default:
        statusClasses = 'border-[var(--border)] text-[var(--text)]';
    }

    const revealDelay = isRevealing ? `${index * 300}ms` : '0ms';
    const revealStyle = isRevealing ? {
      animationDelay: revealDelay,
      animationDuration: '500ms',
      animationFillMode: 'both' as const
    } : {};

    return (
      <div
        key={index}
        className={`${baseClasses} ${statusClasses} ${isRevealing ? 'animate-flip' : ''}`}
        style={revealStyle}
      >
        {letter}
      </div>
    );
  };

  // Render the game grid
  const renderGrid = () => {
    const rows = [];

    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      const isCurrentRow = i === guesses.length && gameStatus === 'playing';
      const isSubmittedRow = i < guesses.length;
      const isRevealingRow = i === revealRow;
      const word = isCurrentRow ? currentGuess : (guesses[i] || '');

      let results: LetterResult[] = [];
      if (isSubmittedRow) {
        results = evaluateGuess(guesses[i], targetWord);
      }

      const tiles = [];
      for (let j = 0; j < WORD_LENGTH; j++) {
        const letter = word[j] || '';
        let status: LetterStatus = 'empty';

        if (isSubmittedRow) {
          status = results[j]?.status || 'absent';
        } else if (isCurrentRow && letter) {
          status = 'pending';
        }

        tiles.push(renderTile(letter, status, j, isRevealingRow && isSubmittedRow));
      }

      rows.push(
        <div
          key={i}
          className={`flex gap-1.5 justify-center ${isCurrentRow && shake ? 'animate-shake' : ''}`}
        >
          {tiles}
        </div>
      );
    }

    return rows;
  };

  // Render keyboard
  const renderKeyboard = () => {
    return KEYBOARD_ROWS.map((row, rowIndex) => (
      <div key={rowIndex} className="flex gap-1.5 justify-center mb-2">
        {row.map(key => {
          const isSpecial = key === 'ENTER' || key === 'BACK';
          const status = keyboardStatus[key];

          let bgClass = 'bg-[#818384]';
          if (status === 'correct') bgClass = 'bg-[#538d4e]';
          else if (status === 'present') bgClass = 'bg-[#b59f3b]';
          else if (status === 'absent') bgClass = 'bg-[#3a3a3c]';

          return (
            <button
              key={key}
              onClick={() => handleKeyPress(key)}
              className={`
                ${isSpecial ? 'px-3 sm:px-4 text-xs' : 'w-[32px] sm:w-[43px]'}
                h-[50px] sm:h-[58px]
                ${bgClass}
                text-white font-bold uppercase
                rounded
                flex items-center justify-center
                transition-colors
                hover:opacity-80
                active:opacity-60
              `}
              aria-label={key === 'BACK' ? 'Backspace' : key}
            >
              {key === 'BACK' ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z"
                  />
                </svg>
              ) : key}
            </button>
          );
        })}
      </div>
    ));
  };

  // Calculate win percentage
  const winPercentage = stats.gamesPlayed > 0
    ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100)
    : 0;

  // Get max distribution value for scaling the bars
  const maxDistribution = Math.max(...stats.guessDistribution, 1);

  return (
    <div className="w-full max-w-[500px] mx-auto select-none">
      {/* Language Selector */}
      <div className="flex justify-center gap-2 mb-6">
        <button
          onClick={() => handleLanguageChange('en')}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
            language === 'en'
              ? 'bg-[var(--accent)] text-white'
              : 'glass-card text-[var(--text-muted)] hover:text-[var(--text)]'
          }`}
          aria-pressed={language === 'en'}
        >
          🇬🇧 English
        </button>
        <button
          onClick={() => handleLanguageChange('es')}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
            language === 'es'
              ? 'bg-[var(--accent)] text-white'
              : 'glass-card text-[var(--text-muted)] hover:text-[var(--text)]'
          }`}
          aria-pressed={language === 'es'}
        >
          🇪🇸 Español
        </button>
      </div>

      {/* Hidden input for mobile keyboard (optional) */}
      <input
        ref={inputRef}
        type="text"
        className="sr-only"
        autoComplete="off"
        autoCapitalize="none"
        autoCorrect="off"
        aria-hidden="true"
      />

      {/* Error message */}
      {error && (
        <div className="text-center mb-4">
          <span className="inline-block px-4 py-2 bg-white text-black text-sm font-bold rounded">
            {error}
          </span>
        </div>
      )}

      {/* Game grid */}
      <div className="flex flex-col gap-1.5 mb-6" role="grid" aria-label="Word guess grid">
        {renderGrid()}
      </div>

      {/* Game over messages */}
      {gameStatus === 'won' && (
        <div className="text-center mb-4">
          <div className="inline-block px-4 py-2 bg-[var(--success)]/20 border border-[var(--success)]/30 rounded">
            <span className="text-[var(--success)] font-bold uppercase tracking-wider">
              {language === 'es'
                ? `¡Excelente! Lo lograste en ${guesses.length}!`
                : `Excellent! You got it in ${guesses.length}!`}
            </span>
          </div>
        </div>
      )}

      {gameStatus === 'lost' && (
        <div className="text-center mb-4">
          <div className="inline-block px-4 py-2 bg-[var(--error)]/20 border border-[var(--error)]/30 rounded">
            <span className="text-[var(--error)]">
              {language === 'es' ? 'La palabra era: ' : 'The word was: '}
              <span className="font-bold uppercase">{targetWord}</span>
            </span>
          </div>
        </div>
      )}

      {/* Share button when game is over */}
      {gameStatus !== 'playing' && (
        <div className="flex justify-center gap-3 mb-6">
          <ShareGame
            gameName="Word Guess"
            score={gameStatus === 'won' ? `${guesses.length}/6` : 'X/6'}
            scoreLabel="Game"
            customMessage={generateShareText()}
            className="flex-1"
          />
          <button
            onClick={() => setShowStats(true)}
            className="btn-secondary px-6 py-3"
          >
            {language === 'es' ? 'Estadísticas' : 'Statistics'}
          </button>
        </div>
      )}

      {/* Keyboard */}
      <div className="px-2" role="group" aria-label="Keyboard">
        {renderKeyboard()}
      </div>

      {/* Statistics Modal */}
      {showStats && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setShowStats(false)}
        >
          <div
            className="glass-card w-full max-w-[400px] p-6 rounded-lg"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold uppercase tracking-wider text-[var(--text)]">
                {language === 'es' ? 'Estadísticas' : 'Statistics'}
              </h2>
              <button
                onClick={() => setShowStats(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                aria-label={language === 'es' ? 'Cerrar estadísticas' : 'Close statistics'}
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-2 mb-6 text-center">
              <div>
                <div className="text-2xl font-bold text-[var(--text)]">{stats.gamesPlayed}</div>
                <div className="text-[0.625rem] text-[var(--text-muted)] uppercase">
                  {language === 'es' ? 'Jugadas' : 'Played'}
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-[var(--text)]">{winPercentage}</div>
                <div className="text-[0.625rem] text-[var(--text-muted)] uppercase">
                  {language === 'es' ? '% Victorias' : 'Win %'}
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-[var(--text)]">{stats.currentStreak}</div>
                <div className="text-[0.625rem] text-[var(--text-muted)] uppercase">
                  {language === 'es' ? 'Racha' : 'Current'}
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-[var(--text)]">{stats.maxStreak}</div>
                <div className="text-[0.625rem] text-[var(--text-muted)] uppercase">
                  {language === 'es' ? 'Máxima' : 'Max'}
                </div>
              </div>
            </div>

            {/* Guess Distribution */}
            <div className="mb-6">
              <h3 className="text-sm uppercase tracking-wider text-[var(--text-muted)] mb-3">
                {language === 'es' ? 'Distribución de Intentos' : 'Guess Distribution'}
              </h3>
              <div className="space-y-1">
                {stats.guessDistribution.map((count, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-[var(--text-muted)] w-3">{i + 1}</span>
                    <div
                      className={`h-5 flex items-center justify-end px-2 text-xs font-bold text-white rounded-sm ${
                        gameStatus === 'won' && guesses.length === i + 1
                          ? 'bg-[#538d4e]'
                          : 'bg-[#3a3a3c]'
                      }`}
                      style={{
                        minWidth: '1.5rem',
                        width: `${Math.max((count / maxDistribution) * 100, 7)}%`
                      }}
                    >
                      {count}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Next puzzle countdown - only show if game is over */}
            {gameStatus !== 'playing' && (
              <div className="text-center pt-4 border-t border-[var(--border)]">
                <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider">
                  {language === 'es'
                    ? 'Próximo puzzle a medianoche UTC'
                    : 'Next puzzle at midnight UTC'}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CSS for animations */}
      <style>{`
        @keyframes flip {
          0% {
            transform: rotateX(0);
          }
          50% {
            transform: rotateX(-90deg);
          }
          100% {
            transform: rotateX(0);
          }
        }

        .animate-flip {
          animation: flip 500ms ease-in-out;
          animation-fill-mode: backwards;
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }

        .animate-shake {
          animation: shake 500ms ease-in-out;
        }
      `}</style>
    </div>
  );
}
