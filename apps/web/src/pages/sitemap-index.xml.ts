import type { APIRoute } from 'astro';

export const prerender = true;

const BASE_URL = (import.meta.env.SITE || 'https://www.newlifesolutions.dev').replace(/\/$/, '');

const buildSitemapIndex = (urls: string[]) => {
  const lastmod = new Date().toISOString().split('T')[0];
  const body = urls
    .map((loc) => `  <sitemap>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </sitemap>`)
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `${body}\n` +
    `</sitemapindex>\n`;
};

export const GET: APIRoute = async () => {
  const urls = [
    `${BASE_URL}/sitemap-hub.xml`,
    `${BASE_URL}/sitemap-tools.xml`,
    `${BASE_URL}/sitemap-guides.xml`
  ];

  const xml = buildSitemapIndex(urls);

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=UTF-8'
    }
  });
};
