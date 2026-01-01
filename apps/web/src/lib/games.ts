export interface Game {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  category: 'puzzle' | 'arcade' | 'casual' | 'daily';
  status: 'live' | 'coming';
  href: string;
  isNew?: boolean;
  releaseDate?: string;
  stats?: Array<{
    label: string;
    value: string;
  }>;
  seo?: {
    title: string;
    metaDescription: string;
    h1: string;
    keywords: string[];
  };
}

export const games: Game[] = [
  // ===============================================
  // PUZZLE GAMES
  // ===============================================
  {
    id: 'pdf-stack',
    name: 'PDF Stack',
    description: 'Stack falling PDF pages in the correct order. A fast-paced puzzle game that tests your reflexes and organizational skills.',
    thumbnail: '/thumbnails/games/pdf-stack.svg',
    category: 'puzzle',
    status: 'live',
    href: '/games/pdf-stack',
    isNew: true,
    releaseDate: '2025-01-01',
    stats: [
      { label: 'Difficulty', value: 'Easy to Hard' },
      { label: 'Levels', value: '10+ challenges' },
      { label: 'Mode', value: 'Single player' }
    ],
    seo: {
      title: 'PDF Stack - Free Puzzle Game | New Life Games',
      metaDescription: 'Stack falling PDF pages in order in this addictive puzzle game. Free to play, no download required. Challenge your reflexes!',
      h1: 'PDF Stack - Page Stacking Puzzle Game',
      keywords: ['pdf game', 'puzzle game', 'stacking game', 'browser game free']
    }
  },

  // ===============================================
  // DAILY GAMES
  // ===============================================
  {
    id: 'word-guess',
    name: 'Word Guess',
    description: 'Guess the hidden word in 6 tries. A new word every day! Track your streak and share your results.',
    thumbnail: '/thumbnails/games/word-guess.svg',
    category: 'daily',
    status: 'live',
    href: '/games/word-guess',
    isNew: true,
    releaseDate: '2026-01-01',
    stats: [
      { label: 'Type', value: 'Daily challenge' },
      { label: 'Difficulty', value: 'Medium' },
      { label: 'Streak tracking', value: 'Yes' }
    ],
    seo: {
      title: 'Word Guess - Daily Word Game | New Life Games',
      metaDescription: 'Guess the hidden 5-letter word in 6 tries. New puzzle every day! Free word game with streak tracking.',
      h1: 'Word Guess - Daily Word Puzzle',
      keywords: ['word game', 'daily puzzle', 'wordle alternative', 'word guess game']
    }
  },

  // ===============================================
  // CASUAL GAMES
  // ===============================================
  {
    id: 'color-match',
    name: 'Color Match',
    description: 'Match colors as fast as you can! A relaxing yet challenging game that tests your color perception and speed.',
    thumbnail: '/thumbnails/games/color-match.svg',
    category: 'casual',
    status: 'coming',
    href: '/games/color-match',
    isNew: false,
    stats: [
      { label: 'Mode', value: 'Endless' },
      { label: 'Difficulty', value: 'Progressive' },
      { label: 'Leaderboard', value: 'Local high scores' }
    ],
    seo: {
      title: 'Color Match - Free Color Matching Game | New Life Games',
      metaDescription: 'Match colors as fast as you can in this addictive casual game. Free to play, no download. Test your color perception!',
      h1: 'Color Match - Speed Color Game',
      keywords: ['color game', 'matching game', 'casual game', 'browser game']
    }
  },

  // ===============================================
  // ARCADE GAMES
  // ===============================================
  {
    id: 'typing-speed',
    name: 'Typing Speed',
    description: 'Test and improve your typing speed. Race against the clock and track your WPM improvement over time.',
    thumbnail: '/thumbnails/games/typing-speed.svg',
    category: 'arcade',
    status: 'live',
    href: '/games/typing-speed',
    isNew: true,
    releaseDate: '2026-01-01',
    stats: [
      { label: 'Metrics', value: 'WPM, accuracy, errors' },
      { label: 'Modes', value: '15s, 30s, 60s, custom' },
      { label: 'Word Types', value: 'Common, programming' }
    ],
    seo: {
      title: 'Typing Speed Test - Free WPM Test | New Life Games',
      metaDescription: 'Test your typing speed and accuracy. Track WPM, compete with yourself, and improve over time. Free online typing test with multiple modes.',
      h1: 'Typing Speed Test - Measure Your WPM',
      keywords: ['typing test', 'wpm test', 'typing speed', 'typing game', 'keyboard speed test', 'online typing test']
    }
  }
];

/**
 * Get all games
 */
export const getAllGames = (): Game[] => games;

/**
 * Get games by category
 */
export const getGamesByCategory = (category: Game['category']): Game[] =>
  games.filter(g => g.category === category);

/**
 * Get games by status
 */
export const getGamesByStatus = (status: Game['status']): Game[] =>
  games.filter(g => g.status === status);

/**
 * Get a single game by ID
 */
export const getGameById = (id: string): Game | undefined =>
  games.find(g => g.id === id);

/**
 * Get live (playable) games
 */
export const getLiveGames = (): Game[] =>
  games.filter(g => g.status === 'live');

/**
 * Get coming soon games
 */
export const getComingSoonGames = (): Game[] =>
  games.filter(g => g.status === 'coming');

/**
 * Get new games (marked with isNew flag)
 */
export const getNewGames = (): Game[] =>
  games.filter(g => g.isNew);

/**
 * Category display info
 */
export const categoryInfo: Record<Game['category'], { label: string; icon: string; color: string }> = {
  puzzle: { label: 'Puzzle', icon: '🧩', color: 'from-violet-500 to-purple-500' },
  arcade: { label: 'Arcade', icon: '🕹️', color: 'from-orange-500 to-red-500' },
  casual: { label: 'Casual', icon: '🎮', color: 'from-cyan-500 to-blue-500' },
  daily: { label: 'Daily', icon: '📅', color: 'from-emerald-500 to-teal-500' }
};
