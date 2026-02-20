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
  emoji?: string;
  howToPlay?: Array<{
    emoji: string;
    title: string;
    description: string;
  }>;
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
  faq?: Array<{
    question: string;
    answer: string;
  }>;
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
    emoji: '📄',
    howToPlay: [
      { emoji: '👀', title: 'Watch', description: 'Watch the PDF document move back and forth across the screen.' },
      { emoji: '👆', title: 'Drop', description: 'Tap the screen or press SPACE to drop it onto the stack.' },
      { emoji: '📚', title: 'Stack', description: 'Stack PDFs on top of each other — center them for bonus points!' },
      { emoji: '🏆', title: 'Challenge', description: 'Miss the stack and the game is over. Share your score to challenge friends!' }
    ],
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
    emoji: '📝',
    howToPlay: [
      { emoji: '📝', title: 'Guess', description: 'Type a 5-letter word and press ENTER to submit your guess.' },
      { emoji: '🟩', title: 'Clues', description: 'Each guess reveals color-coded clues about the hidden word.' },
      { emoji: '🧠', title: 'Narrow Down', description: 'Use the feedback to eliminate possibilities and narrow your guesses.' },
      { emoji: '🎯', title: '6 Attempts', description: 'You have 6 attempts to guess the word correctly.' }
    ],
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
    description: 'Follow the color sequence and test your memory! A classic Simon Says style game with progressive difficulty.',
    thumbnail: '/thumbnails/games/color-match.svg',
    category: 'casual',
    status: 'live',
    href: '/games/color-match',
    isNew: true,
    releaseDate: '2026-01-01',
    emoji: '🎮',
    howToPlay: [
      { emoji: '👀', title: 'Watch', description: 'Pay attention as the colors light up in sequence. Each round adds one more color to remember.' },
      { emoji: '👆', title: 'Repeat', description: 'Click the colors in the same order. Get it right to advance. One mistake and it\'s game over!' },
      { emoji: '⚡', title: 'Speed Up', description: 'As you progress, the sequence plays faster. Stay focused and keep your rhythm!' },
      { emoji: '🔥', title: 'Hard Mode', description: 'Reach level 11 to unlock Hard Mode with 6 colors instead of 4. Can you master it?' }
    ],
    stats: [
      { label: 'Mode', value: 'Endless + Hard Mode' },
      { label: 'Difficulty', value: 'Progressive (4→6 colors)' },
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
  // CARD GAMES
  // ===============================================
  {
    id: 'poker-roguelike',
    name: 'Poker Roguelike',
    description: 'Play poker hands to beat the blinds! Collect Jokers with special powers and multipliers. A roguelike deck-builder inspired by Balatro.',
    thumbnail: '/thumbnails/games/poker-roguelike.svg',
    category: 'puzzle',
    status: 'live',
    href: '/games/poker-roguelike',
    isNew: true,
    releaseDate: '2026-01-01',
    emoji: '🃏',
    howToPlay: [
      { emoji: '🎯', title: 'Goal', description: 'Score enough points to beat each Blind. Defeat all 7 Blinds to win!' },
      { emoji: '🃏', title: 'Jokers', description: 'Buy Jokers between rounds. They add multipliers and special effects to your hands.' },
      { emoji: '✋', title: 'Hands', description: 'Select 1-5 cards to play poker hands. Better hands = more chips × multiplier.' },
      { emoji: '🔄', title: 'Discards', description: 'Use discards to swap bad cards. Plan carefully — they\'re limited!' }
    ],
    stats: [
      { label: 'Type', value: 'Roguelike Deck-Builder' },
      { label: 'Rounds', value: '7 Blinds' },
      { label: 'Jokers', value: '13+ to collect' }
    ],
    seo: {
      title: 'Poker Roguelike - Free Card Roguelike Game | New Life Games',
      metaDescription: 'Play poker hands to score points and beat the blinds. Collect Jokers with special multipliers. Free browser roguelike inspired by Balatro.',
      h1: 'Poker Roguelike - Deck-Builder Card Game',
      keywords: ['poker game', 'roguelike', 'card game', 'balatro', 'deck builder', 'free browser game']
    }
  },
  {
    id: 'solitaire',
    name: 'Solitaire',
    description: 'Classic Klondike Solitaire. Stack cards by alternating colors, build foundations from Ace to King. Drag and drop gameplay.',
    thumbnail: '/thumbnails/games/solitaire.svg',
    category: 'casual',
    status: 'live',
    href: '/games/solitaire',
    isNew: true,
    releaseDate: '2026-01-01',
    emoji: '🃏',
    howToPlay: [
      { emoji: '🎯', title: 'Goal', description: 'Move all cards to the four foundation piles, building each from Ace to King by suit.' },
      { emoji: '📚', title: 'Tableau', description: 'Stack cards in descending order, alternating colors (red on black, black on red).' },
      { emoji: '👆', title: 'Controls', description: 'Drag cards to move. Double-click to auto-move to foundation. Click stock to draw.' },
      { emoji: '👑', title: 'Empty Columns', description: 'Only Kings can be placed on empty tableau columns.' }
    ],
    stats: [
      { label: 'Type', value: 'Classic Klondike' },
      { label: 'Tracking', value: 'Moves & Time' },
      { label: 'Controls', value: 'Drag & Drop' }
    ],
    seo: {
      title: 'Solitaire - Free Classic Card Game | New Life Games',
      metaDescription: 'Play classic Klondike Solitaire for free. No download, no ads. Drag and drop cards, track your moves and time.',
      h1: 'Solitaire - Classic Card Game',
      keywords: ['solitaire', 'klondike', 'card game', 'free solitaire', 'browser card game']
    }
  },

  // ===============================================
  // LOGIC GAMES
  // ===============================================
  {
    id: 'binary-puzzle',
    name: 'Binary Puzzle',
    description: 'Solve binary grid puzzles with logic. Fill the grid with 0s and 1s following simple rules. Perfect brain training for developers.',
    thumbnail: '/thumbnails/games/binary-puzzle.svg',
    category: 'puzzle',
    status: 'live',
    href: '/games/binary-puzzle',
    isNew: true,
    releaseDate: '2026-01-11',
    emoji: '🔢',
    howToPlay: [
      { emoji: '🚫', title: 'No Triples', description: 'No more than two of the same number can be adjacent horizontally or vertically.' },
      { emoji: '⚖️', title: 'Balance', description: 'Each row and column must have an equal number of 0s and 1s.' },
      { emoji: '🔄', title: 'Unique Lines', description: 'No two rows and no two columns can be identical.' },
      { emoji: '▶️', title: 'Easy Controls', description: 'Click a cell and press 0 or 1 to fill. Gray cells are fixed and cannot be changed.' }
    ],
    stats: [
      { label: 'Difficulty', value: 'Easy/Hard' },
      { label: 'Grid size', value: '6x6 to 10x10' },
      { label: 'Mode', value: 'Single player' }
    ],
    seo: {
      title: 'Binary Puzzle - Free Logic Game | New Life Games',
      metaDescription: 'Solve binary logic puzzles. Fill grids with 0s and 1s following simple rules. Free brain training game for developers and logic lovers.',
      h1: 'Binary Puzzle - Logic Grid Game',
      keywords: ['binary puzzle', 'logic game', 'brain training', 'developer game', 'binary grid', 'logic puzzle']
    }
  },
  {
    id: 'word-search',
    name: 'Word Search',
    description: 'Find hidden tech-related words in the grid! Search for programming terms, developer jargon, and technology vocabulary.',
    thumbnail: '/thumbnails/games/word-search.svg',
    category: 'puzzle',
    status: 'live',
    href: '/games/word-search',
    isNew: true,
    releaseDate: '2026-01-11',
    emoji: '🔍',
    howToPlay: [
      { emoji: '👆', title: 'Click & Drag', description: 'Click on a letter and drag to select consecutive letters that form a word.' },
      { emoji: '➡️', title: 'Any Direction', description: 'Words can be horizontal, vertical, or diagonal — forwards or backwards.' },
      { emoji: '💻', title: 'Tech Vocabulary', description: 'Find programming terms, developer tools, and technology-related words.' },
      { emoji: '🏁', title: 'Find All Words', description: 'Race against time to find all hidden words and complete the puzzle.' }
    ],
    stats: [
      { label: 'Difficulty', value: '3 levels' },
      { label: 'Word types', value: 'Tech vocabulary' },
      { label: 'Mode', value: 'Single player' }
    ],
    seo: {
      title: 'Word Search - Free Tech Word Game | New Life Games',
      metaDescription: 'Find hidden tech-related words in the grid! Free word search game with programming terms and technology vocabulary.',
      h1: 'Word Search - Tech Vocabulary Puzzle',
      keywords: ['word search', 'tech words', 'programming vocabulary', 'word game', 'developer game']
    }
  },

  // ===============================================
  // ARCADE GAMES
  // ===============================================
  {
    id: 'fibonacci-2048',
    name: 'Fibonacci 2048',
    description: 'Merge Fibonacci numbers in this twist on the classic 2048 game! Swipe to combine 1, 1, 2, 3, 5, 8... How high can you reach?',
    thumbnail: '/thumbnails/games/fibonacci-2048.svg',
    category: 'arcade',
    status: 'live',
    href: '/games/fibonacci-2048',
    isNew: true,
    releaseDate: '2026-01-11',
    emoji: '🔢',
    howToPlay: [
      { emoji: '👆', title: 'Swipe or Arrows', description: 'Use arrow keys (or WASD) or swipe on mobile to move all tiles in one direction.' },
      { emoji: '🔄', title: 'Fibonacci Merge', description: 'Tiles combine when they sum to the next Fibonacci number (1+1=2, 1+2=3, 2+3=5, etc).' },
      { emoji: '🎯', title: 'Win Condition', description: 'Create a tile with value 144 (F₁₂) to win. The higher you go, the more points you score!' },
      { emoji: '💾', title: 'Strategy', description: 'Plan your moves carefully! Once the grid fills up with no valid merges, the game ends.' }
    ],
    stats: [
      { label: 'Goal', value: 'Reach 144' },
      { label: 'Mode', value: 'Single player' },
      { label: 'Controls', value: 'Swipe or Keyboard' }
    ],
    seo: {
      title: 'Fibonacci 2048 - Free Number Game | New Life Games',
      metaDescription: 'Merge Fibonacci numbers in this 2048 twist! Swipe to combine tiles. Free brain-teasing puzzle game with mathematical elegance.',
      h1: 'Fibonacci 2048 - Merge Numbers Strategically',
      keywords: ['2048 game', 'fibonacci', 'number puzzle', 'math game', 'strategy game', 'browser game']
    }
  },
  {
    id: 'snake-roguelike',
    name: 'Snake Roguelike',
    description: 'Guide your snake through 7 floors, collect relics with game-changing powers, and beat escalating score targets. A roguelike run inspired by Balatro.',
    thumbnail: '/thumbnails/games/snake-roguelike.svg',
    category: 'arcade',
    status: 'live',
    href: '/games/snake-roguelike',
    isNew: true,
    releaseDate: '2026-02-20',
    emoji: '🐍',
    howToPlay: [
      { emoji: '🎯', title: 'Goal', description: 'Reach the score target on each floor before time runs out. Clear all 7 floors to win the run!' },
      { emoji: '🎮', title: 'Controls', description: 'Arrow keys or WASD to move. Swipe on mobile. Space to activate Shrink Ray (if owned).' },
      { emoji: '💎', title: 'Relics', description: 'After each floor, pick 1 of 3 relics. They modify gameplay — some are powerful, some are risky.' },
      { emoji: '❤️', title: 'Lives', description: 'You have 3 lives. Wall or self-collision costs 1 life. Lose all 3 and the run ends.' }
    ],
    stats: [
      { label: 'Type', value: 'Roguelike Run' },
      { label: 'Floors', value: '7 to conquer' },
      { label: 'Relics', value: '10 to discover' }
    ],
    seo: {
      title: 'Snake Roguelike - Free Arcade Roguelike | New Life Games',
      metaDescription: 'Play snake with roguelike progression! Collect relics, beat 7 floors, and survive. Free browser game with 10 unique power-ups.',
      h1: 'Snake Roguelike - Arcade Roguelike Game',
      keywords: ['snake game', 'roguelike', 'arcade game', 'browser game', 'snake roguelike', 'free game']
    }
  },
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
    emoji: '⌨️',
    howToPlay: [
      { emoji: '⏱️', title: 'Choose Mode', description: 'Select your time mode (15s, 30s, 60s) or paste custom text.' },
      { emoji: '📝', title: 'Type Words', description: 'Type the highlighted words as fast and accurately as possible.' },
      { emoji: '⎵', title: 'Next Word', description: 'Press SPACE after each word to move to the next one.' },
      { emoji: '📊', title: 'Results', description: 'View your WPM, accuracy, and share your results!' }
    ],
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
