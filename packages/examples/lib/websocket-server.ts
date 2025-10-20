/**
 * WebSocket server for controller communication
 * Manages WebSocket connections for browser automation
 */

import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';

export interface WebSocketManager {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  broadcast(message: any): void;
  getActiveConnections(): number;
}

let wss: WebSocketServer | null = null;

export function initializeWebSocketServer(server: Server): WebSocketManager {
  if (wss) {
    return createManager(wss);
  }

  wss = new WebSocketServer({ server, path: '/api/ws' });

  wss.on('connection', (ws: WebSocket) => {
    console.log('WebSocket client connected');

    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        console.log('WebSocket message received:', message);

        // Echo back for now (will be replaced with actual controller logic)
        ws.send(
          JSON.stringify({
            requestId: message.requestId,
            payload: { type: 'ack', message: 'Received' },
          }),
        );
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  return createManager(wss);
}

function createManager(wss: WebSocketServer): WebSocketManager {
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    broadcast(message: any) {
      const data = JSON.stringify(message);
      for (const client of wss.clients) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(data);
        }
      }
    },

    getActiveConnections() {
      return wss.clients.size;
    },
  };
}
