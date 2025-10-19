import type { z } from 'zod';
import { detectGeminiNano } from '../utils/detection';
import type { AIProvider, GenerateOptions, NanoCapabilities, SessionOptions, SummarizerOptions } from './types';

/**
 * Provider for Chrome's built-in Gemini Nano AI
 * Uses the Prompt API, Summarizer, and Translator APIs
 */
export class GeminiNanoProvider implements AIProvider {
  private capabilities: NanoCapabilities;
  private session: any | null = null;
  private initialized = false;

  constructor() {
    this.capabilities = {
      promptAPI: false,
      summarizer: false,
      translator: false,
    };
  }

  /**
   * Initialize the provider and detect capabilities
   * @returns true if at least Prompt API is available
   */
  async initialize(): Promise<boolean> {
    this.capabilities = await detectGeminiNano();
    this.initialized = true;
    return this.capabilities.promptAPI;
  }

  /**
   * Check which Nano capabilities are available
   */
  async checkAvailability(): Promise<NanoCapabilities> {
    if (!this.initialized) {
      await this.initialize();
    }
    return { ...this.capabilities };
  }

  /**
   * Generate text using the Prompt API
   */
  async generateText(prompt: string, options: GenerateOptions = {}): Promise<string> {
    if (!this.capabilities.promptAPI) {
      throw new Error('Prompt API is not available');
    }

    try {
      await this.createSession(options);

      if (!this.session) {
        throw new Error('Failed to create AI session');
      }

      const result = await this.session.prompt(prompt);
      return result;
    } catch (error) {
      throw new Error(`Nano inference failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate structured output using the Prompt API with schema validation
   */
  async generateStructured<T>(prompt: string, schema: z.ZodType<T>, options: GenerateOptions = {}): Promise<T> {
    // Generate text and parse as JSON
    const text = await this.generateText(prompt, options);

    try {
      // Try to extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return schema.parse(parsed);
    } catch (error) {
      throw new Error(`Failed to parse structured output: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate streaming text using the Prompt API
   */
  async *generateStream(prompt: string, options: GenerateOptions = {}): AsyncGenerator<string> {
    if (!this.capabilities.promptAPI) {
      throw new Error('Prompt API is not available');
    }

    try {
      await this.createSession(options);

      if (!this.session) {
        throw new Error('Failed to create AI session');
      }

      // Check if streaming is supported
      if (typeof this.session.promptStreaming === 'function') {
        const stream = await this.session.promptStreaming(prompt);

        for await (const chunk of stream) {
          yield chunk;
        }
      } else {
        // Fallback to non-streaming
        const result = await this.session.prompt(prompt);
        yield result;
      }
    } catch (error) {
      throw new Error(`Nano streaming failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Summarize text using the Summarizer API
   */
  async summarize(text: string, options: SummarizerOptions = {}): Promise<string> {
    if (!this.capabilities.summarizer) {
      throw new Error('Summarizer API is not available');
    }

    try {
      const ai = (globalThis as any)?.ai;
      if (!ai?.summarizer) {
        throw new Error('Summarizer API not found');
      }

      const summarizer = await ai.summarizer.create(options);
      const result = await summarizer.summarize(text);
      summarizer.destroy();

      return result;
    } catch (error) {
      throw new Error(`Summarization failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Translate text using the Translator API
   */
  async translate(text: string, targetLang: string, sourceLang?: string): Promise<string> {
    if (!this.capabilities.translator) {
      throw new Error('Translator API is not available');
    }

    try {
      const ai = (globalThis as any)?.ai;
      if (!ai?.translator) {
        throw new Error('Translator API not found');
      }

      const translatorOptions: any = {
        targetLanguage: targetLang,
      };

      if (sourceLang) {
        translatorOptions.sourceLanguage = sourceLang;
      }

      const translator = await ai.translator.create(translatorOptions);
      const result = await translator.translate(text);
      translator.destroy();

      return result;
    } catch (error) {
      throw new Error(`Translation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create a new AI session with the specified options
   */
  async createSession(options: SessionOptions = {}): Promise<void> {
    // Destroy existing session if any
    await this.destroySession();

    try {
      const ai = (globalThis as any)?.ai;
      if (!ai?.languageModel) {
        throw new Error('Language Model API not found');
      }

      const sessionOptions: any = {};

      if (options.systemPrompt) {
        sessionOptions.systemPrompt = options.systemPrompt;
      }

      if (options.temperature !== undefined) {
        sessionOptions.temperature = options.temperature;
      }

      if (options.topK !== undefined) {
        sessionOptions.topK = options.topK;
      }

      this.session = await ai.languageModel.create(sessionOptions);
    } catch (error) {
      throw new Error(`Failed to create session: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Destroy the current AI session
   */
  async destroySession(): Promise<void> {
    if (this.session) {
      try {
        if (typeof this.session.destroy === 'function') {
          this.session.destroy();
        }
      } catch (error) {
        console.warn('Error destroying session:', error);
      }
      this.session = null;
    }
  }

  /**
   * Check if the provider is ready to use
   */
  isReady(): boolean {
    return this.initialized && this.capabilities.promptAPI;
  }
}
