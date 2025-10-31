/**
 * Simple token estimation utility for Options page
 * Provides basic token counting functionality
 */

/**
 * Estimate token count for text using 4-char-per-token approximation
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
  const estimatedTokens = Math.ceil(normalizedText.length / 4);

  // Minimum of 1 token for non-empty text
  return Math.max(estimatedTokens, normalizedText.length > 0 ? 1 : 0);
}
