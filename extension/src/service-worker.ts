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

    // Send keepalive ping every 20 seconds to keep service worker alive (Chrome 116+)
    const keepAliveInterval = setInterval(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }));
      } else {
        clearInterval(keepAliveInterval);
      }
    }, 20000);
  };

  ws.onmessage = async (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log('[Service Worker] Received:', data);

      // Handle incoming requests from server
      if (data.requestId && data.message) {
        const { requestId, message } = data;
        console.log('[Service Worker] Processing message:', message.type, message);

        // Process the message and generate response
        let payload;

        if (message.type === 'connect') {
          // Create session
          const session = sessionManager.createSession();
          payload = session;
        } else if (message.type === 'createTab') {
          // Create new tab
          const tab = await chrome.tabs.create({ url: message.url });
          if (tab.id) {
            sessionManager.addTabToSession('default-session', tab.id);
          }
          payload = {
            id: tab.id,
            url: tab.url || message.url,
            title: tab.title || 'New Tab',
            sessionId: 'default-session',
          };
        } else if (message.type === 'listTabs') {
          // List all tabs
          const tabs = await chrome.tabs.query({});
          payload = tabs.map((tab) => ({
            id: tab.id,
            url: tab.url || '',
            title: tab.title || 'Untitled',
            sessionId: 'default-session',
          }));
        } else if (message.type === 'execute') {
          // Execute tool on tab
          const { tool, args } = message;
          let { tabId } = message;

          // For navigate tool without explicit tabId, create new tab
          if (tool === 'navigate' && (!tabId || tabId === 1)) {
            const tab = await chrome.tabs.create({ url: args.url });
            if (tab.id) {
              sessionManager.addTabToSession('default-session', tab.id);
            }
            payload = {
              code: `navigate('${args.url}')`,
              pageState: `Navigated to ${args.url} in new tab`,
              tabId: tab.id,
            };
          } else {
            // If no tab ID or invalid, use active tab for other tools
            if (!tabId || tabId === 1) {
              const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
              tabId = tabs[0]?.id || null;
            }

            if (!tabId) {
              payload = { error: 'No active tab found' };
            } else if (tool === 'navigate') {
              // Navigate existing tab to URL (when tabId was explicitly provided)
              await chrome.tabs.update(tabId, { url: args.url });
              payload = {
                code: `navigate('${args.url}')`,
                pageState: `Navigated to ${args.url}`,
              };
            } else if (tool === 'snapshot') {
              // Get page snapshot (placeholder - needs dom-core integration)
              payload = {
                snapshot: `Page snapshot for tab ${tabId} (not yet implemented)`,
              };
            } else {
              payload = { success: true, message: `Executed ${tool}` };
            }
          }
        } else {
          payload = { error: 'Unknown message type' };
        }

        // Send response back to server
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ requestId, payload }));
        }
      }
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
