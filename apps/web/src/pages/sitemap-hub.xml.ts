import type { APIRoute } from 'astro';

export const prerender = true;

const BASE_URL = (import.meta.env.SITE || 'https://www.newlifesolutions.dev').replace(/\/$/, '');
const LAST_MOD = new Date().toISOString().split('T')[0];

const buildUrl = (path: string) => {
  if (path === '/') return `${BASE_URL}/`;
  return `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
};

const urls = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/hub', changefreq: 'weekly', priority: '0.9' },
  { path: '/pdf-tools', changefreq: 'monthly', priority: '0.7' },
  { path: '/image-tools', changefreq: 'monthly', priority: '0.7' },
  { path: '/video-tools', changefreq: 'monthly', priority: '0.7' },
  { path: '/audio-tools', changefreq: 'monthly', priority: '0.7' },
  { path: '/ai-tools', changefreq: 'monthly', priority: '0.7' }
];

const buildSitemap = () => {
  const body = urls
    .map((entry) => (
      `  <url>\n` +
      `    <loc>${buildUrl(entry.path)}</loc>\n` +
      `    <lastmod>${LAST_MOD}</lastmod>\n` +
      `    <changefreq>${entry.changefreq}</changefreq>\n` +
      `    <priority>${entry.priority}</priority>\n` +
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
