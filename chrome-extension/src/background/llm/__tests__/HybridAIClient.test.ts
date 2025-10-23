import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HybridAIClient } from '../HybridAIClient';
import { GeminiNanoChatModel } from '../langchain/GeminiNanoChatModel';
import { HYBRID_SDK_INVOKE } from '../constants';

// Mock the GeminiNanoChatModel
vi.mock('../langchain/GeminiNanoChatModel', () => ({
  GeminiNanoChatModel: vi.fn().mockImplementation(() => ({
    invoke: vi.fn().mockResolvedValue({ content: 'Nano response' }),
    stream: vi.fn().mockResolvedValue({
      async *[Symbol.asyncIterator]() {
        yield { content: 'Streamed ' };
        yield { content: 'response' };
      },
    }),
    withStructuredOutput: vi.fn().mockReturnValue({
      invoke: vi.fn().mockResolvedValue({ result: 'structured data' }),
    }),
  })),
}));

describe('HybridAIClient', () => {
  let client: HybridAIClient;

  beforeEach(() => {
    client = new HybridAIClient();
    vi.clearAllMocks();
  });

  describe('initialize', () => {
    it('should detect Nano availability when available', async () => {
      // Mock globalThis.LanguageModel
      globalThis.LanguageModel = {
        availability: vi.fn().mockResolvedValue('available'),
        create: vi.fn(),
      } as any;

      await client.initialize();

      const status = client.getStatus();
      expect(status.nano.availability).toBe('available');
      expect(status.provider).toBe('nano');
    });

    it('should handle Nano unavailable', async () => {
      // Mock globalThis.LanguageModel
      globalThis.LanguageModel = {
        availability: vi.fn().mockResolvedValue('unavailable'),
        create: vi.fn(),
      } as any;

      await client.initialize();

      const status = client.getStatus();
      expect(status.nano.availability).toBe('unavailable');
      expect(status.provider).toBe('cloud');
    });

    it('should handle missing LanguageModel API', async () => {
      // Remove LanguageModel from globalThis
      delete (globalThis as any).LanguageModel;

      await client.initialize();

      const status = client.getStatus();
      expect(status.nano.availability).toBe('unavailable');
      expect(status.provider).toBe('cloud');
    });

    it('should handle initialization errors', async () => {
      globalThis.LanguageModel = {
        availability: vi.fn().mockRejectedValue(new Error('Test error')),
        create: vi.fn(),
      } as any;

      await client.initialize();

      const status = client.getStatus();
      expect(status.lastError).toBe('Test error');
      expect(status.nano.availability).toBe('unavailable');
    });
  });

  describe('invoke - Nano path', () => {
    beforeEach(async () => {
      // Setup Nano as available
      globalThis.LanguageModel = {
        availability: vi.fn().mockResolvedValue('available'),
        create: vi.fn(),
      } as any;

      await client.initialize();
    });

    it('should use Nano for simple prompt', async () => {
      const result = await client.invoke({
        prompt: 'Hello',
      });

      expect(result.provider).toBe('nano');
      expect(result.content).toBe('Nano response');
    });

    it('should use Nano with system message', async () => {
      const result = await client.invoke({
        prompt: 'Hello',
        system: 'You are a helpful assistant',
      });

      expect(result.provider).toBe('nano');
      expect(result.content).toBe('Nano response');
    });

    it('should use Nano with schema for structured output', async () => {
      const schema = { type: 'object', properties: { result: { type: 'string' } } };

      const result = await client.invoke({
        prompt: 'Generate data',
        schema,
      });

      expect(result.provider).toBe('nano');
      expect(result.content).toContain('structured data');
    });

    it('should use Nano with streaming', async () => {
      const result = await client.invoke({
        prompt: 'Hello',
        stream: true,
      });

      expect(result.provider).toBe('nano');
      expect(result.content).toBe('Streamed response');
    });
  });

  describe('invoke - Bridge fallback', () => {
    beforeEach(async () => {
      // Setup Nano as unavailable
      globalThis.LanguageModel = {
        availability: vi.fn().mockResolvedValue('unavailable'),
        create: vi.fn(),
      } as any;

      await client.initialize();
    });

    it('should use bridge when Nano unavailable', async () => {
      // Mock chrome.runtime.sendMessage
      const mockSendMessage = vi.fn().mockResolvedValue({
        ok: true,
        text: 'Cloud response',
        provider: 'cloud',
      });
      global.chrome = {
        runtime: {
          sendMessage: mockSendMessage,
        },
      } as any;

      const result = await client.invoke({
        prompt: 'Hello',
      });

      expect(mockSendMessage).toHaveBeenCalledWith({
        type: HYBRID_SDK_INVOKE,
        payload: {
          prompt: 'Hello',
          system: undefined,
          schema: undefined,
          stream: undefined,
        },
      });
      expect(result.provider).toBe('cloud');
      expect(result.content).toBe('Cloud response');
    });

    it('should handle bridge errors', async () => {
      // Mock chrome.runtime.sendMessage with error
      const mockSendMessage = vi.fn().mockResolvedValue({
        ok: false,
        error: 'Bridge failed',
      });
      global.chrome = {
        runtime: {
          sendMessage: mockSendMessage,
        },
      } as any;

      await expect(client.invoke({ prompt: 'Hello' })).rejects.toThrow('Bridge failed');
    });

    it('should pass all options to bridge', async () => {
      const mockSendMessage = vi.fn().mockResolvedValue({
        ok: true,
        text: 'Cloud response',
      });
      global.chrome = {
        runtime: {
          sendMessage: mockSendMessage,
        },
      } as any;

      const schema = { type: 'object' };
      await client.invoke({
        prompt: 'Test',
        system: 'System prompt',
        schema,
        stream: true,
      });

      expect(mockSendMessage).toHaveBeenCalledWith({
        type: HYBRID_SDK_INVOKE,
        payload: {
          prompt: 'Test',
          system: 'System prompt',
          schema,
          stream: true,
        },
      });
    });
  });

  describe('invoke - Nano fallback to bridge', () => {
    beforeEach(async () => {
      // Setup Nano as available
      globalThis.LanguageModel = {
        availability: vi.fn().mockResolvedValue('available'),
        create: vi.fn(),
      } as any;

      await client.initialize();
    });

    it('should fallback to bridge when Nano fails', async () => {
      // Mock Nano to fail
      const mockNanoModel = (GeminiNanoChatModel as any).mock.results[0].value;
      mockNanoModel.invoke.mockRejectedValueOnce(new Error('Nano error'));

      // Mock bridge to succeed
      const mockSendMessage = vi.fn().mockResolvedValue({
        ok: true,
        text: 'Cloud fallback response',
      });
      global.chrome = {
        runtime: {
          sendMessage: mockSendMessage,
        },
      } as any;

      const result = await client.invoke({
        prompt: 'Hello',
      });

      expect(result.provider).toBe('cloud');
      expect(result.content).toBe('Cloud fallback response');
    });
  });

  describe('getStatus', () => {
    it('should return correct status when Nano available', async () => {
      globalThis.LanguageModel = {
        availability: vi.fn().mockResolvedValue('readily'),
        create: vi.fn(),
      } as any;

      await client.initialize();

      const status = client.getStatus();
      expect(status.provider).toBe('nano');
      expect(status.nano.availability).toBe('readily');
      expect(status.lastError).toBeUndefined();
    });

    it('should return correct status when Nano unavailable', async () => {
      globalThis.LanguageModel = {
        availability: vi.fn().mockResolvedValue('downloading'),
        create: vi.fn(),
      } as any;

      await client.initialize();

      const status = client.getStatus();
      expect(status.provider).toBe('cloud');
      expect(status.nano.availability).toBe('downloading');
    });

    it('should include last error when present', async () => {
      globalThis.LanguageModel = {
        availability: vi.fn().mockRejectedValue(new Error('Init failed')),
        create: vi.fn(),
      } as any;

      await client.initialize();

      const status = client.getStatus();
      expect(status.lastError).toBe('Init failed');
    });
  });
});
