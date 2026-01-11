import { useEffect, useRef, useState, useCallback } from 'react';
import ShareGame from './ShareGame';

// Daily seed based on current date (same worldwide)
const getDailySeed = (): number => {
  const now = new Date();
  const dateString = `${now.getUTCFullYear()}-${now.getUTCMonth() + 1}-${now.getUTCDate()}`;
  let hash = 0;
  for (let i = 0; i < dateString.length; i++) {
    const char = dateString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
};

// Seeded random number generator
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
}

// Game state type
type GameState = 'start' | 'playing' | 'gameover';

interface GameStats {
  score: number;
  maxHeight: number;
  perfectDrops: number;
}

interface PdfBlock {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  velocityY: number;
  rotation: number;
  angularVelocity: number;
  isMoving: boolean;
}

export default function PdfStackGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

  const [gameState, setGameState] = useState<GameState>('start');
  const [stats, setStats] = useState<GameStats>({ score: 0, maxHeight: 0, perfectDrops: 0 });
  const [highScore, setHighScore] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Game state refs (to avoid re-renders during gameplay)
  const gameStateRef = useRef({
    pdfs: [] as PdfBlock[],
    fallingPdf: null as PdfBlock | null,
    rng: null as SeededRandom | null,
    score: 0,
    perfectDrops: 0,
    gameOver: false,
    moveSpeed: 3,
    moveDirection: 1,
    lastDropX: 0,
    baseY: 0,
    lowestY: 0,
    startY: 0,
    cameraY: 0,
    cameraTargetY: 0,
    width: 400,
    height: 600,
    pdfWidth: 80,
    pdfHeight: 20,
  });

  // Load high score
  useEffect(() => {
    const stored = localStorage.getItem('pdfstack-highscore');
    if (stored) setHighScore(parseInt(stored, 10));
  }, []);

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctxRef.current = ctx;

    // Set canvas size
    const resizeCanvas = () => {
      const containerWidth = canvas.parentElement?.clientWidth || 400;
      const width = Math.min(400, containerWidth);
      const height = 600;

      canvas.width = width;
      canvas.height = height;

      gameStateRef.current.width = width;
      gameStateRef.current.height = height;
      gameStateRef.current.baseY = height - 80;
      gameStateRef.current.lowestY = gameStateRef.current.baseY;
      gameStateRef.current.startY = gameStateRef.current.baseY;
      gameStateRef.current.pdfWidth = 80;
      gameStateRef.current.pdfHeight = 20;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Set up input handlers
    const handlePointerDown = () => dropPdf();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        dropPdf();
      }
    };

    canvas.addEventListener('click', handlePointerDown);
    canvas.addEventListener('touchstart', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      canvas.removeEventListener('click', handlePointerDown);
      canvas.removeEventListener('touchstart', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);

      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Draw PDF block
  const drawPdf = (ctx: CanvasRenderingContext2D, pdf: PdfBlock) => {
    ctx.save();
    ctx.translate(pdf.x, pdf.y);

    // Draw shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(-pdf.width/2 + 2, -pdf.height/2 + 2, pdf.width, pdf.height);

    // Draw main body
    ctx.fillStyle = pdf.color;
    ctx.fillRect(-pdf.width/2, -pdf.height/2, pdf.width, pdf.height);

    // Draw border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(-pdf.width/2, -pdf.height/2, pdf.width, pdf.height);

    // Draw PDF text
    ctx.fillStyle = '#ffffff';
    ctx.font = '10px Courier New, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PDF', 0, 0);

    // Draw corner fold
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    ctx.moveTo(pdf.width/2 - 10, -pdf.height/2);
    ctx.lineTo(pdf.width/2, -pdf.height/2);
    ctx.lineTo(pdf.width/2, -pdf.height/2 + 10);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  };

  // Draw ground
  const drawGround = (ctx: CanvasRenderingContext2D) => {
    const { width, height } = gameStateRef.current;

    // Draw ground rectangle
    ctx.fillStyle = '#222222';
    ctx.fillRect(0, height - 80, width, 80);

    // Draw grid pattern
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, height - 80);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
  };

  // Spawn new falling PDF
  const spawnFallingPdf = useCallback(() => {
    const { rng, width, pdfWidth, pdfHeight } = gameStateRef.current;
    if (!rng || gameStateRef.current.gameOver) return;

    // Spawn at top
    const spawnY = -50 - gameStateRef.current.cameraY;
    const startX = rng.next() > 0.5 ? 50 : width - 50;

    const colors = ['#ef4444', '#dc2626', '#b91c1c', '#f87171'];
    const color = colors[Math.floor(rng.next() * colors.length)];

    gameStateRef.current.fallingPdf = {
      x: startX,
      y: spawnY,
      width: pdfWidth,
      height: pdfHeight,
      color,
      velocityY: 0,
      rotation: 0,
      angularVelocity: 0,
      isMoving: true,
    };

    gameStateRef.current.moveDirection = startX < width / 2 ? 1 : -1;
    gameStateRef.current.moveSpeed = Math.min(3 + Math.floor(gameStateRef.current.score / 5) * 0.5, 8);
  }, []);

  // Drop the current PDF
  const dropPdf = useCallback(() => {
    const state = gameStateRef.current;
    if (!state.fallingPdf || state.gameOver || gameState !== 'playing') return;

    const pdf = state.fallingPdf;
    state.fallingPdf = null;

    // Simulate drop animation with easing
    const targetY = state.lowestY - state.pdfHeight;
    const distance = targetY - pdf.y;
    const duration = 200 + distance / 2;
    const startTime = Date.now();
    const startY = pdf.y;

    const animateDrop = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Bounce easing out
      const bounce = 1 - Math.pow(1 - progress, 3);
      pdf.y = startY + (targetY - startY) * bounce;

      if (progress < 1) {
        requestAnimationFrame(animateDrop);
      } else {
        // Landed
        onPdfLanded(pdf, pdf.x);
      }
    };

    animateDrop();
  }, [gameState]);

  // Handle PDF landing
  const onPdfLanded = (pdf: PdfBlock, dropX: number) => {
    const state = gameStateRef.current;
    if (state.gameOver) return;

    // Check overlap
    const overlapThreshold = state.pdfWidth * 0.3;
    const offset = Math.abs(dropX - state.lastDropX);

    if (offset > state.pdfWidth - overlapThreshold && state.pdfs.length > 0) {
      // Missed - game over
      triggerGameOver(pdf);
      return;
    }

    // Successfully stacked
    state.pdfs.push({ ...pdf, x: dropX });
    state.lastDropX = dropX;

    // Perfect drop bonus
    if (offset < 10) {
      state.perfectDrops++;
      state.score += 2;
      showPerfectText(dropX, pdf.y);
    } else {
      state.score++;
    }

    // Update camera target
    state.lowestY = pdf.y - state.pdfHeight / 2;
    state.cameraTargetY = Math.max(0, (state.startY - state.lowestY) - state.height / 2);

    // Update stats
    setStats({
      score: state.score,
      maxHeight: state.pdfs.length,
      perfectDrops: state.perfectDrops
    });

    // Spawn next PDF after delay
    setTimeout(() => spawnFallingPdf(), 300);
  };

  // Show perfect text animation
  const showPerfectText = (x: number, y: number) => {
    const state = gameStateRef.current;
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;

    const text = {
      x,
      y: y - 30,
      text: 'PERFECT!',
      opacity: 1,
    };

    const animate = () => {
      text.y -= 1;
      text.opacity -= 0.015;

      if (text.opacity > 0) {
        requestAnimationFrame(animate);
      }
    };

    // Store for rendering
    state.perfectText = text;
    setTimeout(() => { delete state.perfectText; }, 800);

    animate();
  };

  // Trigger game over
  const triggerGameOver = (failedPdf: PdfBlock) => {
    const state = gameStateRef.current;
    state.gameOver = true;

    // Animate failed PDF falling off
    const animateFall = () => {
      failedPdf.y += 8;
      failedPdf.x += state.moveDirection * 2;
      failedPdf.rotation += state.moveDirection * 0.1;

      if (failedPdf.y < state.height + 100) {
        requestAnimationFrame(animateFall);
      }
    };
    animateFall();

    // Update high score
    const finalScore = state.score;
    if (finalScore > highScore) {
      localStorage.setItem('pdfstack-highscore', finalScore.toString());
      setHighScore(finalScore);
    }

    // Delay game over screen
    setTimeout(() => {
      setStats({
        score: finalScore,
        maxHeight: state.pdfs.length,
        perfectDrops: state.perfectDrops
      });
      setGameState('gameover');
    }, 800);
  };

  // Game loop
  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    const state = gameStateRef.current;

    if (!canvas || !ctx || gameState !== 'playing') return;

    // Clear canvas
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Apply camera transform
    ctx.save();
    ctx.translate(0, -state.cameraY);

    // Draw ground
    drawGround(ctx);

    // Update and draw stacked PDFs
    state.pdfs.forEach(pdf => {
      drawPdf(ctx, pdf);
    });

    // Update and draw falling PDF
    if (state.fallingPdf && !state.gameOver) {
      const pdf = state.fallingPdf;

      // Move horizontally
      pdf.x += state.moveSpeed * state.moveDirection;

      // Bounce off walls
      if (pdf.x <= state.pdfWidth / 2) {
        pdf.x = state.pdfWidth / 2;
        state.moveDirection = 1;
      } else if (pdf.x >= state.width - state.pdfWidth / 2) {
        pdf.x = state.width - state.pdfWidth / 2;
        state.moveDirection = -1;
      }

      drawPdf(ctx, pdf);
    }

    // Draw perfect text (if any)
    if (state.perfectText) {
      const text = state.perfectText;
      ctx.save();
      ctx.translate(0, state.cameraY);
      ctx.fillStyle = `rgba(0, 255, 0, ${text.opacity})`;
      ctx.font = 'bold 14px Courier New, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.strokeText(text.text, text.x, text.y);
      ctx.fillText(text.text, text.x, text.y);
      ctx.restore();
    }

    ctx.restore();

    // Smooth camera follow
    const cameraDiff = state.cameraTargetY - state.cameraY;
    if (Math.abs(cameraDiff) > 1) {
      state.cameraY += cameraDiff * 0.05;
    }

    animationRef.current = requestAnimationFrame(gameLoop);
  }, [gameState]);

  // Start game
  const startGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const state = gameStateRef.current;

    // Reset game state
    state.pdfs = [];
    state.fallingPdf = null;
    state.rng = new SeededRandom(getDailySeed());
    state.score = 0;
    state.perfectDrops = 0;
    state.gameOver = false;
    state.moveSpeed = 3;
    state.moveDirection = 1;
    state.lastDropX = canvas.width / 2;
    state.cameraY = 0;
    state.cameraTargetY = 0;
    state.baseY = canvas.height - 80;
    state.lowestY = state.baseY;
    state.startY = state.baseY;

    setStats({ score: 0, maxHeight: 0, perfectDrops: 0 });
    setGameState('playing');

    // Start spawning PDFs
    setTimeout(() => spawnFallingPdf(), 100);

    // Start game loop
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    animationRef.current = requestAnimationFrame(gameLoop);
  }, [gameLoop, spawnFallingPdf]);

  // Start initial game loop
  useEffect(() => {
    if (gameState === 'playing' && !animationRef.current) {
      animationRef.current = requestAnimationFrame(gameLoop);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [gameState, gameLoop]);

  return (
    <div className="relative w-full max-w-[400px] mx-auto">
      {/* Game Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full aspect-[2/3] bg-[#0a0a0a] rounded-lg overflow-hidden border border-[var(--border)] cursor-pointer"
        style={{ touchAction: 'manipulation', imageRendering: 'crisp-edges' as any }}
      />

      {/* Loading Indicator (now instant) */}
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0a0a] rounded-lg">
          <div className="text-2xl mb-2 opacity-60 animate-spin">📄</div>
          <h3 className="text-lg font-semibold text-[var(--text)] mb-2">Initializing...</h3>
        </div>
      )}

      {/* Score Display */}
      {gameState === 'playing' && (
        <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none">
          <div className="glass-card px-3 py-2 rounded">
            <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Score</div>
            <div className="text-2xl font-bold text-[var(--text)]">{stats.score}</div>
          </div>
          <div className="glass-card px-3 py-2 rounded text-right">
            <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Best</div>
            <div className="text-lg text-[var(--text-dim)]">{highScore}</div>
          </div>
        </div>
      )}

      {/* Start Screen Overlay */}
      {gameState === 'start' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0a0a]/90 backdrop-blur-sm rounded-lg">
          <div className="text-center px-6">
            <div className="mb-2">
              <span className="text-5xl">📄</span>
            </div>
            <h2 className="text-2xl font-bold text-[var(--text)] mb-2 tracking-wider">
              PDF STACK
            </h2>
            <p className="text-[var(--text-muted)] text-sm mb-6 max-w-[250px]">
              Stack PDFs as high as you can. Tap or press SPACE to drop.
            </p>

            <div className="inline-block glass-card px-4 py-2 rounded-full mb-6">
              <span className="text-xs text-[var(--text-dim)] uppercase tracking-wider">
                Daily Challenge
              </span>
              <span className="block text-[var(--text)] text-sm">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </span>
            </div>

            {highScore > 0 && (
              <div className="mb-6 text-center">
                <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider block">
                  Your Best
                </span>
                <span className="text-xl text-[var(--success)]">{highScore}</span>
              </div>
            )}

            <button
              onClick={startGame}
              className="btn-primary w-full py-4 text-lg animate-pulse"
            >
              TAP TO PLAY
            </button>
          </div>
        </div>
      )}

      {/* Game Over Overlay */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0a0a]/90 backdrop-blur-sm rounded-lg">
          <div className="text-center px-6 w-full max-w-[300px]">
            <h2 className="text-xl font-bold text-[var(--text)] mb-4 tracking-wider">
              GAME OVER
            </h2>

            <div className="grid grid-cols-3 gap-2 mb-6">
              <div className="glass-card p-3 rounded">
                <div className="text-xs text-[var(--text-muted)] uppercase">Score</div>
                <div className="text-xl font-bold text-[var(--text)]">{stats.score}</div>
              </div>
              <div className="glass-card p-3 rounded">
                <div className="text-xs text-[var(--text-muted)] uppercase">Height</div>
                <div className="text-xl font-bold text-[var(--text)]">{stats.maxHeight}</div>
              </div>
              <div className="glass-card p-3 rounded">
                <div className="text-xs text-[var(--text-muted)] uppercase">Perfect</div>
                <div className="text-xl font-bold text-[var(--success)]">{stats.perfectDrops}</div>
              </div>
            </div>

            {stats.score >= highScore && stats.score > 0 && (
              <div className="mb-4 py-2 px-4 bg-[var(--success)]/10 border border-[var(--success)]/30 rounded">
                <span className="text-[var(--success)] text-sm font-bold uppercase tracking-wider">
                  New High Score!
                </span>
              </div>
            )}

            <div className="glass-card p-4 rounded mb-4 font-mono text-sm text-left max-h-32 overflow-y-auto">
              <div className="text-[var(--text-muted)] text-xs mb-2">Your Stack:</div>
              {Array(Math.min(stats.maxHeight, 8)).fill(null).map((_, i) => (
                <div key={i} className="leading-tight">
                  {i < stats.perfectDrops ? '🟢' : '🔴'} PDF
                </div>
              )).reverse()}
              {stats.maxHeight > 8 && (
                <div className="text-[var(--text-muted)]">... +{stats.maxHeight - 8} more</div>
              )}
            </div>

            <div className="space-y-3">
              <ShareGame
                gameName="PDF Stack"
                score={stats.score}
                scoreLabel="Score"
                customMessage={`PDF Stack - ${new Date().toISOString().split('T')[0]}

${stats.score} points | ${stats.maxHeight} PDFs | ${stats.perfectDrops} perfect drops

Play at newlifesolutions.dev/games/pdf-stack`}
                className="w-full"
              />

              <button
                onClick={startGame}
                className="btn-primary w-full py-3"
              >
                Play Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Instructions (during play) */}
      {gameState === 'playing' && (
        <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none">
          <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider opacity-50">
            Tap or SPACE to drop
          </span>
        </div>
      )}
    </div>
  );
}
