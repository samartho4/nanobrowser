/**
 * Bridge to communicate with content scripts for Gemini Nano operations
 * Content scripts have access to window.ai, so we use them as a proxy
 */

import type { NanoCapabilities, GenerateOptions, SummarizerOptions } from '../providers/types';

export class ContentScriptBridge {
  private static instance: ContentScriptBridge | null = null;
  private messageIdCounter = 0;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): ContentScriptBridge {
    if (!ContentScriptBridge.instance) {
      ContentScriptBridge.instance = new ContentScriptBridge();
    }
    return ContentScriptBridge.instance;
  }

  /**
   * Get an active tab to send messages to
   */
  private async getActiveTab(): Promise<chrome.tabs.Tab> {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs.length === 0 || !tabs[0].id) {
      throw new Error('No active tab found');
    }
    return tabs[0];
  }

  /**
   * Send a message to content script and wait for response
   */
  private async sendMessage<T>(type: string, payload?: any): Promise<T> {
    const tab = await this.getActiveTab();
    const messageId = `nano-${++this.messageIdCounter}`;

    return new Promise<T>((resolve, reject) => {
      chrome.tabs.sendMessage(
        tab.id!,
        {
          type,
          id: messageId,
          payload,
        },
        response => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }

          if (response && response.type === 'nano:response') {
            resolve(response.payload);
          } else if (response && response.type === 'nano:error') {
            reject(new Error(response.error));
          } else {
            reject(new Error('Invalid response from content script'));
          }
        },
      );
    });
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
}
