/**
 * Custom Next.js server with WebSocket support
 */

import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { WebSocketServer } from 'ws';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '30001', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

await app.prepare();

const server = createServer(async (req, res) => {
  try {
    const parsedUrl = parse(req.url, true);
    await handle(req, res, parsedUrl);
  } catch (err) {
    console.error('Error occurred handling', req.url, err);
    res.statusCode = 500;
    res.end('internal server error');
  }
});

// WebSocket server for extension communication
const wss = new WebSocketServer({ server, path: '/ws' });
const clients = new Map();

// Global registry for API routes to access WebSocket clients
global.wsClients = clients;
global.getExtensionClient = () => {
  // Return the first connected client (assuming single extension)
  return clients.size > 0 ? Array.from(clients.values())[0] : null;
};

wss.on('connection', (ws) => {
  const clientId = Math.random().toString(36).substring(2);
  clients.set(clientId, ws);
  console.log(`[WebSocket] Extension ${clientId} connected (${clients.size} total)`);

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log('[WebSocket] Received:', message);

      // Echo response (extension will handle actual logic)
      ws.send(
        JSON.stringify({
          requestId: message.requestId,
          payload: message.message,
        })
      );
    } catch (error) {
      console.error('[WebSocket] Message error:', error);
    }
  });

  ws.on('close', () => {
    clients.delete(clientId);
    console.log(`[WebSocket] Extension ${clientId} disconnected (${clients.size} remaining)`);
  });

  ws.on('error', (error) => {
    console.error(`[WebSocket] Client ${clientId} error:`, error);
  });
});

server.listen(port, () => {
  console.log(`> Ready on http://${hostname}:${port}`);
  console.log(`> WebSocket server ready on ws://${hostname}:${port}/ws`);
});
