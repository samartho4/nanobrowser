import type { z } from 'zod';

/**
 * Base error class for AI-related errors
 */
export class AIError extends Error {
  constructor(
    message: string,
    public provider: 'nano' | 'cloud',
    public originalError?: Error,
  ) {
    super(message);
    this.name = 'AIError';

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AIError);
    }
  }
}

/**
 * Error thrown when Gemini Nano is unavailable
 */
export class NanoUnavailableError extends AIError {
  constructor(message: string) {
    super(message, 'nano');
    this.name = 'NanoUnavailableError';
  }
}

/**
 * Error thrown when Gemini Nano inference fails
 */
export class NanoInferenceError extends AIError {
  constructor(message: string, originalError?: Error) {
    super(message, 'nano', originalError);
    this.name = 'NanoInferenceError';
  }
}

/**
 * Error thrown when cloud fallback fails
 */
export class CloudFallbackError extends AIError {
  constructor(message: string, originalError?: Error) {
    super(message, 'cloud', originalError);
    this.name = 'CloudFallbackError';
  }
}

/**
 * Error thrown when schema validation fails
 */
export class SchemaValidationError extends AIError {
  constructor(
    message: string,
    public schema: z.ZodType,
    provider: 'nano' | 'cloud',
    public validationError?: z.ZodError,
  ) {
    super(message, provider);
    this.name = 'SchemaValidationError';
  }
}

/**
 * Error thrown when a request times out
 */
export class TimeoutError extends AIError {
  constructor(message: string, provider: 'nano' | 'cloud') {
    super(message, provider);
    this.name = 'TimeoutError';
  }
}

/**
 * Error thrown when rate limit is exceeded
 */
export class RateLimitError extends AIError {
  constructor(
    message: string,
    provider: 'nano' | 'cloud',
    public retryAfter?: number,
  ) {
    super(message, provider);
    this.name = 'RateLimitError';
  }
}
