/**
 * LangChain-compatible chat model wrapper for Gemini Nano
 * Allows using Gemini Nano with existing agent infrastructure
 */

import { BaseChatModel, type BaseChatModelParams } from '@langchain/core/language_models/chat_models';
import { AIMessage, AIMessageChunk, BaseMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ChatGenerationChunk, ChatResult } from '@langchain/core/outputs';
import { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager';
import type { AISessionOptions, AILanguageModelSession } from '../utils/types';

export interface GeminiNanoChatModelParams extends BaseChatModelParams {
  temperature?: number;
  topK?: number;
  systemPrompt?: string;
}

/**
 * LangChain chat model that uses Gemini Nano via direct API access
 */
export class GeminiNanoChatModel extends BaseChatModel {
  modelName = 'gemini-nano';
  temperature?: number;
  topK?: number;
  systemPrompt?: string;
  private session: AILanguageModelSession | null = null;
  private sessionPromise: Promise<AILanguageModelSession> | null = null;

  constructor(fields?: GeminiNanoChatModelParams) {
    super(fields ?? {});
    this.temperature = fields?.temperature;
    this.topK = fields?.topK;
    this.systemPrompt = fields?.systemPrompt;
  }

  /**
   * Get or create a reusable session
   * Per Chrome docs: sessions should be reused for better performance
   * https://developer.chrome.com/docs/ai/session-management
   */
  private async getSession(): Promise<AILanguageModelSession> {
    // Reuse existing session
    if (this.session) {
      return this.session;
    }

    // Wait for session being created (prevents race condition)
    if (this.sessionPromise) {
      return this.sessionPromise;
    }

    // Create new session
    this.sessionPromise = this.createSession();

    try {
      this.session = await this.sessionPromise;
      return this.session;
    } catch (error) {
      this.session = null;
      throw error;
    } finally {
      this.sessionPromise = null;
    }
  }

  /**
   * Create a new session with configured options
   */
  private async createSession(): Promise<AILanguageModelSession> {
    if (!globalThis.LanguageModel) {
      throw new Error(
        'LanguageModel API is not available. Make sure you are using Chrome 127+ with Gemini Nano enabled.',
      );
    }

    const status = await globalThis.LanguageModel.availability();

    if (status !== 'available' && status !== 'readily') {
      throw new Error(`Gemini Nano is not ready. Status: ${status}`);
    }

    const sessionOptions: AISessionOptions = {};

    if (this.systemPrompt) {
      sessionOptions.initialPrompts = [
        {
          role: 'system',
          content: this.systemPrompt,
        },
      ];
    }

    if (this.temperature !== undefined || this.topK !== undefined) {
      sessionOptions.temperature = this.temperature ?? 0.7;
      sessionOptions.topK = this.topK ?? 3;
    }

    return await globalThis.LanguageModel.create(sessionOptions);
  }

  /**
   * Destroy the current session
   */
  destroySession(): void {
    if (this.session) {
      try {
        this.session.destroy();
        console.log('[GeminiNano] Session destroyed');
      } catch (error) {
        console.warn('[GeminiNano] Failed to destroy session:', error);
      }
      this.session = null;
    }
  }

  _llmType(): string {
    return 'gemini-nano';
  }

  /**
   * Bind tools to the model - required for withStructuredOutput
   * Gemini Nano doesn't support native tool calling, so we return this instance
   * and handle structured output via prompt engineering
   */
  bindTools(_tools: any[], _kwargs?: any): this {
    // Store tools for potential use in prompt engineering
    // For now, just return this to satisfy the interface
    return this;
  }

  /**
   * Create a model that returns structured output using JSON Schema
   * Gemini Nano supports this via the responseConstraint parameter
   */
  withStructuredOutput(schema: any, config?: any): any {
    const model = this;

    return {
      async invoke(input: any): Promise<any> {
        let jsonSchema = schema;

        // Check if this is a Zod schema and convert it
        if (schema && typeof schema === 'object' && '_def' in schema) {
          const { zodToJsonSchema } = await import('zod-to-json-schema');
          jsonSchema = zodToJsonSchema(schema, {
            name: config?.name || 'Output',
            target: 'openApi3',
          });
        } else if (schema && typeof schema === 'object' && 'schema' in schema) {
          jsonSchema = schema.schema;
        } else if (schema && typeof schema === 'object' && ('type' in schema || 'properties' in schema)) {
          jsonSchema = schema;
        }

        // Call the model with responseConstraint
        const result = await model.invokeWithSchema(input, jsonSchema, config);

        return result;
      },

      // For compatibility with LangChain's expectations
      _modelType: () => 'gemini-nano-structured',
      _llmType: () => 'gemini-nano-structured',
    };
  }

  /**
   * Internal method to invoke with JSON Schema constraint
   * Per Chrome docs: https://developer.chrome.com/docs/ai/structured-output-for-prompt-api
   */
  private async invokeWithSchema(input: any, jsonSchema: any, config?: any): Promise<any> {
    // Handle different input types
    let messages: BaseMessage[];
    if (Array.isArray(input)) {
      messages = input;
    } else if (typeof input === 'string') {
      messages = [new HumanMessage(input)];
    } else if (input.messages) {
      messages = input.messages;
    } else {
      messages = [new HumanMessage(String(input))];
    }

    const prompt = this.messagesToPrompt(messages);

    const session = await this.getSession();
    let result: string;

    try {
      // Try with responseConstraint
      result = await session.prompt(prompt, {
        responseConstraint: jsonSchema,
      });
    } catch (constraintError) {
      // Fallback to prompt engineering
      const schemaStr = JSON.stringify(jsonSchema, null, 2);
      const enhancedPrompt = `${prompt}\n\n**IMPORTANT**: You must respond with ONLY valid JSON matching this exact schema. Do not include any explanatory text, markdown formatting, or code blocks.\n\nRequired JSON Schema:\n${schemaStr}\n\nYour response (JSON only):`;
      result = await session.prompt(enhancedPrompt);
    }

    // Parse JSON response
    let parsed: any;
    try {
      parsed = JSON.parse(result);
    } catch (parseError) {
      // Extract JSON from markdown code blocks if needed
      const jsonMatch = result.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || result.match(/(\{[\s\S]*\})/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      } else {
        throw new Error(
          `Failed to parse JSON response: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
        );
      }
    }

    // If config.includeRaw is true, return both parsed and raw
    if (config?.includeRaw) {
      return {
        parsed,
        raw: new AIMessage(result),
      };
    }

    return parsed;
  }

  /**
   * Generate a response using Gemini Nano via direct API access
   */
  async _generate(
    messages: BaseMessage[],
    _options: this['ParsedCallOptions'],
    runManager?: CallbackManagerForLLMRun,
  ): Promise<ChatResult> {
    // Convert messages to a single prompt
    const prompt = this.messagesToPrompt(messages);

    // Get or create reusable session
    const session = await this.getSession();

    // Generate response
    const text = await session.prompt(prompt);

    // Notify callback if provided
    if (runManager) {
      await runManager.handleLLMNewToken(text);
    }

    return {
      generations: [
        {
          text,
          message: new AIMessage(text),
        },
      ],
    };
  }

  /**
   * Convert LangChain messages to a single prompt string
   */
  private messagesToPrompt(messages: BaseMessage[]): string {
    const parts: string[] = [];

    for (const message of messages) {
      if (message instanceof SystemMessage) {
        // System messages become part of the context
        if (!this.systemPrompt) {
          this.systemPrompt = message.content as string;
        }
      } else if (message instanceof HumanMessage) {
        parts.push(`User: ${message.content}`);
      } else if (message instanceof AIMessage) {
        parts.push(`Assistant: ${message.content}`);
      } else {
        // Generic message
        parts.push(message.content as string);
      }
    }

    return parts.join('\n\n');
  }

  /**
   * Streaming support - uses promptStreaming if available
   */
  async *_streamResponseChunks(
    messages: BaseMessage[],
    options: this['ParsedCallOptions'],
    runManager?: CallbackManagerForLLMRun,
  ): AsyncGenerator<ChatGenerationChunk> {
    const prompt = this.messagesToPrompt(messages);

    // Get or create reusable session
    const session = await this.getSession();

    // Check if streaming is supported
    if (typeof session.promptStreaming === 'function') {
      // Pass signal for cancellation support
      const stream = session.promptStreaming(prompt, {
        signal: options.signal,
      });
      const reader = stream.getReader();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          if (runManager) {
            await runManager.handleLLMNewToken(value);
          }
          yield new ChatGenerationChunk({
            text: value,
            message: new AIMessageChunk({ content: value }),
          });
        }
      } finally {
        reader.releaseLock();
      }
    } else {
      // Fallback to non-streaming
      const result = await this._generate(messages, options, runManager);
      yield new ChatGenerationChunk({
        text: result.generations[0].text,
        message: new AIMessageChunk({ content: result.generations[0].text }),
      });
    }
  }

  /**
   * Cleanup method - call when model is no longer needed
   * Ensures session is properly destroyed
   */
  async cleanup(): Promise<void> {
    this.destroySession();
  }
}
