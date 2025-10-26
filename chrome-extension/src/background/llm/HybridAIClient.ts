/**
 * HybridAIClient - Unified AI client that prefers Gemini Nano and falls back to cloud
 *
 * This client provides a single interface for all LLM interactions in the extension.
 * It attempts to use Gemini Nano (on-device) first for privacy and speed, then falls
 * back to Firebase AI Logic SDK (cloud) when Nano is unavailable.
 */

import { HumanMessage, SystemMessage, type BaseMessage } from '@langchain/core/messages';
import { GeminiNanoChatModel } from './langchain/GeminiNanoChatModel';
import { HYBRID_SDK_INVOKE, type HybridSDKResponse } from './constants';

/**
 * Options for invoking the AI client
 */
export interface InvokeOptions {
  prompt: string;
  system?: string;
  schema?: any; // Zod schema or JSON schema
  stream?: boolean;
}

/**
 * Response from AI invocation
 */
export interface InvokeResponse {
  content: string;
  provider: 'nano' | 'cloud';
}

/**
 * Current status of the AI system
 */
export interface AIStatus {
  provider: 'nano' | 'cloud' | 'unknown';
  nano: {
    availability: 'available' | 'readily' | 'downloading' | 'unavailable';
  };
  lastError?: string;
}

/**
 * HybridAIClient manages AI inference with Nano-first, cloud-fallback strategy
 */
export class HybridAIClient {
  private availability: string = 'unavailable';
  private nanoModel: GeminiNanoChatModel | null = null;
  private lastError?: string;
  private userPreference: 'nano' | 'cloud' = 'nano'; // Default to nano, but respects user choice

  /**
   * Initialize the client by checking Nano availability and creating model if available
   */
  async initialize(): Promise<void> {
    // Load user preference from storage
    try {
      const result = await chrome.storage.local.get('provider_preference');
      if (result?.provider_preference) {
        this.userPreference = result.provider_preference;
        console.log('[HybridAIClient] Loaded user preference:', this.userPreference);
      }
    } catch (error) {
      console.warn('[HybridAIClient] Failed to load provider preference, using default (nano):', error);
    }

    // // TEMPORARY: Skip Nano initialization for cloud-only testing
    // console.log('[HybridAIClient] TESTING MODE: Skipping Nano initialization, cloud-only mode');
    // this.availability = 'unavailable';
    // return;

    try {
      // Check if Prompt API is available
      if (globalThis.LanguageModel) {
        // Check availability with language specified (Chrome requires this)
        this.availability = await globalThis.LanguageModel.availability({ language: 'en' });

        console.log('[HybridAIClient] Nano availability:', this.availability);

        // Create Nano model if available
        if (this.availability === 'available' || this.availability === 'readily') {
          this.nanoModel = new GeminiNanoChatModel({
            // Specify language for optimal output quality
            systemPrompt: undefined, // Will be set per request
          });
          console.log('[HybridAIClient] Initialized with Gemini Nano');
        } else {
          console.log('[HybridAIClient] Nano not available, will use cloud fallback');
        }
      } else {
        console.log('[HybridAIClient] LanguageModel API not found, will use cloud fallback');
        this.availability = 'unavailable';
      }
    } catch (error) {
      console.error('[HybridAIClient] Initialization error:', error);
      this.lastError = error instanceof Error ? error.message : String(error);
      this.availability = 'unavailable';
    }
  }

  /**
   * Invoke AI based on user preference (Nano if available, fallback to cloud)
   */
  async invoke(options: InvokeOptions): Promise<InvokeResponse> {
    // // TEMPORARY: Force cloud-only for testing Firebase setup
    // // TODO: Remove this to re-enable Nano
    // console.log('[HybridAIClient] TESTING MODE: Skipping Nano, using cloud only');
    // return await this.invokeBridge(options);

    // Check user preference
    console.log('[HybridAIClient] User preference:', this.userPreference, 'Nano available:', !!this.nanoModel);

    // If user prefers Nano and it's available, try Nano first
    if (
      this.userPreference === 'nano' &&
      this.nanoModel &&
      (this.availability === 'available' || this.availability === 'readily')
    ) {
      try {
        const result = await this.invokeNano(options);
        return { content: result, provider: 'nano' };
      } catch (error) {
        console.warn('[HybridAIClient] Nano failed, falling back to cloud:', error);
        this.lastError = error instanceof Error ? error.message : String(error);
      }
    }

    // If user prefers cloud OR Nano is unavailable/failed, use cloud
    console.log('[HybridAIClient] Using cloud provider');
    return await this.invokeBridge(options);
  }

  /**
   * Invoke using Gemini Nano (on-device)
   */
  private async invokeNano(options: InvokeOptions): Promise<string> {
    if (!this.nanoModel) {
      throw new Error('Nano model not initialized');
    }

    // Convert string prompt to LangChain messages
    const messages: BaseMessage[] = [];

    // Add system message if provided
    if (options.system) {
      messages.push(new SystemMessage(options.system));
    }

    // Add user prompt
    messages.push(new HumanMessage(options.prompt));

    // Handle structured output with schema
    if (options.schema) {
      // Use withStructuredOutput for schema-based invocation
      // This internally passes the schema as responseConstraint to Prompt API
      const structured = this.nanoModel.withStructuredOutput(options.schema);
      const result = await structured.invoke(messages);
      return JSON.stringify(result);
    }

    // Handle streaming
    if (options.stream) {
      // Use LangChain's streaming methods
      let fullContent = '';
      const stream = await this.nanoModel.stream(messages);

      for await (const chunk of stream) {
        fullContent += chunk.content;
      }

      return fullContent;
    }

    // Regular invocation
    const result = await this.nanoModel.invoke(messages);
    return result.content as string;
  }

  /**
   * Invoke using Firebase AI Logic SDK via side panel bridge
   */
  private async invokeBridge(options: InvokeOptions): Promise<InvokeResponse> {
    try {
      console.log('[HybridAIClient] Sending message to side panel bridge');

      // Send message to side panel for cloud fallback
      const response = (await chrome.runtime.sendMessage({
        type: HYBRID_SDK_INVOKE,
        payload: {
          prompt: options.prompt,
          system: options.system,
          schema: options.schema,
          stream: options.stream,
        },
      })) as HybridSDKResponse;

      console.log('[HybridAIClient] Received response from bridge:', response);

      // Handle error response
      if (!response?.ok) {
        throw new Error(response?.error || 'SDK fallback failed');
      }

      return {
        content: response.text || '',
        provider: 'cloud',
      };
    } catch (error) {
      console.error('[HybridAIClient] Bridge invocation failed:', error);
      this.lastError = error instanceof Error ? error.message : String(error);
      throw error;
    }
  }

  /**
   * Get current status of the AI system
   */
  getStatus(): AIStatus {
    return {
      provider: this.nanoModel ? 'nano' : 'cloud',
      nano: {
        availability: this.availability as any,
      },
      lastError: this.lastError,
    };
  }

  /**
   * Set user's provider preference (nano or cloud)
   */
  async setUserPreference(preference: 'nano' | 'cloud'): Promise<void> {
    // Validate preference
    if (preference !== 'nano' && preference !== 'cloud') {
      throw new Error('Invalid provider preference. Must be "nano" or "cloud".');
    }

    // Don't allow setting Nano if it's not available
    if (preference === 'nano' && this.availability === 'unavailable') {
      console.warn('[HybridAIClient] Nano not available, ignoring preference change to nano');
      return;
    }

    this.userPreference = preference;
    console.log('[HybridAIClient] User preference updated to:', preference);

    // Persist to storage
    try {
      await chrome.storage.local.set({ provider_preference: preference });
      console.log('[HybridAIClient] Provider preference saved to storage');
    } catch (error) {
      console.error('[HybridAIClient] Failed to save provider preference:', error);
      throw error;
    }
  }

  /**
   * Get user's current provider preference
   */
  getUserPreference(): 'nano' | 'cloud' {
    return this.userPreference;
  }

  /**
   * Get provider preference details (for UI)
   */
  getProviderPreference(): {
    userPreference: 'nano' | 'cloud';
    nanoAvailable: boolean;
  } {
    const nanoAvailable = this.availability === 'available' || this.availability === 'readily';
    return {
      userPreference: this.userPreference,
      nanoAvailable,
    };
  }
}
