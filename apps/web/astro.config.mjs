// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  site: 'https://www.newlifesolutions.dev',
  output: 'server',
  adapter: vercel(),

  build: {
    inlineStylesheets: 'never',
  },

  vite: {
    // @ts-ignore - Plugin type mismatch between Vite versions
    plugins: [tailwindcss()],

    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            // Video tools (heavy: ~50MB ffmpeg)
            'video-tools': [
              '@ffmpeg/ffmpeg',
              '@ffmpeg/util'
            ],
            // AI tools (heavy: ~50MB transformers)
            'ai-tools': [
              '@huggingface/transformers',
              'onnxruntime-web'
            ],
            // Heavy image processing
            'image-tools': [
              '@imgly/background-removal',
              'upscaler'
            ],
            // OCR
            'ocr-tools': [
              'tesseract.js'
            ],
            // PDF processing
            'pdf-tools': [
              'pdf-lib',
              'pdfjs-dist',
              'jspdf'
            ]
          }
        }
      }
    }
  },

  integrations: [
    react({
      babel: {
        plugins: [
          ['@babel/plugin-transform-react-jsx', {
            runtime: 'automatic',
            importSource: 'react'
          }]
        ]
      }
    }),
    sitemap({
      // GEO 2025: Include all tool pages for AI discovery
      filter: (page) => !page.includes('/api/'),
      changefreq: 'weekly',
      priority: 0.8,
      lastmod: new Date(),
      // Prioritize tool pages for AI crawlers
      serialize(item) {
        if (item.url.includes('/tools/')) {
          item.priority = 0.9;
          // @ts-expect-error - Type issue with enum
          item.changefreq = 'weekly';
        }
        if (item.url.includes('/hub')) {
          item.priority = 1.0;
        }
        return item;
      }
    })
  ]
});