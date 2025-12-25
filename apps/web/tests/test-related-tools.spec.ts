/**
 * Related Tools Component Tests
 *
 * Tests hub-spoke internal linking implementation for SEO improvement.
 */

import { test, expect } from '@playwright/test';

test.describe('RelatedTools Component', () => {
  test('displays related tools on PDF Merge page', async ({ page }) => {
    await page.goto('/tools/pdf-merge');
    await page.waitForLoadState('networkidle');

    // Check that related tools section exists
    const relatedSection = page.locator('section.related-tools');
    await expect(relatedSection).toBeVisible();

    // Check heading
    const heading = relatedSection.locator('h2');
    await expect(heading).toHaveText('Related Free Tools');

    // Check that at least 3 tools are shown (PDF tools are a category)
    const toolLinks = relatedSection.locator('.tool-link');
    const count = await toolLinks.count();
    expect(count).toBeGreaterThanOrEqual(3);
    expect(count).toBeLessThanOrEqual(6); // Max should be 6

    // Verify each tool has required elements
    const firstTool = toolLinks.first();
    await expect(firstTool.locator('.tool-icon')).toBeVisible();
    await expect(firstTool.locator('.tool-name')).toBeVisible();
    await expect(firstTool.locator('.tool-desc')).toBeVisible();

    // Verify tool links are properly formed
    const firstHref = await firstTool.getAttribute('href');
    expect(firstHref).toMatch(/^\/tools\//);
  });

  test('shows document tools for document category tool', async ({ page }) => {
    await page.goto('/tools/pdf-merge');
    await page.waitForLoadState('networkidle');

    const relatedSection = page.locator('section.related-tools');
    const toolLinks = relatedSection.locator('.tool-link');

    // At least some should be document tools (PDF Compress, PDF Split, etc.)
    const toolNames = await toolLinks.locator('.tool-name').allTextContents();

    // Should not include the current tool (PDF Merge)
    expect(toolNames).not.toContain('PDF Merge');

    // Check that at least 2 are from document category
    const documentTools = ['PDF Compress', 'PDF Split', 'PDF Redactor', 'PDF Form Filler', 'OCR Text Extractor', 'Document Scanner', 'PDF to Word', 'Resume Builder'];
    const foundDocumentTools = toolNames.filter(name => documentTools.includes(name));
    expect(foundDocumentTools.length).toBeGreaterThanOrEqual(2);
  });

  test('includes ItemList schema markup', async ({ page }) => {
    await page.goto('/tools/pdf-merge');
    await page.waitForLoadState('networkidle');

    // Find the schema script within related-tools section
    const schemas = page.locator('section.related-tools script[type="application/ld+json"]');
    await expect(schemas.first()).toBeAttached();

    // Get the schema content
    const schemaContent = await schemas.first().textContent();
    const schema = JSON.parse(schemaContent || '{}');

    // Verify schema structure
    expect(schema['@context']).toBe('https://schema.org');
    expect(schema['@type']).toBe('ItemList');
    expect(schema.name).toBe('Related Free Tools');
    expect(schema.numberOfItems).toBeGreaterThan(0);
    expect(Array.isArray(schema.itemListElement)).toBe(true);

    // Verify first item structure
    const firstItem = schema.itemListElement[0];
    expect(firstItem['@type']).toBe('ListItem');
    expect(firstItem.position).toBe(1);
    expect(firstItem.item['@type']).toBe('SoftwareApplication');
    expect(firstItem.item.url).toMatch(/^https:\/\/www\.newlifesolutions\.dev\/tools\//);
    expect(firstItem.item.offers.price).toBe('0');
  });

  test('related tools are clickable and navigate correctly', async ({ page }) => {
    await page.goto('/tools/pdf-merge');
    await page.waitForLoadState('networkidle');

    const relatedSection = page.locator('section.related-tools');
    const firstToolLink = relatedSection.locator('.tool-link').first();

    // Get the href before clicking
    const href = await firstToolLink.getAttribute('href');

    // Click the link
    await firstToolLink.click();
    await page.waitForLoadState('networkidle');

    // Verify navigation occurred
    expect(page.url()).toContain(href || '');

    // Verify main content exists (related tools may or may not be on all pages yet)
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });

  test('shows media tools for media category tool', async ({ page }) => {
    await page.goto('/tools/image-compress');
    await page.waitForLoadState('networkidle');

    const relatedSection = page.locator('section.related-tools');
    const toolLinks = relatedSection.locator('.tool-link');

    // Check that some are from media category
    const toolNames = await toolLinks.locator('.tool-name').allTextContents();

    // Should not include the current tool
    expect(toolNames).not.toContain('Image Compress');

    // Check that at least 2 are from media category
    const mediaTools = ['Image Converter', 'Background Remover', 'EXIF Metadata Editor', 'Video to MP3', 'Video Compressor', 'Video Trimmer', 'GIF Maker', 'Vocal Remover'];
    const foundMediaTools = toolNames.filter(name => mediaTools.includes(name));
    expect(foundMediaTools.length).toBeGreaterThanOrEqual(2);
  });

  test('respects maxItems parameter', async ({ page }) => {
    await page.goto('/tools/qr-generator');
    await page.waitForLoadState('networkidle');

    const relatedSection = page.locator('section.related-tools');
    const toolLinks = relatedSection.locator('.tool-link');
    const count = await toolLinks.count();

    // Should not exceed default maxItems (6)
    expect(count).toBeLessThanOrEqual(6);
  });

  test('hover effect works on tool cards', async ({ page }) => {
    await page.goto('/tools/pdf-merge');
    await page.waitForLoadState('networkidle');

    const relatedSection = page.locator('section.related-tools');
    const firstTool = relatedSection.locator('.tool-link').first();

    // Check initial state
    const initialTransform = await firstTool.evaluate(el =>
      window.getComputedStyle(el).transform
    );

    // Hover over the card
    await firstTool.hover();

    // Wait a bit for transition
    await page.waitForTimeout(300);

    // Check that transform changed (should translateY)
    const hoveredTransform = await firstTool.evaluate(el =>
      window.getComputedStyle(el).transform
    );

    // Transform should be different after hover
    expect(hoveredTransform).not.toBe(initialTransform);
  });

  test('has proper accessibility attributes', async ({ page }) => {
    await page.goto('/tools/pdf-merge');
    await page.waitForLoadState('networkidle');

    const relatedSection = page.locator('section.related-tools');

    // Check aria-labelledby
    await expect(relatedSection).toHaveAttribute('aria-labelledby', 'related-tools-heading');

    // Check heading has correct id
    const heading = relatedSection.locator('h2#related-tools-heading');
    await expect(heading).toBeVisible();

    // Check tool icons have aria-hidden
    const icons = relatedSection.locator('.tool-icon');
    const firstIcon = icons.first();
    await expect(firstIcon).toHaveAttribute('aria-hidden', 'true');

    // Check links are keyboard accessible
    const firstLink = relatedSection.locator('.tool-link').first();
    await firstLink.focus();

    // Should have focus visible outline
    const outlineStyle = await firstLink.evaluate(el =>
      window.getComputedStyle(el).outlineStyle
    );
    expect(outlineStyle).not.toBe('none');
  });

  test('responsive layout on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/tools/pdf-merge');
    await page.waitForLoadState('networkidle');

    const toolsGrid = page.locator('.related-tools .tools-grid');

    // Check that grid uses single column on mobile
    const gridTemplateColumns = await toolsGrid.evaluate(el =>
      window.getComputedStyle(el).gridTemplateColumns
    );

    // On mobile viewport (375px), grid should have only one column (not auto-fill minmax)
    // The computed value will be a single pixel value instead of multiple columns
    const columnCount = gridTemplateColumns.split(' ').length;
    expect(columnCount).toBe(1);
  });
});
