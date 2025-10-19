import type { z } from 'zod';

/**
 * Base options for text generation
 */
export interface GenerateOptions {
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

/**
 * Options for creating an AI session
 */
export interface SessionOptions {
  systemPrompt?: string;
  temperature?: number;
  topK?: number;
}

/**
 * Capabilities of Gemini Nano
 */
export interface NanoCapabilities {
  promptAPI: boolean;
  summarizer: boolean;
  translator: boolean;
}

/**
 * Options for the Summarizer API
 */
export interface SummarizerOptions {
  type?: 'tl;dr' | 'key-points' | 'teaser' | 'headline';
  format?: 'plain-text' | 'markdown';
  length?: 'short' | 'medium' | 'long';
}

/**
 * Configuration for Firebase AI Logic
 */
export interface FirebaseConfig {
  endpoint: string;
  apiKey?: string;
  projectId?: string;
}

/**
 * Payload sent to Firebase AI Logic
 */
export interface FirebasePayload {
  prompt: string;
  systemPrompt?: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  schema?: object;
}

/**
 * Response from Firebase AI Logic
 */
export interface FirebaseResponse {
  content: string;
  model: string;
  tokensUsed?: number;
}

/**
 * Base interface for AI providers
 */
export interface AIProvider {
  generateText(prompt: string, options: GenerateOptions): Promise<string>;
  generateStructured<T>(prompt: string, schema: z.ZodType<T>, options: GenerateOptions): Promise<T>;
  generateStream(prompt: string, options: GenerateOptions): AsyncGenerator<string>;
}
