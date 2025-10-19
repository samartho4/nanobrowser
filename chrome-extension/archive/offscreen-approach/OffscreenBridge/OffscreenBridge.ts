/**
 * Bridge to communicate with the offscreen document for Gemini Nano operations
 * Service workers can't access window.ai, so we use an offscreen document as a proxy
 */

import type { NanoCapabilities, GenerateOptions, SummarizerOptions } from '../providers/types';

const OFFSCREEN_DOCUMENT_PATH = 'offscreen/offscreen.html';

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  streamCallback?: (chunk: string) => void;
}

export class OffscreenBridge {
  private static instance: OffscreenBridge | null = null;
  private pendingRequests = new Map<string, PendingRequest>();
  private messageIdCounter = 0;
  private offscreenReady = false;

  private constructor() {
    // Listen for responses from offscreen document
    chrome.runtime.onMessage.addListener((message, sender) => {
      if (message.type?.startsWith('nano:')) {
        this.handleOffscreenMessage(message);
      }
    });
  }

  /**
   * Get singleton instance
   */
  static getInstance(): OffscreenBridge {
    if (!OffscreenBridge.instance) {
      OffscreenBridge.instance = new OffscreenBridge();
    }
    return OffscreenBridge.instance;
  }

  /**
   * Ensure offscreen document is created
   */
  private async ensureOffscreenDocument(): Promise<void> {
    if (this.offscreenReady) {
      return;
    }

    // Check if offscreen document already exists
    const existingContexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT' as chrome.runtime.ContextType],
    });

    if (existingContexts.length > 0) {
      this.offscreenReady = true;
      return;
    }

    // Create offscreen document
    await chrome.offscreen.createDocument({
      url: OFFSCREEN_DOCUMENT_PATH,
      reasons: ['DOM_SCRAPING' as chrome.offscreen.Reason], // Using DOM_SCRAPING as it's the closest reason
      justification: 'Access Chrome AI APIs (window.ai) which are not available in service workers',
    });

    this.offscreenReady = true;
    console.log('[OffscreenBridge] Offscreen document created');
  }

  /**
   * Send a message to the offscreen document and wait for response
   */
  private async sendMessage<T>(type: string, payload?: any): Promise<T> {
    await this.ensureOffscreenDocument();

    const messageId = `nano-${++this.messageIdCounter}`;

    return new Promise<T>((resolve, reject) => {
      this.pendingRequests.set(messageId, { resolve, reject });

      chrome.runtime.sendMessage(
        {
          type,
          id: messageId,
          payload,
        },
        response => {
          if (chrome.runtime.lastError) {
            const pending = this.pendingRequests.get(messageId);
            if (pending) {
              pending.reject(new Error(chrome.runtime.lastError.message));
              this.pendingRequests.delete(messageId);
            }
          }
          // Response will be handled by handleOffscreenMessage
        },
      );

      // Timeout after 30 seconds
      setTimeout(() => {
        const pending = this.pendingRequests.get(messageId);
        if (pending) {
          pending.reject(new Error('Request timeout'));
          this.pendingRequests.delete(messageId);
        }
      }, 30000);
    });
  }

  /**
   * Handle messages from offscreen document
   */
  private handleOffscreenMessage(message: any): void {
    const { type, id, payload, error } = message;
    const pending = this.pendingRequests.get(id);

    if (!pending) {
      return;
    }

    switch (type) {
      case 'nano:response':
        pending.resolve(payload);
        this.pendingRequests.delete(id);
        break;

      case 'nano:error':
        pending.reject(new Error(error || 'Unknown error'));
        this.pendingRequests.delete(id);
        break;

      case 'nano:stream-chunk':
        if (pending.streamCallback) {
          pending.streamCallback(payload.chunk);
        }
        break;

      case 'nano:stream-end':
        pending.resolve(undefined);
        this.pendingRequests.delete(id);
        break;
    }
  }

  /**
   * Initialize Gemini Nano
   */
  async initialize(): Promise<boolean> {
    const result = await this.sendMessage<{ available: boolean }>('nano:initialize');
    return result.available;
  }

  /**
   * Detect Gemini Nano capabilities
   */
  async detectCapabilities(): Promise<NanoCapabilities> {
    return await this.sendMessage<NanoCapabilities>('nano:detect');
  }

  /**
   * Generate text using Gemini Nano
   */
  async generateText(prompt: string, options: GenerateOptions = {}): Promise<string> {
    const result = await this.sendMessage<{ text: string }>('nano:generateText', {
      prompt,
      options,
    });
    return result.text;
  }

  /**
   * Generate structured output (returns raw text, caller must parse)
   */
  async generateStructured(prompt: string, options: GenerateOptions = {}): Promise<string> {
    const result = await this.sendMessage<{ text: string }>('nano:generateStructured', {
      prompt,
      options,
    });
    return result.text;
  }

  /**
   * Generate streaming text
   */
  async generateStream(prompt: string, options: GenerateOptions = {}, onChunk: (chunk: string) => void): Promise<void> {
    const messageId = `nano-${++this.messageIdCounter}`;

    return new Promise<void>((resolve, reject) => {
      this.pendingRequests.set(messageId, {
        resolve,
        reject,
        streamCallback: onChunk,
      });

      chrome.runtime.sendMessage({
        type: 'nano:generateStream',
        id: messageId,
        payload: { prompt, options },
      });

      // Timeout after 60 seconds for streaming
      setTimeout(() => {
        const pending = this.pendingRequests.get(messageId);
        if (pending) {
          pending.reject(new Error('Streaming timeout'));
          this.pendingRequests.delete(messageId);
        }
      }, 60000);
    });
  }

  /**
   * Summarize text
   */
  async summarize(text: string, options: SummarizerOptions = {}): Promise<string> {
    const result = await this.sendMessage<{ summary: string }>('nano:summarize', {
      text,
      options,
    });
    return result.summary;
  }

  /**
   * Translate text
   */
  async translate(text: string, targetLang: string, sourceLang?: string): Promise<string> {
    const result = await this.sendMessage<{ translation: string }>('nano:translate', {
      text,
      targetLang,
      sourceLang,
    });
    return result.translation;
  }

  /**
   * Close the offscreen document
   */
  async close(): Promise<void> {
    if (this.offscreenReady) {
      await chrome.offscreen.closeDocument();
      this.offscreenReady = false;
      console.log('[OffscreenBridge] Offscreen document closed');
    }
  }
}
