/**
 * Content Script
 * Bridges communication between inpage provider and background service worker
 */

// Inject the inpage script
const injectScript = () => {
  try {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('inpage.js');
    script.type = 'module';

    // Inject as first script
    const container = document.head || document.documentElement;
    container.insertBefore(script, container.firstChild);

    // Clean up after injection
    script.onload = () => script.remove();
  } catch (error) {
    console.error('Trinity Wallet: Failed to inject provider', error);
  }
};

// Listen for messages from inpage
window.addEventListener('message', async event => {
  if (event.source !== window) return;
  if (event.data?.target !== 'trinity-content') return;

  const { type, payload } = event.data;

  if (type === 'request') {
    try {
      // Forward to background
      const response = await chrome.runtime.sendMessage({
        type: 'rpc',
        payload: {
          id: payload.id,
          method: payload.method,
          params: payload.params,
          origin: window.location.origin,
        },
      });

      // Send response back to inpage
      window.postMessage(
        {
          target: 'trinity-inpage',
          type: 'response',
          payload: {
            id: payload.id,
            result: response.result,
            error: response.error,
          },
        },
        '*'
      );
    } catch (error) {
      window.postMessage(
        {
          target: 'trinity-inpage',
          type: 'response',
          payload: {
            id: payload.id,
            error: {
              code: -32603,
              message: (error as Error).message || 'Internal error',
            },
          },
        },
        '*'
      );
    }
  }
});

// Listen for events from background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'event') {
    // Forward event to inpage
    window.postMessage(
      {
        target: 'trinity-inpage',
        type: 'event',
        payload: message.payload,
      },
      '*'
    );
  }

  // Keep the message channel open
  sendResponse({ received: true });
  return true;
});

// Inject on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectScript);
} else {
  injectScript();
}
