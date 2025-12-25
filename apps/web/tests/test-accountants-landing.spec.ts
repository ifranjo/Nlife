import { test, expect } from '@playwright/test';

test.describe('Accountants Landing Page', () => {
  test('page loads and has correct SEO metadata', async ({ page }) => {
    await page.goto('/for/accountants');
    await page.waitForLoadState('networkidle');

    // Check page title (JARVIS-optimized)
    await expect(page).toHaveTitle(/Free Accounting Tools Online for CPAs & Bookkeepers/i);

    // Check main heading
    const main = page.locator('main');
    await expect(main).toBeVisible();
    const h1 = main.locator('h1').first();
    await expect(h1).toContainText(/Private Document Tools for Accountants/i);

    // Check meta description
    const metaDescription = page.locator('meta[name="description"]');
    await expect(metaDescription).toHaveAttribute('content', /accounting professionals|CPAs|Bookkeepers/i);

    // Check page has accounting-related content
    const pageContent = await page.content();
    expect(pageContent).toContain('Accountants');
  });

  test('displays all 5 essential tools with correct links', async ({ page }) => {
    await page.goto('/for/accountants');
    await page.waitForLoadState('networkidle');

    const expectedTools = [
      { name: 'PDF Merge', href: '/tools/pdf-merge' },
      { name: 'PDF Split', href: '/tools/pdf-split' },
      { name: 'PDF Compress', href: '/tools/pdf-compress' },
      { name: 'OCR Text Extractor', href: '/tools/ocr-extractor' },
      { name: 'Document Scanner', href: '/tools/document-scanner' }
    ];

    // Check each tool card exists and has correct link
    for (const tool of expectedTools) {
      const toolLink = page.locator(`a[href="${tool.href}"]`).filter({ has: page.locator('h3') });
      await expect(toolLink).toBeVisible();
      await expect(toolLink.locator('h3')).toContainText(tool.name);
    }

    // Verify we have exactly 5 tool cards
    const toolCards = page.locator('a.glass-card').filter({ has: page.locator('h3') });
    await expect(toolCards).toHaveCount(5);
  });

  test('privacy guarantee section is prominent', async ({ page }) => {
    await page.goto('/for/accountants');
    await page.waitForLoadState('networkidle');

    // Check for privacy guarantee heading
    const privacyHeading = page.getByRole('heading', { name: /Client Confidentiality Guaranteed/i });
    await expect(privacyHeading).toBeVisible();

    // Check for key privacy points (use first match to avoid strict mode violations)
    await expect(page.locator('text=/Zero server uploads/i').first()).toBeVisible();
    await expect(page.locator('text=/No data retention/i').first()).toBeVisible();
    await expect(page.locator('text=/Works offline/i').first()).toBeVisible();
    await expect(page.locator('text=/No tracking/i').first()).toBeVisible();

    // Check for lock icon (privacy indicator)
    await expect(page.locator('text=🔒')).toBeVisible();
  });

  test('displays real-world accounting workflows', async ({ page }) => {
    await page.goto('/for/accountants');
    await page.waitForLoadState('networkidle');

    // Check for workflow section
    const workflowHeading = page.getByRole('heading', { name: /Real-World Accounting Workflows/i });
    await expect(workflowHeading).toBeVisible();

    // Check for specific use cases
    const useCases = [
      /Tax Season Preparation/i,
      /Monthly Bookkeeping/i,
      /Audit Preparation/i,
      /Client Communication/i
    ];

    for (const useCase of useCases) {
      const useCaseHeading = page.getByRole('heading', { name: useCase });
      await expect(useCaseHeading).toBeVisible();
    }
  });

  test('FAQ section answers accountant-specific questions', async ({ page }) => {
    await page.goto('/for/accountants');
    await page.waitForLoadState('networkidle');

    // Check FAQ section exists
    const faqHeading = page.getByRole('heading', { name: /Frequently Asked Questions/i });
    await expect(faqHeading).toBeVisible();

    // Check for specific FAQ questions
    const questions = [
      /Can I use these tools with client data/i,
      /file size limits/i,
      /watermarks/i,
      /tax preparation software/i,
      /OCR accuracy/i
    ];

    for (const question of questions) {
      await expect(page.locator(`text=${question}`).first()).toBeVisible();
    }
  });

  test('CTA buttons link to hub and tools', async ({ page }) => {
    await page.goto('/for/accountants');
    await page.waitForLoadState('networkidle');

    // Check main CTA button (JARVIS-optimized: single centered CTA)
    const mainCTA = page.locator('a[href="/tools/pdf-merge"]').filter({ hasText: /Process My Documents Free/i });
    await expect(mainCTA).toBeVisible();

    // Check secondary link to hub exists
    const hubLink = page.locator('a[href="/hub"]');
    await expect(hubLink.first()).toBeVisible();
  });

  test('navbar and footer are present', async ({ page }) => {
    await page.goto('/for/accountants');
    await page.waitForLoadState('networkidle');

    // Check navbar (should have New Life link)
    const navLinks = page.locator('nav a');
    await expect(navLinks.first()).toBeVisible();

    // Check footer exists
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
  });

  test('privacy badges are displayed', async ({ page }) => {
    await page.goto('/for/accountants');
    await page.waitForLoadState('networkidle');

    // Check for privacy badges in hero section (use first match)
    await expect(page.locator('text=/100% Private/i').first()).toBeVisible();
    await expect(page.locator('text=/No Upload/i').first()).toBeVisible();
    await expect(page.locator('text=/Free Forever/i').first()).toBeVisible();
  });

  test('why browser-based section explains benefits', async ({ page }) => {
    await page.goto('/for/accountants');
    await page.waitForLoadState('networkidle');

    const whyHeading = page.getByRole('heading', { name: /Why Accountants Choose Browser-Based Tools/i });
    await expect(whyHeading).toBeVisible();

    // Check for key benefits (use first match)
    await expect(page.locator('text=/No Installation Required/i').first()).toBeVisible();
    await expect(page.locator('text=/HIPAA.*SOX.*GDPR/i').first()).toBeVisible();
    await expect(page.locator('text=/Zero Subscription Costs/i').first()).toBeVisible();
    await expect(page.locator('text=/Works Offline/i').first()).toBeVisible();
  });

  test('tool cards display use cases', async ({ page }) => {
    await page.goto('/for/accountants');
    await page.waitForLoadState('networkidle');

    // Check that at least one tool card shows "Common Uses"
    const commonUsesLabel = page.locator('text=/Common Uses:/i');
    await expect(commonUsesLabel.first()).toBeVisible();

    // Verify specific use cases are mentioned
    await expect(page.locator('text=/Combine monthly receipts/i')).toBeVisible();
    await expect(page.locator('text=/Extract receipt data/i')).toBeVisible();
  });

  test('responsive design elements are present', async ({ page }) => {
    await page.goto('/for/accountants');
    await page.waitForLoadState('networkidle');

    // Check that grid layouts use responsive classes
    const toolsGrid = page.locator('.grid').first();
    await expect(toolsGrid).toBeVisible();

    // Verify glass-card styling is applied
    const glassCards = page.locator('.glass-card');
    expect(await glassCards.count()).toBeGreaterThan(0);
  });

  test('page contains profession-specific keywords', async ({ page }) => {
    await page.goto('/for/accountants');
    await page.waitForLoadState('networkidle');

    const pageContent = await page.textContent('body');

    // Check for accounting-specific terminology
    const keywords = [
      'accountant',
      'CPA',
      'bookkeeper',
      'tax',
      'client',
      'invoice',
      'receipt',
      'audit',
      'financial'
    ];

    for (const keyword of keywords) {
      expect(pageContent?.toLowerCase()).toContain(keyword.toLowerCase());
    }
  });
});
