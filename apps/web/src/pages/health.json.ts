import type { APIRoute } from 'astro';

// Static health endpoint - built at deploy time
// For uptime monitoring: check if this endpoint returns 200
export const GET: APIRoute = async () => {
  const healthData = {
    status: 'ok',
    version: import.meta.env.PUBLIC_VERSION || '1.0.0',
    buildTime: new Date().toISOString(), // Set at build time
  };

  return new Response(JSON.stringify(healthData, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};
