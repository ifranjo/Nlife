import { useState, useEffect, useCallback } from 'react';
import ShareGame from './ShareGame';

// ============================================
// TYPES
// ============================================

type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
type GameState = 'playing' | 'won';

interface Card {
  suit: Suit;
  value: number; // 1=Ace, 11=J, 12=Q, 13=K
  faceUp: boolean;
  id: string;
}

interface GameData {
  tableau: Card[][];      // 7 columns
  foundations: Card[][];  // 4 piles (one per suit)
  stock: Card[];          // Draw pile
  waste: Card[];          // Drawn cards
}

interface DragData {
  source: 'tableau' | 'waste' | 'foundation';
  sourceIndex: number;
  cardIndex: number;
  cards: Card[];
}

interface LeaderboardEntry {
  moves: number;
  time: number;
  date: string;
}

// ============================================
// CONSTANTS
// ============================================

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const SUIT_SYMBOLS: Record<Suit, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};
const SUIT_COLORS: Record<Suit, string> = {
  hearts: '#ef4444',
  diamonds: '#ef4444',
  clubs: '#1f2937',
  spades: '#1f2937',
};
const VALUE_NAMES: Record<number, string> = {
  1: 'A', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7',
  8: '8', 9: '9', 10: '10', 11: 'J', 12: 'Q', 13: 'K',
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

const createDeck = (): Card[] => {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (let value = 1; value <= 13; value++) {
      deck.push({
        suit,
        value,
        faceUp: false,
        id: `${suit}-${value}`,
      });
    }
  }
  return deck;
};

const shuffleDeck = (deck: Card[]): Card[] => {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const isRed = (suit: Suit): boolean => suit === 'hearts' || suit === 'diamonds';

const canStackOnTableau = (card: Card, target: Card | undefined): boolean => {
  if (!target) return card.value === 13; // Only Kings on empty
  if (!target.faceUp) return false;
  return isRed(card.suit) !== isRed(target.suit) && card.value === target.value - 1;
};

const canStackOnFoundation = (card: Card, foundation: Card[]): boolean => {
  if (foundation.length === 0) return card.value === 1; // Ace
  const top = foundation[foundation.length - 1];
  return card.suit === top.suit && card.value === top.value + 1;
};

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function SolitaireGame() {
  // Game state
  const [gameState, setGameState] = useState<GameState>('playing');
  const [game, setGame] = useState<GameData | null>(null);
  const [moves, setMoves] = useState(0);
  const [time, setTime] = useState(0);
  const [dragData, setDragData] = useState<DragData | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  // Initialize game
  const initGame = useCallback(() => {
    const deck = shuffleDeck(createDeck());

    // Deal tableau (7 columns)
    const tableau: Card[][] = [];
    let deckIndex = 0;
    for (let col = 0; col < 7; col++) {
      const column: Card[] = [];
      for (let row = 0; row <= col; row++) {
        const card = { ...deck[deckIndex++] };
        card.faceUp = row === col; // Only top card face up
        column.push(card);
      }
      tableau.push(column);
    }

    // Rest goes to stock
    const stock = deck.slice(deckIndex).map(c => ({ ...c, faceUp: false }));

    setGame({
      tableau,
      foundations: [[], [], [], []],
      stock,
      waste: [],
    });
    setGameState('playing');
    setMoves(0);
    setTime(0);
  }, []);

  // Generate share text
  const generateShareText = useCallback(() => {
    return `Solitaire

Completed in ${moves} moves and ${formatTime(time)}

Play at newlifesolutions.dev/games/solitaire`;
  }, [moves, time]);

  // Load leaderboard
  useEffect(() => {
    const stored = localStorage.getItem('solitaire-leaderboard');
    if (stored) {
      try {
        setLeaderboard(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to load leaderboard:', e);
      }
    }
    initGame();
  }, [initGame]);

  // Timer
  useEffect(() => {
    if (gameState !== 'playing' || !game) return;

    const timer = setInterval(() => {
      setTime(t => t + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, game]);

  // Check win condition
  useEffect(() => {
    if (!game) return;

    const totalInFoundations = game.foundations.reduce((sum, f) => sum + f.length, 0);
    if (totalInFoundations === 52) {
      setGameState('won');

      // Save to leaderboard
      const entry: LeaderboardEntry = { moves, time, date: new Date().toISOString() };
      const newLeaderboard = [...leaderboard, entry]
        .sort((a, b) => a.moves - b.moves || a.time - b.time)
        .slice(0, 10);
      setLeaderboard(newLeaderboard);
      localStorage.setItem('solitaire-leaderboard', JSON.stringify(newLeaderboard));
    }
  }, [game, moves, time, leaderboard]);

  // Draw from stock
  const drawCard = useCallback(() => {
    if (!game) return;

    if (game.stock.length === 0) {
      // Reset stock from waste
      const newStock = [...game.waste].reverse().map(c => ({ ...c, faceUp: false }));
      setGame({ ...game, stock: newStock, waste: [] });
    } else {
      // Draw 1 card
      const card = { ...game.stock[game.stock.length - 1], faceUp: true };
      setGame({
        ...game,
        stock: game.stock.slice(0, -1),
        waste: [...game.waste, card],
      });
      setMoves(m => m + 1);
    }
  }, [game]);

  // Handle drag start
  const handleDragStart = useCallback((
    source: DragData['source'],
    sourceIndex: number,
    cardIndex: number
  ) => {
    if (!game) return;

    let cards: Card[] = [];
    if (source === 'tableau') {
      cards = game.tableau[sourceIndex].slice(cardIndex);
    } else if (source === 'waste' && game.waste.length > 0) {
      cards = [game.waste[game.waste.length - 1]];
    } else if (source === 'foundation' && game.foundations[sourceIndex].length > 0) {
      cards = [game.foundations[sourceIndex][game.foundations[sourceIndex].length - 1]];
    }

    if (cards.length > 0 && cards[0].faceUp) {
      setDragData({ source, sourceIndex, cardIndex, cards });
    }
  }, [game]);

  // Handle drop
  const handleDrop = useCallback((
    target: 'tableau' | 'foundation',
    targetIndex: number
  ) => {
    if (!game || !dragData) return;

    const { source, sourceIndex, cardIndex, cards } = dragData;
    const card = cards[0];
    let valid = false;

    if (target === 'tableau') {
      const targetColumn = game.tableau[targetIndex];
      const targetCard = targetColumn[targetColumn.length - 1];
      valid = canStackOnTableau(card, targetCard);
    } else if (target === 'foundation' && cards.length === 1) {
      valid = canStackOnFoundation(card, game.foundations[targetIndex]);
    }

    if (valid) {
      const newGame = { ...game };

      // Remove from source
      if (source === 'tableau') {
        newGame.tableau = [...game.tableau];
        newGame.tableau[sourceIndex] = game.tableau[sourceIndex].slice(0, cardIndex);
        // Flip top card if needed
        const col = newGame.tableau[sourceIndex];
        if (col.length > 0 && !col[col.length - 1].faceUp) {
          col[col.length - 1] = { ...col[col.length - 1], faceUp: true };
        }
      } else if (source === 'waste') {
        newGame.waste = game.waste.slice(0, -1);
      } else if (source === 'foundation') {
        newGame.foundations = [...game.foundations];
        newGame.foundations[sourceIndex] = game.foundations[sourceIndex].slice(0, -1);
      }

      // Add to target
      if (target === 'tableau') {
        newGame.tableau = [...(newGame.tableau || game.tableau)];
        newGame.tableau[targetIndex] = [...game.tableau[targetIndex], ...cards];
      } else if (target === 'foundation') {
        newGame.foundations = [...(newGame.foundations || game.foundations)];
        newGame.foundations[targetIndex] = [...game.foundations[targetIndex], ...cards];
      }

      setGame(newGame);
      setMoves(m => m + 1);
    }

    setDragData(null);
  }, [game, dragData]);

  // Auto-move to foundation
  const autoMoveToFoundation = useCallback((card: Card, source: 'tableau' | 'waste', sourceIndex: number, cardIndex: number) => {
    if (!game) return;

    for (let i = 0; i < 4; i++) {
      if (canStackOnFoundation(card, game.foundations[i])) {
        const newGame = { ...game };

        // Remove from source
        if (source === 'tableau') {
          newGame.tableau = [...game.tableau];
          newGame.tableau[sourceIndex] = game.tableau[sourceIndex].slice(0, cardIndex);
          const col = newGame.tableau[sourceIndex];
          if (col.length > 0 && !col[col.length - 1].faceUp) {
            col[col.length - 1] = { ...col[col.length - 1], faceUp: true };
          }
        } else {
          newGame.waste = game.waste.slice(0, -1);
        }

        // Add to foundation
        newGame.foundations = [...game.foundations];
        newGame.foundations[i] = [...game.foundations[i], card];

        setGame(newGame);
        setMoves(m => m + 1);
        return true;
      }
    }
    return false;
  }, [game]);

  // Render card
  const renderCard = useCallback((
    card: Card,
    source: DragData['source'],
    sourceIndex: number,
    cardIndex: number,
    stacked: boolean = false,
    isTop: boolean = false
  ) => {
    const isDragging = dragData?.source === source &&
                       dragData?.sourceIndex === sourceIndex &&
                       dragData?.cardIndex <= cardIndex;

    if (!card.faceUp) {
      return (
        <div
          key={card.id}
          className={`
            w-16 h-22 sm:w-20 sm:h-28 rounded-lg
            bg-gradient-to-br from-blue-600 to-blue-800
            border-2 border-blue-400
            ${stacked ? '-mt-16 sm:-mt-20' : ''}
            shadow-md
          `}
          style={{ marginTop: stacked ? '-4rem' : undefined }}
        />
      );
    }

    return (
      <div
        key={card.id}
        draggable={card.faceUp}
        onDragStart={() => handleDragStart(source, sourceIndex, cardIndex)}
        onDoubleClick={() => {
          if (isTop && source !== 'foundation') {
            autoMoveToFoundation(card, source as 'tableau' | 'waste', sourceIndex, cardIndex);
          }
        }}
        className={`
          w-16 h-22 sm:w-20 sm:h-28 rounded-lg
          bg-white border-2 border-gray-300
          flex flex-col justify-between p-1 sm:p-2
          cursor-grab active:cursor-grabbing
          ${stacked ? '' : ''}
          ${isDragging ? 'opacity-50' : ''}
          shadow-md hover:shadow-lg transition-shadow
          select-none
        `}
        style={{ marginTop: stacked ? '-4rem' : undefined }}
      >
        <div
          className="text-xs sm:text-sm font-bold"
          style={{ color: SUIT_COLORS[card.suit] }}
        >
          {VALUE_NAMES[card.value]}
          <span className="ml-0.5">{SUIT_SYMBOLS[card.suit]}</span>
        </div>
        <div
          className="text-2xl sm:text-3xl text-center"
          style={{ color: SUIT_COLORS[card.suit] }}
        >
          {SUIT_SYMBOLS[card.suit]}
        </div>
        <div
          className="text-xs sm:text-sm font-bold text-right rotate-180"
          style={{ color: SUIT_COLORS[card.suit] }}
        >
          {VALUE_NAMES[card.value]}
          <span className="ml-0.5">{SUIT_SYMBOLS[card.suit]}</span>
        </div>
      </div>
    );
  }, [dragData, handleDragStart, autoMoveToFoundation]);

  // ============================================
  // RENDER
  // ============================================

  if (!game) {
    return <div className="text-center p-8">Loading...</div>;
  }

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Stats Bar */}
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex gap-4">
          <div className="glass-card px-3 py-1 rounded">
            <span className="text-xs text-[var(--text-muted)]">Moves: </span>
            <span className="font-mono font-bold">{moves}</span>
          </div>
          <div className="glass-card px-3 py-1 rounded">
            <span className="text-xs text-[var(--text-muted)]">Time: </span>
            <span className="font-mono font-bold">{formatTime(time)}</span>
          </div>
        </div>
        <button
          onClick={initGame}
          className="btn-secondary px-3 py-1 text-sm"
        >
          New Game
        </button>
      </div>

      {/* Game Board */}
      <div
        className="glass-card p-4 rounded-lg min-h-[500px]"
        onDragOver={(e) => e.preventDefault()}
      >
        {/* Top Row: Stock, Waste, Foundations */}
        <div className="flex justify-between mb-6">
          {/* Stock & Waste */}
          <div className="flex gap-2">
            {/* Stock */}
            <div
              onClick={drawCard}
              className={`
                w-16 h-22 sm:w-20 sm:h-28 rounded-lg
                border-2 border-dashed border-[var(--border)]
                flex items-center justify-center
                cursor-pointer hover:border-[var(--accent)]
                transition-colors
              `}
            >
              {game.stock.length > 0 ? (
                <div className="w-full h-full rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 border-2 border-blue-400">
                  <span className="flex items-center justify-center h-full text-white text-xs font-bold">
                    {game.stock.length}
                  </span>
                </div>
              ) : (
                <span className="text-2xl text-[var(--text-muted)]">↺</span>
              )}
            </div>

            {/* Waste */}
            <div
              className="w-16 h-22 sm:w-20 sm:h-28 rounded-lg border-2 border-dashed border-[var(--border)]"
              onDragOver={(e) => e.preventDefault()}
            >
              {game.waste.length > 0 && renderCard(
                game.waste[game.waste.length - 1],
                'waste',
                0,
                game.waste.length - 1,
                false,
                true
              )}
            </div>
          </div>

          {/* Foundations */}
          <div className="flex gap-2">
            {game.foundations.map((foundation, i) => (
              <div
                key={i}
                className={`
                  w-16 h-22 sm:w-20 sm:h-28 rounded-lg
                  border-2 border-dashed border-[var(--border)]
                  flex items-center justify-center
                  ${dragData ? 'hover:border-[var(--success)]' : ''}
                `}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop('foundation', i)}
              >
                {foundation.length > 0 ? (
                  renderCard(
                    foundation[foundation.length - 1],
                    'foundation',
                    i,
                    foundation.length - 1,
                    false,
                    true
                  )
                ) : (
                  <span className="text-2xl text-[var(--text-muted)] opacity-30">
                    {SUIT_SYMBOLS[SUITS[i]]}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Tableau */}
        <div className="flex justify-center gap-2 sm:gap-3">
          {game.tableau.map((column, colIndex) => (
            <div
              key={colIndex}
              className={`
                w-16 sm:w-20 min-h-[140px] sm:min-h-[180px]
                rounded-lg border-2 border-dashed border-[var(--border)]
                ${dragData ? 'hover:border-[var(--success)]' : ''}
                pt-2
              `}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop('tableau', colIndex)}
            >
              {column.length === 0 ? (
                <div className="h-22 sm:h-28 flex items-center justify-center">
                  <span className="text-[var(--text-muted)] text-xs">K</span>
                </div>
              ) : (
                column.map((card, cardIndex) =>
                  renderCard(
                    card,
                    'tableau',
                    colIndex,
                    cardIndex,
                    cardIndex > 0,
                    cardIndex === column.length - 1
                  )
                )
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Win Screen */}
      {gameState === 'won' && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="glass-card p-8 rounded-lg text-center max-w-md mx-4">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold mb-4 text-[var(--success)]">You Won!</h2>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="glass-card p-3 rounded">
                <div className="text-xs text-[var(--text-muted)]">Moves</div>
                <div className="text-2xl font-mono font-bold">{moves}</div>
              </div>
              <div className="glass-card p-3 rounded">
                <div className="text-xs text-[var(--text-muted)]">Time</div>
                <div className="text-2xl font-mono font-bold">{formatTime(time)}</div>
              </div>
            </div>
            <div className="mb-6">
              <ShareGame
                gameName="Solitaire"
                score={`${moves} moves`}
                scoreLabel="Moves"
                customMessage={generateShareText()}
                className="w-full"
              />
            </div>
            <button
              onClick={initGame}
              className="btn-primary w-full py-3"
            >
              Play Again
            </button>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 text-center text-xs text-[var(--text-muted)]">
        <p>Drag cards to move • Double-click to auto-move to foundation • Click stock to draw</p>
      </div>
    </div>
  );
}
