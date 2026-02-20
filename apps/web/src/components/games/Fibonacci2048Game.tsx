import { useState, useEffect, useCallback, useRef } from 'react';
import ShareGame from './ShareGame';

// ============================================
// TYPES
// ============================================

type GameState = 'menu' | 'playing' | 'won' | 'lost';
type Tile = {
  value: number;
  position: [number, number];
  id: number;
  isNew?: boolean;
  isMerged?: boolean;
};

type Board = (Tile | null)[][];
type Direction = 'up' | 'down' | 'left' | 'right';

interface GameStats {
  score: number;
  bestTile: number;
  moves: number;
  time: number;
}

// ============================================
// CONSTANTS
// ============================================

const FIBONACCI_SEQUENCE = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584, 4181, 6765];

const TILE_COLORS: Record<number, string> = {
  1: '#111827',
  2: '#1e1e2e',
  3: '#2d1b69',
  5: '#312e81',
  8: '#1e40af',
  13: '#164e63',
  21: '#166534',
  34: '#a16207',
  55: '#854d0e',
  89: '#7c2d12',
  144: '#7c3aed',
  233: '#ec4899',
  377: '#e11d48',
  610: '#0ea5e9',
  987: '#10b981',
  1597: '#f59e0b',
  2584: '#ef4444',
  4181: '#8b5cf6',
};

// ============================================
// 2048 FIBONACCI GAME
// ============================================

export default function Fibonacci2048Game() {
  const [gameState, setGameState] = useState<GameState>('menu');
  const [board, setBoard] = useState<Board>([]);
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [stats, setStats] = useState<GameStats>({ score: 0, bestTile: 0, moves: 0, time: 0 });
  const [highScore, setHighScore] = useState(0);
  const [tileIdCounter, setTileIdCounter] = useState(0);
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);

  // Load high score
  useEffect(() => {
    const stored = localStorage.getItem('fibonacci2048-highscore');
    if (stored) setHighScore(parseInt(stored, 10));
  }, []);

  // Initialize empty board
  const initializeBoard = useCallback(() => {
    const newBoard: Board = Array(4).fill(null).map(() => Array(4).fill(null));
    setBoard(newBoard);
    return newBoard;
  }, []);

  // Generate new tile value (usually 1, sometimes 2)
  const generateTileValue = () => {
    return Math.random() < 0.9 ? 1 : 2;
  };

  // Add new random tile
  const addRandomTile = useCallback((currentBoard: Board) => {
    const emptyCells: [number, number][] = [];

    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        if (!currentBoard[i][j]) {
          emptyCells.push([i, j]);
        }
      }
    }

    if (emptyCells.length === 0) return currentBoard;

    const [row, col] = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    const value = generateTileValue();
    const newTile: Tile = {
      id: tileIdCounter,
      value,
      position: [row, col],
      isNew: true,
    };

    setTileIdCounter(prev => prev + 1);
    const newBoard = currentBoard.map(r => [...r]);
    newBoard[row][col] = newTile;

    return newBoard;
  }, [tileIdCounter]);

  // Start new game
  const startGame = useCallback(() => {
    const newBoard = initializeBoard();
    let boardWithTiles = addRandomTile(newBoard);
    boardWithTiles = addRandomTile(boardWithTiles);

    setBoard(boardWithTiles);
    setGameState('playing');
    setStats({ score: 0, bestTile: 0, moves: 0, time: 0 });
    setTiles([]);
  }, [initializeBoard, addRandomTile]);

  // Check and update best tile
  const updateBestTile = useCallback((value: number) => {
    setStats(prev => {
      if (value > prev.bestTile) {
        return { ...prev, bestTile: value };
      }
      return prev;
    });
  }, []);

  // Merge tiles in Fibonacci sequence
  const mergeFibonacci = useCallback((line: Tile[]): Tile[] => {
    const nonNull = line.filter(Boolean) as Tile[];
    const merged: Tile[] = [];
    let i = 0;

    while (i < nonNull.length) {
      if (i + 1 < nonNull.length) {
        const sum = nonNull[i].value + nonNull[i + 1].value;
        const nextIndex = FIBONACCI_SEQUENCE.indexOf(sum);

        // Check if sum is in Fibonacci sequence
        if (nextIndex !== -1) {
          const newTile: Tile = {
            id: tileIdCounter + merged.length,
            value: sum,
            position: [0, 0], // Will be updated
            isMerged: true,
          };
          merged.push(newTile);
          setTileIdCounter(prev => prev + 1);
          updateBestTile(sum);
          setStats(prev => ({ ...prev, score: prev.score + sum }));
          i += 2;
          continue;
        }
      }
      merged.push({ ...nonNull[i] });
      i++;
    }

    return merged;
  }, [tileIdCounter, updateBestTile]);

  // Move tiles in direction
  const move = useCallback((direction: Direction) => {
    if (gameState !== 'playing') return false;

    let newBoard = board.map(r => [...r]);
    let hasMoved = false;

    const moveLine = (line: Tile[]): Tile[] => {
      const nonNull = line.filter(Boolean) as Tile[];
      const merged = mergeFibonacci(line);
      return [...merged, ...Array(4 - merged.length).fill(null)];
    };

    if (direction === 'left' || direction === 'right') {
      for (let i = 0; i < 4; i++) {
        const line = direction === 'left' ? newBoard[i] : [...newBoard[i]].reverse();
        const newLine = moveLine(line);
        newBoard[i] = direction === 'left' ? newLine : newLine.reverse();
        if (JSON.stringify(newBoard[i]) !== JSON.stringify(board[i])) hasMoved = true;
      }
    } else {
      for (let j = 0; j < 4; j++) {
        const line: Tile[] = [];
        for (let i = 0; i < 4; i++) {
          line.push(direction === 'up' ? newBoard[i][j] : newBoard[3 - i][j]);
        }
        const newLine = moveLine(line);
        for (let i = 0; i < 4; i++) {
          if (direction === 'up') {
            newBoard[i][j] = newLine[i];
          } else {
            newBoard[3 - i][j] = newLine[i];
          }
        }
      }
    }

    if (hasMoved) {
      const boardWithNewTile = addRandomTile(newBoard);
      setBoard(boardWithNewTile);
      setStats(prev => ({ ...prev, moves: prev.moves + 1 }));
      return true;
    }

    return false;
  }, [board, gameState, addRandomTile, mergeFibonacci]);

  // Check for game over
  const checkGameOver = useCallback((currentBoard: Board) => {
    // Check if there are empty cells
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        if (!currentBoard[i][j]) return false;
      }
    }

    // Check for possible merges
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        const value = currentBoard[i][j]?.value;
        if (!value) continue;

        // Check adjacent cells for possible Fibonacci sum
        const directions = [
          [i - 1, j], [i + 1, j], [i, j - 1], [i, j + 1]
        ];

        for (const [ni, nj] of directions) {
          if (ni >= 0 && ni < 4 && nj >= 0 && nj < 4) {
            const neighborValue = currentBoard[ni][nj]?.value;
            if (neighborValue) {
              const sum = value + neighborValue;
              if (FIBONACCI_SEQUENCE.includes(sum)) return false;
            }
          }
        }
      }
    }

    return true;
  }, []);

  // Check for win condition
  const checkWin = useCallback((currentBoard: Board) => {
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        const tile = currentBoard[i][j];
        if (tile && tile.value >= 144) { // Win at 144 (F12)
          return true;
        }
      }
    }
    return false;
  }, []);

  // Check game state after move
  useEffect(() => {
    if (gameState === 'playing') {
      setTiles(board.flat().filter(Boolean) as Tile[]);

      if (checkWin(board)) {
        setGameState('won');
        if (timer) clearInterval(timer);
      } else if (checkGameOver(board)) {
        setGameState('lost');
        if (timer) clearInterval(timer);
      }
    }
  }, [board, gameState, checkWin, checkGameOver, timer]);

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

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
          move('up');
          break;
        case 'ArrowDown':
        case 's':
          move('down');
          break;
        case 'ArrowLeft':
        case 'a':
          move('left');
          break;
        case 'ArrowRight':
        case 'd':
          move('right');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameState, move]);

  // Touch controls
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (gameState !== 'playing') return;
    touchStart.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (gameState !== 'playing' || !touchStart.current) return;

    const deltaX = e.changedTouches[0].clientX - touchStart.current.x;
    const deltaY = e.changedTouches[0].clientY - touchStart.current.y;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      move(deltaX > 0 ? 'right' : 'left');
    } else {
      move(deltaY > 0 ? 'down' : 'up');
    }

    touchStart.current = null;
  };

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Get tile color
  const getTileColor = (value: number) => {
    return TILE_COLORS[value] || '#6b7280';
  };

  // Get tile size
  const getTileSize = () => {
    // Responsive sizing
    if (typeof window !== 'undefined') {
      return Math.min(80, (window.innerWidth - 80) / 4);
    }
    return 80;
  };

  return (
    <div className="relative w-full max-w-md mx-auto">
      {/* Game Controls */}
      <div className="flex justify-between items-center mb-4 glass-card p-4 rounded-lg">
        <div className="flex gap-6">
          <div>
            <div className="text-xs text-[var(--text-muted)] uppercase">Score</div>
            <div className="text-xl font-bold">{stats.score}</div>
          </div>
          <div>
            <div className="text-xs text-[var(--text-muted)] uppercase">Best</div>
            <div className="text-xl font-bold text-[var(--text-dim)]">{highScore}</div>
          </div>
          <div>
            <div className="text-xs text-[var(--text-muted)] uppercase">Moves</div>
            <div className="text-xl font-bold">{stats.moves}</div>
          </div>
          <div>
            <div className="text-xs text-[var(--text-muted)] uppercase">Time</div>
            <div className="text-xl font-bold mono">{formatTime(stats.time)}</div>
          </div>
        </div>

        {gameState === 'playing' && (
          <button
            onClick={startGame}
            className="btn-secondary px-3 py-1 text-sm"
          >
            New Game
          </button>
        )}
      </div>

      {/* Best Tile Display */}
      {stats.bestTile > 1 && (
        <div className="glass-card p-2 rounded-lg text-center mb-4">
          <div className="text-xs text-[var(--text-muted)] uppercase">Best Tile</div>
          <div className="text-2xl font-bold" style={{ color: getTileColor(stats.bestTile) }}>
            {stats.bestTile}
          </div>
        </div>
      )}

      {/* Game Board */}
      <div
        className="relative bg-[#0a0a0a] p-2 rounded-lg border border-[var(--border)] select-none"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="grid gap-2 mx-auto"
          style={{
            gridTemplateColumns: 'repeat(4, 1fr)',
            width: 'fit-content',
          }}
        >
          {board.map((row, i) =>
            row.map((cell, j) => {
              const size = getTileSize();
              return (
                <div
                  key={`${i}-${j}`}
                  className="rounded-lg transition-all duration-150 flex items-center justify-center font-bold text-white"
                  style={{
                    width: size,
                    height: size,
                    backgroundColor: cell ? getTileColor(cell.value) : 'rgba(255, 255, 255, 0.1)',
                    boxShadow: cell ? '0 4px 8px rgba(0, 0, 0, 0.3)' : 'none',
                    transform: cell?.isNew ? 'scale(0)' : cell?.isMerged ? 'scale(1.1)' : 'scale(1)',
                    fontSize: cell ? Math.min(size / 3, 32) : 24,
                  }}
                >
                  {cell?.value || ''}
                </div>
              );
            })
          )}
        </div>

        {/* Game Over Overlay */}
        {gameState === 'won' && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center rounded-lg">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-[var(--success)] mb-4">🎉 You Won!</h2>
              <p className="text-lg text-white mb-6">You reached {stats.bestTile}!</p>
              <button
                onClick={startGame}
                className="btn-primary px-6 py-3"
              >
                Play Again
              </button>
            </div>
          </div>
        )}

        {gameState === 'lost' && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center rounded-lg">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-[var(--error)] mb-4">Game Over</h2>
              <p className="text-lg text-white mb-2">Final Score: {stats.score}</p>
              <p className="text-[var(--text-dim)] mb-6">Best Tile: {stats.bestTile}</p>
              <button
                onClick={startGame}
                className="btn-primary px-6 py-3"
              >
                Try Again
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Controls Help */}
      {gameState === 'playing' && (
        <div className="mt-6 glass-card p-4 rounded-lg text-center">
          <h3 className="font-bold mb-2">How to Play</h3>
          <p className="text-sm text-[var(--text-dim)] mb-3">
            Use arrow keys or WASD to move tiles. Merge matching Fibonacci numbers!
          </p>
          <div className="flex justify-center gap-2 text-xs">
            <kbd className="px-2 py-1 bg-[var(--border)] rounded">↑</kbd>
            <kbd className="px-2 py-1 bg-[var(--border)] rounded">↓</kbd>
            <kbd className="px-2 py-1 bg-[var(--border)] rounded">←</kbd>
            <kbd className="px-2 py-1 bg-[var(--border)] rounded">→</kbd>
          </div>
        </div>
      )}

      {/* Start Button */}
      {gameState === 'menu' && (
        <button
          onClick={startGame}
          className="btn-primary w-full py-4 text-lg mt-6"
        >
          Start Game
        </button>
      )}

      {/* Share on win */}
      {gameState === 'won' && (
        <div className="mt-6">
          <ShareGame
            gameName="Fibonacci 2048"
            score={stats.bestTile}
            scoreLabel="Best Tile"
            customMessage={`🎉 Reached ${stats.bestTile} in Fibonacci 2048!

Score: ${stats.score} | Moves: ${stats.moves} | Time: ${formatTime(stats.time)}

Can you beat my score?`}
            className="w-full"
          />
        </div>
      )}
    </div>
  );
}
