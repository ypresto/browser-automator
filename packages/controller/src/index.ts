/**
 * @browser-automator/controller
 * Frontend SDK for browser automation
 */

export { createControllerSDK } from './controller-sdk.js';
export { createWebSocketAdapter } from './adapters/websocket-adapter.js';

export type {
  ControllerSDK,
  ControllerConfig,
  ControllerMessage,
  ControllerResponse,
  MessagingAdapter,
  BrowserTabs,
} from './types.js';

// Re-export common types from dependencies for convenience
export type { DomCoreTools } from '@browser-automator/dom-core';
export type { TabInfo } from '@browser-automator/extensions-core';
