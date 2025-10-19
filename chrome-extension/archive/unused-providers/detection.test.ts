import { describe, it, expect, beforeEach, vi } from 'vitest';
import { detectGeminiNano, isGeminiNanoAvailable } from '../detection';

describe('Gemini Nano Detection', () => {
  beforeEach(() => {
    // Clear any existing globalThis.ai mock
    delete (globalThis as any).ai;
  });

  describe('detectGeminiNano', () => {
    it('returns all false when ai is not available', async () => {
      const capabilities = await detectGeminiNano();
      expect(capabilities).toEqual({
        promptAPI: false,
        summarizer: false,
        translator: false,
      });
    });

    it('detects promptAPI when available is "readily"', async () => {
      (globalThis as any).ai = {
        languageModel: {
          capabilities: vi.fn().mockResolvedValue({ available: 'readily' }),
        },
      };

      const capabilities = await detectGeminiNano();
      expect(capabilities.promptAPI).toBe(true);
      expect(capabilities.summarizer).toBe(false);
      expect(capabilities.translator).toBe(false);
    });

    it('detects promptAPI when available is true', async () => {
      (globalThis as any).ai = {
        languageModel: {
          capabilities: vi.fn().mockResolvedValue({ available: true }),
        },
      };

      const capabilities = await detectGeminiNano();
      expect(capabilities.promptAPI).toBe(true);
    });

    it('detects summarizer when available', async () => {
      (globalThis as any).ai = {
        summarizer: {
          capabilities: vi.fn().mockResolvedValue({ available: 'readily' }),
        },
      };

      const capabilities = await detectGeminiNano();
      expect(capabilities.summarizer).toBe(true);
      expect(capabilities.promptAPI).toBe(false);
    });

    it('detects translator when available', async () => {
      (globalThis as any).ai = {
        translator: {
          capabilities: vi.fn().mockResolvedValue({ available: 'readily' }),
        },
      };

      const capabilities = await detectGeminiNano();
      expect(capabilities.translator).toBe(true);
      expect(capabilities.promptAPI).toBe(false);
    });

    it('detects all capabilities when all are available', async () => {
      (globalThis as any).ai = {
        languageModel: {
          capabilities: vi.fn().mockResolvedValue({ available: 'readily' }),
        },
        summarizer: {
          capabilities: vi.fn().mockResolvedValue({ available: true }),
        },
        translator: {
          capabilities: vi.fn().mockResolvedValue({ available: 'readily' }),
        },
      };

      const capabilities = await detectGeminiNano();
      expect(capabilities).toEqual({
        promptAPI: true,
        summarizer: true,
        translator: true,
      });
    });

    it('handles errors gracefully when capabilities check throws', async () => {
      (globalThis as any).ai = {
        languageModel: {
          capabilities: vi.fn().mockRejectedValue(new Error('API error')),
        },
      };

      const capabilities = await detectGeminiNano();
      expect(capabilities.promptAPI).toBe(false);
    });

    it('returns false when available status is not "readily" or true', async () => {
      (globalThis as any).ai = {
        languageModel: {
          capabilities: vi.fn().mockResolvedValue({ available: 'after-download' }),
        },
      };

      const capabilities = await detectGeminiNano();
      expect(capabilities.promptAPI).toBe(false);
    });

    it('handles missing capabilities method gracefully', async () => {
      (globalThis as any).ai = {
        languageModel: {},
      };

      const capabilities = await detectGeminiNano();
      expect(capabilities.promptAPI).toBe(false);
    });

    it('handles partial API availability', async () => {
      (globalThis as any).ai = {
        languageModel: {
          capabilities: vi.fn().mockResolvedValue({ available: 'readily' }),
        },
        summarizer: {
          capabilities: vi.fn().mockRejectedValue(new Error('Not available')),
        },
      };

      const capabilities = await detectGeminiNano();
      expect(capabilities.promptAPI).toBe(true);
      expect(capabilities.summarizer).toBe(false);
    });
  });

  describe('isGeminiNanoAvailable', () => {
    it('returns true when promptAPI is available', async () => {
      (globalThis as any).ai = {
        languageModel: {
          capabilities: vi.fn().mockResolvedValue({ available: 'readily' }),
        },
      };

      const available = await isGeminiNanoAvailable();
      expect(available).toBe(true);
    });

    it('returns false when promptAPI is not available', async () => {
      (globalThis as any).ai = {
        summarizer: {
          capabilities: vi.fn().mockResolvedValue({ available: 'readily' }),
        },
      };

      const available = await isGeminiNanoAvailable();
      expect(available).toBe(false);
    });

    it('returns false when no AI APIs are available', async () => {
      const available = await isGeminiNanoAvailable();
      expect(available).toBe(false);
    });
  });
});
