/**
 * Server-side WebSocket adapter using ws package
 * Works in Node.js environment (API routes)
 */

import type { WebSocket } from 'ws';
import type { MessagingAdapter, ControllerMessage, ControllerResponse } from '@browser-automator/controller';

export interface ServerWebSocketAdapterConfig {
  getClient: () => WebSocket | null;
}

export function createServerWebSocketAdapter(
  config: ServerWebSocketAdapterConfig
): MessagingAdapter {
  const { getClient } = config;
  const pendingRequests = new Map<string, (response: any) => void>();

  return {
    async send<T = any>(message: ControllerMessage): Promise<T> {
      const client = getClient();
      if (!client || client.readyState !== 1) {
        // readyState 1 = OPEN
        throw new Error('WebSocket not connected');
      }

      return new Promise((resolve, reject) => {
        const requestId = Math.random().toString(36).substring(2);

        pendingRequests.set(requestId, resolve);

        client.send(JSON.stringify({ requestId, message }));

        // Timeout after 30 seconds
        setTimeout(() => {
          if (pendingRequests.has(requestId)) {
            pendingRequests.delete(requestId);
            reject(new Error('Request timeout'));
          }
        }, 30000);
      });
    },

    onMessage(handler: (response: ControllerResponse) => void): void {
      // Not needed for server-side adapter
    },

    close(): void {
      // Don't close the shared WebSocket connection
    },
  };
}
