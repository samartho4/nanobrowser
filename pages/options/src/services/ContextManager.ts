/**
 * ContextManager for Options page
 * Communicates with Chrome Extension background script for real context operations
 */

import { estimateTokenCount } from '../utils/tokenEstimator';
import { chromeExtensionBridge } from './ChromeExtensionBridge';

// ============================================================================
// CONTEXT INTERFACES (copied from main ContextManager)
// ============================================================================

export interface ContextItem {
  id: string;
  type: 'message' | 'page' | 'gmail' | 'memory' | 'file' | 'history';
  content: string;
  agentId?: string;
  sourceType?: 'main' | 'subagent';
  metadata: {
    source: string;
    timestamp: number;
    tokens: number;
    priority: number;
    workspaceId: string;
    sessionId?: string;
    relevanceScore?: number;
  };
}

export interface CompressionStrategy {
  name: 'minimal' | 'balanced' | 'aggressive';
  description: string;
  targetRatio: number;
}

export interface CompressionResult {
  original: ContextItem[];
  compressed: ContextItem[];
  originalTokens: number;
  compressedTokens: number;
  compressionRatio: number;
  strategy: CompressionStrategy;
  preview?: {
    removedItems: ContextItem[];
    modifiedItems: { original: ContextItem; compressed: ContextItem }[];
  };
}

export interface ContextStats {
  totalItems: number;
  totalTokens: number;
  itemsByType: Record<string, number>;
  tokensByType: Record<string, number>;
  itemsByAgent: Record<string, number>;
  averageRelevance: number;
  oldestItem: number;
  newestItem: number;
}

// ============================================================================
// COMPRESSION STRATEGIES
// ============================================================================

export const COMPRESSION_STRATEGIES: Record<string, CompressionStrategy> = {
  minimal: {
    name: 'minimal',
    description: 'Keep most detail, remove only redundant content',
    targetRatio: 0.8,
  },
  balanced: {
    name: 'balanced',
    description: 'Balance detail with conciseness, focus on key decisions',
    targetRatio: 0.5,
  },
  aggressive: {
    name: 'aggressive',
    description: 'Keep only conclusions and critical facts',
    targetRatio: 0.3,
  },
};

// ============================================================================
// MOCK CONTEXT MANAGER FOR OPTIONS UI
// ============================================================================

export class ContextManager {
  private static instance: ContextManager;

  private constructor() {}

  public static getInstance(): ContextManager {
    if (!ContextManager.instance) {
      ContextManager.instance = new ContextManager();
    }
    return ContextManager.instance;
  }

  /**
   * Get context statistics from chrome extension
   */
  async getContextStats(workspaceId: string): Promise<
    ContextStats & {
      currentTokens: number;
      estimatedCompressed: number;
      messages: { tokens: number };
      memories: { tokens: number };
      pages: { tokens: number };
      files: { tokens: number };
    }
  > {
    try {
      return await chromeExtensionBridge.getContextStats(workspaceId);
    } catch (error) {
      console.error('Failed to get context stats from extension:', error);
      // Return empty stats as fallback
      return {
        totalItems: 0,
        totalTokens: 0,
        itemsByType: {},
        tokensByType: {},
        itemsByAgent: {},
        averageRelevance: 0,
        oldestItem: 0,
        newestItem: 0,
        currentTokens: 0,
        estimatedCompressed: 0,
        messages: { tokens: 0 },
        memories: { tokens: 0 },
        pages: { tokens: 0 },
        files: { tokens: 0 },
      };
    }
  }

  /**
   * Select context items from chrome extension
   */
  async select(workspaceId: string, query: string, tokenLimit: number, options?: any): Promise<ContextItem[]> {
    try {
      return await chromeExtensionBridge.selectContext(workspaceId, query, tokenLimit, options);
    } catch (error) {
      console.error('Failed to select context from extension:', error);
      return [];
    }
  }

  /**
   * Compress context items via chrome extension
   */
  async compress(
    items: ContextItem[],
    strategy: CompressionStrategy,
    targetTokens: number,
  ): Promise<CompressionResult> {
    try {
      return await chromeExtensionBridge.compressContext('default-workspace', items, strategy, targetTokens);
    } catch (error) {
      console.error('Failed to compress context via extension:', error);
      // Fallback to local compression
      return this.fallbackCompress(items, strategy, targetTokens);
    }
  }

  /**
   * Fallback compression when extension is not available
   */
  private fallbackCompress(
    items: ContextItem[],
    strategy: CompressionStrategy,
    targetTokens: number,
  ): CompressionResult {
    const originalTokens = items.reduce((sum, item) => sum + item.metadata.tokens, 0);
    const compressedTokens = Math.round(originalTokens * strategy.targetRatio);

    // Create compressed versions of items
    const compressed: ContextItem[] = items.map(item => ({
      ...item,
      id: `compressed-${item.id}`,
      content: this.compressContent(item.content, strategy),
      agentId: 'compressor',
      metadata: {
        ...item.metadata,
        tokens: Math.round(item.metadata.tokens * strategy.targetRatio),
        source: 'compressed',
      },
    }));

    // Generate preview data
    const removedItems = items.slice(Math.floor(items.length * strategy.targetRatio));
    const modifiedItems = items.slice(0, Math.floor(items.length * strategy.targetRatio)).map((original, index) => ({
      original,
      compressed: compressed[index],
    }));

    return {
      original: items,
      compressed,
      originalTokens,
      compressedTokens,
      compressionRatio: strategy.targetRatio,
      strategy,
      preview: {
        removedItems,
        modifiedItems,
      },
    };
  }

  /**
   * Mock content compression based on strategy
   */
  private compressContent(content: string, strategy: CompressionStrategy): string {
    switch (strategy.name) {
      case 'minimal':
        // Remove redundant words and phrases
        return content
          .replace(/\b(very|really|quite|rather|pretty)\s+/gi, '')
          .replace(/\s+/g, ' ')
          .trim();

      case 'balanced':
        // Keep key information, summarize details
        const sentences = content.split(/[.!?]+/).filter(s => s.trim());
        const keySentences = sentences.slice(0, Math.ceil(sentences.length * 0.6));
        return keySentences.join('. ') + (keySentences.length > 0 ? '.' : '');

      case 'aggressive':
        // Extract only the most critical facts
        const words = content.split(/\s+/);
        const keyWords = words.filter(
          word =>
            word.length > 4 &&
            !/^(the|and|but|for|are|was|were|been|have|has|had|will|would|could|should)$/i.test(word),
        );
        return keyWords.slice(0, Math.ceil(keyWords.length * 0.4)).join(' ');

      default:
        return content;
    }
  }
}

// Export singleton instance
export const contextManager = ContextManager.getInstance();
