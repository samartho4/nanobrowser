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

  /**
   * Initialize the client by checking Nano availability and creating model if available
   */
  async initialize(): Promise<void> {
    // TEMPORARY: Skip Nano initialization for cloud-only testing
    console.log('[HybridAIClient] TESTING MODE: Skipping Nano initialization, cloud-only mode');
    this.availability = 'unavailable';
    return;

    // try {
    //   // Check if Prompt API is available
    //   if (globalThis.LanguageModel) {
    //     // Check availability with language specified (Chrome requires this)
    //     this.availability = await globalThis.LanguageModel.availability({ language: 'en' });

    //     console.log('[HybridAIClient] Nano availability:', this.availability);

    //     // Create Nano model if available
    //     if (this.availability === 'available' || this.availability === 'readily') {
    //       this.nanoModel = new GeminiNanoChatModel({
    //         // Specify language for optimal output quality
    //         systemPrompt: undefined, // Will be set per request
    //       });
    //       console.log('[HybridAIClient] Initialized with Gemini Nano');
    //     } else {
    //       console.log('[HybridAIClient] Nano not available, will use cloud fallback');
    //     }
    //   } else {
    //     console.log('[HybridAIClient] LanguageModel API not found, will use cloud fallback');
    //     this.availability = 'unavailable';
    //   }
    // } catch (error) {
    //   console.error('[HybridAIClient] Initialization error:', error);
    //   this.lastError = error instanceof Error ? error.message : String(error);
    //   this.availability = 'unavailable';
    // }
  }

  /**
   * Invoke AI with Nano-first, cloud-fallback strategy
   */
  async invoke(options: InvokeOptions): Promise<InvokeResponse> {
    // TEMPORARY: Force cloud-only for testing Firebase setup
    // TODO: Remove this to re-enable Nano
    console.log('[HybridAIClient] TESTING MODE: Skipping Nano, using cloud only');
    return await this.invokeBridge(options);

    // Try Nano first if available
    // if (this.nanoModel && (this.availability === 'available' || this.availability === 'readily')) {
    //   try {
    //     const result = await this.invokeNano(options);
    //     return { content: result, provider: 'nano' };
    //   } catch (error) {
    //     console.warn('[HybridAIClient] Nano failed, falling back to cloud:', error);
    //     this.lastError = error instanceof Error ? error.message : String(error);
    //   }
    // }

    // // Fallback to side panel bridge
    // return await this.invokeBridge(options);
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
}
