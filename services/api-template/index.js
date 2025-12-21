/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║  API TEMPLATE - Microservicio básico                                          ║
 * ║                                                                               ║
 * ║  Este es un template. Para crear un nuevo servicio:                          ║
 * ║  1. Copia esta carpeta: cp -r api-template api-tu-servicio                   ║
 * ║  2. Modifica package.json (nombre)                                           ║
 * ║  3. Añade tu lógica aquí                                                     ║
 * ║  4. Añade al docker-compose.yml                                              ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { createServer } from 'http';

const PORT = process.env.PORT || 3000;
const SERVICE_NAME = process.env.SERVICE_NAME || 'api-template';

const server = createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Health check endpoint
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      service: SERVICE_NAME,
      timestamp: new Date().toISOString()
    }));
    return;
  }

  // Root endpoint
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      message: `${SERVICE_NAME} is running`,
      endpoints: ['/health', '/']
    }));
    return;
  }

  // 404 for other routes
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`[${SERVICE_NAME}] Running on port ${PORT}`);
});
