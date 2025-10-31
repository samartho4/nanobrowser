/**
 * MessageManager service for Options page
 * Simplified implementation for token estimation
 */

import { estimateTokenCount } from '../utils/tokenEstimator';

export default class MessageManager {
  /**
   * Estimate token count consistently throughout the system
   */
  public estimateTokenCount(text: string): number {
    return estimateTokenCount(text);
  }
}
