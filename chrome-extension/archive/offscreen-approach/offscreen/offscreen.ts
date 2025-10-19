/**
 * Offscreen document for Gemini Nano integration
 * This document has access to window.ai APIs which are not available in service workers
 */

import { GeminiNanoProvider } from '../background/llm/providers/GeminiNanoProvider';
import type { NanoCapabilities } from '../background/llm/providers/types';

console.log('[Offscreen] Gemini Nano offscreen document loaded');

// Initialize the provider
const nanoProvider = new GeminiNanoProvider();
let initialized = false;

// Message types
interface NanoMessage {
  type:
    | 'nano:initialize'
    | 'nano:detect'
    | 'nano:generateText'
    | 'nano:generateStructured'
    | 'nano:generateStream'
    | 'nano:summarize'
    | 'nano:translate';
  id: string;
  payload?: any;
}

interface NanoResponse {
  type: 'nano:response' | 'nano:error' | 'nano:stream-chunk' | 'nano:stream-end';
  id: string;
  payload?: any;
  error?: string;
}

/**
 * Handle messages from the service worker
 */
chrome.runtime.onMessage.addListener((message: NanoMessage, sender, sendResponse) => {
  // Only handle nano messages
  if (!message.type?.startsWith('nano:')) {
    return false;
  }

  console.log('[Offscreen] Received message:', message.type);

  // Handle async operations
  handleNanoMessage(message)
    .then(result => {
      const response: NanoResponse = {
        type: 'nano:response',
        id: message.id,
        payload: result,
      };
      sendResponse(response);
    })
    .catch(error => {
      const response: NanoResponse = {
        type: 'nano:error',
        id: message.id,
        error: error instanceof Error ? error.message : String(error),
      };
      sendResponse(response);
    });

  // Return true to indicate we'll send a response asynchronously
  return true;
});

/**
 * Handle different types of Nano operations
 */
async function handleNanoMessage(message: NanoMessage): Promise<any> {
  const { type, payload } = message;

  switch (type) {
    case 'nano:initialize':
      if (!initialized) {
        const available = await nanoProvider.initialize();
        initialized = true;
        return { available };
      }
      return { available: nanoProvider.isReady() };

    case 'nano:detect':
      if (!initialized) {
        await nanoProvider.initialize();
        initialized = true;
      }
      const capabilities = await nanoProvider.checkAvailability();
      return capabilities;

    case 'nano:generateText':
      if (!initialized) {
        await nanoProvider.initialize();
        initialized = true;
      }
      const text = await nanoProvider.generateText(payload.prompt, payload.options);
      return { text };

    case 'nano:generateStructured':
      if (!initialized) {
        await nanoProvider.initialize();
        initialized = true;
      }
      // Note: We can't pass Zod schemas through messaging, so we'll need to handle validation differently
      // For now, just return the raw text and let the caller parse it
      const structuredText = await nanoProvider.generateText(payload.prompt, payload.options);
      return { text: structuredText };

    case 'nano:generateStream':
      // Streaming requires a different approach - we'll send multiple messages
      if (!initialized) {
        await nanoProvider.initialize();
        initialized = true;
      }
      await handleStreamingGeneration(message.id, payload.prompt, payload.options);
      return { streaming: true };

    case 'nano:summarize':
      if (!initialized) {
        await nanoProvider.initialize();
        initialized = true;
      }
      const summary = await nanoProvider.summarize(payload.text, payload.options);
      return { summary };

    case 'nano:translate':
      if (!initialized) {
        await nanoProvider.initialize();
        initialized = true;
      }
      const translation = await nanoProvider.translate(payload.text, payload.targetLang, payload.sourceLang);
      return { translation };

    default:
      throw new Error(`Unknown message type: ${type}`);
  }
}

/**
 * Handle streaming generation by sending multiple messages
 */
async function handleStreamingGeneration(messageId: string, prompt: string, options: any): Promise<void> {
  try {
    for await (const chunk of nanoProvider.generateStream(prompt, options)) {
      // Send each chunk back to the service worker
      chrome.runtime.sendMessage({
        type: 'nano:stream-chunk',
        id: messageId,
        payload: { chunk },
      });
    }

    // Send end-of-stream message
    chrome.runtime.sendMessage({
      type: 'nano:stream-end',
      id: messageId,
    });
  } catch (error) {
    // Send error message
    chrome.runtime.sendMessage({
      type: 'nano:error',
      id: messageId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// Auto-initialize on load
(async () => {
  try {
    console.log('[Offscreen] Auto-initializing Gemini Nano provider...');
    const available = await nanoProvider.initialize();
    initialized = true;

    if (available) {
      console.log('[Offscreen] ✅ Gemini Nano is available and ready');
      const caps = await nanoProvider.checkAvailability();
      console.log('[Offscreen] Capabilities:', caps);
    } else {
      console.warn('[Offscreen] ⚠️ Gemini Nano is not available');
    }
  } catch (error) {
    console.error('[Offscreen] Failed to initialize:', error);
  }
})();
