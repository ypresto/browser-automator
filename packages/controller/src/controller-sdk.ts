/**
 * Controller SDK implementation
 * Provides frontend SDK for browser automation
 */

import type {
  ControllerSDK,
  ControllerConfig,
  BrowserTabs,
  MessagingAdapter,
} from './types.js';
import type {
  NavigateParams,
  ClickParams,
  TypeParams,
  FillFormParams,
  SelectOptionParams,
  ElementTarget,
  DragParams,
  PressKeyParams,
  EvaluateParams,
  WaitParams,
  ConsoleMessagesParams,
  ScreenshotParams,
  ToolResponse,
  ConsoleMessage,
  NetworkRequest,
} from '@browser-automator/dom-core';
import type { TabInfo } from '@browser-automator/extensions-core';

export function createControllerSDK(config: ControllerConfig): ControllerSDK {
  const { adapter } = config;
  let currentTabId: number | null = config.defaultTabId ?? null;
  let connected = false;

  // Helper to execute tool on current tab
  async function executeTool<T>(tool: string, args: any): Promise<T> {
    if (!connected) {
      throw new Error('Not connected to extension');
    }
    if (currentTabId === null) {
      throw new Error('No tab selected');
    }

    const response = await adapter.send({
      type: 'execute',
      tabId: currentTabId,
      tool,
      args,
    });

    return response as T;
  }

  // Tab management implementation
  const tabs: BrowserTabs = {
    async create(url: string): Promise<TabInfo> {
      const response = await adapter.send({ type: 'createTab', url });
      const tab = response as TabInfo;
      // Auto-select newly created tab
      currentTabId = tab.id;
      return tab;
    },

    async list(): Promise<TabInfo[]> {
      const response = await adapter.send({ type: 'listTabs' });
      return response as TabInfo[];
    },

    async select(index: number): Promise<void> {
      await adapter.send({ type: 'selectTab', index });
      const tabsList = await tabs.list();
      const tab = tabsList[index];
      if (tab) {
        currentTabId = tab.id;
      }
    },

    async close(index?: number): Promise<void> {
      if (index === undefined) {
        await adapter.send({ type: 'closeTab' });
      } else {
        await adapter.send({ type: 'closeTab', index });
      }
      if (index === undefined || currentTabId === null) {
        currentTabId = null;
      }
    },
  };

  // Controller SDK implementation
  const sdk: ControllerSDK = {
    // Connection management
    async connect(token: string) {
      const response = await adapter.send({ type: 'connect', token });
      connected = true;
      return response as { sessionId: string; createdAt: number };
    },

    async disconnect() {
      await adapter.send({ type: 'disconnect' });
      connected = false;
      currentTabId = null;
    },

    isConnected() {
      return connected;
    },

    // Tab management
    tabs,

    getCurrentTabId() {
      return currentTabId;
    },

    setCurrentTabId(tabId: number) {
      currentTabId = tabId;
    },

    // DomCoreTools implementation - all delegate to executeTool
    async navigate(params: NavigateParams): Promise<ToolResponse> {
      // Navigate can work without a tab selected - will create new tab
      if (!connected) {
        throw new Error('Not connected to extension');
      }

      const response = await adapter.send({
        type: 'execute',
        tabId: currentTabId ?? 1, // Use 1 as sentinel for "no tab specified"
        tool: 'navigate',
        args: params,
      });

      return response as ToolResponse;
    },

    async navigateBack(): Promise<ToolResponse> {
      return executeTool('navigateBack', {});
    },

    async snapshot(): Promise<string> {
      return executeTool('snapshot', {});
    },

    async click(params: ClickParams): Promise<void> {
      return executeTool('click', params);
    },

    async type(params: TypeParams): Promise<void> {
      return executeTool('type', params);
    },

    async fillForm(params: FillFormParams): Promise<void> {
      return executeTool('fillForm', params);
    },

    async selectOption(params: SelectOptionParams): Promise<void> {
      return executeTool('selectOption', params);
    },

    async hover(params: ElementTarget): Promise<void> {
      return executeTool('hover', params);
    },

    async drag(params: DragParams): Promise<void> {
      return executeTool('drag', params);
    },

    async pressKey(params: PressKeyParams): Promise<void> {
      return executeTool('pressKey', params);
    },

    async evaluate<T = any>(params: EvaluateParams): Promise<ToolResponse<T>> {
      return executeTool('evaluate', params);
    },

    async waitFor(params: WaitParams): Promise<void> {
      return executeTool('waitFor', params);
    },

    async consoleMessages(
      params?: ConsoleMessagesParams,
    ): Promise<ToolResponse<ConsoleMessage[]>> {
      return executeTool('consoleMessages', params || {});
    },

    async networkRequests(): Promise<ToolResponse<NetworkRequest[]>> {
      return executeTool('networkRequests', {});
    },

    async takeScreenshot(params?: ScreenshotParams): Promise<Blob> {
      return executeTool('takeScreenshot', params || {});
    },
  };

  return sdk;
}
