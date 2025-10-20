/**
 * Vercel AI SDK tools for browser automation
 */

import { tool } from 'ai';
import { z } from 'zod';
import type { ControllerSDK, TabInfo } from '@browser-automator/controller';

/**
 * Create browser automation tools for AI SDK
 */
export function createBrowserTools(sdk: ControllerSDK) {
  return {
    /**
     * Navigate to a URL
     */
    browser_navigate: tool({
      description: 'Navigate to a URL in the browser',
      inputSchema: z.object({
        url: z.string().describe('The URL to navigate to'),
      }),
      execute: async ({ url }) => {
        const result = await sdk.navigate({ url });
        return {
          code: result.code,
          pageState: result.pageState,
        };
      },
    }),

    /**
     * Get accessibility snapshot of current page
     */
    browser_snapshot: tool({
      description: 'Get accessibility tree snapshot of the current page',
      inputSchema: z.object({}),
      execute: async () => {
        const snapshot = await sdk.snapshot();
        return { snapshot };
      },
    }),

    /**
     * Click an element
     */
    browser_click: tool({
      description: 'Click an element on the page',
      inputSchema: z.object({
        element: z.string().describe('Human-readable element description'),
        ref: z.string().describe('Element reference from snapshot (e.g., e1, e2)'),
        doubleClick: z.boolean().optional().describe('Whether to double click'),
        button: z
          .enum(['left', 'right', 'middle'])
          .optional()
          .describe('Mouse button to click'),
      }),
      execute: async ({ element, ref, doubleClick, button }) => {
        const params: any = { element, ref };
        if (doubleClick !== undefined) params.doubleClick = doubleClick;
        if (button !== undefined) params.button = button;
        await sdk.click(params);
        return { success: true };
      },
    }),

    /**
     * Type text into an input
     */
    browser_type: tool({
      description: 'Type text into an input element',
      inputSchema: z.object({
        element: z.string().describe('Human-readable element description'),
        ref: z.string().describe('Element reference from snapshot'),
        text: z.string().describe('Text to type'),
        submit: z.boolean().optional().describe('Whether to submit after typing'),
      }),
      execute: async ({ element, ref, text, submit }) => {
        const params: any = { element, ref, text };
        if (submit !== undefined) params.submit = submit;
        await sdk.type(params);
        return { success: true };
      },
    }),

    /**
     * Evaluate JavaScript on the page
     */
    browser_evaluate: tool({
      description: 'Evaluate JavaScript code on the page',
      inputSchema: z.object({
        function: z.string().describe('JavaScript function body to execute'),
        element: z.string().optional().describe('Element description (if evaluating on element)'),
        ref: z.string().optional().describe('Element reference (if evaluating on element)'),
      }),
      execute: async ({ function: fn, element, ref }) => {
        const params: any = { function: fn };
        if (element !== undefined) params.element = element;
        if (ref !== undefined) params.ref = ref;
        const result = await sdk.evaluate(params);
        return {
          result: result.result,
          error: result.error,
        };
      },
    }),

    /**
     * Create a new tab
     */
    browser_tabs_create: tool({
      description: 'Create a new browser tab',
      inputSchema: z.object({
        url: z.string().describe('URL to open in the new tab'),
      }),
      execute: async ({ url }) => {
        const tab = await sdk.tabs.create(url);
        return {
          tabId: tab.id,
          url: tab.url,
          title: tab.title,
        };
      },
    }),

    /**
     * List all tabs
     */
    browser_tabs_list: tool({
      description: 'List all browser tabs',
      inputSchema: z.object({}),
      execute: async () => {
        const tabs = await sdk.tabs.list();
        return {
          tabs: tabs.map((tab: TabInfo) => ({
            id: tab.id,
            url: tab.url,
            title: tab.title,
          })),
        };
      },
    }),

    /**
     * Select a tab
     */
    browser_tabs_select: tool({
      description: 'Select a browser tab by index',
      inputSchema: z.object({
        index: z.number().describe('Tab index to select (0-based)'),
      }),
      execute: async ({ index }) => {
        await sdk.tabs.select(index);
        return { success: true };
      },
    }),

    /**
     * Close a tab
     */
    browser_tabs_close: tool({
      description: 'Close a browser tab',
      inputSchema: z.object({
        index: z.number().optional().describe('Tab index to close (0-based), or current tab if omitted'),
      }),
      execute: async ({ index }) => {
        await sdk.tabs.close(index);
        return { success: true };
      },
    }),

    /**
     * Wait for condition
     */
    browser_wait: tool({
      description: 'Wait for a condition on the page',
      inputSchema: z.object({
        time: z.number().optional().describe('Time to wait in seconds'),
        text: z.string().optional().describe('Text to wait for to appear'),
        textGone: z.string().optional().describe('Text to wait for to disappear'),
      }),
      execute: async ({ time, text, textGone }) => {
        const params: any = {};
        if (time !== undefined) params.time = time;
        if (text !== undefined) params.text = text;
        if (textGone !== undefined) params.textGone = textGone;
        await sdk.waitFor(params);
        return { success: true };
      },
    }),

    /**
     * Get console messages
     */
    browser_console: tool({
      description: 'Get browser console messages',
      inputSchema: z.object({
        onlyErrors: z.boolean().optional().describe('Whether to return only error messages'),
      }),
      execute: async ({ onlyErrors }) => {
        const params: any = {};
        if (onlyErrors !== undefined) params.onlyErrors = onlyErrors;
        const result = await sdk.consoleMessages(params);
        return {
          messages: result.result,
        };
      },
    }),
  };
}
