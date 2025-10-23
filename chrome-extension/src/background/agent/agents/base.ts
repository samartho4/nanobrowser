import type { z } from 'zod';
import type { AgentContext, AgentOutput } from '../types';
import type { BasePrompt } from '../prompts/base';
import type { BaseMessage } from '@langchain/core/messages';
import { createLogger } from '@src/background/log';
import type { Action } from '../actions/builder';
import { HybridAIClient } from '@src/background/llm/HybridAIClient';
import { isAbortedError, ResponseParseError } from './errors';

const logger = createLogger('agent');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CallOptions = Record<string, any>;

// Update options to use Zod schema
export interface BaseAgentOptions {
  aiClient: HybridAIClient;
  context: AgentContext;
  prompt: BasePrompt;
}
export interface ExtraAgentOptions {
  id?: string;
  callOptions?: CallOptions;
}

/**
 * Base class for all agents
 * @param T - The Zod schema for the model output
 * @param M - The type of the result field of the agent output
 */
export abstract class BaseAgent<T extends z.ZodType, M = unknown> {
  protected id: string;
  protected aiClient: HybridAIClient;
  protected prompt: BasePrompt;
  protected context: AgentContext;
  protected actions: Record<string, Action> = {};
  protected modelOutputSchema: T;
  protected callOptions?: CallOptions;
  declare ModelOutput: z.infer<T>;

  constructor(modelOutputSchema: T, options: BaseAgentOptions, extraOptions?: Partial<ExtraAgentOptions>) {
    // base options
    this.modelOutputSchema = modelOutputSchema;
    this.aiClient = options.aiClient;
    this.prompt = options.prompt;
    this.context = options.context;
    // extra options
    this.id = extraOptions?.id || 'agent';
    this.callOptions = extraOptions?.callOptions;
  }

  /**
   * Convert LangChain messages to a simple prompt string
   */
  private convertMessagesToPrompt(messages: BaseMessage[]): string {
    return messages
      .map(msg => {
        const type = msg._getType();
        if (type === 'human') return `User: ${msg.content}`;
        if (type === 'ai') return `Assistant: ${msg.content}`;
        if (type === 'system') return `System: ${msg.content}`;
        return String(msg.content);
      })
      .join('\n\n');
  }

  async invoke(inputMessages: BaseMessage[]): Promise<this['ModelOutput']> {
    try {
      logger.debug('[BaseAgent] Preparing HybridAIClient invocation', {
        messageCount: inputMessages.length,
        hasSchema: !!this.modelOutputSchema,
      });

      // Extract system prompt from the prompt object
      const systemMessage = this.prompt.getSystemMessage();
      const systemPrompt = systemMessage?.content as string | undefined;

      // Convert messages to prompt string
      const prompt = this.convertMessagesToPrompt(inputMessages);

      logger.debug('[BaseAgent] Invoking HybridAIClient...');

      // Call HybridAIClient with schema for structured output
      const response = await this.aiClient.invoke({
        prompt,
        system: systemPrompt,
        schema: this.modelOutputSchema,
      });

      logger.debug('[BaseAgent] HybridAIClient response received:', {
        provider: response.provider,
        contentLength: response.content.length,
      });

      // Parse response content as JSON and validate with schema
      try {
        logger.debug('[BaseAgent] Parsing response content, length:', response.content.length);
        logger.debug('[BaseAgent] Response preview:', response.content.substring(0, 500));

        const parsed = JSON.parse(response.content);
        logger.debug('[BaseAgent] Parsed JSON structure:', JSON.stringify(parsed, null, 2).substring(0, 1000));

        const validated = this.validateModelOutput(parsed);

        if (validated) {
          logger.debug('[BaseAgent] Successfully validated model output');
          return validated;
        }

        throw new Error('Model output validation failed');
      } catch (error) {
        logger.error('[BaseAgent] Failed to parse or validate response:', error);
        logger.error('[BaseAgent] Response content:', response.content.substring(0, 1000));

        // Try to provide more helpful error message
        if (error instanceof SyntaxError) {
          throw new ResponseParseError(`Invalid JSON in response: ${error.message}`);
        }

        throw new ResponseParseError(
          `Failed to parse response: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    } catch (error) {
      if (isAbortedError(error)) {
        throw error;
      }
      logger.error('[BaseAgent] Invocation failed:', error);
      throw error;
    }
  }

  // Execute the agent and return the result
  abstract execute(): Promise<AgentOutput<M>>;

  // Helper method to validate metadata
  protected validateModelOutput(data: unknown): this['ModelOutput'] | undefined {
    if (!this.modelOutputSchema || !data) return undefined;
    try {
      return this.modelOutputSchema.parse(data);
    } catch (error) {
      logger.error('[BaseAgent] Validation error:', error);

      // Log the data that failed validation
      logger.error('[BaseAgent] Data that failed validation:', JSON.stringify(data, null, 2).substring(0, 2000));

      // If it's a Zod error, log the specific issues
      if (error && typeof error === 'object' && 'issues' in error) {
        const zodError = error as any;
        logger.error('[BaseAgent] Validation issues:', JSON.stringify(zodError.issues, null, 2));
      }

      throw new ResponseParseError('Could not validate model output');
    }
  }
}
