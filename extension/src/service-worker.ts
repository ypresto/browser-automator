/**
 * Chrome Extension Service Worker
 * Manages tabs and sessions
 */

import { SessionManager } from '@browser-automator/extensions-core';

const sessionManager = new SessionManager();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'createSession') {
    const session = sessionManager.createSession();
    sendResponse(session);
  }

  return true;
});

console.log('Browser Automator Service Worker loaded');
