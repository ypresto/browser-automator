/**
 * Chrome Extension Service Worker
 * Manages tabs and sessions and connects to WebSocket server
 */

import {
  SessionManager,
  PermissionManager,
  type PermissionRequest,
} from '@browser-automator/extensions-core';

const sessionManager = new SessionManager();
const permissionManager = new PermissionManager();
let ws: WebSocket | null = null;

// TODO: Get actual caller origin from WebSocket handshake or initial connection
// For now, using localhost as the controller origin
const CALLER_ORIGIN = 'http://localhost:30001';

// Permission management
interface PendingPermissionUI {
  id: string;
  request: PermissionRequest;
  resolve: (allowed: boolean) => void;
  reject: (error: Error) => void;
}

const pendingPermissions = new Map<string, PendingPermissionUI>();

// Keep service worker alive using alarms
chrome.alarms.create('keepAlive', { periodInMinutes: 0.5 }); // Every 30 seconds

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'keepAlive') {
    console.log('[Service Worker] Keep-alive alarm triggered');
    // Reconnect WebSocket if disconnected
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.log('[Service Worker] WebSocket disconnected, reconnecting...');
      connectWebSocket();
    }
  }
});

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
          // Create session bound to caller origin
          const session = sessionManager.createSession(CALLER_ORIGIN);
          payload = session;
        } else if (message.type === 'createTab') {
          // Check permission for createTab (navigating to target URL)
          const targetOrigin = new URL(message.url).origin;
          const permissionRequest: PermissionRequest = {
            action: 'createTab',
            callerOrigin: CALLER_ORIGIN,
            targetOrigin,
            url: message.url,
          };

          try {
            const allowed = await requestPermission(permissionRequest);
            if (!allowed) {
              payload = {
                error: `Permission denied to open tab: ${message.url}`,
                success: false,
              };
            } else {
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
            }
          } catch (error) {
            payload = {
              error: `Permission error: ${error instanceof Error ? error.message : String(error)}`,
              success: false,
            };
          }
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
            // Check permission for navigate (to target URL)
            const targetOrigin = new URL(args.url).origin;
            const permissionRequest: PermissionRequest = {
              action: 'navigate',
              callerOrigin: CALLER_ORIGIN,
              targetOrigin,
              url: args.url,
            };

            try {
              const allowed = await requestPermission(permissionRequest);
              if (!allowed) {
                payload = {
                  error: `Permission denied to navigate to: ${args.url}`,
                  success: false,
                };
              } else {
                const tab = await chrome.tabs.create({ url: args.url });
                if (tab.id) {
                  sessionManager.addTabToSession('default-session', tab.id);
                }
                payload = {
                  code: `navigate('${args.url}')`,
                  pageState: `Navigated to ${args.url} in new tab`,
                  tabId: tab.id,
                };
              }
            } catch (error) {
              payload = {
                error: `Permission error: ${error instanceof Error ? error.message : String(error)}`,
                success: false,
              };
            }
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
              // Check permission for navigate (to target URL)
              const targetOrigin = new URL(args.url).origin;
              const permissionRequest: PermissionRequest = {
                action: 'navigate',
                callerOrigin: CALLER_ORIGIN,
                targetOrigin,
                url: args.url,
              };

              try {
                const allowed = await requestPermission(permissionRequest);
                if (!allowed) {
                  payload = {
                    error: `Permission denied to navigate to: ${args.url}`,
                    success: false,
                  };
                } else {
                  await chrome.tabs.update(tabId, { url: args.url });
                  payload = {
                    code: `navigate('${args.url}')`,
                    pageState: `Navigated to ${args.url}`,
                  };
                }
              } catch (error) {
                payload = {
                  error: `Permission error: ${error instanceof Error ? error.message : String(error)}`,
                  success: false,
                };
              }
            } else {
              // Check permission for sensitive actions
              const sensitiveActions = ['click', 'type', 'evaluate'];
              const requiresPermission = sensitiveActions.includes(tool);

              if (requiresPermission) {
                try {
                  console.log(`[Permission] Action "${tool}" requires permission`);
                  // Get tab URL for permission context
                  const tab = await chrome.tabs.get(tabId);
                  const targetOrigin = tab.url ? new URL(tab.url).origin : 'unknown';

                  // Build permission request
                  const permissionRequest: PermissionRequest = {
                    action: tool,
                    callerOrigin: CALLER_ORIGIN,
                    targetOrigin,
                    element: args.element,
                    ref: args.ref,
                    text: args.text,
                  };

                  console.log(`[Permission] Requesting: ${CALLER_ORIGIN} → ${tool} on ${targetOrigin}`);

                  // Request permission
                  const allowed = await requestPermission(permissionRequest);
                  console.log(`[Permission] Decision: ${allowed ? 'ALLOWED' : 'DENIED'}`);

                  if (!allowed) {
                    payload = {
                      error: `Permission denied for action: ${tool}`,
                      success: false,
                    };
                    // Send response and skip execution
                    if (ws && ws.readyState === WebSocket.OPEN) {
                      ws.send(JSON.stringify({ requestId, payload }));
                    }
                    return;
                  }
                } catch (error) {
                  payload = {
                    error: `Permission error: ${error instanceof Error ? error.message : String(error)}`,
                    success: false,
                  };
                  if (ws && ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ requestId, payload }));
                  }
                  return;
                }
              }

              // Forward all other tools to content script for DOM operations
              try {
                const response = await chrome.tabs.sendMessage(tabId, {
                  type: 'execute-tool',
                  tool,
                  args,
                });
                payload = response;
              } catch (error) {
                payload = {
                  error: `Failed to execute tool "${tool}": ${error instanceof Error ? error.message : String(error)}`,
                  success: false,
                };
              }
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

// Request permission from user using PermissionManager
async function requestPermission(request: PermissionRequest): Promise<boolean> {
  // Check if already allowed by policy
  if (permissionManager.isAllowed(request)) {
    console.log(`[Permission] Auto-allowed: ${request.action} (${request.callerOrigin} → ${request.targetOrigin})`);
    return true;
  }

  // Create pending permission for UI
  const permissionId = Math.random().toString(36).substring(2);

  return new Promise((resolve, reject) => {
    const pending: PendingPermissionUI = {
      id: permissionId,
      request,
      resolve,
      reject,
    };

    pendingPermissions.set(permissionId, pending);

    console.log('[Permission] Opening popup for permission request:', permissionId);

    // Open popup to show permission request
    chrome.action.openPopup().then(() => {
      console.log('[Permission] Popup opened successfully');
    }).catch((error) => {
      console.error('[Permission] Failed to open popup:', error);
      pendingPermissions.delete(permissionId);
      reject(new Error('Failed to open permission popup'));
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      if (pendingPermissions.has(permissionId)) {
        pendingPermissions.delete(permissionId);
        reject(new Error('Permission request timed out'));
      }
    }, 30000);
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'createSession') {
    const session = sessionManager.createSession(CALLER_ORIGIN);
    sendResponse(session);
  } else if (message.type === 'ping') {
    console.log('[Service Worker] Ping received, service worker is active');
    sendResponse({ status: 'active', timestamp: Date.now() });
  } else if (message.type === 'getPendingPermission') {
    // Popup is requesting the pending permission
    const permissions = Array.from(pendingPermissions.values());
    const pending = permissions[0] || null;
    if (pending) {
      // Return serializable version (without resolve/reject functions)
      sendResponse({
        id: pending.id,
        action: pending.request.action,
        element: pending.request.element,
        ref: pending.request.ref,
        text: pending.request.text,
        url: pending.request.url || pending.request.targetOrigin,
        callerOrigin: pending.request.callerOrigin,
        targetOrigin: pending.request.targetOrigin,
        sessionId: 'default-session', // For UI display
        timestamp: Date.now(),
      });
    } else {
      sendResponse(null);
    }
  } else if (message.type === 'permissionDecision') {
    // User made a decision in popup
    const { permissionId, allow, remember } = message;
    const pending = pendingPermissions.get(permissionId);

    if (pending) {
      if (allow && remember) {
        // Save permission policy using PermissionManager
        permissionManager.grantPermission(pending.request, true);
      }

      // Resolve the promise
      pending.resolve(allow);
      pendingPermissions.delete(permissionId);

      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, error: 'Permission not found' });
    }
  }

  return true;
});

console.log('Browser Automator Service Worker loaded');
