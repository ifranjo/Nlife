import { useEffect, useRef, useState, useCallback } from 'react';

// Phaser is loaded via CDN at runtime - types are declared as any
declare const Phaser: any;
type PhaserGame = any;
type PhaserScene = any;
type PhaserGameObject = any;

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

export default function PdfStackGame() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<PhaserGame | null>(null);
  const [gameState, setGameState] = useState<GameState>('start');
  const [stats, setStats] = useState<GameStats>({ score: 0, maxHeight: 0, perfectDrops: 0 });
  const [highScore, setHighScore] = useState<number>(0);
  const [copied, setCopied] = useState(false);

  // Load high score from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('pdfstack-highscore');
    if (stored) setHighScore(parseInt(stored, 10));
  }, []);

  // Initialize Phaser
  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    // Dynamically load Phaser
    const loadPhaser = async () => {
      // @ts-ignore - Phaser is loaded via CDN
      if (typeof Phaser === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/phaser@3.80.1/dist/phaser.min.js';
        script.async = true;
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      initGame();
    };

    loadPhaser();

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  const initGame = useCallback(() => {
    if (!containerRef.current) return;

    // @ts-ignore - Phaser is loaded via CDN
    const Phaser = window.Phaser;
    if (!Phaser) return;

    const width = Math.min(400, window.innerWidth - 32);
    const height = 600;

    // Game Scene - extends Phaser.Scene (loaded from CDN)
    // @ts-ignore - Phaser is loaded at runtime via CDN
    class GameScene extends Phaser.Scene {
      [key: string]: any; // Allow any Phaser.Scene properties
      private platforms!: any; // Phaser.Physics.Arcade.StaticGroup
      private fallingPdf: any = null; // Phaser.GameObjects.Container
      private pdfs: any[] = []; // Phaser.GameObjects.Container[]
      private rng!: SeededRandom;
      private score = 0;
      private perfectDrops = 0;
      private gameOver = false;
      private dropSpeed = 150;
      private moveDirection = 1;
      private moveSpeed = 3;
      private pdfWidth = 80;
      private pdfHeight = 20;
      private baseY!: number;
      private lastDropX = 0;
      private cameraTarget = 0;
      private startY!: number;
      private lowestY!: number;

      constructor() {
        super({ key: 'GameScene' });
      }

      preload() {
        // No assets to preload - we draw everything
      }

      create() {
        this.rng = new SeededRandom(getDailySeed());
        this.score = 0;
        this.perfectDrops = 0;
        this.gameOver = false;
        this.dropSpeed = 150;
        this.moveSpeed = 3;
        this.pdfs = [];

        // Set up world
        const worldHeight = 3000;
        this.physics.world.setBounds(0, -worldHeight, width, worldHeight + height);
        this.baseY = height - 80;
        this.startY = this.baseY;
        this.lowestY = this.baseY;

        // Create ground platform
        this.platforms = this.physics.add.staticGroup();
        const ground = this.add.rectangle(width / 2, height - 40, width, 80, 0x222222);
        this.platforms.add(ground);

        // Draw ground pattern
        const groundGraphics = this.add.graphics();
        groundGraphics.lineStyle(1, 0x333333);
        for (let x = 0; x < width; x += 20) {
          groundGraphics.moveTo(x, height - 80);
          groundGraphics.lineTo(x, height);
        }
        groundGraphics.strokePath();

        // Create first PDF at center
        this.lastDropX = width / 2;
        this.spawnFallingPdf();

        // Input handling
        this.input.on('pointerdown', () => this.dropPdf());

        // Capture space key with preventDefault to stop Chrome scroll
        const handleKeyDown = (e: KeyboardEvent) => {
          if (e.code === 'Space' || e.key === ' ') {
            e.preventDefault();
            this.dropPdf();
          }
        };
        window.addEventListener('keydown', handleKeyDown);

        // Cleanup on scene shutdown
        this.events.on('shutdown', () => {
          window.removeEventListener('keydown', handleKeyDown);
        });

        // Camera setup
        this.cameras.main.setBounds(0, -worldHeight, width, worldHeight + height);
        this.cameraTarget = 0;
      }

      createPdfGraphics(x: number, y: number, color: number = 0xef4444): any {
        const container = this.add.container(x, y);

        // PDF body
        const body = this.add.rectangle(0, 0, this.pdfWidth, this.pdfHeight, color);
        body.setStrokeStyle(2, 0xffffff, 0.3);

        // PDF icon/text
        const text = this.add.text(0, 0, 'PDF', {
          fontSize: '10px',
          fontFamily: 'Courier New, monospace',
          color: '#ffffff'
        }).setOrigin(0.5);

        // Corner fold effect
        const fold = this.add.triangle(
          this.pdfWidth / 2 - 6,
          -this.pdfHeight / 2 + 6,
          0, 0, 8, 0, 0, 8,
          0xffffff, 0.2
        );

        container.add([body, text, fold]);
        return container;
      }

      spawnFallingPdf() {
        if (this.gameOver) return;

        // Spawn at top of visible area
        const spawnY = this.cameras.main.scrollY - 50;

        // Random starting side with some variation
        const startX = this.rng.next() > 0.5 ? 50 : width - 50;
        this.moveDirection = startX < width / 2 ? 1 : -1;

        // Vary the color slightly for visual interest
        const colors = [0xef4444, 0xdc2626, 0xb91c1c, 0xf87171];
        const color = colors[Math.floor(this.rng.next() * colors.length)];

        this.fallingPdf = this.createPdfGraphics(startX, spawnY, color);

        // Increase speed as score increases
        this.moveSpeed = 3 + Math.floor(this.score / 5) * 0.5;
        this.moveSpeed = Math.min(this.moveSpeed, 8);
      }

      dropPdf() {
        if (!this.fallingPdf || this.gameOver) return;

        const pdf = this.fallingPdf;
        const targetX = pdf.x;
        this.fallingPdf = null;

        // Animate drop
        this.tweens.add({
          targets: pdf,
          y: this.lowestY - this.pdfHeight,
          duration: 200 + (this.lowestY - pdf.y) / 2,
          ease: 'Bounce.easeOut',
          onComplete: () => this.onPdfLanded(pdf, targetX)
        });
      }

      onPdfLanded(pdf: any, dropX: number) {
        if (this.gameOver) return;

        // Check if it's a valid stack
        const overlapThreshold = this.pdfWidth * 0.3;
        const offset = Math.abs(dropX - this.lastDropX);

        if (offset > this.pdfWidth - overlapThreshold && this.pdfs.length > 0) {
          // Missed - game over!
          this.triggerGameOver(pdf);
          return;
        }

        // Successfully stacked!
        this.pdfs.push(pdf);
        this.lastDropX = dropX;

        // Perfect drop bonus
        if (offset < 10) {
          this.perfectDrops++;
          this.score += 2;
          this.showPerfectText(dropX, pdf.y);
        } else {
          this.score++;
        }

        // Update camera to follow stack
        this.lowestY = pdf.y - this.pdfHeight / 2;
        const targetScroll = Math.max(0, (this.startY - this.lowestY) - height / 2);
        this.cameraTarget = -targetScroll;

        // Update stats
        setStats({
          score: this.score,
          maxHeight: this.pdfs.length,
          perfectDrops: this.perfectDrops
        });

        // Spawn next PDF
        this.time.delayedCall(300, () => this.spawnFallingPdf());
      }

      showPerfectText(x: number, y: number) {
        const text = this.add.text(x, y - 30, 'PERFECT!', {
          fontSize: '14px',
          fontFamily: 'Courier New, monospace',
          color: '#00ff00',
          stroke: '#000000',
          strokeThickness: 2
        }).setOrigin(0.5);

        this.tweens.add({
          targets: text,
          y: y - 60,
          alpha: 0,
          duration: 800,
          onComplete: () => text.destroy()
        });
      }

      triggerGameOver(failedPdf: any) {
        this.gameOver = true;

        // Animate failed PDF falling off
        this.tweens.add({
          targets: failedPdf,
          y: height + 100,
          x: failedPdf.x + (this.moveDirection * 100),
          angle: this.moveDirection * 90,
          duration: 1000,
          ease: 'Quad.easeIn'
        });

        // Shake camera
        this.cameras.main.shake(300, 0.01);

        // Update high score
        const finalScore = this.score;
        const currentHigh = parseInt(localStorage.getItem('pdfstack-highscore') || '0', 10);
        if (finalScore > currentHigh) {
          localStorage.setItem('pdfstack-highscore', finalScore.toString());
          setHighScore(finalScore);
        }

        // Trigger game over state
        this.time.delayedCall(800, () => {
          setStats({
            score: finalScore,
            maxHeight: this.pdfs.length,
            perfectDrops: this.perfectDrops
          });
          setGameState('gameover');
        });
      }

      update() {
        // Move falling PDF
        if (this.fallingPdf && !this.gameOver) {
          this.fallingPdf.x += this.moveSpeed * this.moveDirection;

          // Bounce off walls
          if (this.fallingPdf.x <= this.pdfWidth / 2) {
            this.fallingPdf.x = this.pdfWidth / 2;
            this.moveDirection = 1;
          } else if (this.fallingPdf.x >= width - this.pdfWidth / 2) {
            this.fallingPdf.x = width - this.pdfWidth / 2;
            this.moveDirection = -1;
          }
        }

        // Smooth camera follow
        const currentScroll = this.cameras.main.scrollY;
        const diff = this.cameraTarget - currentScroll;
        if (Math.abs(diff) > 1) {
          this.cameras.main.scrollY += diff * 0.05;
        }
      }
    }

    // Game config
    const config: any = {
      type: Phaser.AUTO,
      width,
      height,
      parent: containerRef.current,
      backgroundColor: '#0a0a0a',
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { x: 0, y: 0 },
          debug: false
        }
      },
      scene: GameScene,
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
      }
    };

    gameRef.current = new Phaser.Game(config);
  }, []);

  const startGame = useCallback(() => {
    setGameState('playing');
    setStats({ score: 0, maxHeight: 0, perfectDrops: 0 });

    // Restart the scene
    if (gameRef.current) {
      const scene = gameRef.current.scene.getScene('GameScene');
      if (scene) {
        scene.scene.restart();
      }
    }
  }, []);

  const generateShareText = useCallback(() => {
    const { score, maxHeight, perfectDrops } = stats;
    const date = new Date().toISOString().split('T')[0];

    // Generate emoji representation
    const towerEmoji = Array(Math.min(maxHeight, 10)).fill(null)
      .map((_, i) => i < perfectDrops ? '🟢' : '🔴')
      .reverse()
      .join('\n');

    return `PDF Stack - ${date}

${towerEmoji}
${maxHeight > 10 ? `... +${maxHeight - 10} more` : ''}

Score: ${score} | Height: ${maxHeight} | Perfect: ${perfectDrops}

Play at newlifesolutions.dev/games/pdf-stack`;
  }, [stats]);

  const shareResult = useCallback(async () => {
    const text = generateShareText();

    if (navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch (e) {
        // Fall back to clipboard
      }
    }

    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy:', e);
    }
  }, [generateShareText]);

  return (
    <div className="relative w-full max-w-[400px] mx-auto">
      {/* Game Container */}
      <div
        ref={containerRef}
        className="w-full aspect-[2/3] bg-[#0a0a0a] rounded-lg overflow-hidden border border-[var(--border)]"
        style={{ touchAction: 'manipulation' }}
      />

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
            {/* Title */}
            <div className="mb-2">
              <span className="text-5xl">📄</span>
            </div>
            <h2 className="text-2xl font-bold text-[var(--text)] mb-2 tracking-wider">
              PDF STACK
            </h2>
            <p className="text-[var(--text-muted)] text-sm mb-6 max-w-[250px]">
              Stack PDFs as high as you can. Tap or press SPACE to drop.
            </p>

            {/* Daily Challenge Badge */}
            <div className="inline-block glass-card px-4 py-2 rounded-full mb-6">
              <span className="text-xs text-[var(--text-dim)] uppercase tracking-wider">
                Daily Challenge
              </span>
              <span className="block text-[var(--text)] text-sm">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </span>
            </div>

            {/* High Score */}
            {highScore > 0 && (
              <div className="mb-6 text-center">
                <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider block">
                  Your Best
                </span>
                <span className="text-xl text-[var(--success)]">{highScore}</span>
              </div>
            )}

            {/* Start Button */}
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

            {/* Stats */}
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

            {/* New High Score */}
            {stats.score >= highScore && stats.score > 0 && (
              <div className="mb-4 py-2 px-4 bg-[var(--success)]/10 border border-[var(--success)]/30 rounded">
                <span className="text-[var(--success)] text-sm font-bold uppercase tracking-wider">
                  New High Score!
                </span>
              </div>
            )}

            {/* Emoji Tower Preview */}
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

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={shareResult}
                className="btn-secondary w-full py-3 flex items-center justify-center gap-2"
              >
                {copied ? (
                  <>
                    <span>Copied!</span>
                    <span className="text-[var(--success)]">✓</span>
                  </>
                ) : (
                  <>
                    <span>Share Result</span>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                  </>
                )}
              </button>
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
