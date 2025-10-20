/**
 * WebSocket messaging adapter
 */

import type { MessagingAdapter, ControllerMessage, ControllerResponse } from '../types.js';

export interface WebSocketAdapterConfig {
  url: string;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Error) => void;
}

export function createWebSocketAdapter(config: WebSocketAdapterConfig): MessagingAdapter {
  const { url, onOpen, onClose, onError } = config;
  const ws = new WebSocket(url);
  const pendingRequests = new Map<string, (response: any) => void>();
  let messageHandlers: Array<(response: ControllerResponse) => void> = [];

  ws.onopen = () => {
    onOpen?.();
  };

  ws.onclose = () => {
    onClose?.();
  };

  ws.onerror = (event) => {
    onError?.(new Error('WebSocket error'));
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);

    // Check if this is a response to a pending request
    if (data.requestId && pendingRequests.has(data.requestId)) {
      const resolver = pendingRequests.get(data.requestId)!;
      pendingRequests.delete(data.requestId);
      resolver(data.payload);
      return;
    }

    // Otherwise, it's an unsolicited message
    const response = data as ControllerResponse;
    for (const handler of messageHandlers) {
      handler(response);
    }
  };

  return {
    async send<T = any>(message: ControllerMessage): Promise<T> {
      return new Promise((resolve, reject) => {
        const requestId = Math.random().toString(36).substring(2);

        pendingRequests.set(requestId, resolve);

        ws.send(JSON.stringify({ requestId, message }));

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
      messageHandlers.push(handler);
    },

    close(): void {
      ws.close();
    },
  };
}
