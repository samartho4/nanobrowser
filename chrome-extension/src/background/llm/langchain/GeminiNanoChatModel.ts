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

    const status = await globalThis.LanguageModel.availability({ language: 'en' });

    if (status !== 'available' && status !== 'readily') {
      throw new Error(`Gemini Nano is not ready. Status: ${status}`);
    }

    const sessionOptions: AISessionOptions = {
      // Specify language for optimal output quality and safety
      language: 'en',
    };

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

    console.log('[GeminiNano] Creating session with language: en');
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
   * Resolve $ref references in JSON Schema
   * Inlines referenced definitions to create a flat schema
   */
  private resolveRefs(schema: any, definitions?: any): any {
    if (!schema || typeof schema !== 'object') {
      return schema;
    }

    // If this schema has a $ref, resolve it
    if (schema.$ref && definitions) {
      const refPath = schema.$ref.replace('#/definitions/', '');
      const resolved = definitions[refPath];
      if (resolved) {
        // Recursively resolve the referenced schema
        return this.resolveRefs(resolved, definitions);
      }
    }

    // Create a copy and recursively resolve nested schemas
    const resolved = { ...schema };

    if (resolved.properties) {
      resolved.properties = Object.fromEntries(
        Object.entries(resolved.properties).map(([key, value]) => [key, this.resolveRefs(value, definitions)]),
      );
    }

    if (resolved.items) {
      resolved.items = this.resolveRefs(resolved.items, definitions);
    }

    if (resolved.anyOf) {
      resolved.anyOf = resolved.anyOf.map((s: any) => this.resolveRefs(s, definitions));
    }

    if (resolved.oneOf) {
      resolved.oneOf = resolved.oneOf.map((s: any) => this.resolveRefs(s, definitions));
    }

    if (resolved.allOf) {
      resolved.allOf = resolved.allOf.map((s: any) => this.resolveRefs(s, definitions));
    }

    return resolved;
  }

  /**
   * Simplify complex schemas for Gemini Nano
   * Reduces complexity by limiting properties and flattening unions
   */
  private simplifySchemaForNano(schema: any, maxDepth: number = 3, currentDepth: number = 0): any {
    if (!schema || typeof schema !== 'object' || currentDepth >= maxDepth) {
      return schema;
    }

    const simplified = { ...schema };

    // Convert complex union types (anyOf/oneOf) to simpler alternatives
    if (simplified.anyOf) {
      // Pick the first non-null option
      const nonNullOptions = simplified.anyOf.filter((opt: any) => opt.type !== 'null');
      if (nonNullOptions.length === 1) {
        return this.simplifySchemaForNano(nonNullOptions[0], maxDepth, currentDepth + 1);
      } else if (nonNullOptions.length > 1) {
        // If multiple options, prefer object or string types
        const preferred = nonNullOptions.find((opt: any) => opt.type === 'object' || opt.type === 'string');
        if (preferred) {
          return this.simplifySchemaForNano(preferred, maxDepth, currentDepth + 1);
        }
      }
    }

    if (simplified.oneOf) {
      // Similar logic for oneOf
      const nonNullOptions = simplified.oneOf.filter((opt: any) => opt.type !== 'null');
      if (nonNullOptions.length > 0) {
        return this.simplifySchemaForNano(nonNullOptions[0], maxDepth, currentDepth + 1);
      }
    }

    // SPECIAL CASE: Don't simplify action arrays - they need all action types
    // Action arrays have many optional properties where only one should be set
    // Simplifying would remove valid action types
    if (simplified.type === 'array' && simplified.items?.properties) {
      const propCount = Object.keys(simplified.items.properties).length;

      // Check if this looks like an action schema (many optional properties)
      const optionalCount = Object.values(simplified.items.properties).filter(
        (prop: any) =>
          prop &&
          typeof prop === 'object' &&
          (prop.nullable ||
            !simplified.items.required?.includes(
              Object.keys(simplified.items.properties).find(k => simplified.items.properties[k] === prop),
            )),
      ).length;

      // If most properties are optional (like action schemas), don't simplify
      if (optionalCount / propCount > 0.8) {
        console.log(`[GeminiNano] Skipping simplification of action-like array (${propCount} optional properties)`);
      } else if (propCount > 5) {
        // For non-action arrays, simplify normally
        const required = simplified.items.required || [];
        const props = Object.entries(simplified.items.properties);
        const keptProps = props.filter(([key]) => required.includes(key));

        if (keptProps.length < 5) {
          const nonRequired = props.filter(([key]) => !required.includes(key));
          keptProps.push(...nonRequired.slice(0, 5 - keptProps.length));
        }

        simplified.items.properties = Object.fromEntries(keptProps.slice(0, 5));
        console.log(
          `[GeminiNano] Simplified array items from ${propCount} to ${Object.keys(simplified.items.properties).length} properties`,
        );
      }
    }

    // AGGRESSIVE: Limit top-level object properties - max 5
    if (simplified.type === 'object' && simplified.properties && currentDepth === 0) {
      const propCount = Object.keys(simplified.properties).length;
      if (propCount > 5) {
        const required = simplified.required || [];
        const props = Object.entries(simplified.properties);
        const keptProps = props.filter(([key]) => required.includes(key));

        if (keptProps.length < 5) {
          const nonRequired = props.filter(([key]) => !required.includes(key));
          keptProps.push(...nonRequired.slice(0, 5 - keptProps.length));
        }

        simplified.properties = Object.fromEntries(keptProps.slice(0, 5));
        console.log(
          `[GeminiNano] Simplified top-level from ${propCount} to ${Object.keys(simplified.properties).length} properties`,
        );
      }
    }

    // Recursively simplify nested structures
    if (simplified.properties) {
      simplified.properties = Object.fromEntries(
        Object.entries(simplified.properties).map(([key, value]) => [
          key,
          this.simplifySchemaForNano(value, maxDepth, currentDepth + 1),
        ]),
      );
    }

    if (simplified.items && typeof simplified.items === 'object') {
      simplified.items = this.simplifySchemaForNano(simplified.items, maxDepth, currentDepth + 1);
    }

    return simplified;
  }

  /**
   * Clean JSON Schema for Gemini Nano's responseConstraint
   * Resolves $ref references and removes fields that might cause issues
   */
  private cleanSchemaForNano(schema: any): any {
    if (!schema || typeof schema !== 'object') {
      return schema;
    }

    // First, resolve all $ref references using definitions
    const definitions = schema.definitions;
    let cleaned = this.resolveRefs(schema, definitions);

    // Remove fields that zodToJsonSchema adds but Nano doesn't need
    delete cleaned.$schema;
    delete cleaned.additionalProperties;
    delete cleaned.definitions;
    delete cleaned.$ref;

    // Recursively clean nested objects
    if (cleaned.properties && typeof cleaned.properties === 'object') {
      cleaned.properties = Object.fromEntries(
        Object.entries(cleaned.properties).map(([key, value]) => [key, this.cleanSchemaForNano(value)]),
      );
    }

    // Clean array items
    if (cleaned.items) {
      cleaned.items = this.cleanSchemaForNano(cleaned.items);
    }

    // Clean anyOf, oneOf, allOf
    if (cleaned.anyOf) {
      cleaned.anyOf = cleaned.anyOf.map((s: any) => this.cleanSchemaForNano(s));
    }
    if (cleaned.oneOf) {
      cleaned.oneOf = cleaned.oneOf.map((s: any) => this.cleanSchemaForNano(s));
    }
    if (cleaned.allOf) {
      cleaned.allOf = cleaned.allOf.map((s: any) => this.cleanSchemaForNano(s));
    }

    return cleaned;
  }

  /**
   * Internal method to invoke with JSON Schema constraint
   * Per Chrome docs: https://developer.chrome.com/docs/ai/structured-output-for-prompt-api
   */
  private async invokeWithSchema(input: any, jsonSchema: any, config?: any): Promise<any> {
    // Debug: Log the input schema
    console.log('[GeminiNano] Input schema keys:', Object.keys(jsonSchema || {}).slice(0, 10));

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
      // Simplify complex schemas first
      const simplifiedSchema = this.simplifySchemaForNano(jsonSchema);

      // Clean up the JSON Schema for Gemini Nano
      // Remove fields that might cause issues with responseConstraint
      const cleanSchema = this.cleanSchemaForNano(simplifiedSchema);

      // Log what we're actually sending to Nano
      console.log('[GeminiNano] Cleaned schema type:', cleanSchema?.type);
      console.log('[GeminiNano] Cleaned schema structure:', JSON.stringify(cleanSchema).substring(0, 300));

      // Try with responseConstraint
      result = await session.prompt(prompt, {
        responseConstraint: cleanSchema,
      });

      // Trim whitespace that Nano might add
      result = result.trim();
    } catch (constraintError) {
      console.warn('[GeminiNano] responseConstraint failed, falling back to prompt engineering:', constraintError);
      // Fallback to prompt engineering
      const schemaStr = JSON.stringify(jsonSchema, null, 2);
      const enhancedPrompt = `${prompt}\n\n**IMPORTANT**: You must respond with ONLY valid JSON matching this exact schema. Do not include any explanatory text, markdown formatting, or code blocks.\n\nRequired JSON Schema:\n${schemaStr}\n\nYour response (JSON only):`;
      result = await session.prompt(enhancedPrompt);
      result = result.trim();
    }

    // Parse JSON response
    let parsed: any;
    try {
      parsed = JSON.parse(result);
    } catch (parseError) {
      // Debug logging for JSON parsing errors
      console.error('[GeminiNano] JSON Parse Error:', parseError);
      console.error('[GeminiNano] Raw output length:', result.length);
      console.error('[GeminiNano] Raw output (first 1000 chars):', result.substring(0, 1000));
      if (result.length > 555) {
        console.error('[GeminiNano] Context around position 555:', result.substring(545, 565));
      }

      // Try to repair incomplete JSON by adding missing closing braces
      let repairedJson = result;

      // Count opening and closing braces/brackets
      const openBraces = (result.match(/\{/g) || []).length;
      const closeBraces = (result.match(/\}/g) || []).length;
      const openBrackets = (result.match(/\[/g) || []).length;
      const closeBrackets = (result.match(/\]/g) || []).length;

      // Add missing closing characters
      if (openBrackets > closeBrackets) {
        repairedJson += ']'.repeat(openBrackets - closeBrackets);
      }
      if (openBraces > closeBraces) {
        repairedJson += '}'.repeat(openBraces - closeBraces);
      }

      // Try parsing the repaired JSON
      try {
        console.log('[GeminiNano] Attempting to repair JSON by adding missing braces/brackets');
        parsed = JSON.parse(repairedJson);
        console.log('[GeminiNano] Successfully repaired and parsed JSON');
      } catch (repairError) {
        // Extract JSON from markdown code blocks if needed
        const jsonMatch = result.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || result.match(/(\{[\s\S]*\})/);
        if (jsonMatch) {
          try {
            parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
          } catch (extractError) {
            console.error('[GeminiNano] Extracted JSON also failed to parse:', extractError);
            throw new Error(
              `Failed to parse JSON response: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
            );
          }
        } else {
          throw new Error(
            `Failed to parse JSON response: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
          );
        }
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
