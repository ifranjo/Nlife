import { useState, useEffect, useCallback } from 'react';

// ============================================
// TYPES
// ============================================

type GameState = 'idle' | 'playing' | 'finished';
type BoardSize = 3 | 4 | 5;

interface Tile {
  id: string;
  value: number;
  row: number;
  col: number;
  isMerging: boolean;
}

interface LeaderboardEntry {
  score: number;
  maxTile: number;
  boardSize: number;
  date: string;
}

// ============================================
// CONSTANTS
// ============================================

const GAME_CONFIG = {
  LEADERBOARD_MAX_ENTRIES: 10,
  ANIMATION_DURATION: 200,
} as const;

const BOARD_SIZES: { size: BoardSize; label: string }[] = [
  { size: 3, label: '3×3 (Easy)' },
  { size: 4, label: '4×4 (Medium)' },
  { size: 5, label: '5×5 (Hard)' },
];

const TILE_COLORS: Record<number, string> = {
  2: '#f97316',    // orange-500
  4: '#ef4444',    // red-500
  8: '#eab308',    // yellow-500
  16: '#22c55e',   // green-500
  32: '#14b8a6',   // teal-500
  64: '#06b6d4',   // cyan-500
  128: '#3b82f6',  // blue-500
  256: '#8b5cf6',  // violet-500
  512: '#d946ef',  // fuchsia-500
  1024: '#ec4899', // pink-500
  2048: '#f43f5e', // rose-500
};

// ============================================
// HELPER FUNCTIONS
// ============================================

const generateId = () => Math.random().toString(36).substring(2, 9);

const getTileColor = (value: number): string => {
  return TILE_COLORS[value] || '#6b7280'; // gray-500 for values beyond 2048
};

const getNextValue = (value: number): number => value * 2;

// ============================================
// MAIN COMPONENT
// ============================================

export default function NumberMatchGame() {
  const [boardSize, setBoardSize] = useState<BoardSize>(4);
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [score, setScore] = useState(0);
  const [gameState, setGameState] = useState<GameState>('idle');
  const [selectedTile, setSelectedTile] = useState<Tile | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  // Load leaderboard from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('numbermatch-leaderboard');
    if (saved) {
      try {
        setLeaderboard(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load leaderboard:', e);
      }
    }
  }, []);

  // Save leaderboard to localStorage
  const saveLeaderboard = useCallback((entries: LeaderboardEntry[]) => {
    localStorage.setItem('numbermatch-leaderboard', JSON.stringify(entries));
    setLeaderboard(entries);
  }, []);

  // Initialize the board
  const initializeBoard = useCallback((size: BoardSize) => {
    const newTiles: Tile[] = [];
    const tileCount = Math.min(size * size - 1, 8); // Start with fewer tiles

    for (let i = 0; i < tileCount; i++) {
      const row = Math.floor(i / size);
      const col = i % size;
      newTiles.push({
        id: generateId(),
        value: Math.random() > 0.7 ? 4 : 2, // 30% chance of 4
        row,
        col,
        isMerging: false,
      });
    }
    setTiles(newTiles);
    setScore(0);
    setSelectedTile(null);
  }, []);

  // Start a new game
  const startGame = useCallback(() => {
    initializeBoard(boardSize);
    setGameState('playing');
  }, [boardSize, initializeBoard]);

  // Check if two tiles are adjacent (horizontally or vertically)
  const isAdjacent = (tile1: Tile, tile2: Tile): boolean => {
    const rowDiff = Math.abs(tile1.row - tile2.row);
    const colDiff = Math.abs(tile1.col - tile2.col);
    return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
  };

  // Handle tile click
  const handleTileClick = useCallback((clickedTile: Tile) => {
    if (gameState !== 'playing') return;

    if (!selectedTile) {
      // Select first tile
      setSelectedTile(clickedTile);
    } else if (selectedTile.id === clickedTile.id) {
      // Deselect if clicking same tile
      setSelectedTile(null);
    } else if (selectedTile.value === clickedTile.value && isAdjacent(selectedTile, clickedTile)) {
      // Merge tiles!
      const newValue = getNextValue(selectedTile.value);
      const newScore = score + newValue;

      // Mark tiles as merging for animation
      setTiles(prev => prev.map(t =>
        t.id === selectedTile.id || t.id === clickedTile.id
          ? { ...t, isMerging: true }
          : t
      ));

      // After animation, update tiles
      setTimeout(() => {
        setTiles(prev => {
          const remaining = prev.filter(t =>
            t.id !== selectedTile.id && t.id !== clickedTile.id
          );

          // Add new merged tile
          const midRow = (selectedTile.row + clickedTile.row) / 2;
          const midCol = (selectedTile.col + clickedTile.col) / 2;

          return [...remaining, {
            id: generateId(),
            value: newValue,
            row: midRow,
            col: midCol,
            isMerging: false,
          }];
        });
        setScore(newScore);
        setSelectedTile(null);
      }, GAME_CONFIG.ANIMATION_DURATION);
    } else {
      // Different values or not adjacent - select new tile
      setSelectedTile(clickedTile);
    }
  }, [gameState, selectedTile, score]);

  // Check if game is over (no valid moves)
  useEffect(() => {
    if (gameState !== 'playing' || tiles.length === 0) return;

    const hasValidMove = tiles.some((tile1, i) =>
      tiles.slice(i + 1).some(tile2 =>
        tile1.value === tile2.value && isAdjacent(tile1, tile2)
      )
    );

    if (!hasValidMove) {
      setGameState('finished');
      // Add to leaderboard if score > 0
      if (score > 0) {
        const maxTile = Math.max(...tiles.map(t => t.value));
        const newEntry: LeaderboardEntry = {
          score,
          maxTile,
          boardSize,
          date: new Date().toISOString(),
        };
        const updated = [...leaderboard, newEntry]
          .sort((a, b) => b.score - a.score)
          .slice(0, GAME_CONFIG.LEADERBOARD_MAX_ENTRIES);
        saveLeaderboard(updated);
      }
    }
  }, [tiles, gameState, score, boardSize, leaderboard, saveLeaderboard]);

  // Render a single tile
  const renderTile = (tile: Tile) => {
    const isSelected = selectedTile?.id === tile.id;
    const canMerge = selectedTile &&
      selectedTile.value === tile.value &&
      isAdjacent(selectedTile, tile);

    return (
      <button
        key={tile.id}
        onClick={() => handleTileClick(tile)}
        className={`
          absolute flex items-center justify-center
          rounded-lg font-bold text-white text-xl sm:text-2xl
          transition-all duration-150 ease-out
          ${tile.isMerging ? 'scale-125 opacity-50' : 'scale-100'}
          ${isSelected ? 'ring-4 ring-white scale-110 z-10' : ''}
          ${canMerge ? 'ring-4 ring-yellow-400 animate-pulse' : ''}
        `}
        style={{
          backgroundColor: getTileColor(tile.value),
          left: `${tile.col * 25}%`,
          top: `${tile.row * 25}%`,
          width: '23%',
          height: '23%',
          margin: '1%',
        }}
      >
        {tile.value}
      </button>
    );
  };

  return (
    <div className="max-w-md mx-auto">
      {/* Header Stats */}
      <div className="flex justify-between items-center mb-6 px-4">
        <div className="text-center">
          <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Score</div>
          <div className="text-2xl font-bold text-[var(--text)]">{score}</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Tiles</div>
          <div className="text-2xl font-bold text-[var(--text)]">{tiles.length}</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Best</div>
          <div className="text-2xl font-bold text-[var(--success)]">
            {leaderboard[0]?.score || 0}
          </div>
        </div>
      </div>

      {/* Board Size Selector */}
      {gameState === 'idle' && (
        <div className="mb-6">
          <label className="block text-center text-sm text-[var(--text-muted)] mb-2">
            Select Difficulty
          </label>
          <div className="flex justify-center gap-2">
            {BOARD_SIZES.map(({ size, label }) => (
              <button
                key={size}
                onClick={() => setBoardSize(size)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
                  ${boardSize === size
                    ? 'bg-[var(--accent)] text-white'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:bg-[var(--border)]'
                  }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Game Board */}
      <div className="relative w-full aspect-square bg-[var(--bg-secondary)] rounded-xl overflow-hidden mb-6 mx-auto" style={{ maxWidth: '400px' }}>
        {gameState === 'idle' ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <button
              onClick={startGame}
              className="px-8 py-4 bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-white font-bold rounded-xl text-lg transition-transform hover:scale-105 active:scale-95"
            >
              Start Game
            </button>
          </div>
        ) : (
          <>
            {tiles.map(renderTile)}
            {gameState === 'finished' && (
              <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center">
                <div className="text-white text-2xl font-bold mb-2">Game Over!</div>
                <div className="text-[var(--text-muted)] mb-4">Final Score: {score}</div>
                <button
                  onClick={startGame}
                  className="px-6 py-3 bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-white font-bold rounded-xl transition-transform hover:scale-105"
                >
                  Play Again
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Instructions */}
      {gameState === 'playing' && (
        <div className="text-center text-sm text-[var(--text-muted)] mb-4">
          Tap two adjacent tiles with the same number to merge them!
        </div>
      )}

      {/* Leaderboard */}
      {leaderboard.length > 0 && (
        <div className="bg-[var(--bg-secondary)] rounded-xl p-4">
          <h3 className="text-sm font-bold text-[var(--text)] uppercase tracking-wider mb-3 text-center">
            Leaderboard
          </h3>
          <div className="space-y-2">
            {leaderboard.slice(0, 5).map((entry, index) => (
              <div
                key={index}
                className="flex justify-between items-center text-sm"
              >
                <span className="text-[var(--text-muted)]">
                  #{index + 1} {entry.boardSize}×{entry.boardSize}
                </span>
                <span className="font-bold text-[var(--text)]">{entry.score}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
