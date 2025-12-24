// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://www.newlifesolutions.dev',

  vite: {
    plugins: [tailwindcss()]
  },

  integrations: [
    react(),
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
          item.changefreq = 'daily';
        }
        if (item.url.includes('/hub')) {
          item.priority = 1.0;
        }
        return item;
      }
    })
  ]
});