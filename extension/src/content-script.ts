/**
 * Chrome Extension Content Script
 * Acts as bridge between service worker and injected script
 */

const BROWSER_AUTOMATOR_UUID = 'ba-4a8f9c2d-e1b6-4d3a-9f7e-2c8b1a5d6e3f';

// Inject the script into the page context
const script = document.createElement('script');
script.src = chrome.runtime.getURL('dist/injected-script.js');
script.onload = () => {
  console.log('[Content Script] Injected script loaded');
};
(document.head || document.documentElement).appendChild(script);

// Handle messages from the web page (for wake-up functionality)
window.addEventListener('message', (event) => {
  if (event.data?.uuid === BROWSER_AUTOMATOR_UUID) {
    if (event.data?.type === 'browser-automator-init') {
      // Forward init message to service worker
      chrome.runtime.sendMessage(event.data, (response) => {
        // Send response back to controller
        window.postMessage({
          type: 'browser-automator-response',
          payload: response,
        }, '*');
      });
    } else if (event.data?.type === 'browser-automator-wake-up') {
      // Wake up service worker by sending a ping
      chrome.runtime.sendMessage({ type: 'ping' }, (response) => {
        window.postMessage({
          type: 'browser-automator-wake-up-response',
          success: !chrome.runtime.lastError,
          error: chrome.runtime.lastError?.message,
        }, '*');
      });
    } else if (event.data?.type === 'browser-automator-tool-response') {
      // Response from injected script - forward to service worker
      const { requestId, result } = event.data;
      if (pendingToolRequests.has(requestId)) {
        const resolve = pendingToolRequests.get(requestId);
        pendingToolRequests.delete(requestId);
        resolve?.(result);
      }
    }
  }
});

// Handle messages from service worker (for tool execution)
const pendingToolRequests = new Map<string, (result: any) => void>();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'execute-tool') {
    const requestId = Math.random().toString(36).substring(2);

    // Store the response callback
    pendingToolRequests.set(requestId, sendResponse);

    // Forward to injected script
    window.postMessage({
      type: 'browser-automator-execute-tool',
      uuid: BROWSER_AUTOMATOR_UUID,
      requestId,
      tool: message.tool,
      args: message.args,
    }, '*');

    // Timeout after 30 seconds
    setTimeout(() => {
      if (pendingToolRequests.has(requestId)) {
        pendingToolRequests.delete(requestId);
        sendResponse({ error: 'Tool execution timeout', success: false });
      }
    }, 30000);

    // Return true to indicate async response
    return true;
  }
});

console.log('Browser Automator Content Script loaded');
