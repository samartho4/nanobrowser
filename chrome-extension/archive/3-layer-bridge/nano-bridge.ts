/**
 * Content script bridge for Gemini Nano
 * Communicates with injected script via postMessage to access window.ai
 */

console.log('[Nano Bridge] Content script nano bridge loaded');

let initialized = false;
const pendingRequests = new Map<string, { resolve: (value: any) => void; reject: (error: Error) => void }>();
let messageIdCounter = 0;

// Listen for messages from injected script
window.addEventListener('message', event => {
  // Only accept messages from same window
  if (event.source !== window) return;

  const message = event.data;

  // Handle responses from injected script
  if (message.type === 'nano:response' || message.type === 'nano:error') {
    const pending = pendingRequests.get(message.id);
    if (pending) {
      if (message.type === 'nano:response') {
        pending.resolve(message.payload);
      } else {
        pending.reject(new Error(message.error));
      }
      pendingRequests.delete(message.id);
    }
  } else if (message.type === 'nano:ready') {
    console.log('[Nano Bridge] Injected script is ready');
    initialized = true;
  }
});

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Only handle nano messages
  if (!message.type?.startsWith('nano:')) {
    return false;
  }

  console.log('[Nano Bridge] Received message from background:', message.type);

  // Forward to injected script via postMessage
  forwardToInjectedScript(message)
    .then(result => {
      sendResponse({
        type: 'nano:response',
        id: message.id,
        payload: result,
      });
    })
    .catch(error => {
      sendResponse({
        type: 'nano:error',
        id: message.id,
        error: error instanceof Error ? error.message : String(error),
      });
    });

  // Return true to indicate async response
  return true;
});

async function forwardToInjectedScript(message: any): Promise<any> {
  const messageId = `nano-${++messageIdCounter}`;

  return new Promise((resolve, reject) => {
    pendingRequests.set(messageId, { resolve, reject });

    console.log('[Nano Bridge] Forwarding message to inject script:', message.type, 'with id:', messageId);

    // Forward message to injected script
    window.postMessage(
      {
        type: message.type,
        id: messageId,
        payload: message.payload,
      },
      window.location.origin,
    );

    // Timeout after 30 seconds
    setTimeout(() => {
      const pending = pendingRequests.get(messageId);
      if (pending) {
        console.error('[Nano Bridge] Request timeout for:', messageId);
        pending.reject(new Error('Request timeout'));
        pendingRequests.delete(messageId);
      }
    }, 30000);
  });
}
