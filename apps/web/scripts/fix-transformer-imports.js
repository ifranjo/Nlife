#!/usr/bin/env node

/**
 * Fix Transformer Imports
 *
 * Replaces direct @huggingface/transformers imports with our singleton wrapper
 */

import { readFile, writeFile } from 'fs/promises';
import pkg from 'glob';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const { glob } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Files to update
const TOOLS_TO_UPDATE = [
  'AudioTranscription.tsx',
  'GrammarChecker.tsx',
  'ImageCaptioning.tsx',
  'ObjectDetection.tsx',
  'ObjectRemover.tsx',
  'OcrExtractor.tsx',
  'SentimentAnalysis.tsx',
  'SubtitleGenerator.tsx',
  'TextSummarization.tsx'
];

const IMPORTS_TO_ADD = `import { createSafeErrorMessage } from '../../lib/security';
import { preloadTransformers, initPipeline } from '../../lib/transformer-wrapper';
import { useEffect } from 'react';`;

async function updateFile(filePath) {
  try {
    const content = await readFile(filePath, 'utf-8');
    const originalContent = content;

    let updated = content;

    // 1. Replace the import statement
    updated = updated.replace(
      /import[^;]*from\s+['"]@huggingface\/transformers['"][^;]*;/g,
      ''
    );

    // 2. Add new imports after React imports
    const reactImportMatch = updated.match(/import React[^;]*;/);
    if (reactImportMatch) {
      updated = updated.replace(
        reactImportMatch[0],
        `${reactImportMatch[0]}\n${IMPORTS_TO_ADD}`
      );
    }

    // 3. Replace import('@huggingface/transformers') with initPipeline
    updated = updated.replace(
      /const\s+{\s*pipeline\s*}\s*=\s*await\s+import\(['"]@huggingface\/transformers['"]\)/g,
      'const transcriber = await initPipeline'
    );

    updated = updated.replace(
      /await\s+import\(['"]@huggingface\/transformers['"]\)/g,
      'const { SamModel, AutoProcessor, env, RawImage } = await import("@huggingface/transformers")'
    );

    // 4. Fix the pipeline call
    updated = updated.replace(
      /pipeline\(/g,
      'initPipeline('
    );

    // 5. Add useEffect for preloading
    const componentMatch = updated.match(/export default function\s+(\w+)\s*\(/);
    if (componentMatch) {
      const componentName = componentMatch[1];
      const useStateSection = updated.match(/const\s+\[.*?\]\s*=\s*useState.*?;/gs);
      if (useStateSection) {
        const lastUseState = useStateSection[useStateSection.length - 1];
        updated = updated.replace(
          lastUseState,
          `${lastUseState}\n\n  // Preload transformers on component mount\n  useEffect(() => {\n    preloadTransformers();\n  }, []);`
        );
      }
    }

    // Write back only if changed
    if (updated !== originalContent) {
      await writeFile(filePath, updated, 'utf-8');
      console.log(`✓ Updated: ${filePath}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`✗ Error updating ${filePath}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🔧 Fixing transformer imports...\n');

  const baseDir = join(__dirname, '..', 'src', 'components', 'tools');
  let updatedCount = 0;

  for (const toolFile of TOOLS_TO_UPDATE) {
    const filePath = join(baseDir, toolFile);
    const updated = await updateFile(filePath);
    if (updated) updatedCount++;
  }

  console.log(`\n✅ Done! Updated ${updatedCount} files`);

  if (updatedCount > 0) {
    console.log('\nNext steps:');
    console.log('1. Review the changes with git diff');
    console.log('2. Run npm run check to verify TypeScript');
    console.log('3. Run npm run build to verify bundle');
    console.log('4. Test a few AI tools to verify functionality');
  }
}

main().catch(console.error);
