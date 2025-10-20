/**
 * Chrome Extension Content Script
 * Executes DOM tools directly with dom-core
 */

import { DomCore } from '@browser-automator/dom-core';

const BROWSER_AUTOMATOR_UUID = 'ba-4a8f9c2d-e1b6-4d3a-9f7e-2c8b1a5d6e3f';

// Create dom-core instance
const domCore = new DomCore();

console.log('[Content Script] Browser Automator Content Script loaded with DomCore');

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
    }
  }
});

// Handle messages from service worker (for tool execution)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'execute-tool') {
    console.log('[Content Script] Executing tool:', message.tool, 'with args:', message.args);

    // Execute tool directly with dom-core
    (async () => {
      try {
        let result: any;

        switch (message.tool) {
          case 'snapshot':
            console.log('[Content Script] Calling domCore.snapshot()');
            result = { snapshot: await domCore.snapshot() };
            console.log('[Content Script] Snapshot result:', result.snapshot.substring(0, 100) + '...');
            break;

          case 'click':
            console.log('[Content Script] Calling domCore.click()');
            await domCore.click(message.args);
            result = { success: true };
            console.log('[Content Script] Click completed');
            break;

          case 'type':
            console.log('[Content Script] Calling domCore.type()');
            await domCore.type(message.args);
            result = { success: true };
            console.log('[Content Script] Type completed');
            break;

          case 'evaluate':
            console.log('[Content Script] Calling domCore.evaluate()');
            const evalResult = await domCore.evaluate(message.args);
            result = { result: evalResult.result, error: evalResult.error };
            console.log('[Content Script] Evaluate result:', result);
            break;

          case 'waitFor':
            console.log('[Content Script] Calling domCore.waitFor()');
            await domCore.waitFor(message.args);
            result = { success: true };
            console.log('[Content Script] WaitFor completed');
            break;

          case 'consoleMessages':
            console.log('[Content Script] Calling domCore.consoleMessages()');
            const messages = await domCore.consoleMessages(message.args);
            result = { messages: messages.result };
            console.log('[Content Script] ConsoleMessages result:', result);
            break;

          default:
            result = {
              error: `Unknown tool: ${message.tool}`,
              success: false,
            };
        }

        console.log('[Content Script] Sending response:', result);
        sendResponse(result);
      } catch (error) {
        console.error('[Content Script] Tool execution error:', error);
        sendResponse({
          error: error instanceof Error ? error.message : String(error),
          success: false,
        });
      }
    })();

    // Return true to indicate async response
    return true;
  }
});

console.log('Browser Automator Content Script loaded');
