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
  enhanced?: 'mult' | 'chips' | 'glass' | 'steel' | 'bonus' | 'wild' | 'red_mult' | 'blue_chip';
  seal?: 'red' | 'blue' | 'gold' | 'purple';
}

interface Joker {
  id: string;
  name: string;
  description: string;
  emoji: string;
  effect: (hand: Card[], base: ScoreResult, gameState: GameState) => ScoreResult;
  cost: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  type: 'flat_mult' | 'chip_bonus' | 'suit_trigger' | 'value_trigger' | 'hand_trigger' | 'special';
}

interface PlanetCard {
  id: string;
  name: string;
  description: string;
  handType: HandType;
  bonusChips: number;
  bonusMult: number;
}

interface TarotCard {
  id: string;
  name: string;
  description: string;
  emoji: string;
  effect: (hand: Card[], deck: Card[], handSize: number, discards: number) => { hand: Card[]; deck: Card[]; handSize: number; discards: number };
  cost: number;
}

interface ScoreResult {
  chips: number;
  mult: number;
  handType: HandType;
  handName: string;
  bonuses: { source: string; chips: number; mult: number }[];
}

interface Blind {
  name: string;
  chips: number;
  reward: number;
  desc: string;
  special?: string;
}

interface GameState {
  jokers: Joker[];
  heldCards: Card[];
  glassCards: number;
  steelCards: number;
  redMults: number;
  blueChips: number;
}

// ============================================
// CONSTANTS
// ============================================

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const SUIT_SYMBOLS: Record<Suit, string> = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
const SUIT_COLORS: Record<Suit, string> = { hearts: '#ef4444', diamonds: '#ef4444', clubs: '#1f2937', spades: '#1f2937' };
const VALUE_NAMES: Record<number, string> = { 1: 'A', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10', 11: 'J', 12: 'Q', 13: 'K' };

// Higher stakes - real difficulty curve
const BLINDS: Blind[] = [
  { name: 'Small Blind', chips: 300, reward: 4, desc: 'The warmup', special: 'none' },
  { name: 'Big Blind', chips: 600, reward: 5, desc: 'Getting serious', special: 'none' },
  { name: 'Small Blind', chips: 1200, reward: 5, desc: 'Level up', special: 'none' },
  { name: 'Big Blind', chips: 2500, reward: 6, desc: 'Time to pay attention', special: 'none' },
  { name: 'The Wall', chips: 5000, reward: 8, desc: 'Massive spike', special: 'none' },
  { name: 'Boss Blind', chips: 10000, reward: 10, desc: 'Survive this', special: 'none' },
  { name: 'Final Boss', chips: 20000, reward: 25, desc: 'The ultimate test', special: 'none' },
];

// Real joker pool - balanced for difficulty
const JOKER_POOL: Omit<Joker, 'id'>[] = [
  // Common - weak but useful
  { name: 'Joker', emoji: '🃏', description: '+4 Mult', cost: 3, rarity: 'common', type: 'flat_mult',
    effect: (_, base) => ({ ...base, mult: base.mult + 4 }) },
  { name: 'Greedy Joker', emoji: '💰', description: '+3 Mult per Diamond', cost: 4, rarity: 'common', type: 'suit_trigger',
    effect: (hand, base) => ({ ...base, mult: base.mult + hand.filter(c => c.suit === 'diamonds').length * 3 }) },
  { name: 'Lusty Joker', emoji: '💕', description: '+3 Mult per Heart', cost: 4, rarity: 'common', type: 'suit_trigger',
    effect: (hand, base) => ({ ...base, mult: base.mult + hand.filter(c => c.suit === 'hearts').length * 3 }) },
  { name: 'Wrathful Joker', emoji: '😡', description: '+3 Mult per Spade', cost: 4, rarity: 'common', type: 'suit_trigger',
    effect: (hand, base) => ({ ...base, mult: base.mult + hand.filter(c => c.suit === 'spades').length * 3 }) },
  { name: 'Even Steven', emoji: '⚖️', description: '+3 Mult per even card', cost: 4, rarity: 'common', type: 'value_trigger',
    effect: (hand, base) => ({ ...base, mult: base.mult + hand.filter(c => c.value % 2 === 0 && c.value !== 10).length * 3 }) },
  { name: 'Odd Todd', emoji: '🎭', description: '+25 Chips per odd card', cost: 4, rarity: 'common', type: 'value_trigger',
    effect: (hand, base) => ({ ...base, chips: base.chips + hand.filter(c => c.value % 2 === 1).length * 25 }) },
  { name: 'Scholar', emoji: '📚', description: '+8 Mult per Ace', cost: 4, rarity: 'common', type: 'value_trigger',
    effect: (hand, base) => ({ ...base, mult: base.mult + hand.filter(c => c.value === 1).length * 8 }) },
  { name: 'Supernova', emoji: '💫', description: '+1 Mult per hand played', cost: 5, rarity: 'common', type: 'special',
    effect: () => ({ mult: 1, chips: 0, handType: 'high_card', handName: 'Supernova', bonuses: [] }) },

  // Uncommon - moderate power
  { name: 'Jolly Joker', emoji: '🤡', description: '+8 Mult if Pair+', cost: 5, rarity: 'uncommon', type: 'hand_trigger',
    effect: (_, base) => ({ ...base, mult: base.mult + (['pair', 'two_pair', 'three_kind', 'full_house', 'four_kind'].includes(base.handType) ? 8 : 0) }) },
  { name: 'Zany Joker', emoji: '🤪', description: '+12 Mult if Three of a Kind+', cost: 5, rarity: 'uncommon', type: 'hand_trigger',
    effect: (_, base) => ({ ...base, mult: base.mult + (['three_kind', 'full_house', 'four_kind'].includes(base.handType) ? 12 : 0) }) },
  { name: 'Crazy Joker', emoji: '🎲', description: '+12 Mult if Straight+', cost: 5, rarity: 'uncommon', type: 'hand_trigger',
    effect: (_, base) => ({ ...base, mult: base.mult + (['straight', 'flush', 'straight_flush', 'royal_flush'].includes(base.handType) ? 12 : 0) }) },
  { name: 'Half Joker', emoji: '½', description: '+15 Mult if 3 or fewer cards', cost: 5, rarity: 'uncommon', type: 'special',
    effect: (hand, base) => ({ ...base, mult: base.mult + (hand.length <= 3 ? 15 : 0) }) },
  { name: 'Droll Joker', emoji: '😴', description: '+15 Mult if 5 cards', cost: 5, rarity: 'uncommon', type: 'special',
    effect: (hand, base) => ({ ...base, mult: base.mult + (hand.length === 5 ? 15 : 0) }) },
  { name: 'Fibonacci', emoji: '🐚', description: '+5 Mult per Fibonacci (A,2,3,5,8)', cost: 6, rarity: 'uncommon', type: 'value_trigger',
    effect: (hand, base) => ({ ...base, mult: base.mult + hand.filter(c => [1, 2, 3, 5, 8].includes(c.value)).length * 5 }) },
  { name: 'Shoot the Moon', emoji: '🌙', description: '+30 Mult if all Hearts', cost: 6, rarity: 'uncommon', type: 'suit_trigger',
    effect: (hand, base) => ({ ...base, mult: base.mult + (hand.length >= 5 && hand.every(c => c.suit === 'hearts') ? 30 : 0) }) },

  // Rare - powerful but expensive
  { name: 'Mad Joker', emoji: '😈', description: '+25 Mult if Four of a Kind', cost: 8, rarity: 'rare', type: 'hand_trigger',
    effect: (_, base) => ({ ...base, mult: base.mult + (base.handType === 'four_kind' ? 25 : 0) }) },
  { name: 'Sexy Joker', emoji: '💋', description: '+50 Mult if Flush', cost: 8, rarity: 'rare', type: 'hand_trigger',
    effect: (_, base) => ({ ...base, mult: base.mult + (base.handType === 'flush' || base.handType === 'royal_flush' ? 50 : 0) }) },
  { name: 'Baron', emoji: '👑', description: '+25 Mult per King held', cost: 8, rarity: 'rare', type: 'value_trigger',
    effect: (hand, base, state) => ({ ...base, mult: base.mult + state.heldCards.filter(c => c.value === 13).length * 25 }) },
  { name: 'Space Joker', emoji: '🚀', description: 'x2 Mult if hand has 5 cards', cost: 7, rarity: 'rare', type: 'special',
    effect: (hand, base) => hand.length >= 5 ? { ...base, mult: base.mult * 2 } : base },
  { name: 'Blue Joker', emoji: '💎', description: '+50 Chips if played 5 cards', cost: 7, rarity: 'rare', type: 'special',
    effect: (hand, base) => ({ ...base, chips: base.chips + (hand.length >= 5 ? 50 : 0) }) },

  // Legendary - game changers
  { name: 'Balatro Joker', emoji: '🏆', description: '+100 Mult', cost: 15, rarity: 'legendary', type: 'flat_mult',
    effect: (_, base) => ({ ...base, mult: base.mult + 100 }) },
  { name: 'Chaos Joker', emoji: '🌪️', description: 'x3 Mult', cost: 20, rarity: 'legendary', type: 'flat_mult',
    effect: (_, base) => ({ ...base, mult: base.mult * 3 }) },
];

// Planet cards - enhance hand types
const PLANET_POOL: PlanetCard[] = [
  { id: 'planet-pair', name: 'Planet Pair', description: '+5 Mult to Pair', handType: 'pair', bonusChips: 5, bonusMult: 5 },
  { id: 'planet-two-pair', name: 'Planet Two Pair', description: '+10 Mult to Two Pair', handType: 'two_pair', bonusChips: 10, bonusMult: 10 },
  { id: 'planet-three-kind', name: 'Planet Trips', description: '+15 Mult to Three of a Kind', handType: 'three_kind', bonusChips: 15, bonusMult: 15 },
  { id: 'planet-straight', name: 'Planet Straight', description: '+20 Mult to Straight', handType: 'straight', bonusChips: 20, bonusMult: 20 },
  { id: 'planet-flush', name: 'Planet Flush', description: '+25 Mult to Flush', handType: 'flush', bonusChips: 25, bonusMult: 25 },
  { id: 'planet-full-house', name: 'Planet Full House', description: '+30 Mult to Full House', handType: 'full_house', bonusChips: 30, bonusMult: 30 },
  { id: 'planet-four-kind', name: 'Planet Quads', description: '+40 Mult to Four of a Kind', handType: 'four_kind', bonusChips: 40, bonusMult: 40 },
  { id: 'planet-straight-flush', name: 'Planet SF', description: '+50 Mult to Straight Flush', handType: 'straight_flush', bonusChips: 50, bonusMult: 50 },
];

// Tarot cards - strategic utility
const TAROT_POOL: Omit<TarotCard, 'id'>[] = [
  { name: 'The Fool', emoji: '🃏', description: 'Draw 3 cards', cost: 3,
    effect: (hand, deck, handSize) => ({ hand, deck: deck.slice(3), handSize: Math.min(handSize + 3, 8), discards: 0 }) },
  { name: 'The Magician', emoji: '🪄', description: 'Enhance 1 card (Glass)', cost: 3,
    effect: (hand, deck, handSize) => ({
      hand: hand.map((c, i) => i === 0 ? { ...c, enhanced: 'glass' as const } : c),
      deck, handSize, discards: 0
    }) },
  { name: 'The High Priestess', emoji: '🔮', description: 'Add 2 red Seals', cost: 3,
    effect: (hand, deck, handSize, discards) => ({
      hand: hand.map((c, i) => i < 2 ? { ...c, seal: 'red' as const } : c),
      deck, handSize, discards
    }) },
  { name: 'The Empress', emoji: '👑', description: 'Enhance 2 cards (Mult)', cost: 3,
    effect: (hand, deck, handSize) => ({
      hand: hand.map((c, i) => i < 2 ? { ...c, enhanced: 'mult' as const } : c),
      deck, handSize, discards: 0
    }) },
  { name: 'The Emperor', emoji: '⚔️', description: 'Enhance 2 cards (Chips)', cost: 3,
    effect: (hand, deck, handSize) => ({
      hand: hand.map((c, i) => i < 2 ? { ...c, enhanced: 'chips' as const } : c),
      deck, handSize, discards: 0
    }) },
  { name: 'The Hierophant', emoji: '⛪', description: 'Add 2 blue Seals', cost: 3,
    effect: (hand, deck, handSize, discards) => ({
      hand: hand.map((c, i) => i < 2 ? { ...c, seal: 'blue' as const } : c),
      deck, handSize, discards
    }) },
  { name: 'The Lovers', emoji: '💕', description: 'Enhance 3 cards (Mult)', cost: 4,
    effect: (hand, deck, handSize) => ({
      hand: hand.map((c, i) => i < 3 ? { ...c, enhanced: 'mult' as const } : c),
      deck, handSize, discards: 0
    }) },
  { name: 'The Chariot', emoji: '🏃', description: 'Enhance 1 card (Steel)', cost: 4,
    effect: (hand, deck, handSize) => ({
      hand: hand.map((c, i) => i === 0 ? { ...c, enhanced: 'steel' as const } : c),
      deck, handSize, discards: 0
    }) },
  { name: 'Strength', emoji: '💪', description: 'Add 2 gold Seals', cost: 4,
    effect: (hand, deck, handSize, discards) => ({
      hand: hand.map((c, i) => i < 2 ? { ...c, seal: 'gold' as const } : c),
      deck, handSize, discards
    }) },
  { name: 'Wheel of Fortune', emoji: '🎡', description: 'Add 1 Joker (random)', cost: 5,
    effect: (hand, deck, handSize, discards) => ({ hand, deck, handSize, discards }) }, // Special case handled in code
  { name: 'Temperance', emoji: '🍷', description: 'Heal all played hands', cost: 4,
    effect: (hand, deck, handSize) => ({ hand, deck, handSize: 4, discards: 0 }) },
  { name: 'The Devil', emoji: '😈', description: 'Destroy 1 card', cost: 3,
    effect: (hand, deck, handSize, discards) => ({ hand: hand.slice(1), deck, handSize, discards }) },
  { name: 'The Tower', emoji: '🗼', description: 'Add 1 Stone card to deck', cost: 3,
    effect: (hand, deck, handSize, discards) => ({ hand, deck, handSize, discards }) }, // Special
  { name: 'The Star', emoji: '⭐', description: '+2 Discards', cost: 4,
    effect: (hand, deck, handSize, discards) => ({ hand, deck, handSize, discards: discards + 2 }) },
  { name: 'The Moon', emoji: '🌙', description: '+1 Hand', cost: 4,
    effect: (hand, deck, handSize, discards) => ({ hand, deck, handSize: handSize + 1, discards }) },
  { name: 'The Sun', emoji: '☀️', description: '+1 Hand, +1 Discard', cost: 5,
    effect: (hand, deck, handSize, discards) => ({ hand, deck, handSize: handSize + 1, discards: discards + 1 }) },
  { name: 'Judgement', emoji: '⚖️', description: 'Add 1 random Joker', cost: 6,
    effect: (hand, deck, handSize, discards) => ({ hand, deck, handSize, discards }) }, // Special
  { name: 'The World', emoji: '🌍', description: 'Enhance all cards (Mult)', cost: 6,
    effect: (hand, deck, handSize) => ({
      hand: hand.map(c => ({ ...c, enhanced: 'mult' as const })),
      deck, handSize, discards: 0
    }) },
];

// Hand scores - balanced for difficulty
const HAND_SCORES: Record<HandType, { chips: number; mult: number; name: string }> = {
  high_card: { chips: 5, mult: 1, name: 'High Card' },
  pair: { chips: 10, mult: 2, name: 'Pair' },
  two_pair: { chips: 20, mult: 2, name: 'Two Pair' },
  three_kind: { chips: 30, mult: 3, name: 'Three of a Kind' },
  straight: { chips: 40, mult: 4, name: 'Straight' },
  flush: { chips: 45, mult: 4, name: 'Flush' },
  full_house: { chips: 50, mult: 4, name: 'Full House' },
  four_kind: { chips: 60, mult: 7, name: 'Four of a Kind' },
  straight_flush: { chips: 80, mult: 8, name: 'Straight Flush' },
  royal_flush: { chips: 100, mult: 10, name: 'Royal Flush' },
};

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

const evaluateHand = (cards: Card[], heldCards: Card[] = []): ScoreResult => {
  if (cards.length === 0) {
    return { chips: 0, mult: 0, handType: 'high_card', handName: 'No Cards', bonuses: [] };
  }

  const values = cards.map(c => c.value).sort((a, b) => a - b);
  const suits = cards.map(c => c.suit);
  const valueCounts: Record<number, number> = {};
  values.forEach(v => { valueCounts[v] = (valueCounts[v] || 0) + 1; });
  const counts = Object.values(valueCounts).sort((a, b) => b - a);

  const isFlush = suits.every(s => s === suits[0]) && cards.length >= 5;

  const uniqueValues = Array.from(new Set(values));
  let isStraight = false;
  if (uniqueValues.length >= 5) {
    for (let i = 0; i <= uniqueValues.length - 5; i++) {
      if (uniqueValues[i + 4] - uniqueValues[i] === 4) {
        isStraight = true;
        break;
      }
    }
    if (uniqueValues.includes(1) && uniqueValues.includes(2) && uniqueValues.includes(3) &&
        uniqueValues.includes(4) && uniqueValues.includes(5)) {
      isStraight = true;
    }
  }

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
  let cardChips = cards.reduce((sum, c) => {
    let chipValue = c.value === 1 ? 11 : Math.min(c.value, 10);
    if (c.enhanced === 'chips' || c.enhanced === 'steel') chipValue += 10;
    if (c.enhanced === 'bonus') chipValue += 5;
    if (c.seal === 'blue') chipValue += 25;
    if (c.seal === 'gold') chipValue += 50;
    return sum + chipValue;
  }, 0);

  let mult = base.mult;
  if (cards.some(c => c.enhanced === 'mult' || c.enhanced === 'glass')) mult += 4;
  if (cards.some(c => c.enhanced === 'red_mult')) mult += 5;
  if (cards.some(c => c.seal === 'red')) mult += 15;
  if (cards.some(c => c.seal === 'purple')) mult += 20;

  // Held cards bonus
  mult += heldCards.filter(c => c.value === 13).length * 2;

  // Glass cards double
  const glassCount = cards.filter(c => c.enhanced === 'glass').length;
  if (glassCount > 0) mult *= (2 ** glassCount);

  return {
    chips: base.chips + cardChips,
    mult,
    handType,
    handName: base.name,
    bonuses: [],
  };
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function PokerRoguelikeGame() {
  const [phase, setPhase] = useState<GamePhase>('playing');
  const [deck, setDeck] = useState<Card[]>([]);
  const [hand, setHand] = useState<Card[]>([]);
  const [heldCards, setHeldCards] = useState<Card[]>([]);
  const [jokers, setJokers] = useState<Joker[]>([]);
  const [money, setMoney] = useState(2); // Reduced starting money
  const [score, setScore] = useState(0);
  const [roundScore, setRoundScore] = useState(0);
  const [blindIndex, setBlindIndex] = useState(0);
  const [handsLeft, setHandsLeft] = useState(3); // Reduced
  const [discardsLeft, setDiscardsLeft] = useState(3);
  const [maxHandSize, setMaxHandSize] = useState(8);
  const [shopJokers, setShopJokers] = useState<Joker[]>([]);
  const [shopTarots, setShopTarots] = useState<TarotCard[]>([]);
  const [shopPlanets, setShopPlanets] = useState<PlanetCard[]>([]);
  const [lastScore, setLastScore] = useState<ScoreResult | null>(null);
  const [handsPlayed, setHandsPlayed] = useState(0);
  const [interestRate, setInterestRate] = useState(0);

  const currentBlind = BLINDS[Math.min(blindIndex, BLINDS.length - 1)];

  const initGame = useCallback(() => {
    const newDeck = shuffleDeck(createDeck());
    setDeck(newDeck.slice(8));
    setHand(newDeck.slice(0, 8).map(c => ({ ...c, selected: false })));
    setHeldCards([]);
    setJokers([]);
    setMoney(2); // Hard mode: start with $2
    setScore(0);
    setRoundScore(0);
    setBlindIndex(0);
    setHandsLeft(3);
    setDiscardsLeft(3);
    setMaxHandSize(8);
    setPhase('playing');
    setLastScore(null);
    setHandsPlayed(0);
    setInterestRate(0);
  }, []);

  useEffect(() => {
    initGame();
  }, [initGame]);

  const drawCards = useCallback((count: number) => {
    const toDraw = Math.min(count, deck.length);
    const newCards = deck.slice(0, toDraw).map(c => ({ ...c, selected: false }));
    setDeck(prev => prev.slice(toDraw));
    setHand(prev => [...prev, ...newCards].slice(0, maxHandSize));
  }, [deck, maxHandSize]);

  const toggleCard = useCallback((cardId: string) => {
    setHand(prev => prev.map(c =>
      c.id === cardId ? { ...c, selected: !c.selected } : c
    ));
  }, []);

  const toggleHold = useCallback((cardId: string) => {
    const card = hand.find(c => c.id === cardId);
    if (!card) return;

    if (heldCards.some(c => c.id === cardId)) {
      setHeldCards(prev => prev.filter(c => c.id !== cardId));
    } else {
      setHeldCards(prev => [...prev, card]);
    }
  }, [hand, heldCards]);

  const playHand = useCallback(() => {
    const selected = hand.filter(c => c.selected);
    if (selected.length === 0 || handsLeft <= 0) return;

    let result = evaluateHand(selected, heldCards);

    // Apply joker effects
    const gameState: GameState = {
      jokers,
      heldCards,
      glassCards: selected.filter(c => c.enhanced === 'glass').length,
      steelCards: selected.filter(c => c.enhanced === 'steel').length,
      redMults: selected.filter(c => c.enhanced === 'red_mult').length,
      blueChips: selected.filter(c => c.enhanced === 'blue_chip').length,
    };

    for (const joker of jokers) {
      result = joker.effect(selected, result, gameState);
    }

    const finalScore = result.chips * result.mult;
    const newRoundScore = roundScore + finalScore;

    setLastScore(result);
    setRoundScore(newRoundScore);
    setHandsLeft(prev => prev - 1);
    setHandsPlayed(prev => prev + 1);
    setHand(prev => prev.filter(c => !c.selected));

    // Enhanced card bonuses
    const enhancedChips = selected.reduce((sum, c) => {
      if (c.enhanced === 'steel') return sum + 15;
      if (c.enhanced === 'bonus') return sum + 10;
      return sum;
    }, 0);

    // Seal bonuses
    const sealMult = selected.reduce((sum, c) => {
      if (c.seal === 'red') return sum + 15;
      if (c.seal === 'purple') return sum + 20;
      return sum;
    }, 0);

    setTimeout(() => {
      if (newRoundScore >= currentBlind.chips) {
        if (blindIndex >= BLINDS.length - 1) {
          setPhase('won');
        } else {
          // Calculate interest (every $25 = +1 interest rate)
          const interestEarned = Math.floor(money / 25);
          setInterestRate(interestEarned);
          setMoney(prev => prev + currentBlind.reward + interestEarned);
          generateShop();
          setPhase('shop');
        }
      } else if (handsLeft <= 0) {
        setPhase('lost');
      } else {
        const toDraw = Math.min(maxHandSize - hand.filter(c => !c.selected).length, deck.length);
        if (toDraw > 0) {
          drawCards(toDraw);
        }
      }
    }, 500);
  }, [hand, handsLeft, jokers, roundScore, currentBlind, blindIndex, deck, heldCards, maxHandSize, drawCards, money]);

  const discardCards = useCallback(() => {
    const selected = hand.filter(c => c.selected);
    if (selected.length === 0 || discardsLeft <= 0) return;

    setDiscardsLeft(prev => prev - 1);
    setHand(prev => prev.filter(c => !c.selected));

    const toDraw = Math.min(selected.length, deck.length);
    if (toDraw > 0) {
      drawCards(toDraw);
    }
  }, [hand, discardsLeft, deck, drawCards]);

  const generateShop = useCallback(() => {
    // Generate jokers
    const availableJokers = JOKER_POOL.filter(j => !jokers.some(owned => owned.name === j.name));
    const shuffledJokers = [...availableJokers].sort(() => Math.random() - 0.5);
    const shopJks: Joker[] = shuffledJokers.slice(0, 3).map((j, i) => ({
      ...j,
      id: `joker-${Date.now()}-${i}`,
    }));
    setShopJokers(shopJks);

    // Generate tarots
    const shuffledTarots = [...TAROT_POOL].sort(() => Math.random() - 0.5);
    const shopTr: TarotCard[] = shuffledTarots.slice(0, 3).map((t, i) => ({
      ...t,
      id: `tarot-${Date.now()}-${i}`,
    }));
    setShopTarots(shopTr);

    // Generate planets
    const shuffledPlanets = [...PLANET_POOL].sort(() => Math.random() - 0.5);
    setShopPlanets(shuffledPlanets.slice(0, 2));
  }, [jokers]);

  const rerollShop = useCallback(() => {
    if (money < 1) return;
    setMoney(prev => prev - 1);
    generateShop();
  }, [money, generateShop]);

  const buyJoker = useCallback((joker: Joker) => {
    if (money < joker.cost || jokers.length >= 5) return;
    setMoney(prev => prev - joker.cost);
    setJokers(prev => [...prev, joker]);
    setShopJokers(prev => prev.filter(j => j.id !== joker.id));
  }, [money, jokers]);

  const buyTarot = useCallback((tarot: TarotCard) => {
    if (money < tarot.cost) return;
    setMoney(prev => prev - tarot.cost);
    setShopTarots(prev => prev.filter(t => t.id !== tarot.id));

    // Apply tarot effect (simplified - enhance first card)
    const enhancedTypes: Card['enhanced'][] = ['mult', 'chips', 'glass', 'steel', 'bonus', 'wild', 'red_mult', 'blue_chip'];
    if (hand.length > 0 && Math.random() > 0.5) {
      const randomIdx = Math.floor(Math.random() * Math.min(3, hand.length));
      setHand(prev => prev.map((c, i) =>
        i === randomIdx ? { ...c, enhanced: enhancedTypes[Math.floor(Math.random() * 4)] } : c
      ));
    }
  }, [money, hand]);

  const buyPlanet = useCallback((planet: PlanetCard) => {
    if (money < 5) return;
    setMoney(prev => prev - 5);
    setShopPlanets(prev => prev.filter(p => p.id !== planet.id));

    // Apply planet effect - boost next hand of that type
    setLastScore({
      chips: planet.bonusChips,
      mult: planet.bonusMult,
      handType: planet.handType,
      handName: `${planet.name} Active!`,
      bonuses: [{ source: planet.name, chips: planet.bonusChips, mult: planet.bonusMult }],
    });
  }, [money]);

  const continueGame = useCallback(() => {
    const newDeck = shuffleDeck(createDeck());
    setDeck(newDeck.slice(8));
    setHand(newDeck.slice(0, 8).map(c => ({ ...c, selected: false })));
    setHeldCards([]);
    setBlindIndex(prev => prev + 1);
    setRoundScore(0);
    setHandsLeft(3);
    setDiscardsLeft(3);
    setPhase('playing');
    setLastScore(null);
    setHandsPlayed(0);
  }, []);

  const generateShareText = useCallback(() => {
    const jokerList = jokers.map(j => j.emoji).join(' ');
    const result = phase === 'won' ? 'WON' : 'LOST';

    return `Poker Roguelike 🃏

${result} at Round ${blindIndex + 1} - ${currentBlind.name}
Score: ${roundScore.toLocaleString()} / ${currentBlind.chips.toLocaleString()}
Jokers: ${jokerList || 'None'}

Play at newlifesolutions.dev/games/poker-roguelike`;
  }, [phase, blindIndex, roundScore, currentBlind, jokers]);

  const selectedCards = useMemo(() => hand.filter(c => c.selected), [hand]);
  const previewScore = useMemo(() => {
    if (selectedCards.length === 0) return null;
    let result = evaluateHand(selectedCards, heldCards);

    const gameState: GameState = {
      jokers,
      heldCards,
      glassCards: 0,
      steelCards: 0,
      redMults: 0,
      blueChips: 0,
    };

    for (const joker of jokers) {
      result = joker.effect(selectedCards, result, gameState);
    }
    return result;
  }, [selectedCards, jokers, heldCards]);

  const renderCard = (card: Card, onClick?: () => void, onHold?: () => void) => {
    const isHeld = heldCards.some(c => c.id === card.id);
    let enhancedClass = '';
    if (card.enhanced === 'mult') enhancedClass = 'ring-2 ring-red-500';
    if (card.enhanced === 'chips') enhancedClass = 'ring-2 ring-blue-500';
    if (card.enhanced === 'glass') enhancedClass = 'ring-2 ring-cyan-400 shadow-[0_0_10px_cyan]';
    if (card.enhanced === 'steel') enhancedClass = 'ring-2 ring-gray-300';
    if (card.enhanced === 'bonus') enhancedClass = 'ring-2 ring-yellow-400';

    let seal = null;
    if (card.seal === 'red') seal = <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500" />;
    if (card.seal === 'blue') seal = <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-blue-500" />;
    if (card.seal === 'gold') seal = <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-yellow-400" />;
    if (card.seal === 'purple') seal = <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-purple-500" />;

    return (
      <div
        key={card.id}
        className={`relative ${enhancedClass}`}
      >
        <div
          onClick={onClick}
          className={`
            w-14 h-20 sm:w-16 sm:h-24 rounded-lg cursor-pointer
            bg-white border-2 transition-all select-none
            flex flex-col justify-between p-1
            ${card.selected ? 'border-[var(--accent)] -translate-y-2 shadow-lg' : 'border-gray-300 hover:border-gray-400'}
            ${isHeld ? 'border-yellow-500 border-double border-4' : ''}
          `}
        >
          {seal}
          <div className="text-xs font-bold" style={{ color: SUIT_COLORS[card.suit] }}>
            {VALUE_NAMES[card.value]}{SUIT_SYMBOLS[card.suit]}
          </div>
          <div className="text-xl text-center" style={{ color: SUIT_COLORS[card.suit] }}>
            {SUIT_SYMBOLS[card.suit]}
          </div>
        </div>
        {onHold && (
          <button
            onClick={(e) => { e.stopPropagation(); onHold(); }}
            className={`absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs px-2 py-0.5 rounded ${
              isHeld ? 'bg-yellow-500 text-black' : 'bg-gray-600 text-white'
            }`}
          >
            {isHeld ? 'HELD' : 'HOLD'}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-2 flex-wrap gap-2">
        <div className="flex gap-3 flex-wrap">
          <div className="glass-card px-3 py-1 rounded">
            <span className="text-xs text-[var(--text-muted)]">Round </span>
            <span className="font-mono font-bold">{blindIndex + 1}/{BLINDS.length}</span>
          </div>
          <div className="glass-card px-3 py-1 rounded">
            <span className="text-xs text-[var(--text-muted)]">💰 </span>
            <span className="font-mono font-bold">${money}</span>
          </div>
          {interestRate > 0 && (
            <div className="glass-card px-3 py-1 rounded bg-yellow-900/30">
              <span className="text-xs text-yellow-400">+{interestRate} interest</span>
            </div>
          )}
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
                {currentBlind.desc}
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
            <div className="flex gap-2 justify-center flex-wrap" style={{ paddingBottom: '1.5rem' }}>
              {hand.map(card => renderCard(card, () => toggleCard(card.id), () => toggleHold(card.id)))}
            </div>
          </div>

          {/* Held Cards Info */}
          {heldCards.length > 0 && (
            <div className="text-center text-xs text-yellow-400">
              {heldCards.length} card(s) held - these stay between hands
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-center flex-wrap">
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
            <p className="text-[var(--text-muted)]">Buy Jokers, Tarots & Planets</p>
            <p className="text-lg font-mono text-[var(--success)] mt-2">💰 ${money}</p>
            {interestRate > 0 && (
              <p className="text-sm text-yellow-400">+{interestRate} interest earned!</p>
            )}
          </div>

          <button
            onClick={rerollShop}
            disabled={money < 1}
            className="w-full btn-secondary py-2 disabled:opacity-50"
          >
            🔄 Reroll Shop ($1)
          </button>

          {/* Jokers */}
          <div>
            <h3 className="text-sm font-bold mb-2 text-[var(--text)]">🎭 Jokers</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              {shopJokers.map(joker => (
                <div key={joker.id} className="glass-card p-4 rounded-lg text-center">
                  <div className="text-4xl mb-2">{joker.emoji}</div>
                  <div className="font-bold text-[var(--text)]">{joker.name}</div>
                  <div className="text-xs text-[var(--text-dim)] mb-3">{joker.description}</div>
                  <div className="text-xs text-[var(--text-muted)] mb-2">[{joker.rarity}]</div>
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
          </div>

          {/* Tarots */}
          <div>
            <h3 className="text-sm font-bold mb-2 text-[var(--text)]">🃏 Tarots</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              {shopTarots.map(tarot => (
                <div key={tarot.id} className="glass-card p-4 rounded-lg text-center">
                  <div className="text-3xl mb-2">{tarot.emoji}</div>
                  <div className="font-bold text-[var(--text)] text-sm">{tarot.name}</div>
                  <div className="text-xs text-[var(--text-dim)] mb-2">{tarot.description}</div>
                  <button
                    onClick={() => buyTarot(tarot)}
                    disabled={money < tarot.cost}
                    className={`px-4 py-2 rounded text-sm transition-all ${
                      money >= tarot.cost
                        ? 'bg-purple-600 text-white hover:opacity-80'
                        : 'bg-[var(--border)] text-[var(--text-muted)] cursor-not-allowed'
                    }`}
                  >
                    ${tarot.cost}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Planets */}
          <div>
            <h3 className="text-sm font-bold mb-2 text-[var(--text)]">🪐 Planets ($5 each)</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {shopPlanets.map(planet => (
                <div key={planet.id} className="glass-card p-4 rounded-lg text-center">
                  <div className="font-bold text-[var(--text)]">{planet.name}</div>
                  <div className="text-xs text-[var(--text-dim)] mb-2">{planet.description}</div>
                  <button
                    onClick={() => buyPlanet(planet)}
                    disabled={money < 5}
                    className={`px-4 py-2 rounded text-sm transition-all ${
                      money >= 5
                        ? 'bg-blue-600 text-white hover:opacity-80'
                        : 'bg-[var(--border)] text-[var(--text-muted)] cursor-not-allowed'
                    }`}
                  >
                    $5
                  </button>
                </div>
              ))}
            </div>
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
