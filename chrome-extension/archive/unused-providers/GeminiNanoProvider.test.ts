import { describe, it, expect, beforeEach, vi } from 'vitest';
import { z } from 'zod';
import { GeminiNanoProvider } from '../GeminiNanoProvider';

describe('GeminiNanoProvider', () => {
  let provider: GeminiNanoProvider;

  beforeEach(() => {
    // Clear any existing globalThis.ai mock
    delete (globalThis as any).ai;
    provider = new GeminiNanoProvider();
  });

  describe('initialize', () => {
    it('returns true when Prompt API is available', async () => {
      (globalThis as any).ai = {
        languageModel: {
          capabilities: vi.fn().mockResolvedValue({ available: 'readily' }),
        },
      };

      const result = await provider.initialize();
      expect(result).toBe(true);
    });

    it('returns false when Prompt API is not available', async () => {
      (globalThis as any).ai = {
        summarizer: {
          capabilities: vi.fn().mockResolvedValue({ available: 'readily' }),
        },
      };

      const result = await provider.initialize();
      expect(result).toBe(false);
    });

    it('returns false when no AI APIs are available', async () => {
      const result = await provider.initialize();
      expect(result).toBe(false);
    });
  });

  describe('checkAvailability', () => {
    it('returns capabilities after initialization', async () => {
      (globalThis as any).ai = {
        languageModel: {
          capabilities: vi.fn().mockResolvedValue({ available: 'readily' }),
        },
        summarizer: {
          capabilities: vi.fn().mockResolvedValue({ available: true }),
        },
      };

      const capabilities = await provider.checkAvailability();
      expect(capabilities).toEqual({
        promptAPI: true,
        summarizer: true,
        translator: false,
      });
    });

    it('initializes automatically if not already initialized', async () => {
      (globalThis as any).ai = {
        languageModel: {
          capabilities: vi.fn().mockResolvedValue({ available: 'readily' }),
        },
      };

      const capabilities = await provider.checkAvailability();
      expect(capabilities.promptAPI).toBe(true);
    });
  });

  describe('createSession', () => {
    it('creates a session with default options', async () => {
      const mockSession = {
        prompt: vi.fn().mockResolvedValue('response'),
        destroy: vi.fn(),
      };

      (globalThis as any).ai = {
        languageModel: {
          capabilities: vi.fn().mockResolvedValue({ available: 'readily' }),
          create: vi.fn().mockResolvedValue(mockSession),
        },
      };

      await provider.initialize();
      await provider.createSession();

      expect((globalThis as any).ai.languageModel.create).toHaveBeenCalledWith({});
    });

    it('creates a session with custom options', async () => {
      const mockSession = {
        prompt: vi.fn().mockResolvedValue('response'),
        destroy: vi.fn(),
      };

      (globalThis as any).ai = {
        languageModel: {
          capabilities: vi.fn().mockResolvedValue({ available: 'readily' }),
          create: vi.fn().mockResolvedValue(mockSession),
        },
      };

      await provider.initialize();
      await provider.createSession({
        systemPrompt: 'You are a helpful assistant',
        temperature: 0.7,
        topK: 40,
      });

      expect((globalThis as any).ai.languageModel.create).toHaveBeenCalledWith({
        systemPrompt: 'You are a helpful assistant',
        temperature: 0.7,
        topK: 40,
      });
    });

    it('destroys existing session before creating new one', async () => {
      const mockSession1 = {
        prompt: vi.fn().mockResolvedValue('response'),
        destroy: vi.fn(),
      };
      const mockSession2 = {
        prompt: vi.fn().mockResolvedValue('response'),
        destroy: vi.fn(),
      };

      (globalThis as any).ai = {
        languageModel: {
          capabilities: vi.fn().mockResolvedValue({ available: 'readily' }),
          create: vi.fn().mockResolvedValueOnce(mockSession1).mockResolvedValueOnce(mockSession2),
        },
      };

      await provider.initialize();
      await provider.createSession();
      await provider.createSession();

      expect(mockSession1.destroy).toHaveBeenCalled();
    });

    it('throws error when languageModel API is not available', async () => {
      await provider.initialize();

      await expect(provider.createSession()).rejects.toThrow('Language Model API not found');
    });
  });

  describe('destroySession', () => {
    it('destroys active session', async () => {
      const mockSession = {
        prompt: vi.fn().mockResolvedValue('response'),
        destroy: vi.fn(),
      };

      (globalThis as any).ai = {
        languageModel: {
          capabilities: vi.fn().mockResolvedValue({ available: 'readily' }),
          create: vi.fn().mockResolvedValue(mockSession),
        },
      };

      await provider.initialize();
      await provider.createSession();
      await provider.destroySession();

      expect(mockSession.destroy).toHaveBeenCalled();
    });

    it('handles missing destroy method gracefully', async () => {
      const mockSession = {
        prompt: vi.fn().mockResolvedValue('response'),
      };

      (globalThis as any).ai = {
        languageModel: {
          capabilities: vi.fn().mockResolvedValue({ available: 'readily' }),
          create: vi.fn().mockResolvedValue(mockSession),
        },
      };

      await provider.initialize();
      await provider.createSession();
      await expect(provider.destroySession()).resolves.not.toThrow();
    });

    it('does nothing when no session exists', async () => {
      await expect(provider.destroySession()).resolves.not.toThrow();
    });
  });

  describe('generateText', () => {
    it('generates text successfully', async () => {
      const mockSession = {
        prompt: vi.fn().mockResolvedValue('Generated text response'),
        destroy: vi.fn(),
      };

      (globalThis as any).ai = {
        languageModel: {
          capabilities: vi.fn().mockResolvedValue({ available: 'readily' }),
          create: vi.fn().mockResolvedValue(mockSession),
        },
      };

      await provider.initialize();
      const result = await provider.generateText('Test prompt');

      expect(result).toBe('Generated text response');
      expect(mockSession.prompt).toHaveBeenCalledWith('Test prompt');
    });

    it('throws error when Prompt API is not available', async () => {
      await provider.initialize();

      await expect(provider.generateText('Test prompt')).rejects.toThrow('Prompt API is not available');
    });

    it('throws error when session creation fails', async () => {
      (globalThis as any).ai = {
        languageModel: {
          capabilities: vi.fn().mockResolvedValue({ available: 'readily' }),
          create: vi.fn().mockRejectedValue(new Error('Session creation failed')),
        },
      };

      await provider.initialize();

      await expect(provider.generateText('Test prompt')).rejects.toThrow('Nano inference failed');
    });

    it('throws error when prompt fails', async () => {
      const mockSession = {
        prompt: vi.fn().mockRejectedValue(new Error('Prompt failed')),
        destroy: vi.fn(),
      };

      (globalThis as any).ai = {
        languageModel: {
          capabilities: vi.fn().mockResolvedValue({ available: 'readily' }),
          create: vi.fn().mockResolvedValue(mockSession),
        },
      };

      await provider.initialize();

      await expect(provider.generateText('Test prompt')).rejects.toThrow('Nano inference failed');
    });
  });

  describe('generateStructured', () => {
    it('generates and parses structured output', async () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const mockSession = {
        prompt: vi.fn().mockResolvedValue('{"name": "John", "age": 30}'),
        destroy: vi.fn(),
      };

      (globalThis as any).ai = {
        languageModel: {
          capabilities: vi.fn().mockResolvedValue({ available: 'readily' }),
          create: vi.fn().mockResolvedValue(mockSession),
        },
      };

      await provider.initialize();
      const result = await provider.generateStructured('Generate user', schema);

      expect(result).toEqual({ name: 'John', age: 30 });
    });

    it('extracts JSON from text with surrounding content', async () => {
      const schema = z.object({
        value: z.string(),
      });

      const mockSession = {
        prompt: vi.fn().mockResolvedValue('Here is the result: {"value": "test"} - done'),
        destroy: vi.fn(),
      };

      (globalThis as any).ai = {
        languageModel: {
          capabilities: vi.fn().mockResolvedValue({ available: 'readily' }),
          create: vi.fn().mockResolvedValue(mockSession),
        },
      };

      await provider.initialize();
      const result = await provider.generateStructured('Generate', schema);

      expect(result).toEqual({ value: 'test' });
    });

    it('throws error when no JSON found in response', async () => {
      const schema = z.object({
        value: z.string(),
      });

      const mockSession = {
        prompt: vi.fn().mockResolvedValue('No JSON here'),
        destroy: vi.fn(),
      };

      (globalThis as any).ai = {
        languageModel: {
          capabilities: vi.fn().mockResolvedValue({ available: 'readily' }),
          create: vi.fn().mockResolvedValue(mockSession),
        },
      };

      await provider.initialize();

      await expect(provider.generateStructured('Generate', schema)).rejects.toThrow(
        'Failed to parse structured output',
      );
    });

    it('throws error when JSON does not match schema', async () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const mockSession = {
        prompt: vi.fn().mockResolvedValue('{"name": "John"}'),
        destroy: vi.fn(),
      };

      (globalThis as any).ai = {
        languageModel: {
          capabilities: vi.fn().mockResolvedValue({ available: 'readily' }),
          create: vi.fn().mockResolvedValue(mockSession),
        },
      };

      await provider.initialize();

      await expect(provider.generateStructured('Generate', schema)).rejects.toThrow(
        'Failed to parse structured output',
      );
    });
  });

  describe('generateStream', () => {
    it('generates streaming text when promptStreaming is available', async () => {
      const mockStream = (async function* () {
        yield 'chunk1';
        yield 'chunk2';
        yield 'chunk3';
      })();

      const mockSession = {
        prompt: vi.fn(),
        promptStreaming: vi.fn().mockResolvedValue(mockStream),
        destroy: vi.fn(),
      };

      (globalThis as any).ai = {
        languageModel: {
          capabilities: vi.fn().mockResolvedValue({ available: 'readily' }),
          create: vi.fn().mockResolvedValue(mockSession),
        },
      };

      await provider.initialize();
      const stream = provider.generateStream('Test prompt');

      const chunks: string[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual(['chunk1', 'chunk2', 'chunk3']);
      expect(mockSession.promptStreaming).toHaveBeenCalledWith('Test prompt');
    });

    it('falls back to non-streaming when promptStreaming is not available', async () => {
      const mockSession = {
        prompt: vi.fn().mockResolvedValue('Full response'),
        destroy: vi.fn(),
      };

      (globalThis as any).ai = {
        languageModel: {
          capabilities: vi.fn().mockResolvedValue({ available: 'readily' }),
          create: vi.fn().mockResolvedValue(mockSession),
        },
      };

      await provider.initialize();
      const stream = provider.generateStream('Test prompt');

      const chunks: string[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual(['Full response']);
      expect(mockSession.prompt).toHaveBeenCalledWith('Test prompt');
    });

    it('throws error when Prompt API is not available', async () => {
      await provider.initialize();

      const stream = provider.generateStream('Test prompt');

      await expect(async () => {
        for await (const _ of stream) {
          // Should throw before yielding
        }
      }).rejects.toThrow('Prompt API is not available');
    });

    it('throws error when streaming fails', async () => {
      const mockSession = {
        prompt: vi.fn(),
        promptStreaming: vi.fn().mockRejectedValue(new Error('Streaming failed')),
        destroy: vi.fn(),
      };

      (globalThis as any).ai = {
        languageModel: {
          capabilities: vi.fn().mockResolvedValue({ available: 'readily' }),
          create: vi.fn().mockResolvedValue(mockSession),
        },
      };

      await provider.initialize();
      const stream = provider.generateStream('Test prompt');

      await expect(async () => {
        for await (const _ of stream) {
          // Should throw
        }
      }).rejects.toThrow('Nano streaming failed');
    });
  });

  describe('summarize', () => {
    it('summarizes text successfully', async () => {
      const mockSummarizer = {
        summarize: vi.fn().mockResolvedValue('Summary of the text'),
        destroy: vi.fn(),
      };

      (globalThis as any).ai = {
        languageModel: {
          capabilities: vi.fn().mockResolvedValue({ available: 'readily' }),
        },
        summarizer: {
          capabilities: vi.fn().mockResolvedValue({ available: 'readily' }),
          create: vi.fn().mockResolvedValue(mockSummarizer),
        },
      };

      await provider.initialize();
      const result = await provider.summarize('Long text to summarize');

      expect(result).toBe('Summary of the text');
      expect(mockSummarizer.summarize).toHaveBeenCalledWith('Long text to summarize');
      expect(mockSummarizer.destroy).toHaveBeenCalled();
    });

    it('passes options to summarizer', async () => {
      const mockSummarizer = {
        summarize: vi.fn().mockResolvedValue('Summary'),
        destroy: vi.fn(),
      };

      (globalThis as any).ai = {
        languageModel: {
          capabilities: vi.fn().mockResolvedValue({ available: 'readily' }),
        },
        summarizer: {
          capabilities: vi.fn().mockResolvedValue({ available: 'readily' }),
          create: vi.fn().mockResolvedValue(mockSummarizer),
        },
      };

      await provider.initialize();
      await provider.summarize('Text', {
        type: 'tl;dr',
        format: 'markdown',
        length: 'short',
      });

      expect((globalThis as any).ai.summarizer.create).toHaveBeenCalledWith({
        type: 'tl;dr',
        format: 'markdown',
        length: 'short',
      });
    });

    it('throws error when Summarizer API is not available', async () => {
      (globalThis as any).ai = {
        languageModel: {
          capabilities: vi.fn().mockResolvedValue({ available: 'readily' }),
        },
      };

      await provider.initialize();

      await expect(provider.summarize('Text')).rejects.toThrow('Summarizer API is not available');
    });

    it('throws error when summarization fails', async () => {
      const mockSummarizer = {
        summarize: vi.fn().mockRejectedValue(new Error('Summarization error')),
        destroy: vi.fn(),
      };

      (globalThis as any).ai = {
        languageModel: {
          capabilities: vi.fn().mockResolvedValue({ available: 'readily' }),
        },
        summarizer: {
          capabilities: vi.fn().mockResolvedValue({ available: 'readily' }),
          create: vi.fn().mockResolvedValue(mockSummarizer),
        },
      };

      await provider.initialize();

      await expect(provider.summarize('Text')).rejects.toThrow('Summarization failed');
    });
  });

  describe('translate', () => {
    it('translates text successfully', async () => {
      const mockTranslator = {
        translate: vi.fn().mockResolvedValue('Translated text'),
        destroy: vi.fn(),
      };

      (globalThis as any).ai = {
        languageModel: {
          capabilities: vi.fn().mockResolvedValue({ available: 'readily' }),
        },
        translator: {
          capabilities: vi.fn().mockResolvedValue({ available: 'readily' }),
          create: vi.fn().mockResolvedValue(mockTranslator),
        },
      };

      await provider.initialize();
      const result = await provider.translate('Hello', 'es');

      expect(result).toBe('Translated text');
      expect(mockTranslator.translate).toHaveBeenCalledWith('Hello');
      expect(mockTranslator.destroy).toHaveBeenCalled();
    });

    it('creates translator with target language only', async () => {
      const mockTranslator = {
        translate: vi.fn().mockResolvedValue('Translated'),
        destroy: vi.fn(),
      };

      (globalThis as any).ai = {
        languageModel: {
          capabilities: vi.fn().mockResolvedValue({ available: 'readily' }),
        },
        translator: {
          capabilities: vi.fn().mockResolvedValue({ available: 'readily' }),
          create: vi.fn().mockResolvedValue(mockTranslator),
        },
      };

      await provider.initialize();
      await provider.translate('Hello', 'es');

      expect((globalThis as any).ai.translator.create).toHaveBeenCalledWith({
        targetLanguage: 'es',
      });
    });

    it('creates translator with source and target languages', async () => {
      const mockTranslator = {
        translate: vi.fn().mockResolvedValue('Translated'),
        destroy: vi.fn(),
      };

      (globalThis as any).ai = {
        languageModel: {
          capabilities: vi.fn().mockResolvedValue({ available: 'readily' }),
        },
        translator: {
          capabilities: vi.fn().mockResolvedValue({ available: 'readily' }),
          create: vi.fn().mockResolvedValue(mockTranslator),
        },
      };

      await provider.initialize();
      await provider.translate('Hello', 'es', 'en');

      expect((globalThis as any).ai.translator.create).toHaveBeenCalledWith({
        targetLanguage: 'es',
        sourceLanguage: 'en',
      });
    });

    it('throws error when Translator API is not available', async () => {
      (globalThis as any).ai = {
        languageModel: {
          capabilities: vi.fn().mockResolvedValue({ available: 'readily' }),
        },
      };

      await provider.initialize();

      await expect(provider.translate('Hello', 'es')).rejects.toThrow('Translator API is not available');
    });

    it('throws error when translation fails', async () => {
      const mockTranslator = {
        translate: vi.fn().mockRejectedValue(new Error('Translation error')),
        destroy: vi.fn(),
      };

      (globalThis as any).ai = {
        languageModel: {
          capabilities: vi.fn().mockResolvedValue({ available: 'readily' }),
        },
        translator: {
          capabilities: vi.fn().mockResolvedValue({ available: 'readily' }),
          create: vi.fn().mockResolvedValue(mockTranslator),
        },
      };

      await provider.initialize();

      await expect(provider.translate('Hello', 'es')).rejects.toThrow('Translation failed');
    });
  });

  describe('isReady', () => {
    it('returns true when initialized and Prompt API is available', async () => {
      (globalThis as any).ai = {
        languageModel: {
          capabilities: vi.fn().mockResolvedValue({ available: 'readily' }),
        },
      };

      await provider.initialize();
      expect(provider.isReady()).toBe(true);
    });

    it('returns false when not initialized', () => {
      expect(provider.isReady()).toBe(false);
    });

    it('returns false when initialized but Prompt API is not available', async () => {
      await provider.initialize();
      expect(provider.isReady()).toBe(false);
    });
  });
});
