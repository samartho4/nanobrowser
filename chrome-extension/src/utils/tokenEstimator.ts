/**
 * Shared token estimation utility
 * Provides consistent token counting across the entire codebase
 */

/**
 * Estimate token count for text using 4-char-per-token approximation
 * This is a simple heuristic that works reasonably well for most text
 *
 * @param text - The text to estimate tokens for
 * @returns Estimated number of tokens
 */
export function estimateTokenCount(text: string): number {
  if (!text || typeof text !== 'string') {
    return 0;
  }

  // Remove extra whitespace and normalize
  const normalizedText = text.trim().replace(/\s+/g, ' ');

  // Use 4 characters per token as a reasonable approximation
  // This accounts for the fact that tokens can be partial words, punctuation, etc.
  const estimatedTokens = Math.ceil(normalizedText.length / 4);

  // Minimum of 1 token for non-empty text
  return Math.max(estimatedTokens, normalizedText.length > 0 ? 1 : 0);
}

/**
 * Estimate tokens for multiple text strings
 *
 * @param texts - Array of text strings
 * @returns Total estimated token count
 */
export function estimateTokenCountForTexts(texts: string[]): number {
  return texts.reduce((total, text) => total + estimateTokenCount(text), 0);
}

/**
 * Check if text exceeds token limit
 *
 * @param text - Text to check
 * @param limit - Token limit
 * @returns True if text exceeds limit
 */
export function exceedsTokenLimit(text: string, limit: number): boolean {
  return estimateTokenCount(text) > limit;
}

/**
 * Truncate text to fit within token limit
 *
 * @param text - Text to truncate
 * @param limit - Token limit
 * @returns Truncated text that fits within limit
 */
export function truncateToTokenLimit(text: string, limit: number): string {
  if (!text || limit <= 0) return '';

  const currentTokens = estimateTokenCount(text);
  if (currentTokens <= limit) return text;

  // Calculate approximate character limit
  const charLimit = Math.floor((limit / currentTokens) * text.length);

  // Truncate and add ellipsis if needed
  const truncated = text.slice(0, charLimit);
  return truncated + (truncated.length < text.length ? '...' : '');
}
