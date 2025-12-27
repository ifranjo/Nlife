#!/usr/bin/env node

/**
 * PWA Icon Generator Script
 *
 * Generates all required PWA icon sizes from a single source image.
 *
 * Usage:
 *   node scripts/generate-pwa-icons.js <source-image.png>
 *
 * Requirements:
 *   npm install sharp
 */

import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const OUTPUT_DIR = join(__dirname, '../public/icons');

async function generateIcons(sourceImage) {
  if (!existsSync(sourceImage)) {
    console.error(`Error: Source image not found: ${sourceImage}`);
    process.exit(1);
  }

  console.log(`Generating PWA icons from: ${sourceImage}`);
  console.log(`Output directory: ${OUTPUT_DIR}\n`);

  try {
    for (const size of ICON_SIZES) {
      const outputPath = join(OUTPUT_DIR, `icon-${size}x${size}.png`);

      await sharp(sourceImage)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 10, g: 10, b: 10, alpha: 1 } // Dark background
        })
        .png({ quality: 100, compressionLevel: 9 })
        .toFile(outputPath);

      console.log(`✓ Generated ${size}x${size} icon`);
    }

    // Generate maskable icon with padding
    const maskableOutputPath = join(OUTPUT_DIR, 'icon-512x512-maskable.png');
    await sharp(sourceImage)
      .resize(410, 410, { // 80% of 512 for safe zone
        fit: 'contain',
        background: { r: 10, g: 10, b: 10, alpha: 0 }
      })
      .extend({
        top: 51,
        bottom: 51,
        left: 51,
        right: 51,
        background: { r: 139, g: 92, b: 246, alpha: 1 } // Purple background
      })
      .png({ quality: 100, compressionLevel: 9 })
      .toFile(maskableOutputPath);

    console.log(`✓ Generated 512x512 maskable icon with safe zone\n`);
    console.log('All icons generated successfully!');
    console.log('\nNext steps:');
    console.log('1. Review icons in public/icons/');
    console.log('2. Test in browser: npm run dev');
    console.log('3. Verify in DevTools > Application > Manifest');
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

// Get source image from command line argument
const sourceImage = process.argv[2];

if (!sourceImage) {
  console.error('Usage: node generate-pwa-icons.js <source-image.png>');
  console.error('\nExample:');
  console.error('  node scripts/generate-pwa-icons.js logo.png');
  process.exit(1);
}

generateIcons(sourceImage);
