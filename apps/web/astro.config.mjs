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

  vite: {
    // @ts-ignore - Plugin type mismatch between Vite versions
    plugins: [tailwindcss()]
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