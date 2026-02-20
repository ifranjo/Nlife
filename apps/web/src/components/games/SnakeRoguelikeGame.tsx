import { useState, useEffect, useCallback, useRef } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Pos { x: number; y: number; }

interface FoodItem { pos: Pos; type: 'normal' | 'golden'; value: number; }

interface Relic {
  id: string;
  name: string;
  emoji: string;
  description: string;
  onTick?: (state: GameState) => GameState;
  onEat?: (state: GameState, food: FoodItem) => GameState;
  onCollision?: (state: GameState) => GameState | null;
  onFloorStart?: (state: GameState) => GameState;
  onFloorEnd?: (state: GameState) => GameState;
}

interface GameState {
  snake: Pos[];
  direction: Pos;
  food: FoodItem[];
  score: number;
  floor: number;
  lives: number;
  timeLeft: number;
  scoreTarget: number;
  relics: Relic[];
  shieldUsed: boolean;
  shrinkUsed: boolean;
  multiplier: number;
  speedMs: number;
}

type Phase = 'menu' | 'playing' | 'shop' | 'gameover' | 'win';

// ─── Constants ───────────────────────────────────────────────────────────────

const GRID = 20;
const CELL = 20;
const BASE_SPEED = 150;
const BASE_TIME = 60;
const BASE_TARGET = 15;
const MAX_FLOOR = 7;
const INITIAL_LIVES = 3;
const STORAGE_KEY = 'snake-roguelike-best';

// ─── Relic Pool ──────────────────────────────────────────────────────────────

const RELIC_POOL: Relic[] = [
  {
    id: 'speed-demon', name: 'Speed Demon', emoji: '⚡',
    description: '+50% score multiplier, but snake is 20% faster',
    onFloorStart: (s) => ({ ...s, multiplier: s.multiplier + 0.5, speedMs: Math.round(s.speedMs * 0.8) }),
  },
  {
    id: 'ghost-phase', name: 'Ghost Phase', emoji: '👻',
    description: 'Walls wrap around — no wall collisions',
  },
  {
    id: 'multi-fruit', name: 'Multi-Fruit', emoji: '🍇',
    description: '3 fruits on the board at once',
  },
  {
    id: 'magnet', name: 'Magnet', emoji: '🧲',
    description: 'Food drifts toward your head each tick',
    onTick: (s) => {
      const head = s.snake[0];
      const food = s.food.map(f => {
        const dx = Math.sign(head.x - f.pos.x);
        const dy = Math.sign(head.y - f.pos.y);
        const nx = f.pos.x + (Math.random() < 0.3 ? dx : 0);
        const ny = f.pos.y + (Math.random() < 0.3 ? dy : 0);
        return { ...f, pos: { x: clamp(nx, 0, GRID - 1), y: clamp(ny, 0, GRID - 1) } };
      });
      return { ...s, food };
    },
  },
  {
    id: 'shield', name: 'Shield', emoji: '🛡️',
    description: 'Survive 1 self-collision per floor',
    onCollision: (s) => {
      if (!s.shieldUsed) return { ...s, shieldUsed: true };
      return null;
    },
    onFloorStart: (s) => ({ ...s, shieldUsed: false }),
  },
  {
    id: 'time-warp', name: 'Time Warp', emoji: '⏳',
    description: '+20s per floor, but score target +25%',
    onFloorStart: (s) => ({ ...s, timeLeft: s.timeLeft + 20, scoreTarget: Math.round(s.scoreTarget * 1.25) }),
  },
  {
    id: 'golden-apple', name: 'Golden Apple', emoji: '🍎',
    description: 'Rare 5× golden food spawns, normal food worth 0.5×',
  },
  {
    id: 'shrink-ray', name: 'Shrink Ray', emoji: '🔫',
    description: 'Press Space to halve snake length (once per floor)',
    onFloorStart: (s) => ({ ...s, shrinkUsed: false }),
  },
  {
    id: 'score-leech', name: 'Score Leech', emoji: '🧛',
    description: '+1 point per tick if snake length > 10',
    onTick: (s) => s.snake.length > 10 ? { ...s, score: s.score + 1 } : s,
  },
  {
    id: 'double-or-nothing', name: 'Double or Nothing', emoji: '🎰',
    description: 'Floor end: 50% chance 2× score, 50% chance 0.5×',
    onFloorEnd: (s) => {
      const lucky = Math.random() < 0.5;
      return { ...s, score: Math.round(s.score * (lucky ? 2 : 0.5)) };
    },
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)); }

function randomPos(exclude: Pos[]): Pos {
  const set = new Set(exclude.map(p => `${p.x},${p.y}`));
  let pos: Pos;
  do {
    pos = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
  } while (set.has(`${pos.x},${pos.y}`));
  return pos;
}

function hasRelic(state: GameState, id: string): boolean {
  return state.relics.some(r => r.id === id);
}

function spawnFood(state: GameState): FoodItem[] {
  const count = hasRelic(state, 'multi-fruit') ? 3 : 1;
  const hasGoldenApple = hasRelic(state, 'golden-apple');
  const items: FoodItem[] = [];
  const occupied = [...state.snake, ...items.map(f => f.pos)];
  for (let i = 0; i < count; i++) {
    const isGolden = hasGoldenApple && Math.random() < 0.15;
    items.push({
      pos: randomPos([...occupied, ...items.map(f => f.pos)]),
      type: isGolden ? 'golden' : 'normal',
      value: isGolden ? 5 : (hasGoldenApple ? 0.5 : 1),
    });
  }
  return items;
}

function getScoreTarget(floor: number): number {
  return Math.round(BASE_TARGET * (1 + (floor - 1) * 0.5));
}

function initialState(floor: number, relics: Relic[], prevScore: number, lives: number): GameState {
  const mid = Math.floor(GRID / 2);
  let state: GameState = {
    snake: [{ x: mid, y: mid }, { x: mid + 1, y: mid }, { x: mid + 2, y: mid }],
    direction: { x: -1, y: 0 },
    food: [],
    score: prevScore,
    floor,
    lives,
    timeLeft: BASE_TIME,
    scoreTarget: getScoreTarget(floor) + prevScore,
    relics,
    shieldUsed: false,
    shrinkUsed: false,
    multiplier: 1,
    speedMs: BASE_SPEED,
  };
  // Apply onFloorStart hooks
  for (const r of relics) {
    if (r.onFloorStart) state = r.onFloorStart(state);
  }
  state.food = spawnFood(state);
  return state;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function SnakeRoguelikeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<Phase>('menu');
  const [game, setGame] = useState<GameState>(() => initialState(1, [], 0, INITIAL_LIVES));
  const [shopChoices, setShopChoices] = useState<Relic[]>([]);
  const [bestScore, setBestScore] = useState(0);
  const [lastGamble, setLastGamble] = useState<string | null>(null);
  const dirRef = useRef<Pos>(game.direction);
  const touchRef = useRef<{ x: number; y: number } | null>(null);

  // Load best score
  useEffect(() => {
    try { setBestScore(Number(localStorage.getItem(STORAGE_KEY)) || 0); } catch {}
  }, []);

  // ─── Game Loop ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (phase !== 'playing') return;

    const tick = () => {
      setGame(prev => {
        let s = { ...prev, direction: dirRef.current };
        const head = s.snake[0];
        let nx = head.x + s.direction.x;
        let ny = head.y + s.direction.y;

        // Wall handling
        const ghost = hasRelic(s, 'ghost-phase');
        if (ghost) {
          nx = ((nx % GRID) + GRID) % GRID;
          ny = ((ny % GRID) + GRID) % GRID;
        } else if (nx < 0 || nx >= GRID || ny < 0 || ny >= GRID) {
          return handleCollision(s);
        }

        const newHead: Pos = { x: nx, y: ny };

        // Self collision
        if (s.snake.some(p => p.x === newHead.x && p.y === newHead.y)) {
          // Check shield
          const shieldRelic = s.relics.find(r => r.id === 'shield');
          if (shieldRelic?.onCollision) {
            const result = shieldRelic.onCollision(s);
            if (result) {
              // Shield absorbed — respawn without losing life
              return respawnSnake({ ...result });
            }
          }
          return handleCollision(s);
        }

        // Move snake
        const newSnake = [newHead, ...s.snake];

        // Check food
        const eatenIdx = s.food.findIndex(f => f.pos.x === newHead.x && f.pos.y === newHead.y);
        if (eatenIdx >= 0) {
          const eaten = s.food[eatenIdx];
          const points = Math.round(eaten.value * s.multiplier);
          s = { ...s, snake: newSnake, score: s.score + points };
          // Apply onEat hooks
          for (const r of s.relics) {
            if (r.onEat) s = r.onEat(s, eaten);
          }
          // Replace eaten food
          const remaining = s.food.filter((_, i) => i !== eatenIdx);
          s = { ...s, food: remaining };
          const newFood = spawnFood({ ...s, food: remaining });
          const combined = [...remaining];
          for (const f of newFood) {
            if (combined.length < (hasRelic(s, 'multi-fruit') ? 3 : 1)) combined.push(f);
          }
          s = { ...s, food: combined };
        } else {
          // No food — remove tail
          s = { ...s, snake: newSnake.slice(0, -1) };
        }

        // Apply onTick hooks
        for (const r of s.relics) {
          if (r.onTick) s = r.onTick(s);
        }

        return s;
      });
    };

    const id = setInterval(tick, game.speedMs);
    return () => clearInterval(id);
  }, [phase, game.speedMs]);

  // ─── Timer ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (phase !== 'playing') return;
    const id = setInterval(() => {
      setGame(prev => {
        if (prev.timeLeft <= 1) {
          // Time's up — lose a life
          if (prev.lives <= 1) return prev; // will be caught below
          return respawnSnake({ ...prev, lives: prev.lives - 1, timeLeft: BASE_TIME });
        }
        return { ...prev, timeLeft: prev.timeLeft - 1 };
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  // ─── Check win/lose/floor-clear ────────────────────────────────────────────

  useEffect(() => {
    if (phase !== 'playing') return;
    if (game.lives <= 0) {
      saveBest(game.score);
      setPhase('gameover');
      return;
    }
    if (game.score >= game.scoreTarget) {
      // Floor cleared — apply onFloorEnd hooks
      let s = { ...game };
      setLastGamble(null);
      for (const r of s.relics) {
        if (r.onFloorEnd) {
          const before = s.score;
          s = r.onFloorEnd(s);
          if (r.id === 'double-or-nothing' && s.score !== before) {
            setLastGamble(s.score > before ? 'WON 2×!' : 'Lost… 0.5×');
          }
        }
      }
      if (s.floor >= MAX_FLOOR) {
        saveBest(s.score);
        setGame(s);
        setPhase('win');
      } else {
        setGame(s);
        openShop(s);
      }
    }
  }, [game.score, game.scoreTarget, game.lives, phase]);

  // ─── Collision handler ─────────────────────────────────────────────────────

  function handleCollision(s: GameState): GameState {
    const newLives = s.lives - 1;
    if (newLives <= 0) return { ...s, lives: 0 };
    return respawnSnake({ ...s, lives: newLives });
  }

  function respawnSnake(s: GameState): GameState {
    const mid = Math.floor(GRID / 2);
    dirRef.current = { x: -1, y: 0 };
    return {
      ...s,
      snake: [{ x: mid, y: mid }, { x: mid + 1, y: mid }, { x: mid + 2, y: mid }],
      direction: { x: -1, y: 0 },
      food: spawnFood(s),
    };
  }

  // ─── Shop ──────────────────────────────────────────────────────────────────

  function openShop(s: GameState) {
    const owned = new Set(s.relics.map(r => r.id));
    const available = RELIC_POOL.filter(r => !owned.has(r.id));
    const shuffled = available.sort(() => Math.random() - 0.5);
    setShopChoices(shuffled.slice(0, Math.min(3, shuffled.length)));
    setPhase('shop');
  }

  function pickRelic(relic: Relic) {
    const newRelics = [...game.relics, relic];
    const nextFloor = game.floor + 1;
    const newState = initialState(nextFloor, newRelics, game.score, game.lives);
    setGame(newState);
    dirRef.current = { x: -1, y: 0 };
    setLastGamble(null);
    setPhase('playing');
  }

  function skipShop() {
    const nextFloor = game.floor + 1;
    const newState = initialState(nextFloor, game.relics, game.score, game.lives);
    setGame(newState);
    dirRef.current = { x: -1, y: 0 };
    setLastGamble(null);
    setPhase('playing');
  }

  // ─── Controls ──────────────────────────────────────────────────────────────

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (phase !== 'playing') return;
    const cur = dirRef.current;
    switch (e.key) {
      case 'ArrowUp': case 'w': case 'W':
        if (cur.y !== 1) dirRef.current = { x: 0, y: -1 };
        break;
      case 'ArrowDown': case 's': case 'S':
        if (cur.y !== -1) dirRef.current = { x: 0, y: 1 };
        break;
      case 'ArrowLeft': case 'a': case 'A':
        if (cur.x !== 1) dirRef.current = { x: -1, y: 0 };
        break;
      case 'ArrowRight': case 'd': case 'D':
        if (cur.x !== -1) dirRef.current = { x: 1, y: 0 };
        break;
      case ' ':
        if (hasRelic(game, 'shrink-ray') && !game.shrinkUsed && game.snake.length > 3) {
          setGame(prev => ({
            ...prev,
            snake: prev.snake.slice(0, Math.ceil(prev.snake.length / 2)),
            shrinkUsed: true,
          }));
        }
        break;
    }
    e.preventDefault();
  }, [phase, game]);

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  // Touch
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      touchRef.current = { x: t.clientX, y: t.clientY };
    };
    const onEnd = (e: TouchEvent) => {
      if (!touchRef.current) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchRef.current.x;
      const dy = t.clientY - touchRef.current.y;
      touchRef.current = null;
      if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;
      const cur = dirRef.current;
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 0 && cur.x !== -1) dirRef.current = { x: 1, y: 0 };
        else if (dx < 0 && cur.x !== 1) dirRef.current = { x: -1, y: 0 };
      } else {
        if (dy > 0 && cur.y !== -1) dirRef.current = { x: 0, y: 1 };
        else if (dy < 0 && cur.y !== 1) dirRef.current = { x: 0, y: -1 };
      }
    };
    canvas.addEventListener('touchstart', onStart, { passive: true });
    canvas.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      canvas.removeEventListener('touchstart', onStart);
      canvas.removeEventListener('touchend', onEnd);
    };
  }, []);

  // ─── Render Canvas ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (phase !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = GRID * CELL;
    canvas.width = size;
    canvas.height = size;

    // Background
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, size, size);

    // Grid lines
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= GRID; i++) {
      ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, size); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * CELL); ctx.lineTo(size, i * CELL); ctx.stroke();
    }

    // Food
    for (const f of game.food) {
      ctx.fillStyle = f.type === 'golden' ? '#fbbf24' : '#ef4444';
      ctx.beginPath();
      ctx.arc(f.pos.x * CELL + CELL / 2, f.pos.y * CELL + CELL / 2, CELL / 2 - 2, 0, Math.PI * 2);
      ctx.fill();
      if (f.type === 'golden') {
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    // Snake
    game.snake.forEach((seg, i) => {
      const alpha = 1 - i * 0.03;
      if (i === 0) {
        ctx.fillStyle = '#4ade80';
      } else {
        ctx.fillStyle = `rgba(34, 197, 94, ${Math.max(0.3, alpha)})`;
      }
      ctx.fillRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2);
    });

    // Head eyes
    const head = game.snake[0];
    ctx.fillStyle = '#0a0a0a';
    const hx = head.x * CELL;
    const hy = head.y * CELL;
    ctx.beginPath(); ctx.arc(hx + 6, hy + 7, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(hx + 14, hy + 7, 2.5, 0, Math.PI * 2); ctx.fill();
  }, [game, phase]);

  // ─── Best score ────────────────────────────────────────────────────────────

  function saveBest(score: number) {
    const best = Math.max(score, bestScore);
    setBestScore(best);
    try { localStorage.setItem(STORAGE_KEY, String(best)); } catch {}
  }

  function startRun() {
    const s = initialState(1, [], 0, INITIAL_LIVES);
    setGame(s);
    dirRef.current = { x: -1, y: 0 };
    setLastGamble(null);
    setPhase('playing');
  }

  // ─── UI ────────────────────────────────────────────────────────────────────

  const panelStyle: React.CSSProperties = {
    background: 'rgba(10,10,10,0.95)', border: '1px solid #222', borderRadius: 12, padding: 32,
    maxWidth: 480, margin: '0 auto', textAlign: 'center' as const,
  };

  // Menu
  if (phase === 'menu') {
    return (
      <div style={{ maxWidth: 500, margin: '0 auto', padding: 16 }}>
        <div style={panelStyle}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🐍</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 8, color: '#e0e0e0' }}>
            SNAKE ROGUELIKE
          </h2>
          <p style={{ fontSize: 13, color: '#888', marginBottom: 24, lineHeight: 1.6 }}>
            7 floors. 10 relics. 3 lives.<br />Eat, survive, collect — how far can you go?
          </p>
          {bestScore > 0 && (
            <p style={{ fontSize: 12, color: '#fbbf24', marginBottom: 16 }}>Best: {bestScore} pts</p>
          )}
          <button
            onClick={startRun}
            style={{
              background: '#22c55e', color: '#000', border: 'none', borderRadius: 8,
              padding: '12px 32px', fontSize: 16, fontWeight: 700, cursor: 'pointer',
              letterSpacing: '0.1em',
            }}
          >
            START RUN
          </button>
        </div>
      </div>
    );
  }

  // Shop
  if (phase === 'shop') {
    return (
      <div style={{ maxWidth: 500, margin: '0 auto', padding: 16 }}>
        <div style={panelStyle}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🏪</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#e0e0e0', letterSpacing: '0.1em', marginBottom: 4 }}>
            FLOOR {game.floor} CLEARED!
          </h2>
          {lastGamble && (
            <p style={{ fontSize: 14, color: lastGamble.startsWith('WON') ? '#22c55e' : '#ef4444', marginBottom: 8 }}>
              🎰 {lastGamble}
            </p>
          )}
          <p style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>
            Score: {game.score} • Lives: {'❤️'.repeat(game.lives)} • Pick a relic:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
            {shopChoices.map(r => (
              <button
                key={r.id}
                onClick={() => pickRelic(r)}
                style={{
                  background: '#1a1a2e', border: '1px solid #333', borderRadius: 8,
                  padding: '12px 16px', cursor: 'pointer', textAlign: 'left' as const,
                  transition: 'border-color 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = '#22c55e')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = '#333')}
              >
                <span style={{ fontSize: 20, marginRight: 8 }}>{r.emoji}</span>
                <span style={{ fontWeight: 700, color: '#e0e0e0' }}>{r.name}</span>
                <p style={{ fontSize: 12, color: '#888', marginTop: 4, marginBottom: 0 }}>{r.description}</p>
              </button>
            ))}
          </div>
          <button
            onClick={skipShop}
            style={{
              background: 'transparent', border: '1px solid #444', borderRadius: 8,
              padding: '8px 20px', color: '#888', fontSize: 12, cursor: 'pointer',
            }}
          >
            Skip →
          </button>
        </div>
      </div>
    );
  }

  // Game Over
  if (phase === 'gameover') {
    return (
      <div style={{ maxWidth: 500, margin: '0 auto', padding: 16 }}>
        <div style={panelStyle}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>💀</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#ef4444', letterSpacing: '0.1em', marginBottom: 8 }}>
            GAME OVER
          </h2>
          <p style={{ fontSize: 14, color: '#888', marginBottom: 4 }}>Floor {game.floor} / {MAX_FLOOR}</p>
          <p style={{ fontSize: 18, fontWeight: 700, color: '#e0e0e0', marginBottom: 4 }}>Score: {game.score}</p>
          {bestScore > 0 && <p style={{ fontSize: 12, color: '#fbbf24', marginBottom: 8 }}>Best: {bestScore}</p>}
          {game.relics.length > 0 && (
            <p style={{ fontSize: 16, marginBottom: 16 }}>
              {game.relics.map(r => <span key={r.id} title={r.name}>{r.emoji}</span>)}
            </p>
          )}
          <button
            onClick={startRun}
            style={{
              background: '#22c55e', color: '#000', border: 'none', borderRadius: 8,
              padding: '10px 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer',
            }}
          >
            TRY AGAIN
          </button>
        </div>
      </div>
    );
  }

  // Win
  if (phase === 'win') {
    return (
      <div style={{ maxWidth: 500, margin: '0 auto', padding: 16 }}>
        <div style={panelStyle}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏆</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fbbf24', letterSpacing: '0.1em', marginBottom: 8 }}>
            YOU WIN!
          </h2>
          <p style={{ fontSize: 18, fontWeight: 700, color: '#e0e0e0', marginBottom: 4 }}>Score: {game.score}</p>
          {bestScore > 0 && <p style={{ fontSize: 12, color: '#fbbf24', marginBottom: 8 }}>Best: {bestScore}</p>}
          {game.relics.length > 0 && (
            <p style={{ fontSize: 16, marginBottom: 16 }}>
              {game.relics.map(r => <span key={r.id} title={r.name} style={{ marginRight: 4 }}>{r.emoji}</span>)}
            </p>
          )}
          <button
            onClick={startRun}
            style={{
              background: '#22c55e', color: '#000', border: 'none', borderRadius: 8,
              padding: '10px 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer',
            }}
          >
            NEW RUN
          </button>
        </div>
      </div>
    );
  }

  // Playing
  return (
    <div style={{ maxWidth: 500, margin: '0 auto', padding: 16 }}>
      {/* HUD */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 8, padding: '8px 12px', background: 'rgba(10,10,10,0.9)',
        border: '1px solid #222', borderRadius: 8, fontSize: 13,
      }}>
        <span style={{ color: '#fbbf24', fontWeight: 700 }}>Floor {game.floor}/{MAX_FLOOR}</span>
        <span style={{ color: '#e0e0e0' }}>
          {game.score} / <span style={{ color: '#888' }}>{game.scoreTarget}</span>
        </span>
        <span style={{ color: game.timeLeft <= 10 ? '#ef4444' : '#888' }}>⏱ {game.timeLeft}s</span>
        <span>{'❤️'.repeat(game.lives)}</span>
      </div>

      {/* Relics bar */}
      {game.relics.length > 0 && (
        <div style={{
          display: 'flex', gap: 6, marginBottom: 8, padding: '4px 8px',
          background: 'rgba(10,10,10,0.7)', borderRadius: 6, fontSize: 18, flexWrap: 'wrap',
        }}>
          {game.relics.map(r => (
            <span key={r.id} title={`${r.name}: ${r.description}`} style={{ cursor: 'help' }}>{r.emoji}</span>
          ))}
          {hasRelic(game, 'shrink-ray') && !game.shrinkUsed && (
            <span style={{ fontSize: 11, color: '#888', alignSelf: 'center', marginLeft: 'auto' }}>
              [SPACE] Shrink
            </span>
          )}
        </div>
      )}

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        style={{
          width: '100%', maxWidth: GRID * CELL, aspectRatio: '1',
          border: '1px solid #222', borderRadius: 4, display: 'block', margin: '0 auto',
          touchAction: 'none',
        }}
      />

      {/* Score bar */}
      <div style={{ marginTop: 8, height: 6, background: '#1a1a1a', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${Math.min(100, (game.score / game.scoreTarget) * 100)}%`,
          background: game.score >= game.scoreTarget ? '#22c55e' : '#3b82f6',
          borderRadius: 3,
          transition: 'width 0.3s',
        }} />
      </div>
    </div>
  );
}
