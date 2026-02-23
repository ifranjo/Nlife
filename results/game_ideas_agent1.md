# Nlife Games - New Game Concepts Proposal

## Executive Summary

This document proposes 5 new game concepts for Nlife Games that expand the current portfolio into new categories while maintaining the brand's core values: 100% client-side, no backend, privacy-first, and "utility meets entertainment."

**Current Portfolio (6 games):**
- Puzzle: PDF Stack
- Daily: Word Guess
- Casual: Color Match, Solitaire
- Arcade: Typing Speed
- Card: Poker Roguelike

**Target Categories for Expansion:**
- Word games (beyond Word Guess)
- Number/math puzzles
- Tile-matching games
- Relaxation/fidget games
- Educational gamified tools

---

## Game 1: Number Match

### Concept
A connect-2 style number merging puzzle where players tap adjacent matching numbers to merge them into the next higher number (2+2=4, 4+4=8, etc.). Inspired by "Get 10" and "Just Get 10" but with a modern Nlife aesthetic.

### Mechanics
- Grid of numbered tiles (starts at 2x2, expands to 5x5)
- Tap two adjacent tiles with same number to merge
- Merged tile shows next number (2→4→8→16→32→64→128→256→512→1024→2048)
- Game ends when no valid moves remain
- Score based on merged values and combos
- High score saved to localStorage
- Multiple board sizes for difficulty

### Why Nlife
- **Utility angle**: Improves number recognition, mental math, pattern recognition
- **Fits casual category**: Easy to pick up, short sessions, addictive loop
- **Complements existing**: Different from Word Guess (verbal) and PDF Stack (physical stacking)
- **No backend needed**: Pure localStorage for high scores

### Technical Notes
- React state for grid management
- CSS Grid for board layout with animated transitions
- localStorage for persistent high scores
- Touch-friendly for mobile
- Optional: Dark mode with neon accents matching Nlife aesthetic

### Similar Games
- "Get 10" - mobile app
- "Just Get 10" - web game
- "2048" - famous number puzzle (but different mechanics)

---

## Game 2: Word Chain

### Concept
A fast-paced word spelling game where players build chains of words by connecting adjacent letters. Each word must share the last letter with the next word's first letter (e.g., "APPLE" → "ELEPHANT" → "TIGER"). Daily challenges with increasing difficulty.

### Mechanics
- Grid of random letters (boggle-style)
- Player drags/swipes to connect adjacent letters
- Form valid English words of 3+ letters
- Chain bonus: Start new word with last letter of previous word
- Timed mode (60 seconds) or Zen mode (untimed)
- Dictionary validation via embedded word list (webkit-ated)
- Track streaks, longest chain, daily challenges

### Why Nlife
- **Utility angle**: Vocabulary building, spelling practice, cognitive exercise
- **Fits daily category**: New puzzle daily (like Word Guess but different mechanics)
- **Brand alignment**: "Word" in name leverages existing Word Guess player base
- **No backend needed**: Embedded word list (~10k words), localStorage for stats

### Technical Notes
- Embedded word list (JSON, ~50KB compressed)
- Boggle-style grid generation with vowel/consonant balance
- Canvas or SVG for letter path drawing
- localStorage for daily challenge seeds and streaks
- Share results as image (canvas export)

### Similar Games
- "Boggle" - classic board game
- "Word Chums" - mobile game
- "Word connect" apps

---

## Game 3: Tile Match (Mahjong-style)

### Concept
A simplified Mahjong Solitaire with clean, modern visuals. Match pairs of identical open tiles to clear the board. Features multiple layouts and a daily challenge mode.

### Mechanics
- 3D layered tile layout (classic turtle formation simplified)
- Tiles have symbols/icons (not Chinese characters - use universal icons)
- Only "open" tiles (no tile on top, free on left OR right) are clickable
- Match two identical open tiles to remove them
- Clear all tiles to win
- Timer, move counter, undo button
- Multiple layouts: Pyramid, Castle, Butterfly, Random
- Daily challenge with seeded layout

### Why Nlife
- **Utility angle**: Pattern recognition, spatial reasoning,Fits casual category meditation
- ****: Relaxing gameplay, similar to Solitaire
- **Complements Solitaire**: Card players might enjoy tile players
- **No backend needed**: Pre-defined layouts, localStorage stats

### Technical Notes
- React with CSS 3D transforms for tile layering
- Click detection with z-index management for "open" tiles
- Icon set: Use emoji or custom SVG icons (animals, nature, objects)
- Shuffle feature when stuck (costs points)
- Undo stack for moves
- Responsive: Scale tile size to viewport

### Similar Games
- "Mahjong Solitaire" - classic
- "Match 3D" - tile matching mobile game
- "Tile Master" - popular mobile game

---

## Game 4: Zen Flow

### Concept
A relaxation/fidget game where players connect glowing dots in flowing patterns. No score, no timer, no fail state - purely meditative. Draw patterns, create symmetries, unlock new color palettes.

### Mechanics
- Canvas with touch/click interaction
- Tap points to connect with smooth bezier curves
- Create mandalas, spirographs, geometric patterns
- Color palettes unlock as you create (start with 3, unlock 10+)
- Symmetry modes: radial, bilateral, kaleidoscope
- Save designs to gallery (localStorage)
- Export as PNG
- Background: Soothing ambient sounds (optional, Web Audio API)

### Why Nlife
- **Utility angle**: Stress relief, meditation, digital art creation
- **Fits relaxation niche**: No competition, no stress, pure creativity
- **Unique offering**: No other Nlife game is purely creative/relaxing
- **Brand extension**: "Flow" evokes productivity apps, appeals to professionals

### Technical Notes
- HTML5 Canvas for drawing (2D context with bezier curves)
- Web Audio API for ambient sounds (generated or small samples)
- localStorage for saved designs (store as JSON coordinates)
- Canvas toDataURL() for PNG export
- Radial symmetry math: rotate and reflect points
- Touch support with pressure sensitivity (if available)

### Similar Games
- "Flow Free" - popular puzzle game
- "Mandala maker" apps
- "Spirograph" digital versions

---

## Game 5: Math Sprint

### Concept
An arcade-style math game where players solve arithmetic problems against the clock. Race through addition, subtraction, multiplication, and division as difficulty increases. Inspired by typing speed tests but for math.

### Mechanics
- Arithmetic problems appear (addition, subtraction, multiplication, division)
- Type or click answer before time runs out
- Difficulty scales: 2-digit numbers, more operations, decimals
- Combo system: Correct answers in row increase multiplier
- Modes: Sprint (60s), Marathon (5min), Daily Challenge
- Track WPM-equivalent: Problems per minute (PPM)
- Leaderboard: Local high scores per mode
- Sound effects for correct/wrong answers (Web Audio)

### Why Nlife
- **Utility angle**: Mental math practice, brain training, educational
- **Fits arcade category**: Complements Typing Speed perfectly (speed + accuracy)
- **Brand alignment**: "Utility meets entertainment" - math practice that's fun
- **No backend needed**: localStorage for all stats and leaderboards

### Technical Notes
- Problem generation algorithm with difficulty tiers
- Input: Number pad UI + keyboard support
- Web Audio API for sound effects (beeps, success chimes)
- localStorage structure: `{ sprint: { score, date }, marathon: {...}, daily: {...} }`
- Visual feedback: Screen flash green/red, shake on wrong answer
- Mobile-friendly: Touch number pad

### Similar Games
- "Math Ninja" - mobile game
- "Math Duel" - split screen math game
- "Quick Math" - arithmetic speed game

---

## Implementation Priority

| Rank | Game | Effort | Impact | Recommendation |
|------|------|--------|--------|----------------|
| 1 | Math Sprint | Low | High | Quick win, complements Typing Speed |
| 2 | Word Chain | Medium | High | Daily game expands portfolio |
| 3 | Number Match | Low | Medium | Addictive, easy to build |
| 4 | Tile Match | Medium | Medium | Solitaire players will love |
| 5 | Zen Flow | Medium | Low | Niche, but unique offering |

---

## Technical Requirements Summary

All games require:
- React/TypeScript component architecture
- localStorage for persistence (high scores, settings, progress)
- CSS animations for polish
- Touch + mouse input support
- No external dependencies beyond React ecosystem
- No backend services

### Browser APIs Used
- **Canvas API**: Zen Flow drawing, Word Chain letter paths
- **Web Audio API**: Math Sprint sounds, Zen Flow ambient
- **localStorage**: All persistent data
- **Touch Events**: Mobile support
- **Clipboard API**: Share results (Word Chain)

---

## Next Steps

1. **Select 2-3 games** for initial development
2. **Create wireframes** for each selected game
3. **Define asset requirements** (icons, sounds, word lists)
4. **Build MVP** for each game
5. **Test and iterate** based on user feedback

---

*Document generated: 2026-02-22*
*Author: Claude Code - Game Design & Creative Strategy*
