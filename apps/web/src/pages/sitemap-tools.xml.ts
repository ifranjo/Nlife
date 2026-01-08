import type { APIRoute } from 'astro';
import { tools } from '../lib/tools';

export const prerender = true;

const BASE_URL = (import.meta.env.SITE || 'https://www.newlifesolutions.dev').replace(/\/$/, '');
const LAST_MOD = new Date().toISOString().split('T')[0];

const buildUrl = (path: string) => `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;

const buildSitemap = () => {
  const body = tools
    .map((tool) => (
      `  <url>\n` +
      `    <loc>${buildUrl(tool.href)}</loc>\n` +
      `    <lastmod>${LAST_MOD}</lastmod>\n` +
      `    <changefreq>monthly</changefreq>\n` +
      `    <priority>0.6</priority>\n` +
      `  </url>`
    ))
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `${body}\n` +
    `</urlset>\n`;
};

export const GET: APIRoute = async () => {
  const xml = buildSitemap();

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=UTF-8'
    }
  });
};
