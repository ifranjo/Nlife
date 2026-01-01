import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import ShareGame from './ShareGame';

// ============================================
// WORD LISTS
// ============================================

const COMMON_WORDS = [
  // Top 200 most common English words
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'I',
  'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
  'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
  'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what',
  'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me',
  'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take',
  'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other',
  'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also',
  'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way',
  'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us',
  // Extended common words (300 more)
  'find', 'here', 'thing', 'tell', 'may', 'should', 'very', 'through', 'long', 'where',
  'much', 'before', 'need', 'right', 'still', 'mean', 'each', 'house', 'world', 'too',
  'own', 'feel', 'high', 'last', 'might', 'old', 'great', 'big', 'seem', 'start',
  'group', 'while', 'another', 'often', 'run', 'small', 'life', 'school', 'under', 'turn',
  'ask', 'keep', 'every', 'open', 'city', 'home', 'idea', 'hand', 'system', 'place',
  'end', 'never', 'call', 'help', 'become', 'move', 'live', 'night', 'read', 'point',
  'change', 'next', 'play', 'close', 'few', 'let', 'put', 'same', 'study', 'fact',
  'part', 'week', 'problem', 'late', 'number', 'between', 'state', 'child', 'begin', 'head',
  'side', 'show', 'power', 'water', 'story', 'young', 'word', 'kind', 'mother', 'write',
  'learn', 'father', 'country', 'name', 'again', 'always', 'develop', 'public', 'three', 'both',
  'eye', 'face', 'away', 'room', 'leave', 'money', 'follow', 'book', 'best', 'area',
  'line', 'business', 'present', 'door', 'sure', 'hour', 'government', 'question', 'company', 'until',
  'body', 'person', 'during', 'without', 'set', 'order', 'family', 'really', 'woman', 'bring',
  'program', 'member', 'city', 'form', 'case', 'service', 'interest', 'together', 'social', 'hear',
  'once', 'several', 'believe', 'month', 'hold', 'ago', 'early', 'today', 'course', 'perhaps',
  'almost', 'easy', 'enough', 'able', 'control', 'already', 'level', 'rather', 'market', 'ever',
  'stand', 'center', 'table', 'result', 'report', 'community', 'understand', 'sense', 'information', 'available',
  'different', 'experience', 'second', 'though', 'less', 'love', 'though', 'either', 'important', 'local',
  'example', 'today', 'reason', 'since', 'possible', 'education', 'light', 'police', 'matter', 'support',
  'morning', 'special', 'staff', 'certain', 'music', 'action', 'minute', 'white', 'black', 'political',
  'office', 'term', 'finally', 'across', 'themselves', 'value', 'whole', 'issue', 'among', 'ground',
  'offer', 'window', 'care', 'free', 'effect', 'data', 'later', 'strong', 'clear', 'practice',
  'board', 'common', 'remember', 'cut', 'rate', 'position', 'above', 'simple', 'along', 'computer',
  'paper', 'project', 'job', 'team', 'rule', 'art', 'break', 'peace', 'wait', 'type',
  'class', 'outside', 'likely', 'sometimes', 'quality', 'wrong', 'return', 'hard', 'future', 'space',
];

const PROGRAMMING_WORDS = [
  // Keywords and concepts
  'function', 'const', 'let', 'var', 'return', 'if', 'else', 'for', 'while', 'switch',
  'case', 'break', 'continue', 'default', 'try', 'catch', 'throw', 'finally', 'async', 'await',
  'class', 'extends', 'constructor', 'static', 'public', 'private', 'protected', 'interface', 'type', 'enum',
  'import', 'export', 'from', 'module', 'package', 'require', 'namespace', 'declare', 'typeof', 'instanceof',
  'new', 'delete', 'void', 'null', 'undefined', 'true', 'false', 'this', 'super', 'yield',
  // Data types
  'string', 'number', 'boolean', 'array', 'object', 'symbol', 'bigint', 'any', 'unknown', 'never',
  'integer', 'float', 'double', 'char', 'byte', 'long', 'short', 'unsigned', 'signed', 'pointer',
  // Common terms
  'variable', 'constant', 'parameter', 'argument', 'method', 'property', 'attribute', 'element', 'index', 'key',
  'value', 'pair', 'map', 'set', 'list', 'queue', 'stack', 'heap', 'tree', 'graph',
  'node', 'edge', 'vertex', 'root', 'leaf', 'branch', 'parent', 'child', 'sibling', 'ancestor',
  'loop', 'iteration', 'recursion', 'callback', 'promise', 'observable', 'stream', 'event', 'listener', 'handler',
  'component', 'module', 'service', 'controller', 'model', 'view', 'template', 'directive', 'decorator', 'annotation',
  'server', 'client', 'request', 'response', 'endpoint', 'route', 'middleware', 'header', 'body', 'query',
  'database', 'table', 'column', 'row', 'schema', 'migration', 'seed', 'index', 'foreign', 'primary',
  'api', 'rest', 'graphql', 'websocket', 'http', 'https', 'tcp', 'udp', 'socket', 'protocol',
  'debug', 'test', 'deploy', 'build', 'compile', 'bundle', 'minify', 'lint', 'format', 'refactor',
  'git', 'commit', 'push', 'pull', 'merge', 'branch', 'checkout', 'rebase', 'stash', 'clone',
  'docker', 'container', 'image', 'volume', 'network', 'compose', 'kubernetes', 'cluster', 'pod', 'service',
  'algorithm', 'complexity', 'runtime', 'memory', 'cache', 'buffer', 'thread', 'process', 'mutex', 'semaphore',
  'encrypt', 'decrypt', 'hash', 'salt', 'token', 'session', 'cookie', 'auth', 'oauth', 'jwt',
];

// ============================================
// TYPES
// ============================================

type GameMode = '15' | '30' | '60' | 'custom';
type WordMode = 'common' | 'programming' | 'custom';
type GameState = 'idle' | 'playing' | 'finished';

interface Stats {
  wpm: number;
  accuracy: number;
  correctChars: number;
  incorrectChars: number;
  totalChars: number;
  wordsTyped: number;
  errors: number;
}

interface LeaderboardEntry {
  wpm: number;
  accuracy: number;
  mode: string;
  wordMode: string;
  date: string;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const generateWords = (wordList: string[], count: number): string[] => {
  const shuffled = shuffleArray(wordList);
  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    result.push(shuffled[i % shuffled.length]);
  }
  return result;
};

const calculateWPM = (chars: number, timeSeconds: number): number => {
  // Standard: 5 characters = 1 word
  const words = chars / 5;
  const minutes = timeSeconds / 60;
  return Math.round(words / minutes);
};

const getWPMCategory = (wpm: number): { label: string; color: string; description: string } => {
  if (wpm < 30) return { label: 'Beginner', color: 'text-red-400', description: 'Keep practicing!' };
  if (wpm < 40) return { label: 'Average', color: 'text-yellow-400', description: 'Better than most!' };
  if (wpm < 60) return { label: 'Proficient', color: 'text-blue-400', description: 'Professional level' };
  if (wpm < 80) return { label: 'Fast', color: 'text-green-400', description: 'Excellent speed!' };
  if (wpm < 100) return { label: 'Expert', color: 'text-purple-400', description: 'Top 5% of typists' };
  return { label: 'Master', color: 'text-pink-400', description: 'Legendary speed!' };
};

// ============================================
// SOUND EFFECTS (optional)
// ============================================

class SoundManager {
  private audioContext: AudioContext | null = null;
  private enabled: boolean = false;

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (enabled && !this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  playKeypress() {
    if (!this.enabled || !this.audioContext) return;
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.05, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.05);
    oscillator.start();
    oscillator.stop(this.audioContext.currentTime + 0.05);
  }

  playError() {
    if (!this.enabled || !this.audioContext) return;
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    oscillator.frequency.value = 200;
    oscillator.type = 'sawtooth';
    gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
    oscillator.start();
    oscillator.stop(this.audioContext.currentTime + 0.1);
  }

  playComplete() {
    if (!this.enabled || !this.audioContext) return;
    const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5
    frequencies.forEach((freq, i) => {
      const oscillator = this.audioContext!.createOscillator();
      const gainNode = this.audioContext!.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext!.destination);
      oscillator.frequency.value = freq;
      oscillator.type = 'sine';
      const startTime = this.audioContext!.currentTime + i * 0.1;
      gainNode.gain.setValueAtTime(0.1, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.2);
      oscillator.start(startTime);
      oscillator.stop(startTime + 0.2);
    });
  }
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function TypingSpeedGame() {
  // Game state
  const [gameState, setGameState] = useState<GameState>('idle');
  const [gameMode, setGameMode] = useState<GameMode>('30');
  const [wordMode, setWordMode] = useState<WordMode>('common');
  const [customText, setCustomText] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  // Game data
  const [words, setWords] = useState<string[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentInput, setCurrentInput] = useState('');
  const [timeLeft, setTimeLeft] = useState(30);
  const [startTime, setStartTime] = useState<number | null>(null);

  // Stats tracking
  const [correctChars, setCorrectChars] = useState(0);
  const [incorrectChars, setIncorrectChars] = useState(0);
  const [wordsTyped, setWordsTyped] = useState(0);
  const [errors, setErrors] = useState(0);

  // UI state
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  // Refs
  const inputRef = useRef<HTMLInputElement>(null);
  const wordsContainerRef = useRef<HTMLDivElement>(null);
  const soundManager = useRef(new SoundManager());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load leaderboard from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('typing-speed-leaderboard');
    if (stored) {
      try {
        setLeaderboard(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to load leaderboard:', e);
      }
    }
  }, []);

  // Update sound manager
  useEffect(() => {
    soundManager.current.setEnabled(soundEnabled);
  }, [soundEnabled]);

  // Timer effect
  useEffect(() => {
    if (gameState !== 'playing') return;

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          endGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState]);

  // Get current word list
  const getWordList = useCallback((): string[] => {
    switch (wordMode) {
      case 'programming':
        return PROGRAMMING_WORDS;
      case 'custom':
        return customText.trim().split(/\s+/).filter(w => w.length > 0);
      default:
        return COMMON_WORDS;
    }
  }, [wordMode, customText]);

  // Initialize game
  const initGame = useCallback(() => {
    const wordList = getWordList();
    if (wordList.length === 0) {
      alert('Please enter some text for custom mode');
      return;
    }

    const wordCount = gameMode === 'custom' ? wordList.length : 200;
    const generatedWords = wordMode === 'custom'
      ? wordList
      : generateWords(wordList, wordCount);

    setWords(generatedWords);
    setCurrentWordIndex(0);
    setCurrentInput('');
    setCorrectChars(0);
    setIncorrectChars(0);
    setWordsTyped(0);
    setErrors(0);

    const seconds = gameMode === 'custom' ? 0 : parseInt(gameMode);
    setTimeLeft(seconds);
    setStartTime(Date.now());
    setGameState('playing');
    setShowCustomInput(false);

    setTimeout(() => inputRef.current?.focus(), 100);
  }, [gameMode, getWordList, wordMode]);

  // End game
  const endGame = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setGameState('finished');
    soundManager.current.playComplete();

    // Calculate final stats
    const totalChars = correctChars + incorrectChars;
    const elapsedSeconds = gameMode === 'custom'
      ? (Date.now() - (startTime || Date.now())) / 1000
      : parseInt(gameMode);
    const wpm = calculateWPM(correctChars, elapsedSeconds);
    const accuracy = totalChars > 0 ? Math.round((correctChars / totalChars) * 100) : 0;

    // Save to leaderboard
    const entry: LeaderboardEntry = {
      wpm,
      accuracy,
      mode: gameMode === 'custom' ? 'Custom' : `${gameMode}s`,
      wordMode: wordMode,
      date: new Date().toISOString()
    };

    const newLeaderboard = [...leaderboard, entry]
      .sort((a, b) => b.wpm - a.wpm)
      .slice(0, 10);

    setLeaderboard(newLeaderboard);
    localStorage.setItem('typing-speed-leaderboard', JSON.stringify(newLeaderboard));
  }, [correctChars, incorrectChars, gameMode, startTime, wordMode, leaderboard]);

  // Handle input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (gameState !== 'playing') return;

    const value = e.target.value;
    const currentWord = words[currentWordIndex];

    // Check if space was pressed (word completed)
    if (value.endsWith(' ')) {
      const typedWord = value.trim();

      if (typedWord === currentWord) {
        // Correct word
        setCorrectChars(prev => prev + currentWord.length + 1); // +1 for space
        setWordsTyped(prev => prev + 1);
        soundManager.current.playKeypress();
      } else {
        // Incorrect word
        let correct = 0;
        let incorrect = 0;
        for (let i = 0; i < Math.max(typedWord.length, currentWord.length); i++) {
          if (i < typedWord.length && i < currentWord.length && typedWord[i] === currentWord[i]) {
            correct++;
          } else {
            incorrect++;
          }
        }
        setCorrectChars(prev => prev + correct);
        setIncorrectChars(prev => prev + incorrect + 1); // +1 for space
        setErrors(prev => prev + 1);
        soundManager.current.playError();
      }

      // Move to next word
      if (currentWordIndex < words.length - 1) {
        setCurrentWordIndex(prev => prev + 1);
        setCurrentInput('');

        // Scroll to keep current word visible
        setTimeout(() => {
          const container = wordsContainerRef.current;
          const currentWordEl = container?.querySelector('.current-word');
          if (container && currentWordEl) {
            const containerRect = container.getBoundingClientRect();
            const wordRect = currentWordEl.getBoundingClientRect();
            if (wordRect.top > containerRect.top + containerRect.height * 0.5) {
              container.scrollTop += wordRect.height + 8;
            }
          }
        }, 0);
      } else {
        // All words completed
        endGame();
      }
    } else {
      setCurrentInput(value);
    }
  }, [gameState, words, currentWordIndex, endGame]);

  // Calculate current stats
  const currentStats = useMemo((): Stats => {
    const totalChars = correctChars + incorrectChars;
    const elapsedSeconds = startTime
      ? (Date.now() - startTime) / 1000
      : 1;
    const wpm = calculateWPM(correctChars, elapsedSeconds);
    const accuracy = totalChars > 0 ? Math.round((correctChars / totalChars) * 100) : 100;

    return {
      wpm,
      accuracy,
      correctChars,
      incorrectChars,
      totalChars,
      wordsTyped,
      errors
    };
  }, [correctChars, incorrectChars, wordsTyped, errors, startTime]);

  // Final stats (for finished state)
  const finalStats = useMemo((): Stats => {
    const totalChars = correctChars + incorrectChars;
    const elapsedSeconds = gameMode === 'custom'
      ? (startTime ? (Date.now() - startTime) / 1000 : 1)
      : parseInt(gameMode);
    const wpm = calculateWPM(correctChars, elapsedSeconds);
    const accuracy = totalChars > 0 ? Math.round((correctChars / totalChars) * 100) : 100;

    return {
      wpm,
      accuracy,
      correctChars,
      incorrectChars,
      totalChars,
      wordsTyped,
      errors
    };
  }, [correctChars, incorrectChars, wordsTyped, errors, gameMode, startTime]);

  // Generate shareable result
  const generateShareText = useCallback(() => {
    const { wpm, accuracy } = finalStats;
    const category = getWPMCategory(wpm);
    const modeLabel = gameMode === 'custom' ? 'Custom' : `${gameMode}s`;

    return `Typing Speed Test - ${modeLabel}

${category.label} Typist

WPM: ${wpm}
Accuracy: ${accuracy}%
Words: ${wordsTyped}

${wpm >= 60 ? '🔥' : wpm >= 40 ? '⚡' : '⌨️'} Can you beat my score?

Play at newlifesolutions.dev/games/typing-speed`;
  }, [finalStats, gameMode, wordsTyped]);

  // Restart game
  const restart = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setGameState('idle');
    setCurrentWordIndex(0);
    setCurrentInput('');
    setCorrectChars(0);
    setIncorrectChars(0);
    setWordsTyped(0);
    setErrors(0);
    setTimeLeft(parseInt(gameMode) || 30);
    setStartTime(null);
  }, [gameMode]);

  // Render word with character highlighting
  const renderWord = useCallback((word: string, index: number) => {
    const isCurrent = index === currentWordIndex;
    const isPast = index < currentWordIndex;
    const isFuture = index > currentWordIndex;

    if (isFuture) {
      return (
        <span key={index} className="text-[var(--text-muted)] mr-2">
          {word}
        </span>
      );
    }

    if (isPast) {
      return (
        <span key={index} className="text-[var(--text-dim)] mr-2 opacity-50">
          {word}
        </span>
      );
    }

    // Current word - show character-by-character highlighting
    return (
      <span key={index} className="current-word mr-2 relative">
        {word.split('').map((char, charIndex) => {
          const typedChar = currentInput[charIndex];
          let className = 'text-[var(--text)]';

          if (typedChar !== undefined) {
            if (typedChar === char) {
              className = 'text-[var(--success)]';
            } else {
              className = 'text-[var(--error)] bg-[var(--error)]/20';
            }
          }

          return (
            <span key={charIndex} className={className}>
              {char}
            </span>
          );
        })}
        {/* Extra typed characters (overflow) */}
        {currentInput.length > word.length && (
          <span className="text-[var(--error)] bg-[var(--error)]/20">
            {currentInput.slice(word.length)}
          </span>
        )}
        {/* Cursor */}
        <span className="animate-blink text-[var(--accent)]">|</span>
      </span>
    );
  }, [currentWordIndex, currentInput]);

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* IDLE STATE - Settings */}
      {gameState === 'idle' && (
        <div className="space-y-6">
          {/* Time Mode Selection */}
          <div className="glass-card p-6 rounded-lg">
            <h3 className="text-sm uppercase tracking-wider text-[var(--text-muted)] mb-4">
              Time Mode
            </h3>
            <div className="flex flex-wrap gap-2">
              {(['15', '30', '60'] as GameMode[]).map(mode => (
                <button
                  key={mode}
                  onClick={() => setGameMode(mode)}
                  className={`px-6 py-3 rounded-lg font-mono text-lg transition-all ${
                    gameMode === mode
                      ? 'bg-[var(--accent)] text-[var(--bg)] font-bold'
                      : 'glass-card hover:border-[var(--border-hover)]'
                  }`}
                >
                  {mode}s
                </button>
              ))}
              <button
                onClick={() => {
                  setGameMode('custom');
                  setShowCustomInput(true);
                }}
                className={`px-6 py-3 rounded-lg font-mono text-lg transition-all ${
                  gameMode === 'custom'
                    ? 'bg-[var(--accent)] text-[var(--bg)] font-bold'
                    : 'glass-card hover:border-[var(--border-hover)]'
                }`}
              >
                Custom
              </button>
            </div>
          </div>

          {/* Word Mode Selection */}
          <div className="glass-card p-6 rounded-lg">
            <h3 className="text-sm uppercase tracking-wider text-[var(--text-muted)] mb-4">
              Word Source
            </h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setWordMode('common')}
                className={`px-6 py-3 rounded-lg font-mono transition-all ${
                  wordMode === 'common'
                    ? 'bg-[var(--success)]/20 border border-[var(--success)] text-[var(--success)]'
                    : 'glass-card hover:border-[var(--border-hover)]'
                }`}
              >
                Common Words
              </button>
              <button
                onClick={() => setWordMode('programming')}
                className={`px-6 py-3 rounded-lg font-mono transition-all ${
                  wordMode === 'programming'
                    ? 'bg-[var(--success)]/20 border border-[var(--success)] text-[var(--success)]'
                    : 'glass-card hover:border-[var(--border-hover)]'
                }`}
              >
                Programming
              </button>
              <button
                onClick={() => {
                  setWordMode('custom');
                  setShowCustomInput(true);
                }}
                className={`px-6 py-3 rounded-lg font-mono transition-all ${
                  wordMode === 'custom'
                    ? 'bg-[var(--success)]/20 border border-[var(--success)] text-[var(--success)]'
                    : 'glass-card hover:border-[var(--border-hover)]'
                }`}
              >
                Custom Text
              </button>
            </div>
          </div>

          {/* Custom Text Input */}
          {showCustomInput && (
            <div className="glass-card p-6 rounded-lg">
              <h3 className="text-sm uppercase tracking-wider text-[var(--text-muted)] mb-4">
                Custom Text
              </h3>
              <textarea
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="Enter your custom text here..."
                className="w-full h-32 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg p-4 text-[var(--text)] font-mono text-sm resize-none focus:outline-none focus:border-[var(--accent)]"
              />
              <p className="text-xs text-[var(--text-muted)] mt-2">
                Words: {customText.trim().split(/\s+/).filter(w => w.length > 0).length}
              </p>
            </div>
          )}

          {/* Sound Toggle */}
          <div className="glass-card p-4 rounded-lg flex items-center justify-between">
            <span className="text-[var(--text-dim)]">Sound Effects</span>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
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

          {/* Start Button */}
          <button
            onClick={initGame}
            className="btn-primary w-full py-4 text-lg"
          >
            Start Typing Test
          </button>

          {/* Leaderboard */}
          {leaderboard.length > 0 && (
            <div className="glass-card p-6 rounded-lg">
              <h3 className="text-sm uppercase tracking-wider text-[var(--text-muted)] mb-4">
                Personal Best
              </h3>
              <div className="space-y-2">
                {leaderboard.slice(0, 5).map((entry, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 flex items-center justify-center bg-[var(--bg-hover)] rounded text-xs">
                        {i + 1}
                      </span>
                      <span className="font-mono text-lg text-[var(--text)]">{entry.wpm} WPM</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm text-[var(--text-dim)]">{entry.accuracy}%</span>
                      <span className="text-xs text-[var(--text-muted)] ml-2">{entry.mode}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* PLAYING STATE */}
      {gameState === 'playing' && (
        <div className="space-y-6">
          {/* Stats Bar */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Timer */}
              <div className="glass-card px-4 py-2 rounded-lg">
                <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Time</span>
                <div className={`text-2xl font-mono font-bold ${timeLeft <= 10 ? 'text-[var(--error)]' : 'text-[var(--text)]'}`}>
                  {timeLeft}s
                </div>
              </div>

              {/* WPM */}
              <div className="glass-card px-4 py-2 rounded-lg">
                <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider">WPM</span>
                <div className="text-2xl font-mono font-bold text-[var(--success)]">
                  {currentStats.wpm}
                </div>
              </div>

              {/* Accuracy */}
              <div className="glass-card px-4 py-2 rounded-lg hidden sm:block">
                <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Accuracy</span>
                <div className="text-2xl font-mono font-bold text-[var(--text)]">
                  {currentStats.accuracy}%
                </div>
              </div>
            </div>

            {/* Restart Button */}
            <button
              onClick={restart}
              className="btn-secondary px-4 py-2"
            >
              Restart
            </button>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-1 bg-[var(--border)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--accent)] transition-all duration-300"
              style={{
                width: `${((parseInt(gameMode) - timeLeft) / parseInt(gameMode)) * 100}%`
              }}
            />
          </div>

          {/* Words Display */}
          <div
            ref={wordsContainerRef}
            className="glass-card p-6 rounded-lg h-48 overflow-hidden"
          >
            <div className="text-xl leading-relaxed font-mono select-none">
              {words.slice(Math.max(0, currentWordIndex - 10), currentWordIndex + 50).map((word, i) =>
                renderWord(word, Math.max(0, currentWordIndex - 10) + i)
              )}
            </div>
          </div>

          {/* Hidden Input */}
          <input
            ref={inputRef}
            type="text"
            value={currentInput}
            onChange={handleInputChange}
            className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg p-4 text-xl font-mono text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
            placeholder="Start typing..."
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
          />

          {/* Errors indicator */}
          {errors > 0 && (
            <div className="text-center text-sm text-[var(--text-muted)]">
              Errors: <span className="text-[var(--error)]">{errors}</span>
            </div>
          )}
        </div>
      )}

      {/* FINISHED STATE */}
      {gameState === 'finished' && (
        <div className="space-y-6">
          {/* Main Result */}
          <div className="glass-card p-8 rounded-lg text-center">
            <div className="mb-4">
              <span className={`text-sm uppercase tracking-wider ${getWPMCategory(finalStats.wpm).color}`}>
                {getWPMCategory(finalStats.wpm).label}
              </span>
            </div>
            <div className="text-6xl font-mono font-bold text-[var(--text)] mb-2">
              {finalStats.wpm}
            </div>
            <div className="text-xl text-[var(--text-muted)]">
              Words Per Minute
            </div>
            <p className="mt-2 text-sm text-[var(--text-dim)]">
              {getWPMCategory(finalStats.wpm).description}
            </p>
          </div>

          {/* Detailed Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="glass-card p-4 rounded-lg text-center">
              <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Accuracy</div>
              <div className="text-2xl font-mono font-bold text-[var(--text)]">{finalStats.accuracy}%</div>
            </div>
            <div className="glass-card p-4 rounded-lg text-center">
              <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Words</div>
              <div className="text-2xl font-mono font-bold text-[var(--text)]">{wordsTyped}</div>
            </div>
            <div className="glass-card p-4 rounded-lg text-center">
              <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Characters</div>
              <div className="text-2xl font-mono font-bold text-[var(--text)]">{finalStats.totalChars}</div>
            </div>
            <div className="glass-card p-4 rounded-lg text-center">
              <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Errors</div>
              <div className="text-2xl font-mono font-bold text-[var(--error)]">{errors}</div>
            </div>
          </div>

          {/* Comparison Chart */}
          <div className="glass-card p-6 rounded-lg">
            <h3 className="text-sm uppercase tracking-wider text-[var(--text-muted)] mb-4">
              How You Compare
            </h3>
            <div className="space-y-3">
              {[
                { label: 'Beginner', wpm: 30, color: 'bg-red-400' },
                { label: 'Average', wpm: 40, color: 'bg-yellow-400' },
                { label: 'Proficient', wpm: 60, color: 'bg-blue-400' },
                { label: 'Fast', wpm: 80, color: 'bg-green-400' },
                { label: 'Expert', wpm: 100, color: 'bg-purple-400' },
              ].map((level) => (
                <div key={level.label} className="relative">
                  <div className="flex justify-between text-xs text-[var(--text-dim)] mb-1">
                    <span>{level.label}</span>
                    <span>{level.wpm} WPM</span>
                  </div>
                  <div className="h-2 bg-[var(--border)] rounded-full overflow-hidden">
                    <div
                      className={`h-full ${level.color} rounded-full transition-all`}
                      style={{ width: `${Math.min(100, (level.wpm / 100) * 100)}%` }}
                    />
                  </div>
                  {/* Your position marker */}
                  {finalStats.wpm >= level.wpm - 10 && finalStats.wpm < level.wpm + 10 && (
                    <div
                      className="absolute top-0 w-0.5 h-full bg-white"
                      style={{ left: `${Math.min(100, (finalStats.wpm / 100) * 100)}%` }}
                    />
                  )}
                </div>
              ))}
              {/* Your result indicator */}
              <div className="mt-4 pt-4 border-t border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-[var(--accent)] rounded-full"></div>
                  <span className="text-sm text-[var(--text)]">
                    You: {finalStats.wpm} WPM
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <ShareGame
              gameName="Typing Speed"
              score={`${finalStats.wpm} WPM`}
              scoreLabel="WPM"
              customMessage={generateShareText()}
              className="flex-1"
            />
            <button
              onClick={initGame}
              className="btn-primary flex-1 py-3"
            >
              Play Again
            </button>
          </div>
        </div>
      )}

      {/* Cursor blink animation */}
      <style>{`
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
        .animate-blink {
          animation: blink 1s infinite;
        }
      `}</style>
    </div>
  );
}
