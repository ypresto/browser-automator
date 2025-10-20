/**
 * Type definitions for @browser-automator/controller
 * Frontend SDK for browser automation
 */

import type { DomCoreTools } from '@browser-automator/dom-core';
import type { TabInfo } from '@browser-automator/extensions-core';

/**
 * Message types for controller-extension communication
 */
export type ControllerMessage =
  | { type: 'connect'; token: string }
  | { type: 'disconnect' }
  | { type: 'createTab'; url: string }
  | { type: 'listTabs' }
  | { type: 'selectTab'; index: number }
  | { type: 'closeTab'; index?: number }
  | { type: 'execute'; tabId: number; tool: string; args: any };

export type ControllerResponse =
  | { type: 'connected'; sessionId: string; createdAt: number }
  | { type: 'disconnected' }
  | { type: 'tabCreated'; tab: TabInfo }
  | { type: 'tabs'; tabs: TabInfo[] }
  | { type: 'tabSelected' }
  | { type: 'tabClosed' }
  | { type: 'toolResult'; result: any }
  | { type: 'error'; error: string };

/**
 * Messaging adapter interface
 * Allows different transport mechanisms (WebSocket, postMessage, etc.)
 */
export interface MessagingAdapter {
  /**
   * Send a message and wait for response
   */
  send<T = any>(message: ControllerMessage): Promise<T>;

  /**
   * Listen for incoming messages
   */
  onMessage(handler: (response: ControllerResponse) => void): void;

  /**
   * Close the connection
   */
  close(): void;
}

/**
 * Browser tabs interface (playwright-mcp compatible)
 */
export interface BrowserTabs {
  create(url: string): Promise<TabInfo>;
  list(): Promise<TabInfo[]>;
  select(index: number): Promise<void>;
  close(index?: number): Promise<void>;
}

/**
 * Controller SDK - provides full dom-core + browser_tabs interface
 */
export interface ControllerSDK extends DomCoreTools {
  // Connection management
  connect(token: string): Promise<{ sessionId: string; createdAt: number }>;
  disconnect(): Promise<void>;
  isConnected(): boolean;

  // Tab management (playwright-mcp compatible)
  tabs: BrowserTabs;

  // Get current tab ID for tool execution
  getCurrentTabId(): number | null;
  setCurrentTabId(tabId: number): void;
}

/**
 * Configuration for controller SDK
 */
export interface ControllerConfig {
  adapter: MessagingAdapter;
  defaultTabId?: number;
}
