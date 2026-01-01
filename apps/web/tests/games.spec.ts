import { test, expect } from '@playwright/test';

test.describe('Games Hub', () => {
  test('games hub page loads correctly', async ({ page }) => {
    await page.goto('/games');
    await page.waitForLoadState('networkidle');

    // Check title
    await expect(page).toHaveTitle(/Games/i);

    // Check main heading
    const h1 = page.locator('main h1').first();
    await expect(h1).toContainText('Games Hub');

    // Check we have game cards
    const gameCards = page.locator('[data-category]');
    await expect(gameCards.first()).toBeVisible();
  });

  test('Color Match game loads', async ({ page }) => {
    await page.goto('/games/color-match');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveTitle(/Color Match/i);

    const h1 = page.locator('main h1').first();
    await expect(h1).toContainText('Color Match');

    // Check game controls are present
    const startButton = page.locator('button:has-text("Start Game")');
    await expect(startButton).toBeVisible();
  });

  test('Solitaire game loads', async ({ page }) => {
    await page.goto('/games/solitaire');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveTitle(/Solitaire/i);

    const h1 = page.locator('main h1').first();
    await expect(h1).toContainText('Solitaire');

    // Check game board is present (New Game button)
    const newGameButton = page.locator('button:has-text("New Game")');
    await expect(newGameButton).toBeVisible();
  });

  test('Poker Roguelike game loads', async ({ page }) => {
    await page.goto('/games/poker-roguelike');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveTitle(/Poker Roguelike/i);

    const h1 = page.locator('main h1').first();
    await expect(h1).toContainText('Poker Roguelike');

    // Check game controls are present
    const newRunButton = page.locator('button:has-text("New Run")');
    await expect(newRunButton).toBeVisible();
  });

  test('Color Match game has interactive elements', async ({ page }) => {
    await page.goto('/games/color-match');
    await page.waitForLoadState('networkidle');

    // Check game UI elements are ready for interaction
    const startButton = page.locator('button:has-text("Start Game")');
    await expect(startButton).toBeVisible();
    await expect(startButton).toBeEnabled();

    // Check difficulty buttons are present
    const normalButton = page.locator('button:has-text("Normal")');
    await expect(normalButton).toBeVisible();

    // Check sound toggle is present
    const soundToggle = page.locator('text=Sound Effects');
    await expect(soundToggle).toBeVisible();
  });

  test('Poker Roguelike shows hand cards', async ({ page }) => {
    await page.goto('/games/poker-roguelike');
    await page.waitForLoadState('networkidle');

    // Check that cards are displayed (8 cards in hand)
    const playButton = page.locator('button:has-text("Play Hand")');
    await expect(playButton).toBeVisible();

    // Check blind info is shown
    await expect(page.locator('text=Small Blind')).toBeVisible();
  });
});
