import { describe, it, expect, beforeEach, vi } from 'vitest';
import { z } from 'zod';
import { BaseAgent, type BaseAgentOptions } from '../base';
import { HybridAIClient } from '@src/background/llm/HybridAIClient';
import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages';
import type { AgentContext, AgentOutput } from '../../types';
import type { BasePrompt } from '../../prompts/base';

// Mock HybridAIClient
vi.mock('@src/background/llm/HybridAIClient', () => ({
  HybridAIClient: vi.fn().mockImplementation(() => ({
    invoke: vi.fn().mockResolvedValue({
      content: JSON.stringify({ result: 'test result', status: 'success' }),
      provider: 'nano',
    }),
  })),
}));

// Mock logger
vi.mock('@src/background/log', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  }),
}));

// Create a concrete test implementation of BaseAgent
const testSchema = z.object({
  result: z.string(),
  status: z.string(),
});

class TestAgent extends BaseAgent<typeof testSchema, { done: boolean }> {
  async execute(): Promise<AgentOutput<{ done: boolean }>> {
    return {
      id: 'test-agent',
      result: { done: true },
    };
  }
}

describe('BaseAgent', () => {
  let mockAiClient: HybridAIClient;
  let mockContext: AgentContext;
  let mockPrompt: BasePrompt;
  let agent: TestAgent;

  beforeEach(() => {
    // Create mock AI client
    mockAiClient = new HybridAIClient();

    // Create mock context
    mockContext = {
      controller: new AbortController(),
    } as AgentContext;

    // Create mock prompt
    mockPrompt = {
      getSystemMessage: vi.fn().mockReturnValue(new SystemMessage('You are a helpful assistant')),
    } as unknown as BasePrompt;

    // Create agent instance
    const options: BaseAgentOptions = {
      aiClient: mockAiClient,
      context: mockContext,
      prompt: mockPrompt,
    };

    agent = new TestAgent(testSchema, options, { id: 'test-agent' });

    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with aiClient', () => {
      expect(agent['aiClient']).toBe(mockAiClient);
    });

    it('should initialize with context', () => {
      expect(agent['context']).toBe(mockContext);
    });

    it('should initialize with prompt', () => {
      expect(agent['prompt']).toBe(mockPrompt);
    });

    it('should initialize with schema', () => {
      expect(agent['modelOutputSchema']).toBe(testSchema);
    });

    it('should set default id when not provided', () => {
      const agentWithoutId = new TestAgent(testSchema, {
        aiClient: mockAiClient,
        context: mockContext,
        prompt: mockPrompt,
      });
      expect(agentWithoutId['id']).toBe('agent');
    });

    it('should use provided id', () => {
      expect(agent['id']).toBe('test-agent');
    });
  });

  describe('convertMessagesToPrompt', () => {
    it('should convert human messages', () => {
      const messages = [new HumanMessage('Hello')];
      const result = agent['convertMessagesToPrompt'](messages);
      expect(result).toBe('User: Hello');
    });

    it('should convert AI messages', () => {
      const messages = [new AIMessage('Hi there')];
      const result = agent['convertMessagesToPrompt'](messages);
      expect(result).toBe('Assistant: Hi there');
    });

    it('should convert system messages', () => {
      const messages = [new SystemMessage('You are helpful')];
      const result = agent['convertMessagesToPrompt'](messages);
      expect(result).toBe('System: You are helpful');
    });

    it('should convert multiple messages with proper formatting', () => {
      const messages = [
        new SystemMessage('System context'),
        new HumanMessage('User question'),
        new AIMessage('AI response'),
      ];
      const result = agent['convertMessagesToPrompt'](messages);
      expect(result).toBe('System: System context\n\nUser: User question\n\nAssistant: AI response');
    });
  });

  describe('invoke', () => {
    it('should call HybridAIClient with correct parameters', async () => {
      const messages = [new HumanMessage('Test prompt')];

      await agent.invoke(messages);

      expect(mockAiClient.invoke).toHaveBeenCalledWith({
        prompt: 'User: Test prompt',
        system: 'You are a helpful assistant',
        schema: testSchema,
      });
    });

    it('should parse and validate response', async () => {
      const messages = [new HumanMessage('Test')];

      const result = await agent.invoke(messages);

      expect(result).toEqual({
        result: 'test result',
        status: 'success',
      });
    });

    it('should handle response from cloud provider', async () => {
      mockAiClient.invoke = vi.fn().mockResolvedValue({
        content: JSON.stringify({ result: 'cloud result', status: 'success' }),
        provider: 'cloud',
      });

      const messages = [new HumanMessage('Test')];
      const result = await agent.invoke(messages);

      expect(result).toEqual({
        result: 'cloud result',
        status: 'success',
      });
    });

    it('should handle messages without system prompt', async () => {
      mockPrompt.getSystemMessage = vi.fn().mockReturnValue(null);

      const messages = [new HumanMessage('Test')];
      await agent.invoke(messages);

      expect(mockAiClient.invoke).toHaveBeenCalledWith({
        prompt: 'User: Test',
        system: undefined,
        schema: testSchema,
      });
    });

    it('should throw error when response is not valid JSON', async () => {
      mockAiClient.invoke = vi.fn().mockResolvedValue({
        content: 'not valid json',
        provider: 'nano',
      });

      const messages = [new HumanMessage('Test')];

      await expect(agent.invoke(messages)).rejects.toThrow();
    });

    it('should throw error when response does not match schema', async () => {
      mockAiClient.invoke = vi.fn().mockResolvedValue({
        content: JSON.stringify({ invalid: 'data' }),
        provider: 'nano',
      });

      const messages = [new HumanMessage('Test')];

      await expect(agent.invoke(messages)).rejects.toThrow();
    });

    it('should propagate abort errors', async () => {
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';

      mockAiClient.invoke = vi.fn().mockRejectedValue(abortError);

      const messages = [new HumanMessage('Test')];

      await expect(agent.invoke(messages)).rejects.toThrow('Aborted');
    });

    it('should handle HybridAIClient errors', async () => {
      mockAiClient.invoke = vi.fn().mockRejectedValue(new Error('AI client error'));

      const messages = [new HumanMessage('Test')];

      await expect(agent.invoke(messages)).rejects.toThrow('AI client error');
    });
  });

  describe('validateModelOutput', () => {
    it('should validate correct data', () => {
      const data = { result: 'test', status: 'ok' };
      const validated = agent['validateModelOutput'](data);
      expect(validated).toEqual(data);
    });

    it('should throw error for invalid data', () => {
      const data = { invalid: 'data' };
      expect(() => agent['validateModelOutput'](data)).toThrow();
    });

    it('should return undefined for null data', () => {
      const validated = agent['validateModelOutput'](null);
      expect(validated).toBeUndefined();
    });

    it('should return undefined for undefined data', () => {
      const validated = agent['validateModelOutput'](undefined);
      expect(validated).toBeUndefined();
    });
  });

  describe('execute', () => {
    it('should be implemented by subclass', async () => {
      const result = await agent.execute();
      expect(result).toEqual({
        id: 'test-agent',
        result: { done: true },
      });
    });
  });
});
