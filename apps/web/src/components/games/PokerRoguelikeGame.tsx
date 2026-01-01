import { useState, useEffect, useCallback, useMemo } from 'react';
import ShareGame from './ShareGame';

// ============================================
// TYPES
// ============================================

type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
type GamePhase = 'playing' | 'shop' | 'won' | 'lost';
type HandType = 'high_card' | 'pair' | 'two_pair' | 'three_kind' | 'straight' | 'flush' | 'full_house' | 'four_kind' | 'straight_flush' | 'royal_flush';

interface Card {
  suit: Suit;
  value: number;
  id: string;
  selected: boolean;
  enhanced?: 'mult' | 'chips' | 'gold';
}

interface Joker {
  id: string;
  name: string;
  description: string;
  emoji: string;
  effect: (hand: Card[], base: ScoreResult) => ScoreResult;
  cost: number;
  rarity: 'common' | 'uncommon' | 'rare';
}

interface ScoreResult {
  chips: number;
  mult: number;
  handType: HandType;
  handName: string;
}

interface Blind {
  name: string;
  chips: number;
  reward: number;
}

// ============================================
// CONSTANTS
// ============================================

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const SUIT_SYMBOLS: Record<Suit, string> = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
const SUIT_COLORS: Record<Suit, string> = { hearts: '#ef4444', diamonds: '#ef4444', clubs: '#1f2937', spades: '#1f2937' };
const VALUE_NAMES: Record<number, string> = { 1: 'A', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10', 11: 'J', 12: 'Q', 13: 'K' };

const HAND_SCORES: Record<HandType, { chips: number; mult: number; name: string }> = {
  high_card: { chips: 5, mult: 1, name: 'High Card' },
  pair: { chips: 10, mult: 2, name: 'Pair' },
  two_pair: { chips: 20, mult: 2, name: 'Two Pair' },
  three_kind: { chips: 30, mult: 3, name: 'Three of a Kind' },
  straight: { chips: 30, mult: 4, name: 'Straight' },
  flush: { chips: 35, mult: 4, name: 'Flush' },
  full_house: { chips: 40, mult: 4, name: 'Full House' },
  four_kind: { chips: 60, mult: 7, name: 'Four of a Kind' },
  straight_flush: { chips: 100, mult: 8, name: 'Straight Flush' },
  royal_flush: { chips: 100, mult: 8, name: 'Royal Flush' },
};

const BLINDS: Blind[] = [
  { name: 'Small Blind', chips: 100, reward: 3 },
  { name: 'Big Blind', chips: 300, reward: 4 },
  { name: 'Boss Blind', chips: 600, reward: 5 },
  { name: 'Small Blind', chips: 1000, reward: 4 },
  { name: 'Big Blind', chips: 2000, reward: 5 },
  { name: 'Boss Blind', chips: 4000, reward: 6 },
  { name: 'Final Boss', chips: 8000, reward: 10 },
];

const JOKER_POOL: Omit<Joker, 'id'>[] = [
  { name: 'Greedy Joker', emoji: '💰', description: '+3 Mult for each $', cost: 4, rarity: 'common',
    effect: (_, base) => ({ ...base, mult: base.mult + 3 }) },
  { name: 'Lusty Joker', emoji: '💕', description: '+3 Mult if hand contains Hearts', cost: 4, rarity: 'common',
    effect: (hand, base) => ({ ...base, mult: base.mult + (hand.some(c => c.suit === 'hearts') ? 3 : 0) }) },
  { name: 'Wrathful Joker', emoji: '😡', description: '+3 Mult if hand contains Spades', cost: 4, rarity: 'common',
    effect: (hand, base) => ({ ...base, mult: base.mult + (hand.some(c => c.suit === 'spades') ? 3 : 0) }) },
  { name: 'Jolly Joker', emoji: '🃏', description: '+8 Mult if hand contains a Pair', cost: 5, rarity: 'common',
    effect: (_, base) => ({ ...base, mult: base.mult + (['pair', 'two_pair', 'three_kind', 'full_house', 'four_kind'].includes(base.handType) ? 8 : 0) }) },
  { name: 'Zany Joker', emoji: '🤪', description: '+12 Mult if hand is Three of a Kind', cost: 5, rarity: 'uncommon',
    effect: (_, base) => ({ ...base, mult: base.mult + (base.handType === 'three_kind' ? 12 : 0) }) },
  { name: 'Mad Joker', emoji: '😈', description: '+20 Mult if hand is Four of a Kind', cost: 6, rarity: 'rare',
    effect: (_, base) => ({ ...base, mult: base.mult + (base.handType === 'four_kind' ? 20 : 0) }) },
  { name: 'Crazy Joker', emoji: '🎲', description: '+12 Mult if hand is a Straight', cost: 5, rarity: 'uncommon',
    effect: (_, base) => ({ ...base, mult: base.mult + (base.handType === 'straight' || base.handType === 'straight_flush' ? 12 : 0) }) },
  { name: 'Half Joker', emoji: '½', description: '+20 Mult if hand contains 3 or fewer cards', cost: 5, rarity: 'common',
    effect: (hand, base) => ({ ...base, mult: base.mult + (hand.length <= 3 ? 20 : 0) }) },
  { name: 'Banner', emoji: '🚩', description: '+30 Chips for each discard remaining', cost: 4, rarity: 'common',
    effect: (_, base) => base }, // Handled in game logic
  { name: 'Mystic Summit', emoji: '🏔️', description: '+15 Mult if 0 discards remaining', cost: 4, rarity: 'uncommon',
    effect: (_, base) => base }, // Handled in game logic
  { name: 'Fibonacci', emoji: '🐚', description: '+8 Mult for each Ace, 2, 3, 5, or 8 in hand', cost: 6, rarity: 'uncommon',
    effect: (hand, base) => ({ ...base, mult: base.mult + hand.filter(c => [1, 2, 3, 5, 8].includes(c.value)).length * 8 }) },
  { name: 'Even Steven', emoji: '⚖️', description: '+4 Mult for each even-valued card', cost: 4, rarity: 'common',
    effect: (hand, base) => ({ ...base, mult: base.mult + hand.filter(c => c.value % 2 === 0).length * 4 }) },
  { name: 'Odd Todd', emoji: '🎭', description: '+30 Chips for each odd-valued card', cost: 4, rarity: 'common',
    effect: (hand, base) => ({ ...base, chips: base.chips + hand.filter(c => c.value % 2 === 1).length * 30 }) },
];

// ============================================
// UTILITY FUNCTIONS
// ============================================

const createDeck = (): Card[] => {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (let value = 1; value <= 13; value++) {
      deck.push({ suit, value, id: `${suit}-${value}`, selected: false });
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

const evaluateHand = (cards: Card[]): ScoreResult => {
  if (cards.length === 0) {
    return { chips: 0, mult: 0, handType: 'high_card', handName: 'No Cards' };
  }

  const values = cards.map(c => c.value).sort((a, b) => a - b);
  const suits = cards.map(c => c.suit);
  const valueCounts: Record<number, number> = {};
  values.forEach(v => { valueCounts[v] = (valueCounts[v] || 0) + 1; });
  const counts = Object.values(valueCounts).sort((a, b) => b - a);

  // Check for flush
  const isFlush = suits.every(s => s === suits[0]) && cards.length >= 5;

  // Check for straight
  const uniqueValues = [...new Set(values)];
  let isStraight = false;
  if (uniqueValues.length >= 5) {
    for (let i = 0; i <= uniqueValues.length - 5; i++) {
      if (uniqueValues[i + 4] - uniqueValues[i] === 4) {
        isStraight = true;
        break;
      }
    }
    // Check for A-2-3-4-5
    if (uniqueValues.includes(1) && uniqueValues.includes(2) && uniqueValues.includes(3) &&
        uniqueValues.includes(4) && uniqueValues.includes(5)) {
      isStraight = true;
    }
  }

  // Check for royal flush (10-J-Q-K-A)
  const isRoyal = isFlush && isStraight && values.includes(1) && values.includes(13);

  let handType: HandType = 'high_card';
  if (isRoyal) handType = 'royal_flush';
  else if (isFlush && isStraight) handType = 'straight_flush';
  else if (counts[0] === 4) handType = 'four_kind';
  else if (counts[0] === 3 && counts[1] === 2) handType = 'full_house';
  else if (isFlush) handType = 'flush';
  else if (isStraight) handType = 'straight';
  else if (counts[0] === 3) handType = 'three_kind';
  else if (counts[0] === 2 && counts[1] === 2) handType = 'two_pair';
  else if (counts[0] === 2) handType = 'pair';

  const base = HAND_SCORES[handType];
  const cardChips = cards.reduce((sum, c) => sum + (c.value === 1 ? 11 : Math.min(c.value, 10)), 0);

  return {
    chips: base.chips + cardChips,
    mult: base.mult,
    handType,
    handName: base.name,
  };
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function PokerRoguelikeGame() {
  // Game state
  const [phase, setPhase] = useState<GamePhase>('playing');
  const [deck, setDeck] = useState<Card[]>([]);
  const [hand, setHand] = useState<Card[]>([]);
  const [jokers, setJokers] = useState<Joker[]>([]);
  const [money, setMoney] = useState(4);
  const [score, setScore] = useState(0);
  const [roundScore, setRoundScore] = useState(0);
  const [blindIndex, setBlindIndex] = useState(0);
  const [handsLeft, setHandsLeft] = useState(4);
  const [discardsLeft, setDiscardsLeft] = useState(3);
  const [shopJokers, setShopJokers] = useState<Joker[]>([]);
  const [lastScore, setLastScore] = useState<ScoreResult | null>(null);

  const currentBlind = BLINDS[Math.min(blindIndex, BLINDS.length - 1)];

  // Initialize game
  const initGame = useCallback(() => {
    const newDeck = shuffleDeck(createDeck());
    setDeck(newDeck.slice(8));
    setHand(newDeck.slice(0, 8).map(c => ({ ...c, selected: false })));
    setJokers([]);
    setMoney(4);
    setScore(0);
    setRoundScore(0);
    setBlindIndex(0);
    setHandsLeft(4);
    setDiscardsLeft(3);
    setPhase('playing');
    setLastScore(null);
  }, []);

  useEffect(() => {
    initGame();
  }, [initGame]);

  // Draw cards to fill hand
  const drawCards = useCallback((count: number) => {
    const newCards = deck.slice(0, count).map(c => ({ ...c, selected: false }));
    setDeck(prev => prev.slice(count));
    setHand(prev => [...prev, ...newCards]);
  }, [deck]);

  // Toggle card selection
  const toggleCard = useCallback((cardId: string) => {
    setHand(prev => prev.map(c =>
      c.id === cardId ? { ...c, selected: !c.selected } : c
    ));
  }, []);

  // Play selected cards
  const playHand = useCallback(() => {
    const selected = hand.filter(c => c.selected);
    if (selected.length === 0 || handsLeft <= 0) return;

    let result = evaluateHand(selected);

    // Apply joker effects
    for (const joker of jokers) {
      result = joker.effect(selected, result);
    }

    // Special joker handling
    const banner = jokers.find(j => j.name === 'Banner');
    if (banner) {
      result.chips += discardsLeft * 30;
    }
    const mystic = jokers.find(j => j.name === 'Mystic Summit');
    if (mystic && discardsLeft === 0) {
      result.mult += 15;
    }

    const finalScore = result.chips * result.mult;
    const newRoundScore = roundScore + finalScore;

    setLastScore(result);
    setRoundScore(newRoundScore);
    setHandsLeft(prev => prev - 1);
    setHand(prev => prev.filter(c => !c.selected));

    // Check win/lose
    setTimeout(() => {
      if (newRoundScore >= currentBlind.chips) {
        // Won the blind!
        if (blindIndex >= BLINDS.length - 1) {
          setPhase('won');
        } else {
          setMoney(prev => prev + currentBlind.reward);
          generateShop();
          setPhase('shop');
        }
      } else if (handsLeft <= 1) {
        setPhase('lost');
      } else {
        // Draw more cards
        const toDraw = Math.min(8 - hand.filter(c => !c.selected).length, deck.length);
        if (toDraw > 0) {
          drawCards(toDraw);
        }
      }
    }, 500);
  }, [hand, handsLeft, jokers, roundScore, currentBlind, blindIndex, deck, discardsLeft, drawCards]);

  // Discard selected cards
  const discardCards = useCallback(() => {
    const selected = hand.filter(c => c.selected);
    if (selected.length === 0 || discardsLeft <= 0) return;

    setDiscardsLeft(prev => prev - 1);
    setHand(prev => prev.filter(c => !c.selected));

    // Draw replacements
    const toDraw = Math.min(selected.length, deck.length);
    if (toDraw > 0) {
      drawCards(toDraw);
    }
  }, [hand, discardsLeft, deck, drawCards]);

  // Generate shop
  const generateShop = useCallback(() => {
    const available = JOKER_POOL.filter(j => !jokers.some(owned => owned.name === j.name));
    const shuffled = [...available].sort(() => Math.random() - 0.5);
    const shop: Joker[] = shuffled.slice(0, 3).map((j, i) => ({
      ...j,
      id: `joker-${Date.now()}-${i}`,
    }));
    setShopJokers(shop);
  }, [jokers]);

  // Buy joker
  const buyJoker = useCallback((joker: Joker) => {
    if (money < joker.cost || jokers.length >= 5) return;
    setMoney(prev => prev - joker.cost);
    setJokers(prev => [...prev, joker]);
    setShopJokers(prev => prev.filter(j => j.id !== joker.id));
  }, [money, jokers]);

  // Continue to next blind
  const continueGame = useCallback(() => {
    const newDeck = shuffleDeck(createDeck());
    setDeck(newDeck.slice(8));
    setHand(newDeck.slice(0, 8).map(c => ({ ...c, selected: false })));
    setBlindIndex(prev => prev + 1);
    setRoundScore(0);
    setHandsLeft(4);
    setDiscardsLeft(3);
    setPhase('playing');
    setLastScore(null);
  }, []);

  // Generate share text
  const generateShareText = useCallback(() => {
    const jokerList = jokers.map(j => j.emoji).join(' ');
    const result = phase === 'won' ? 'WON' : 'LOST';

    return `Poker Roguelike - Balatro Clone

${result} at Round ${blindIndex + 1} - ${currentBlind.name}
Score: ${roundScore.toLocaleString()} / ${currentBlind.chips.toLocaleString()}
Jokers: ${jokerList || 'None'}

Play at newlifesolutions.dev/games/poker-roguelike`;
  }, [phase, blindIndex, roundScore, currentBlind, jokers]);

  // Selected cards preview
  const selectedCards = useMemo(() => hand.filter(c => c.selected), [hand]);
  const previewScore = useMemo(() => {
    if (selectedCards.length === 0) return null;
    let result = evaluateHand(selectedCards);
    for (const joker of jokers) {
      result = joker.effect(selectedCards, result);
    }
    return result;
  }, [selectedCards, jokers]);

  // Render card
  const renderCard = (card: Card, onClick?: () => void) => (
    <div
      key={card.id}
      onClick={onClick}
      className={`
        w-14 h-20 sm:w-16 sm:h-24 rounded-lg cursor-pointer
        bg-white border-2 transition-all select-none
        flex flex-col justify-between p-1
        ${card.selected ? 'border-[var(--accent)] -translate-y-2 shadow-lg' : 'border-gray-300 hover:border-gray-400'}
        ${card.enhanced === 'mult' ? 'ring-2 ring-red-400' : ''}
        ${card.enhanced === 'chips' ? 'ring-2 ring-blue-400' : ''}
      `}
    >
      <div className="text-xs font-bold" style={{ color: SUIT_COLORS[card.suit] }}>
        {VALUE_NAMES[card.value]}{SUIT_SYMBOLS[card.suit]}
      </div>
      <div className="text-xl text-center" style={{ color: SUIT_COLORS[card.suit] }}>
        {SUIT_SYMBOLS[card.suit]}
      </div>
    </div>
  );

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-2 flex-wrap gap-2">
        <div className="flex gap-3">
          <div className="glass-card px-3 py-1 rounded">
            <span className="text-xs text-[var(--text-muted)]">Round </span>
            <span className="font-mono font-bold">{blindIndex + 1}/{BLINDS.length}</span>
          </div>
          <div className="glass-card px-3 py-1 rounded">
            <span className="text-xs text-[var(--text-muted)]">💰 </span>
            <span className="font-mono font-bold">${money}</span>
          </div>
        </div>
        <button onClick={initGame} className="btn-secondary px-3 py-1 text-sm">
          New Run
        </button>
      </div>

      {/* PLAYING PHASE */}
      {phase === 'playing' && (
        <div className="space-y-4">
          {/* Blind Info */}
          <div className="glass-card p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-[var(--text)]">{currentBlind.name}</span>
              <span className="text-sm text-[var(--text-muted)]">
                Reward: ${currentBlind.reward}
              </span>
            </div>
            <div className="relative h-4 bg-[var(--border)] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all"
                style={{ width: `${Math.min(100, (roundScore / currentBlind.chips) * 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs mt-1">
              <span className="text-[var(--success)] font-mono">{roundScore.toLocaleString()}</span>
              <span className="text-[var(--text-muted)]">/ {currentBlind.chips.toLocaleString()}</span>
            </div>
          </div>

          {/* Jokers */}
          {jokers.length > 0 && (
            <div className="flex gap-2 justify-center flex-wrap">
              {jokers.map(joker => (
                <div
                  key={joker.id}
                  className="glass-card px-3 py-2 rounded-lg text-center"
                  title={joker.description}
                >
                  <div className="text-2xl">{joker.emoji}</div>
                  <div className="text-xs text-[var(--text-muted)]">{joker.name}</div>
                </div>
              ))}
            </div>
          )}

          {/* Hand Preview */}
          {previewScore && (
            <div className="glass-card p-3 rounded-lg text-center border border-[var(--accent)]">
              <div className="text-sm text-[var(--text-muted)]">{previewScore.handName}</div>
              <div className="text-xl font-mono">
                <span className="text-blue-400">{previewScore.chips}</span>
                <span className="text-[var(--text-muted)]"> × </span>
                <span className="text-red-400">{previewScore.mult}</span>
                <span className="text-[var(--text-muted)]"> = </span>
                <span className="text-[var(--success)] font-bold">{(previewScore.chips * previewScore.mult).toLocaleString()}</span>
              </div>
            </div>
          )}

          {/* Last Score */}
          {lastScore && !previewScore && (
            <div className="glass-card p-3 rounded-lg text-center opacity-60">
              <div className="text-xs text-[var(--text-muted)]">Last: {lastScore.handName}</div>
              <div className="text-sm font-mono text-[var(--success)]">
                +{(lastScore.chips * lastScore.mult).toLocaleString()}
              </div>
            </div>
          )}

          {/* Hand */}
          <div className="glass-card p-4 rounded-lg">
            <div className="flex gap-2 justify-center flex-wrap">
              {hand.map(card => renderCard(card, () => toggleCard(card.id)))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-center">
            <button
              onClick={playHand}
              disabled={selectedCards.length === 0 || handsLeft <= 0}
              className="btn-primary px-6 py-3 disabled:opacity-50"
            >
              Play Hand ({handsLeft})
            </button>
            <button
              onClick={discardCards}
              disabled={selectedCards.length === 0 || discardsLeft <= 0}
              className="btn-secondary px-6 py-3 disabled:opacity-50"
            >
              Discard ({discardsLeft})
            </button>
          </div>

          {/* Hand Types Reference */}
          <details className="glass-card p-3 rounded-lg">
            <summary className="text-xs text-[var(--text-muted)] cursor-pointer">Hand Rankings</summary>
            <div className="grid grid-cols-2 gap-1 mt-2 text-xs">
              {Object.entries(HAND_SCORES).reverse().map(([_, info]) => (
                <div key={info.name} className="flex justify-between">
                  <span>{info.name}</span>
                  <span className="text-[var(--text-muted)]">{info.chips}×{info.mult}</span>
                </div>
              ))}
            </div>
          </details>
        </div>
      )}

      {/* SHOP PHASE */}
      {phase === 'shop' && (
        <div className="space-y-6">
          <div className="text-center">
            <div className="text-4xl mb-2">🛒</div>
            <h2 className="text-xl font-bold">Shop</h2>
            <p className="text-[var(--text-muted)]">Buy Jokers to power up your hands</p>
            <p className="text-lg font-mono text-[var(--success)] mt-2">💰 ${money}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {shopJokers.map(joker => (
              <div key={joker.id} className="glass-card p-4 rounded-lg text-center">
                <div className="text-4xl mb-2">{joker.emoji}</div>
                <div className="font-bold text-[var(--text)]">{joker.name}</div>
                <div className="text-xs text-[var(--text-dim)] mb-3">{joker.description}</div>
                <button
                  onClick={() => buyJoker(joker)}
                  disabled={money < joker.cost || jokers.length >= 5}
                  className={`px-4 py-2 rounded text-sm transition-all ${
                    money >= joker.cost && jokers.length < 5
                      ? 'bg-[var(--accent)] text-[var(--bg)] hover:opacity-80'
                      : 'bg-[var(--border)] text-[var(--text-muted)] cursor-not-allowed'
                  }`}
                >
                  ${joker.cost}
                </button>
              </div>
            ))}
          </div>

          {jokers.length >= 5 && (
            <p className="text-center text-sm text-[var(--warning)]">Max 5 Jokers!</p>
          )}

          <button onClick={continueGame} className="btn-primary w-full py-3">
            Continue to {BLINDS[Math.min(blindIndex + 1, BLINDS.length - 1)].name}
          </button>
        </div>
      )}

      {/* WON PHASE */}
      {phase === 'won' && (
        <div className="glass-card p-8 rounded-lg text-center">
          <div className="text-6xl mb-4">🏆</div>
          <h2 className="text-2xl font-bold text-[var(--success)] mb-2">You Won!</h2>
          <p className="text-[var(--text-dim)] mb-4">Conquered all {BLINDS.length} blinds!</p>
          <div className="text-lg mb-6">
            Final Jokers: {jokers.map(j => j.emoji).join(' ')}
          </div>
          <div className="flex gap-4">
            <ShareGame
              gameName="Poker Roguelike"
              score={`Round ${blindIndex + 1}`}
              scoreLabel="Game"
              customMessage={generateShareText()}
              className="flex-1"
            />
            <button onClick={initGame} className="btn-primary px-8 py-3">
              Play Again
            </button>
          </div>
        </div>
      )}

      {/* LOST PHASE */}
      {phase === 'lost' && (
        <div className="glass-card p-8 rounded-lg text-center">
          <div className="text-6xl mb-4">💔</div>
          <h2 className="text-2xl font-bold text-[var(--error)] mb-2">Game Over</h2>
          <p className="text-[var(--text-dim)] mb-4">
            Reached Round {blindIndex + 1} - {currentBlind.name}
          </p>
          <p className="text-lg mb-6">
            Score: {roundScore.toLocaleString()} / {currentBlind.chips.toLocaleString()}
          </p>
          <div className="flex gap-4">
            <ShareGame
              gameName="Poker Roguelike"
              score={`Round ${blindIndex + 1}`}
              scoreLabel="Game"
              customMessage={generateShareText()}
              className="flex-1"
            />
            <button onClick={initGame} className="btn-primary px-8 py-3">
              Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
