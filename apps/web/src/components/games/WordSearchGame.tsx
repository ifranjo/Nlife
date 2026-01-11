import { useState, useEffect, useCallback, useRef } from 'react';
import ShareGame from './ShareGame';

// ============================================
// TYPES
// ============================================

type GameState = 'menu' | 'playing' | 'won';
type Difficulty = 'easy' | 'medium' | 'hard';
type Direction = 'horizontal' | 'vertical' | 'diagonal';

interface Word {
  text: string;
  found: boolean;
  positions: Array<[number, number]>;
  direction: Direction;
}

interface GameStats {
  time: number;
  wordsFound: number;
  totalWords: number;
}

interface Selection {
  start: [number, number] | null;
  end: [number, number] | null;
  cells: Array<[number, number]>;
}

// ============================================
// CONSTANTS
// ============================================

const DIFFICULTY_CONFIG = {
  easy: { size: 10, wordCount: 5 },
  medium: { size: 12, wordCount: 8 },
  hard: { size: 15, wordCount: 12 },
} as const;

const TECH_WORD_BANK: Record<Difficulty, string[]> = {
  easy: ['CODE', 'BUG', 'GIT', 'DEV', 'API', 'URL', 'APP', 'WEB'],
  medium: ['DEBUG', 'BUILD', 'TEST', 'DEPLOY', 'REACT', 'VUE', 'NODE', 'PYTHON', 'LINUX', 'BASH'],
  hard: ['DEVELOPER', 'JAVASCRIPT', 'FUNCTION', 'REFACTOR', 'ALGORITHM', 'DATABASE', 'ASYNCHRONOUS', 'OPTIMIZATION', 'ARCHITECTURE', 'INFRASTRUCTURE', 'MICROSERVICES', 'CONTINUOUS'],
};

// ============================================
// WORD SEARCH GAME
// ============================================

export default function WordSearchGame() {
  const [gameState, setGameState] = useState<GameState>('menu');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [grid, setGrid] = useState<string[][]>([]);
  const [words, setWords] = useState<Word[]>([]);
  const [selection, setSelection] = useState<Selection>({ start: null, end: null, cells: [] });
  const [stats, setStats] = useState<GameStats>({ time: 0, wordsFound: 0, totalWords: 0 });
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Generate a word search grid
  const generateGrid = useCallback((size: number, wordList: string[]) => {
    const newGrid: string[][] = Array(size).fill(null).map(() => Array(size).fill(''));
    const placedWords: Word[] = [];
    const directions: Direction[] = ['horizontal', 'vertical', 'diagonal'];

    // Try to place each word
    wordList.forEach((word) => {
      let placed = false;
      let attempts = 0;

      while (!placed && attempts < 100) {
        const direction = directions[Math.floor(Math.random() * directions.length)];
        const row = Math.floor(Math.random() * size);
        const col = Math.floor(Math.random() * size);

        if (canPlaceWord(newGrid, word, row, col, direction)) {
          placeWord(newGrid, word, row, col, direction);
          placedWords.push({
            text: word,
            found: false,
            positions: getWordPositions(word, row, col, direction),
            direction,
          });
          placed = true;
        }
        attempts++;
      }
    });

    // Fill empty cells with random letters
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        if (newGrid[row][col] === '') {
          newGrid[row][col] = String.fromCharCode(65 + Math.floor(Math.random() * 26));
        }
      }
    }

    return { grid: newGrid, words: placedWords };
  }, []);

  // Check if word can be placed
  const canPlaceWord = (grid: string[][], word: string, row: number, col: number, direction: Direction): boolean => {
    const size = grid.length;

    for (let i = 0; i < word.length; i++) {
      const r = row + (direction === 'vertical' || direction === 'diagonal' ? i : 0);
      const c = col + (direction === 'horizontal' || direction === 'diagonal' ? i : 0);

      if (r >= size || c >= size) return false;
      if (grid[r][c] !== '' && grid[r][c] !== word[i]) return false;
    }

    return true;
  };

  // Place word in grid
  const placeWord = (grid: string[][], word: string, row: number, col: number, direction: Direction) => {
    for (let i = 0; i < word.length; i++) {
      const r = row + (direction === 'vertical' || direction === 'diagonal' ? i : 0);
      const c = col + (direction === 'horizontal' || direction === 'diagonal' ? i : 0);
      grid[r][c] = word[i];
    }
  };

  // Get positions for a word
  const getWordPositions = (word: string, row: number, col: number, direction: Direction): Array<[number, number]> => {
    const positions: Array<[number, number]> = [];

    for (let i = 0; i < word.length; i++) {
      const r = row + (direction === 'vertical' || direction === 'diagonal' ? i : 0);
      const c = col + (direction === 'horizontal' || direction === 'diagonal' ? i : 0);
      positions.push([r, c]);
    }

    return positions;
  };

  // Start new game
  const startGame = useCallback((selectedDifficulty: Difficulty) => {
    const config = DIFFICULTY_CONFIG[selectedDifficulty];
    const wordList = TECH_WORD_BANK[selectedDifficulty];
    const selectedWords = wordList.slice(0, config.wordCount);
    const { grid: newGrid, words: newWords } = generateGrid(config.size, selectedWords);

    setGrid(newGrid);
    setWords(newWords);
    setGameState('playing');
    setDifficulty(selectedDifficulty);
    setSelection({ start: null, end: null, cells: [] });
    setStats({ time: 0, wordsFound: 0, totalWords: newWords.length });
  }, [generateGrid]);

  // Handle mouse down on cell
  const handleMouseDown = useCallback((row: number, col: number) => {
    if (gameState !== 'playing') return;

    setSelection({
      start: [row, col],
      end: [row, col],
      cells: [[row, col]],
    });
  }, [gameState]);

  // Handle mouse enter on cell (during selection)
  const handleMouseEnter = useCallback((row: number, col: number) => {
    if (gameState !== 'playing' || !selection.start) return;

    const startRow = selection.start[0];
    const startCol = selection.start[1];

    // Calculate all cells between start and current
    const cells: Array<[number, number]> = [];
    const minRow = Math.min(startRow, row);
    const maxRow = Math.max(startRow, row);
    const minCol = Math.min(startCol, col);
    const maxCol = Math.max(startCol, col);

    // Check if selection is valid (straight line)
    const isHorizontal = startRow === row;
    const isVertical = startCol === col;
    const isDiagonal = Math.abs(startRow - row) === Math.abs(startCol - col);

    if (isHorizontal) {
      for (let c = minCol; c <= maxCol; c++) {
        cells.push([row, c]);
      }
    } else if (isVertical) {
      for (let r = minRow; r <= maxRow; r++) {
        cells.push([r, col]);
      }
    } else if (isDiagonal) {
      const stepRow = row > startRow ? 1 : -1;
      const stepCol = col > startCol ? 1 : -1;
      let r = startRow;
      let c = startCol;

      while ((stepRow > 0 ? r <= row : r >= row) && (stepCol > 0 ? c <= col : c >= col)) {
        cells.push([r, c]);
        r += stepRow;
        c += stepCol;
      }
    }

    setSelection({
      start: selection.start,
      end: [row, col],
      cells,
    });
  }, [gameState, selection.start]);

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    if (gameState !== 'playing' || selection.cells.length === 0) return;

    // Check if selected cells form a word
    const selectedWord = selection.cells.map(([row, col]) => grid[row][col]).join('');
    const reversedWord = selectedWord.split('').reverse().join('');

    // Check both directions
    const foundWord = words.find(
      (word) => !word.found && (word.text === selectedWord || word.text === reversedWord)
    );

    if (foundWord) {
      // Mark word as found
      setWords(prev =>
        prev.map(w =>
          w.text === foundWord.text ? { ...w, found: true } : w
        )
      );

      setStats(prev => ({
        ...prev,
        wordsFound: prev.wordsFound + 1,
      }));
    }

    // Clear selection
    setSelection({ start: null, end: null, cells: [] });
  }, [gameState, selection, grid, words]);

  // Check win condition
  useEffect(() => {
    if (gameState === 'playing' && stats.wordsFound === stats.totalWords && stats.totalWords > 0) {
      setGameState('won');
      if (timer) clearInterval(timer);
    }
  }, [gameState, stats, timer]);

  // Timer
  useEffect(() => {
    if (gameState !== 'playing') return;

    const interval = setInterval(() => {
      setStats(prev => ({ ...prev, time: prev.time + 1 }));
    }, 1000);

    setTimer(interval);
    return () => clearInterval(interval);
  }, [gameState]);

  // Add event listeners for mouse up
  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseUp]);

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Check if cell is part of found word or selection
  const getCellState = (row: number, col: number) => {
    const isSelected = selection.cells.some(([r, c]) => r === row && c === col);
    const isFound = words.some(
      word => word.found && word.positions.some(([r, c]) => r === row && c === col)
    );

    if (isSelected) return 'selected';
    if (isFound) return 'found';
    return 'normal';
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto">
      {/* Game Controls */}
      <div className="flex justify-between items-center mb-4 glass-card p-4 rounded-lg">
        <div className="flex gap-6">
          <div>
            <div className="text-xs text-[var(--text-muted)] uppercase">Words</div>
            <div className="text-xl font-bold">
              {stats.wordsFound}/{stats.totalWords}
            </div>
          </div>
          <div>
            <div className="text-xs text-[var(--text-muted)] uppercase">Time</div>
            <div className="text-xl font-bold mono">{formatTime(stats.time)}</div>
          </div>
          <div>
            <div className="text-xs text-[var(--text-muted)] uppercase">Difficulty</div>
            <div className="text-xl font-bold capitalize">{difficulty}</div>
          </div>
        </div>

        {gameState === 'playing' && (
          <button
            onClick={() => startGame(difficulty)}
            className="btn-secondary px-4 py-2 text-sm"
          >
            New Game
          </button>
        )}
      </div>

      {/* Difficulty Selector */}
      {gameState === 'menu' && (
        <div className="glass-card p-6 rounded-lg mb-6">
          <h2 className="text-xl font-bold mb-4">Choose Difficulty</h2>
          <div className="grid grid-cols-3 gap-4">
            <button
              onClick={() => startGame('easy')}
              className="glass-card p-4 rounded-lg hover:bg-[var(--border)] transition-colors text-center"
            >
              <div className="text-2xl mb-2">🟢</div>
              <div className="font-bold">Easy</div>
              <div className="text-sm text-[var(--text-dim)]">10x10 grid, 5 words</div>
            </button>
            <button
              onClick={() => startGame('medium')}
              className="glass-card p-4 rounded-lg hover:bg-[var(--border)] transition-colors text-center"
            >
              <div className="text-2xl mb-2">🟡</div>
              <div className="font-bold">Medium</div>
              <div className="text-sm text-[var(--text-dim)]">12x12 grid, 8 words</div>
            </button>
            <button
              onClick={() => startGame('hard')}
              className="glass-card p-4 rounded-lg hover:bg-[var(--border)] transition-colors text-center"
            >
              <div className="text-2xl mb-2">🔴</div>
              <div className="font-bold">Hard</div>
              <div className="text-sm text-[var(--text-dim)]">15x15 grid, 12 words</div>
            </button>
          </div>
        </div>
      )}

      {/* Game Grid */}
      {(gameState === 'playing' || gameState === 'won') && (
        <div className="mb-6">
          <div
            ref={gridRef}
            className="inline-block bg-[#0a0a0a] p-4 rounded-lg border border-[var(--border)]"
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${grid.length}, 1fr)`,
              gap: '1px',
              backgroundColor: 'var(--border)',
            }}
            onMouseLeave={() => setSelection({ start: null, end: null, cells: [] })}
          >
            {grid.map((row, rowIndex) =>
              row.map((cell, colIndex) => {
                const state = getCellState(rowIndex, colIndex);
                let bgColor = '#0a0a0a';
                let color = 'var(--text)';
                let fontWeight = 'normal';

                if (state === 'selected') {
                  bgColor = '#3b82f6';
                  color = '#ffffff';
                  fontWeight = 'bold';
                } else if (state === 'found') {
                  bgColor = '#22c55e';
                  color = '#ffffff';
                  fontWeight = 'bold';
                }

                return (
                  <div
                    key={`${rowIndex}-${colIndex}`}
                    className="w-8 h-8 flex items-center justify-center cursor-pointer hover:bg-[var(--border)] transition-colors font-mono"
                    style={{
                      backgroundColor: bgColor,
                      color,
                      fontWeight,
                      userSelect: 'none',
                    }}
                    onMouseDown={() => handleMouseDown(rowIndex, colIndex)}
                    onMouseEnter={() => handleMouseEnter(rowIndex, colIndex)}
                  >
                    {cell}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Word List */}
      {(gameState === 'playing' || gameState === 'won') && (
        <div className="glass-card p-4 rounded-lg mb-6">
          <h3 className="font-bold mb-3">Find these tech words:</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {words.map((word, index) => (
              <div
                key={index}
                className={`font-mono text-sm p-2 rounded ${
                  word.found
                    ? 'bg-[var(--success)]/20 text-[var(--success)] line-through'
                    : 'bg-[var(--border)] text-[var(--text)]'
                }`}
              >
                {word.text}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Win Screen */}
      {gameState === 'won' && (
        <div className="glass-card p-6 rounded-lg">
          <h2 className="text-2xl font-bold text-center mb-4 text-[var(--success)]">
            🎉 All words found!
          </h2>

          <div className="text-center mb-6">
            <div className="text-lg text-[var(--text-dim)]">
              Completed in {formatTime(stats.time)}
            </div>
          </div>

          <div className="space-y-3">
            <ShareGame
              gameName="Word Search"
              score={stats.time}
              scoreLabel="Time"
              customMessage={`Found all ${stats.totalWords} tech words in ${formatTime(stats.time)}!\n\nCan you find them faster?`}
              className="w-full"
            />

            <button
              onClick={() => setGameState('menu')}
              className="btn-primary w-full"
            >
              Play Again
            </button>
          </div>
        </div>
      )}

      {/* Instructions */}
      {gameState === 'menu' && (
        <div className="mt-6 glass-card p-4 rounded-lg">
          <h3 className="font-bold mb-3">How to Play</h3>
          <ul className="space-y-2 text-sm text-[var(--text-dim)]">
            <li>• Click and drag to select letters and form words</li>
            <li>• Words can be horizontal, vertical, or diagonal</li>
            <li>• Find all the hidden tech-related words</li>
            <li>• Words can be forwards or backwards</li>
          </ul>
        </div>
      )}
    </div>
  );
}
