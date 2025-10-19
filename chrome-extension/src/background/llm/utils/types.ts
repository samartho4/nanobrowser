/**
 * Chrome AI Language Model Session interface (extension service worker API)
 * Based on: https://developer.chrome.com/docs/ai/session-management
 */
export interface AILanguageModelSession {
  prompt(
    input: string,
    options?: {
      responseConstraint?: {
        type: 'object';
        properties: Record<string, any>;
        required?: string[];
        additionalProperties?: boolean;
      };
      signal?: AbortSignal;
    },
  ): Promise<string>;
  promptStreaming(input: string, options?: { signal?: AbortSignal }): ReadableStream<string>;
  destroy(): void;
  clone(): Promise<AILanguageModelSession>;
}

/**
 * Chrome AI session creation options
 * Based on: https://developer.chrome.com/docs/ai/session-management
 * Note: Use initialPrompts for system messages, not systemPrompt
 */
export interface AISessionOptions {
  temperature?: number;
  topK?: number;
  signal?: AbortSignal;
  initialPrompts?: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
}

/**
 * Chrome AI Language Model Static interface (extension service worker API)
 * Based on: https://developer.chrome.com/docs/ai/built-in-apis
 */
export interface AILanguageModelStatic {
  availability(): Promise<'readily' | 'after-download' | 'no' | 'available'>;
  create(options?: AISessionOptions): Promise<AILanguageModelSession>;
}

/**
 * Declare global LanguageModel API for extension service workers
 */
declare global {
  var LanguageModel: AILanguageModelStatic;
}

/**
 * Summarizer session options
 */
export interface SummarizerSessionOptions {
  type?: 'tl;dr' | 'key-points' | 'teaser' | 'headline';
  format?: 'plain-text' | 'markdown';
  length?: 'short' | 'medium' | 'long';
  signal?: AbortSignal;
}

/**
 * AI Summarizer interface
 */
export interface AISummarizer {
  summarize(text: string, options?: { signal?: AbortSignal }): Promise<string>;
  summarizeStreaming(text: string, options?: { signal?: AbortSignal }): ReadableStream;
  destroy(): void;
}

/**
 * Translator capabilities options
 */
export interface TranslatorCapabilitiesOptions {
  sourceLanguage: string;
  targetLanguage: string;
}

/**
 * Translator session options
 */
export interface TranslatorSessionOptions {
  sourceLanguage: string;
  targetLanguage: string;
  signal?: AbortSignal;
}

/**
 * AI Translator interface
 */
export interface AITranslator {
  translate(text: string, options?: { signal?: AbortSignal }): Promise<string>;
  translateStreaming(text: string, options?: { signal?: AbortSignal }): ReadableStream;
  destroy(): void;
}
