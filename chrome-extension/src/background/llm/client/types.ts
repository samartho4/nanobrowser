import type { z } from 'zod';

/**
 * Options for invoking the AI client
 */
export interface InvokeOptions {
  prompt: string;
  schema?: z.ZodType;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

/**
 * Response from AI invocation
 */
export interface InvokeResponse<T = unknown> {
  content: string;
  parsed?: T;
  provider: 'nano' | 'cloud';
  metadata: {
    model: string;
    tokensUsed?: number;
    latency: number;
    fallbackReason?: string;
  };
}

/**
 * Current status of the AI system
 */
export interface AIStatus {
  nanoAvailable: boolean;
  nanoReady: boolean;
  currentProvider: 'nano' | 'cloud' | 'unknown';
  lastError?: string;
  capabilities?: {
    promptAPI: boolean;
    summarizer: boolean;
    translator: boolean;
  };
}

/**
 * Configuration for HybridAIClient
 */
export interface HybridAIClientConfig {
  firebaseEndpoint: string;
  firebaseApiKey?: string;
  geminiModel?: string;
  forceCloudFallback?: boolean;
  retryAttempts?: number;
  timeout?: number;
}
