# HAMBREDEVICTORIA - RAPID INTEGRATION PLAN
# ShareGame Integration - 3 Remaining Games

**Status:** Ready for Execution
**Estimated Time:** 5-7 minutes
**Protocol:** Systematic + Aggressive

---

## Integration Status Check

### ✅ Already Integrated (1/4)
- PDFStackGame.tsx: ✅ Complete (commit a32ef80)

### ⏳ Pending Integration (3/4)
- ColorMatchGame.tsx: 738 lines - NEEDS ShareGame
- PokerRoguelikeGame.tsx: 604 lines - NEEDS ShareGame
- SolitaireGame.tsx: 592 lines - NEEDS ShareGame
- TypingSpeedGame.tsx: 36071 lines - MAYBE ShareGame
- WordGuessGame.tsx: 24551 lines - MAYBE ShareGame

---

## Component Integration Template

```tsx
// Add to imports:
import ShareGame from './ShareGame';

// Find game over state and add:
{gameState === 'gameOver' && (
  <div className="mt-4">
    <ShareGame
      gameName="Game Name"
      score={finalScore}
      scoreLabel="Score" // or "WPM", "Level", etc.
    />
  </div>
)}
```

---

## Quick Implementation Steps

1. **ColorMatchGame.tsx** (738 lines):
   - Add import
   - Find game over UI section
   - Add ShareGame component
   - Use: score={score}, scoreLabel="Score"

2. **PokerRoguelikeGame.tsx** (604 lines):
   - Add import
   - Find game over (defeat victory)
   - Add ShareGame component
   - Use: score={score}, scoreLabel="Score"

3. **SolitaireGame.tsx** (592 lines):
   - Add import
   - Find victory modal/screen
   - Add ShareGame component
   - Use: score={moves} or time-based score

---

## Victory Criteria

✅ ShareGame integrated in all 3 remaining games
✅ Each game uses appropriate score prop
✅ Labels match game metrics (Score/WPM/Moves/etc.)
✅ No duplicate share logic remains
✅ All compile and run successfully
✅ Single atomic commit for all 3
✅ Push to production

---

**Time to Victory: 5-7 minutes**
**Confidence: 100%**
**Protocol: HAMBREDEVICTORIA**
