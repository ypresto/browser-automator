/**
 * Injected Script - Runs in page context with access to DOM
 * Uses dom-core for browser automation
 */

import { DomCore } from '@browser-automator/dom-core';

const BROWSER_AUTOMATOR_UUID = 'ba-4a8f9c2d-e1b6-4d3a-9f7e-2c8b1a5d6e3f';

// Create dom-core instance
const domCore = new DomCore();

// Listen for tool execution requests from content script
window.addEventListener('message', async (event) => {
  if (event.data?.uuid !== BROWSER_AUTOMATOR_UUID) {
    return;
  }

  if (event.data?.type === 'browser-automator-execute-tool') {
    const { requestId, tool, args } = event.data;

    try {
      let result: any;

      switch (tool) {
        case 'snapshot':
          result = { snapshot: await domCore.snapshot() };
          break;

        case 'click':
          await domCore.click(args);
          result = { success: true };
          break;

        case 'type':
          await domCore.type(args);
          result = { success: true };
          break;

        case 'evaluate':
          const evalResult = await domCore.evaluate(args);
          result = { result: evalResult.result, error: evalResult.error };
          break;

        case 'waitFor':
          await domCore.waitFor(args);
          result = { success: true };
          break;

        case 'consoleMessages':
          const messages = await domCore.consoleMessages(args);
          result = { messages: messages.result };
          break;

        default:
          result = {
            error: `Unknown tool: ${tool}`,
            success: false,
          };
      }

      // Send response back to content script
      window.postMessage({
        type: 'browser-automator-tool-response',
        uuid: BROWSER_AUTOMATOR_UUID,
        requestId,
        result,
      }, '*');
    } catch (error) {
      // Send error response
      window.postMessage({
        type: 'browser-automator-tool-response',
        uuid: BROWSER_AUTOMATOR_UUID,
        requestId,
        result: {
          error: error instanceof Error ? error.message : String(error),
          success: false,
        },
      }, '*');
    }
  }
});

console.log('Browser Automator Injected Script loaded');
