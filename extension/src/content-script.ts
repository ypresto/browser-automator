/**
 * Chrome Extension Content Script
 * Acts as bridge between controller page and service worker
 */

const BROWSER_AUTOMATOR_UUID = 'ba-4a8f9c2d-e1b6-4d3a-9f7e-2c8b1a5d6e3f';

window.addEventListener('message', (event) => {
  if (event.data?.type === 'browser-automator-init' &&
      event.data?.uuid === BROWSER_AUTOMATOR_UUID) {
    // Forward to service worker
    chrome.runtime.sendMessage(event.data, (response) => {
      // Send response back to controller
      window.postMessage({
        type: 'browser-automator-response',
        payload: response,
      }, '*');
    });
  }
});

console.log('Browser Automator Content Script loaded');
