/**
 * Injected Script
 * Runs in page context with access to DOM
 */

import { DomCore } from '@browser-automator/dom-core';

const domCore = new DomCore();

// Expose to window for testing
(window as any).__browserAutomatorDomCore = domCore;

console.log('Browser Automator Injected Script loaded');
