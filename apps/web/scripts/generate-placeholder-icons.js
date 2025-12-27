#!/usr/bin/env node

/**
 * Placeholder PWA Icon Generator
 *
 * Generates simple placeholder icons for testing PWA functionality.
 * Replace these with real brand icons before production deploy.
 *
 * Usage:
 *   node scripts/generate-placeholder-icons.js
 *
 * No dependencies required - uses HTML Canvas via node-canvas fallback.
 */

import { createWriteStream } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const OUTPUT_DIR = join(__dirname, '../public/icons');

// SVG template for placeholder icon
function createSVG(size) {
  const centerX = size / 2;
  const centerY = size / 2;
  const symbolSize = size * 0.4; // Diamond symbol size

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#8b5cf6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#6d28d9;stop-opacity:1" />
    </linearGradient>
    <filter id="shadow">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.3"/>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="${size}" height="${size}" fill="#0a0a0a" rx="${size * 0.15}"/>

  <!-- Gradient overlay -->
  <rect width="${size}" height="${size}" fill="url(#grad)" opacity="0.95" rx="${size * 0.15}"/>

  <!-- Diamond symbol (◈) -->
  <g transform="translate(${centerX}, ${centerY})" filter="url(#shadow)">
    <path
      d="M 0,-${symbolSize} L ${symbolSize},0 L 0,${symbolSize} L -${symbolSize},0 Z"
      fill="white"
      opacity="0.95"
    />
    <circle
      cx="0"
      cy="0"
      r="${symbolSize * 0.25}"
      fill="#0a0a0a"
    />
  </g>
</svg>`;
}

// Convert SVG to PNG using simple data URI approach
async function generateIcon(size) {
  const svg = createSVG(size);
  const outputPath = join(OUTPUT_DIR, `icon-${size}x${size}.png`);

  // For Node.js environment, we'll save SVG as intermediate format
  // In browser or with proper tooling, this would be converted to PNG
  const svgPath = join(OUTPUT_DIR, `icon-${size}x${size}.svg`);
  const writeStream = createWriteStream(svgPath);

  writeStream.write(svg);
  writeStream.end();

  return new Promise((resolve, reject) => {
    writeStream.on('finish', () => {
      console.log(`✓ Generated ${size}x${size} SVG icon (placeholder)`);
      resolve();
    });
    writeStream.on('error', reject);
  });
}

async function generateAllIcons() {
  console.log('Generating placeholder PWA icons...');
  console.log(`Output directory: ${OUTPUT_DIR}\n`);
  console.log('NOTE: These are SVG placeholders for testing.');
  console.log('For production, use PNG icons generated with:');
  console.log('  node scripts/generate-pwa-icons.js <source.png>\n');

  try {
    for (const size of ICON_SIZES) {
      await generateIcon(size);
    }

    console.log('\n✅ All placeholder icons generated!\n');
    console.log('Next steps:');
    console.log('1. Test PWA: npm run dev');
    console.log('2. Convert SVG to PNG (use PWA Builder or ImageMagick)');
    console.log('3. Replace with real brand icons before production');
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

generateAllIcons();
