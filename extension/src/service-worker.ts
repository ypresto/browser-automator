/**
 * Chrome Extension Service Worker
 * Manages tabs and sessions and connects to WebSocket server
 */

import { SessionManager } from '@browser-automator/extensions-core';

const sessionManager = new SessionManager();
let ws: WebSocket | null = null;

// Connect to WebSocket server
function connectWebSocket() {
  const WS_URL = 'ws://localhost:30001/ws';

  ws = new WebSocket(WS_URL);

  ws.onopen = () => {
    console.log('[Service Worker] Connected to WebSocket server');
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log('[Service Worker] Received:', data);
      // Handle messages from server
    } catch (error) {
      console.error('[Service Worker] Message parse error:', error);
    }
  };

  ws.onclose = () => {
    console.log('[Service Worker] Disconnected from WebSocket server');
    // Reconnect after 3 seconds
    setTimeout(connectWebSocket, 3000);
  };

  ws.onerror = (error) => {
    console.error('[Service Worker] WebSocket error:', error);
  };
}

// Start WebSocket connection
connectWebSocket();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'createSession') {
    const session = sessionManager.createSession();
    sendResponse(session);
  }

  return true;
});

console.log('Browser Automator Service Worker loaded');
