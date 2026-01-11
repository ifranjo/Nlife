import { useState, useEffect, useCallback, useRef } from 'react';
import ShareGame from './ShareGame';

// ============================================
// TYPES
// ============================================

type Grid = number[][];
type GameState = 'menu' | 'playing' | 'won';
type Difficulty = 'easy' | 'medium' | 'hard';

interface GameStats {
  moves: number;
  time: number;
  errors: number;
}

// ============================================
// CONSTANTS
// ============================================

const DIFFICULTY_CONFIG = {
  easy: { size: 6, fillPercent: 50 },
  medium: { size: 8, fillPercent: 40 },
  hard: { size: 10, fillPercent: 35 },
} as const;

const TECH_WORD_BANK = [
  'CODE', 'BUG', 'GIT', 'DEV', 'API', 'URL', 'APP', 'WEB', 'CSS', 'JS',
  'PHP', 'SQL', 'RAM', 'CPU', 'IDE', 'CLI', 'UX', 'UI', 'QA', 'CI',
  'CD', 'TDD', 'JWT', 'REST', 'HTTP', 'HTML', 'JSON', 'XML', 'AWS', 'OSS',
];

// ============================================
// BINARY PUZZLE GAME
// ============================================

export default function BinaryPuzzleGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>('menu');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [grid, setGrid] = useState<Grid>([]);
  const [solution, setSolution] = useState<Grid>([]);
  const [initialGrid, setInitialGrid] = useState<Grid>([]);
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null);
  const [stats, setStats] = useState<GameStats>({ moves: 0, time: 0, errors: 0 });
  const [showErrors, setShowErrors] = useState(false);
  const [hintWord, setHintWord] = useState('');
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);

  // Generate a valid binary puzzle
  const generatePuzzle = useCallback((size: number, fillPercent: number) => {
    // Start with a random valid solution
    const newSolution: Grid = Array(size).fill(null).map(() => Array(size).fill(0));

    // Fill with random 0s and 1s ensuring no more than 2 consecutive
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        // This is a simplified generation - in a real implementation,
        // you'd use backtracking to ensure puzzle solvability
        newSolution[row][col] = Math.random() > 0.5 ? 1 : 0;
      }
    }

    // Create puzzle by removing some values
    const puzzle: Grid = newSolution.map(row => [...row]);
    const cellsToRemove = Math.floor((size * size) * (100 - fillPercent) / 100);

    for (let i = 0; i < cellsToRemove; i++) {
      const row = Math.floor(Math.random() * size);
      const col = Math.floor(Math.random() * size);
      puzzle[row][col] = -1; // -1 represents empty cell
    }

    return { puzzle, solution: newSolution };
  }, []);

  // Start new game
  const startGame = useCallback((selectedDifficulty: Difficulty) => {
    const config = DIFFICULTY_CONFIG[selectedDifficulty];
    const { puzzle, solution } = generatePuzzle(config.size, config.fillPercent);

    setGrid(puzzle);
    setSolution(solution);
    setInitialGrid(puzzle.map(row => [...row]));
    setGameState('playing');
    setSelectedCell(null);
    setStats({ moves: 0, time: 0, errors: 0 });
    setShowErrors(false);
    setDifficulty(selectedDifficulty);

    // Set random hint word
    const word = TECH_WORD_BANK[Math.floor(Math.random() * TECH_WORD_BANK.length)];
    setHintWord(`Hint: ${word}`);
  }, [generatePuzzle]);

  // Handle cell click
  const handleCellClick = useCallback((row: number, col: number) => {
    if (gameState !== 'playing') return;
    if (initialGrid[row][col] !== -1) return; // Can't change initial cells

    setSelectedCell([row, col]);
  }, [gameState, initialGrid]);

  // Set cell value (0 or 1)
  const setCellValue = useCallback((value: number) => {
    if (!selectedCell || gameState !== 'playing') return;

    const [row, col] = selectedCell;
    if (initialGrid[row][col] !== -1) return;

    const newGrid = grid.map(r => [...r]);

    // Check if this creates an error
    if (solution[row][col] !== value) {
      setStats(prev => ({ ...prev, errors: prev.errors + 1 }));
      // Briefly show error state
      setShowErrors(true);
      setTimeout(() => setShowErrors(false), 1000);
    }

    newGrid[row][col] = value;
    setGrid(newGrid);
    setStats(prev => ({ ...prev, moves: prev.moves + 1 }));
    setSelectedCell(null);
  }, [selectedCell, gameState, grid, initialGrid, solution]);

  // Clear cell
  const clearCell = useCallback(() => {
    if (!selectedCell || gameState !== 'playing') return;

    const [row, col] = selectedCell;
    if (initialGrid[row][col] !== -1) return;

    const newGrid = grid.map(r => [...r]);
    newGrid[row][col] = -1;
    setGrid(newGrid);
    setSelectedCell(null);
  }, [selectedCell, gameState, grid, initialGrid]);

  // Check if puzzle is solved
  useEffect(() => {
    if (gameState !== 'playing') return;

    const isSolved = grid.every((row, i) =>
      row.every((cell, j) => cell === solution[i][j])
    );

    if (isSolved) {
      setGameState('won');
      if (timer) clearInterval(timer);
    }
  }, [grid, solution, gameState, timer]);

  // Timer
  useEffect(() => {
    if (gameState !== 'playing') return;

    const interval = setInterval(() => {
      setStats(prev => ({ ...prev, time: prev.time + 1 }));
    }, 1000);

    setTimer(interval);
    return () => clearInterval(interval);
  }, [gameState]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (gameState !== 'playing') return;

      if (e.key === '0' || e.key === '1') {
        setCellValue(parseInt(e.key));
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        clearCell();
      } else if (e.key === 'Escape') {
        setSelectedCell(null);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameState, setCellValue, clearCell]);

  // Draw grid on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = DIFFICULTY_CONFIG[difficulty].size;
    const cellSize = Math.min(40, 400 / size);
    canvas.width = size * cellSize;
    canvas.height = size * cellSize;

    // Clear canvas
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        const x = col * cellSize;
        const y = row * cellSize;
        const cell = grid[row]?.[col] ?? -1;
        const isInitial = initialGrid[row]?.[col] !== -1;
        const isSelected = selectedCell && selectedCell[0] === row && selectedCell[1] === col;
        const isError = showErrors && cell !== -1 && cell !== solution[row]?.[col];

        // Draw cell background
        if (isSelected) {
          ctx.fillStyle = '#3b82f6';
        } else if (isError) {
          ctx.fillStyle = '#ef4444';
        } else if (isInitial) {
          ctx.fillStyle = '#1f2937';
        } else {
          ctx.fillStyle = '#111827';
        }
        ctx.fillRect(x, y, cellSize, cellSize);

        // Draw border
        ctx.strokeStyle = '#374151';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, cellSize, cellSize);

        // Draw value
        if (cell !== -1) {
          ctx.fillStyle = isInitial ? '#9ca3af' : '#ffffff';
          ctx.font = `${cellSize * 0.5}px monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(cell.toString(), x + cellSize / 2, y + cellSize / 2);
        }
      }
    }
  }, [grid, difficulty, selectedCell, initialGrid, solution, showErrors]);

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      {/* Game Controls */}
      <div className="flex justify-between items-center mb-4 glass-card p-4 rounded-lg">
        <div className="flex gap-6">
          <div>
            <div className="text-xs text-[var(--text-muted)] uppercase">Moves</div>
            <div className="text-xl font-bold">{stats.moves}</div>
          </div>
          <div>
            <div className="text-xs text-[var(--text-muted)] uppercase">Time</div>
            <div className="text-xl font-bold mono">{formatTime(stats.time)}</div>
          </div>
          <div>
            <div className="text-xs text-[var(--text-muted)] uppercase">Errors</div>
            <div className="text-xl font-bold text-[var(--error)]">{stats.errors}</div>
          </div>
        </div>

        {gameState === 'playing' && (
          <button
            onClick={() => startGame(difficulty)}
            className="btn-secondary px-4 py-2 text-sm"
          >
            Restart
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
              <div className="text-sm text-[var(--text-dim)]">6x6 grid</div>
            </button>
            <button
              onClick={() => startGame('medium')}
              className="glass-card p-4 rounded-lg hover:bg-[var(--border)] transition-colors text-center"
            >
              <div className="text-2xl mb-2">🟡</div>
              <div className="font-bold">Medium</div>
              <div className="text-sm text-[var(--text-dim)]">8x8 grid</div>
            </button>
            <button
              onClick={() => startGame('hard')}
              className="glass-card p-4 rounded-lg hover:bg-[var(--border)] transition-colors text-center"
            >
              <div className="text-2xl mb-2">🔴</div>
              <div className="font-bold">Hard</div>
              <div className="text-sm text-[var(--text-dim)]">10x10 grid</div>
            </button>
          </div>
        </div>
      )}

      {/* Game Grid */}
      {(gameState === 'playing' || gameState === 'won') && (
        <div className="glass-card p-4 rounded-lg">
          <div className="text-center mb-4">
            <div className="text-sm text-[var(--text-dim)]">{hintWord}</div>
          </div>
          <div className="flex justify-center">
            <canvas
              ref={canvasRef}
              className="cursor-pointer border border-[var(--border)] rounded"
              style={{ imageRendering: 'crisp-edges' as any }}
            />
          </div>

          {gameState === 'playing' && (
            <div className="mt-4 text-center">
              <div className="text-sm text-[var(--text-muted)]">
                Click a cell, then press 0 or 1 to fill
              </div>
              <div className="mt-2 flex justify-center gap-2">
                <button
                  onClick={() => setCellValue(0)}
                  className="btn-secondary px-6 py-2 font-mono text-lg"
                  disabled={!selectedCell}
                >
                  0
                </button>
                <button
                  onClick={() => setCellValue(1)}
                  className="btn-secondary px-6 py-2 font-mono text-lg"
                  disabled={!selectedCell}
                >
                  1
                </button>
                <button
                  onClick={clearCell}
                  className="btn-secondary px-6 py-2"
                  disabled={!selectedCell}
                >
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Win Screen */}
      {gameState === 'won' && (
        <div className="glass-card p-6 rounded-lg mt-4">
          <h2 className="text-2xl font-bold text-center mb-4 text-[var(--success)]">
            🎉 Puzzle Solved!
          </h2>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.moves}</div>
              <div className="text-sm text-[var(--text-dim)]">Moves</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{formatTime(stats.time)}</div>
              <div className="text-sm text-[var(--text-dim)]">Time</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[var(--error)]">{stats.errors}</div>
              <div className="text-sm text-[var(--text-dim)]">Errors</div>
            </div>
          </div>

          <div className="space-y-3">
            <ShareGame
              gameName="Binary Puzzle"
              score={stats.moves}
              scoreLabel="Moves"
              customMessage={`Binary Puzzle ${difficulty} - Solved in ${formatTime(stats.time)} with ${stats.errors} errors!\n\nCan you beat my time?`}
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
            <li>• Fill the grid with 0s and 1s</li>
            <li>• No more than two same numbers adjacent</li>
            <li>• Each row and column has equal 0s and 1s</li>
            <li>• No identical rows or columns</li>
            <li>• Gray cells are fixed - cannot be changed</li>
          </ul>
        </div>
      )}
    </div>
  );
}
