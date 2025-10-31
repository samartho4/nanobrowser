/**
 * ContextManager - Implements LangChain's Four Pillars of Context Engineering
 *
 * WRITE: Persist context items into workspace-scoped store
 * SELECT: Context engineering layer - pull only relevant content under token budget
 * COMPRESS: User-controlled strategies with transparency
 * ISOLATE: Workspace-scoped snapshots with cross-workspace synthesis
 */

import { langGraphStore, type MemoryNamespace } from '../../../../packages/storage/lib/chat/LangGraphStore';
// Simple logger for ContextManager
const createLogger = (name: string) => ({
  debug: (message: string, ...args: any[]) => console.debug(`[${name}] ${message}`, ...args),
  error: (message: string, ...args: any[]) => console.error(`[${name}] ${message}`, ...args),
  info: (message: string, ...args: any[]) => console.info(`[${name}] ${message}`, ...args),
  warn: (message: string, ...args: any[]) => console.warn(`[${name}] ${message}`, ...args),
});
import { estimateTokenCount } from '../../utils/tokenEstimator';
import { HybridAIClient } from '../../background/llm/HybridAIClient';

const logger = createLogger('ContextManager');

export interface ContextItem {
  id: string;
  type: 'message' | 'page' | 'gmail' | 'memory' | 'file' | 'history';
  content: string;
  agentId?: string; // Track which subagent produced this context (research, writer, etc.)
  sourceType?: 'main' | 'subagent'; // Which pipeline produced it (main vs subagent)
  metadata: {
    source: string;
    timestamp: number;
    tokens: number;
    priority: number; // 1-5, for lost-in-the-middle mitigation
    workspaceId: string;
    sessionId?: string;
    relevanceScore?: number;
  };
}

export interface SelectOptions {
  types?: ContextItem['type'][];
  recencyBias?: number; // 0-1, how much to weight recent items
  semanticThreshold?: number; // 0-1, minimum relevance score
  maxItems?: number;
  priorityWeighting?: boolean; // Use priority for ordering
}

export interface CompressionStrategy {
  name: 'minimal' | 'balanced' | 'aggressive';
  description: string;
  targetRatio: number; // Target compression ratio (0-1)
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

export interface QualityScore {
  relevance: number; // 0-1
  completeness: number; // 0-1
  coherence: number; // 0-1
  overall: number; // 0-1
  issues: string[];
  suggestions: string[];
}

export interface WorkspaceContext {
  workspaceId: string;
  items: ContextItem[];
  totalTokens: number;
  quality: QualityScore;
  lastUpdated: number;
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

/**
 * Compression strategies with different approaches
 */
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

/**
 * ContextManager implements the four pillars of context engineering
 */
export class ContextManager {
  private static instance: ContextManager;
  private aiService: HybridAIClient;

  private constructor() {
    this.aiService = new HybridAIClient();
    this.aiService.initialize().catch(error => {
      logger.error('Failed to initialize AI service:', error);
    });
  }

  public static getInstance(): ContextManager {
    if (!ContextManager.instance) {
      ContextManager.instance = new ContextManager();
    }
    return ContextManager.instance;
  }

  // ============================================================================
  // WRITE PILLAR - Persist context items into workspace-scoped store
  // ============================================================================

  /**
   * Write context item to workspace-scoped storage
   */
  async write(
    workspaceId: string,
    context: Omit<ContextItem, 'id' | 'metadata'> & { metadata: Partial<ContextItem['metadata']> },
    type: 'episodic' | 'semantic' | 'procedural' = 'episodic',
  ): Promise<void> {
    try {
      const contextItem: ContextItem = {
        id: crypto.randomUUID(),
        ...context,
        metadata: {
          source: context.metadata.source || 'unknown',
          timestamp: Date.now(),
          tokens: this.estimateTokenCount(context.content),
          priority: context.metadata.priority || 3,
          workspaceId,
          sessionId: context.metadata.sessionId,
          relevanceScore: context.metadata.relevanceScore || 0.5,
          ...context.metadata,
        },
      };

      const namespace: MemoryNamespace = {
        userId: 'default', // TODO: Get from user context
        workspaceId,
        threadId: context.metadata.sessionId || 'default',
      };

      // Use cleaner key structure like suggested approach
      const key = `${type}_${Date.now()}_${contextItem.id}`;
      await langGraphStore.put(namespace, key, {
        ...contextItem,
        type,
        saved: Date.now(),
      });

      logger.debug(`Wrote context item ${contextItem.id} to workspace ${workspaceId}`);
    } catch (error) {
      logger.error('Failed to write context item:', error);
      throw error;
    }
  }

  // ============================================================================
  // SELECT PILLAR - Context engineering layer/harness
  // ============================================================================

  /**
   * Select relevant context items within token budget
   */
  async select(
    workspaceId: string,
    query: string,
    tokenLimit: number,
    options: SelectOptions = {},
  ): Promise<ContextItem[]> {
    try {
      // Get all context items for workspace
      const allItems = await this.getAllContextItems(workspaceId);

      // Filter by type if specified
      let filteredItems = allItems;
      if (options.types && options.types.length > 0) {
        filteredItems = allItems.filter(item => options.types!.includes(item.type));
      }

      // Calculate relevance scores
      const scoredItems = await this.calculateRelevanceScores(filteredItems, query);

      // Apply semantic threshold
      let relevantItems = scoredItems;
      if (options.semanticThreshold) {
        relevantItems = scoredItems.filter(item => (item.metadata.relevanceScore || 0) >= options.semanticThreshold!);
      }

      // Sort by relevance, recency, and priority
      const sortedItems = this.sortByRelevance(relevantItems, options);

      // Select items within token budget
      const selectedItems = this.selectWithinTokenBudget(sortedItems, tokenLimit, options.maxItems);

      // Apply lost-in-the-middle mitigation
      const reorderedItems = this.reorderForAttention(selectedItems);

      logger.debug(`Selected ${reorderedItems.length} items from ${allItems.length} total`);
      return reorderedItems;
    } catch (error) {
      logger.error('Failed to select context items:', error);
      throw error;
    }
  }

  // ============================================================================
  // COMPRESS PILLAR - User-controlled strategies with transparency
  // ============================================================================

  /**
   * Compress context items using specified strategy
   */
  async compress(
    items: ContextItem[],
    strategy: CompressionStrategy,
    targetTokens: number,
  ): Promise<CompressionResult> {
    try {
      logger.info(`Starting compression with strategy: ${strategy.name}, target: ${targetTokens} tokens`);

      const originalTokens = items.reduce((sum, item) => sum + item.metadata.tokens, 0);

      if (originalTokens <= targetTokens) {
        return {
          original: items,
          compressed: items,
          originalTokens,
          compressedTokens: originalTokens,
          compressionRatio: 1.0,
          strategy,
          itemsRemoved: 0,
          tokensRemoved: 0,
          summary: 'No compression needed - already within target',
          itemsToRemove: [],
        };
      }

      // Sort items by importance and recency
      const sortedItems = this.sortItemsByImportance(items, strategy);

      // Calculate how many tokens to remove
      const tokensToRemove = originalTokens - targetTokens;

      // Select items to remove
      const { itemsToKeep, itemsToRemove } = this.selectItemsForCompression(sortedItems, tokensToRemove, strategy);

      const compressedTokens = itemsToKeep.reduce((sum, item) => sum + item.metadata.tokens, 0);
      const tokensRemoved = originalTokens - compressedTokens;
      const compressionRatio = compressedTokens / originalTokens;

      return {
        original: items,
        compressed: itemsToKeep,
        originalTokens,
        compressedTokens,
        compressionRatio,
        strategy,
        itemsRemoved: itemsToRemove.length,
        tokensRemoved,
        summary: `Removed ${itemsToRemove.length} items (${tokensRemoved} tokens, ${((1 - compressionRatio) * 100).toFixed(1)}% reduction)`,
        preview: this.generateCompressionPreview(items, itemsToKeep),
        itemsToRemove: itemsToRemove.map(item => item.id),
      };
    } catch (error) {
      logger.error('Failed to compress context items:', error);
      throw error;
    }
  }

  // ============================================================================
  // ISOLATE PILLAR - Workspace-scoped snapshots with cross-workspace synthesis
  // ============================================================================

  /**
   * Get isolated workspace context
   */
  async isolate(workspaceId: string): Promise<WorkspaceContext> {
    try {
      const items = await this.getAllContextItems(workspaceId);
      const totalTokens = items.reduce((sum, item) => sum + item.metadata.tokens, 0);
      const quality = await this.assessQuality(items);

      return {
        workspaceId,
        items,
        totalTokens,
        quality,
        lastUpdated: Date.now(),
      };
    } catch (error) {
      logger.error('Failed to isolate workspace context:', error);
      throw error;
    }
  }

  /**
   * Synthesize context across multiple workspaces
   */
  async synthesizeWorkspaces(
    sourceWorkspaceIds: string[],
    targetWorkspaceId: string,
    query: string,
  ): Promise<ContextItem[]> {
    try {
      const allItems: ContextItem[] = [];

      // Collect items from all source workspaces
      for (const workspaceId of sourceWorkspaceIds) {
        const items = await this.getAllContextItems(workspaceId);
        allItems.push(...items);
      }

      // Select most relevant items for synthesis
      const relevantItems = await this.calculateRelevanceScores(allItems, query);
      const topItems = relevantItems
        .sort((a, b) => (b.metadata.relevanceScore || 0) - (a.metadata.relevanceScore || 0))
        .slice(0, 10); // Limit to top 10 most relevant

      // Create synthesis context item
      const synthesisItem: ContextItem = {
        id: crypto.randomUUID(),
        type: 'memory',
        content: `Synthesis from workspaces ${sourceWorkspaceIds.join(', ')}: ${topItems.map(item => item.content).join('\n\n')}`,
        agentId: 'synthesis-agent',
        sourceType: 'main',
        metadata: {
          source: `synthesis:${sourceWorkspaceIds.join(',')}`,
          timestamp: Date.now(),
          tokens: this.estimateTokenCount(topItems.map(item => item.content).join('\n\n')),
          priority: 5, // High priority for synthesis
          workspaceId: targetWorkspaceId,
          relevanceScore: 0.9,
        },
      };

      // Write synthesis to target workspace
      await this.write(targetWorkspaceId, synthesisItem, 'semantic');

      return [synthesisItem];
    } catch (error) {
      logger.error('Failed to synthesize workspaces:', error);
      throw error;
    }
  }

  // ============================================================================
  // QUALITY ASSESSMENT AND OPTIMIZATION
  // ============================================================================

  /**
   * Assess context quality
   */
  async assessQuality(items: ContextItem[]): Promise<QualityScore> {
    if (items.length === 0) {
      return {
        relevance: 0,
        completeness: 0,
        coherence: 0,
        overall: 0,
        issues: ['No context items available'],
        suggestions: ['Add relevant context items'],
      };
    }

    const relevance = this.calculateAverageRelevance(items);
    const completeness = this.assessCompleteness(items);
    const coherence = this.assessCoherence(items);
    const overall = (relevance + completeness + coherence) / 3;

    const issues: string[] = [];
    const suggestions: string[] = [];

    if (relevance < 0.5) {
      issues.push('Low relevance scores');
      suggestions.push('Review context selection criteria');
    }

    if (completeness < 0.5) {
      issues.push('Incomplete context coverage');
      suggestions.push('Add more diverse context sources');
    }

    if (coherence < 0.5) {
      issues.push('Poor context coherence');
      suggestions.push('Reorder context items for better flow');
    }

    return {
      relevance,
      completeness,
      coherence,
      overall,
      issues,
      suggestions,
    };
  }

  /**
   * Reorder context items to mitigate "lost in the middle" problem
   */
  reorderForAttention(items: ContextItem[]): ContextItem[] {
    if (items.length <= 2) return items;

    // Sort by priority and relevance
    const sorted = [...items].sort((a, b) => {
      const priorityDiff = b.metadata.priority - a.metadata.priority;
      if (priorityDiff !== 0) return priorityDiff;
      return (b.metadata.relevanceScore || 0) - (a.metadata.relevanceScore || 0);
    });

    // Place highest priority items at beginning and end
    const reordered: ContextItem[] = [];
    let start = true;

    for (const item of sorted) {
      if (start) {
        reordered.unshift(item); // Add to beginning
      } else {
        reordered.push(item); // Add to end
      }
      start = !start;
    }

    return reordered;
  }

  // ============================================================================
  // UTILITY METHODS FOR OPTIONS UI AND AMBIENT MONITOR
  // ============================================================================

  /**
   * Get compression statistics for a workspace
   */
  async getCompressionStats(workspaceId: string): Promise<any> {
    try {
      // Get compression stats from storage
      const compressionData = await chrome.storage.local.get(`compressionStats_${workspaceId}`);
      const stats = compressionData[`compressionStats_${workspaceId}`] || {};

      // Get current context stats
      const currentStats = await this.getContextStats(workspaceId);

      return {
        totalItems: currentStats.totalItems,
        totalTokens: currentStats.totalTokens,
        compressedItems: stats.compressedItems || 0,
        compressedTokens: stats.compressedTokens || 0,
        compressionRatio: stats.compressionRatio || 0,
        lastCompression: stats.lastCompression || 0,
        isCompressing: stats.isCompressing || false,
      };
    } catch (error) {
      logger.error('Failed to get compression stats:', error);
      return {
        totalItems: 0,
        totalTokens: 0,
        compressedItems: 0,
        compressedTokens: 0,
        compressionRatio: 0,
        lastCompression: 0,
        isCompressing: false,
      };
    }
  }

  /**
   * Update compression statistics
   */
  async updateCompressionStats(workspaceId: string, stats: any): Promise<void> {
    try {
      await chrome.storage.local.set({
        [`compressionStats_${workspaceId}`]: {
          ...stats,
          lastCompression: Date.now(),
        },
      });
    } catch (error) {
      logger.error('Failed to update compression stats:', error);
    }
  }

  /**
   * Get context statistics for Options UI (enhanced format)
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
      const items = await this.getAllContextItems(workspaceId);

      if (items.length === 0) {
        return {
          totalItems: 0,
          totalTokens: 0,
          itemsByType: {},
          tokensByType: {},
          itemsByAgent: {},
          averageRelevance: 0,
          oldestItem: 0,
          newestItem: 0,
          // Enhanced format
          currentTokens: 0,
          estimatedCompressed: 0,
          messages: { tokens: 0 },
          memories: { tokens: 0 },
          pages: { tokens: 0 },
          files: { tokens: 0 },
        };
      }

      const totalTokens = items.reduce((sum, item) => sum + item.metadata.tokens, 0);
      const itemsByType: Record<string, number> = {};
      const tokensByType: Record<string, number> = {};
      const itemsByAgent: Record<string, number> = {};

      let totalRelevance = 0;
      let oldestItem = items[0].metadata.timestamp;
      let newestItem = items[0].metadata.timestamp;

      for (const item of items) {
        // Count by type
        itemsByType[item.type] = (itemsByType[item.type] || 0) + 1;
        tokensByType[item.type] = (tokensByType[item.type] || 0) + item.metadata.tokens;

        // Count by agent
        const agentId = item.agentId || 'main-agent';
        itemsByAgent[agentId] = (itemsByAgent[agentId] || 0) + 1;

        // Track relevance and timestamps
        totalRelevance += item.metadata.relevanceScore || 0;
        oldestItem = Math.min(oldestItem, item.metadata.timestamp);
        newestItem = Math.max(newestItem, item.metadata.timestamp);
      }

      return {
        totalItems: items.length,
        totalTokens,
        itemsByType,
        tokensByType,
        itemsByAgent,
        averageRelevance: totalRelevance / items.length,
        oldestItem,
        newestItem,
        // Enhanced format matching suggested approach
        currentTokens: totalTokens,
        estimatedCompressed: Math.floor(totalTokens * 0.5),
        messages: { tokens: tokensByType['message'] || 0 },
        memories: { tokens: tokensByType['memory'] || 0 },
        pages: { tokens: tokensByType['page'] || 0 },
        files: { tokens: tokensByType['file'] || 0 },
      };
    } catch (error) {
      logger.error('Failed to get context stats:', error);
      throw error;
    }
  }

  /**
   * Remove specific context item (for AmbientMonitor and pills)
   */
  async removeItem(workspaceId: string, itemId: string): Promise<void> {
    try {
      const namespace: MemoryNamespace = {
        userId: 'default',
        workspaceId,
      };

      // Try to delete from all possible context types using new key format
      const contextTypes = ['episodic', 'semantic', 'procedural'];
      for (const type of contextTypes) {
        // Handle both old and new key formats for backward compatibility
        const oldKey = `context:${type}:${itemId}`;
        const newKeyPattern = `${type}_.*_${itemId}`;

        try {
          await langGraphStore.delete(namespace, oldKey);
        } catch (error) {
          // Ignore errors for non-existent keys
        }

        // TODO: Implement pattern-based deletion for new key format
        // This would require enhancing LangGraphStore with pattern matching
      }

      logger.debug(`Removed context item ${itemId} from workspace ${workspaceId}`);
    } catch (error) {
      logger.error('Failed to remove context item:', error);
      throw error;
    }
  }

  /**
   * Update pill priorities for drag-to-reorder functionality
   */
  async updatePillPriorities(workspaceId: string, priorities: Array<{ id: string; priority: number }>): Promise<void> {
    try {
      const namespace: MemoryNamespace = {
        userId: 'default',
        workspaceId,
      };

      // Update priorities for each item
      for (const { id, priority } of priorities) {
        // For now, store priority updates in a separate key
        // In production, you'd want to update the actual context items
        const priorityKey = `priority_${id}`;
        await langGraphStore.put(namespace, priorityKey, {
          itemId: id,
          priority,
          updated: Date.now(),
        });
      }

      logger.debug(`Updated priorities for ${priorities.length} items in workspace ${workspaceId}`);
    } catch (error) {
      logger.error('Failed to update pill priorities:', error);
      throw error;
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Get all context items for a workspace
   */
  private async getAllContextItems(workspaceId: string): Promise<ContextItem[]> {
    try {
      const items: ContextItem[] = [];
      const namespace: MemoryNamespace = {
        userId: 'default',
        workspaceId,
      };

      // Try to get items from all context types
      const contextTypes = ['episodic', 'semantic', 'procedural'];

      for (const type of contextTypes) {
        try {
          // Try different key patterns that might exist
          const patterns = [
            `${type}_`, // New format: episodic_timestamp_id
            `context:${type}:`, // Old format: context:episodic:id
          ];

          for (const pattern of patterns) {
            // Since LangGraphStore search is not implemented, we'll try a different approach
            // We'll attempt to get items by trying common key patterns
            for (let i = 0; i < 100; i++) {
              // Try up to 100 items per type
              try {
                const timestamp = Date.now() - i * 60000; // Try recent timestamps
                const testKey = `${type}_${timestamp}_test`;
                const item = await langGraphStore.get(namespace, testKey);
                if (item && item.id && item.content) {
                  items.push(item as ContextItem);
                }
              } catch {
                // Ignore missing items
              }
            }
          }
        } catch (error) {
          // Continue with other types
        }
      }

      // If no items found with the above approach, try to get from storage directly
      if (items.length === 0) {
        try {
          // Try to get any stored context items using a broader search
          const searchQuery = {
            namespace: { workspaceId },
          };
          const searchResults = await langGraphStore.search(searchQuery);

          for (const result of searchResults) {
            if (result.value && result.value.id && result.value.content) {
              items.push(result.value as ContextItem);
            }
          }
        } catch (error) {
          logger.debug('Search method not available, using fallback approach');
        }
      }

      logger.debug(`Retrieved ${items.length} context items for workspace ${workspaceId}`);
      return items;
    } catch (error) {
      logger.error('Failed to get context items:', error);
      return [];
    }
  }

  /**
   * Calculate relevance scores for items based on query
   */
  private async calculateRelevanceScores(items: ContextItem[], query: string): Promise<ContextItem[]> {
    // Simple relevance scoring based on keyword matching
    // In production, you'd use semantic similarity with embeddings
    const queryWords = query.toLowerCase().split(/\s+/);

    return items.map(item => {
      const content = item.content.toLowerCase();
      const matches = queryWords.filter(word => content.includes(word)).length;
      const relevanceScore = Math.min(matches / queryWords.length, 1.0);

      return {
        ...item,
        metadata: {
          ...item.metadata,
          relevanceScore,
        },
      };
    });
  }

  /**
   * Sort items by relevance, recency, and priority
   */
  private sortByRelevance(items: ContextItem[], options: SelectOptions): ContextItem[] {
    return [...items].sort((a, b) => {
      // Primary sort: relevance score
      const relevanceDiff = (b.metadata.relevanceScore || 0) - (a.metadata.relevanceScore || 0);
      if (Math.abs(relevanceDiff) > 0.1) return relevanceDiff;

      // Secondary sort: priority
      if (options.priorityWeighting) {
        const priorityDiff = b.metadata.priority - a.metadata.priority;
        if (priorityDiff !== 0) return priorityDiff;
      }

      // Tertiary sort: recency (if recency bias is enabled)
      if (options.recencyBias && options.recencyBias > 0) {
        const recencyDiff = b.metadata.timestamp - a.metadata.timestamp;
        return recencyDiff * options.recencyBias;
      }

      return 0;
    });
  }

  /**
   * Select items within token budget
   */
  private selectWithinTokenBudget(items: ContextItem[], tokenLimit: number, maxItems?: number): ContextItem[] {
    const selected: ContextItem[] = [];
    let totalTokens = 0;

    for (const item of items) {
      if (maxItems && selected.length >= maxItems) break;
      if (totalTokens + item.metadata.tokens > tokenLimit) break;

      selected.push(item);
      totalTokens += item.metadata.tokens;
    }

    return selected;
  }

  /**
   * Apply compression strategy to items using AI-powered summarization
   */
  private async applyCompressionStrategy(
    items: ContextItem[],
    strategy: CompressionStrategy,
    targetTokens: number,
  ): Promise<ContextItem[]> {
    const totalTokens = items.reduce((sum, item) => sum + item.metadata.tokens, 0);

    if (totalTokens <= targetTokens) return items;

    switch (strategy.name) {
      case 'minimal':
        return this.truncateStrategy(items, targetTokens);
      case 'balanced':
        return this.summarizeOldStrategy(items, targetTokens);
      case 'aggressive':
        return this.keyFactsOnlyStrategy(items, targetTokens);
      default:
        return this.truncateStrategy(items, targetTokens);
    }
  }

  /**
   * Truncate strategy: Keep everything, just truncate tail if needed
   */
  private async truncateStrategy(items: ContextItem[], targetTokens: number): Promise<ContextItem[]> {
    const selected: ContextItem[] = [];
    let currentTokens = 0;

    // Sort by priority first
    const sorted = [...items].sort((a, b) => b.metadata.priority - a.metadata.priority);

    for (const item of sorted) {
      if (currentTokens + item.metadata.tokens <= targetTokens) {
        selected.push(item);
        currentTokens += item.metadata.tokens;
      } else {
        break;
      }
    }

    return selected;
  }

  /**
   * Summarize old strategy: Summarize older items, keep recent verbatim
   */
  private async summarizeOldStrategy(items: ContextItem[], targetTokens: number): Promise<ContextItem[]> {
    const recentCount = 10; // Keep last 10 messages unmodified
    const recent = items.slice(-recentCount);
    const old = items.slice(0, -recentCount);

    if (old.length === 0) return recent;

    try {
      // Use AI service for summarization
      const oldContent = old.map(item => item.content).join('\n\n');
      const response = await this.aiService.invoke({
        prompt: `Summarize the following context while preserving key information:\n\n${oldContent}`,
        system: 'You are a context summarizer. Preserve important facts, decisions, and outcomes while being concise.',
      });

      const summaryItem: ContextItem = {
        id: crypto.randomUUID(),
        type: 'memory',
        content: response.content,
        agentId: 'compressor',
        sourceType: 'main',
        metadata: {
          source: 'compressed',
          timestamp: Date.now(),
          tokens: this.estimateTokenCount(response.content),
          priority: 3,
          workspaceId: old[0]?.metadata.workspaceId || '',
        },
      };

      return [summaryItem, ...recent];
    } catch (error) {
      logger.error('Failed to summarize old content, falling back to truncation:', error);
      return this.truncateStrategy(items, targetTokens);
    }
  }

  /**
   * Key facts only strategy: Keep only conclusions and critical facts
   */
  private async keyFactsOnlyStrategy(items: ContextItem[], targetTokens: number): Promise<ContextItem[]> {
    try {
      const allContent = items.map(item => item.content).join('\n\n');
      const response = await this.aiService.invoke({
        prompt: `Extract only the most critical facts, decisions, and conclusions from:\n\n${allContent}`,
        system: 'You are a fact extractor. Return only essential information in bullet points.',
      });

      const factsItem: ContextItem = {
        id: crypto.randomUUID(),
        type: 'memory',
        content: response.content,
        agentId: 'compressor',
        sourceType: 'main',
        metadata: {
          source: 'key-facts',
          timestamp: Date.now(),
          tokens: this.estimateTokenCount(response.content),
          priority: 5, // High priority for key facts
          workspaceId: items[0]?.metadata.workspaceId || '',
        },
      };

      return [factsItem];
    } catch (error) {
      logger.error('Failed to extract key facts, falling back to truncation:', error);
      return this.truncateStrategy(items, targetTokens);
    }
  }

  /**
   * Generate compression preview
   */
  private generateCompressionPreview(original: ContextItem[], compressed: ContextItem[]): CompressionResult['preview'] {
    const compressedIds = new Set(compressed.map(item => item.id));
    const removedItems = original.filter(item => !compressedIds.has(item.id));

    const modifiedItems: { original: ContextItem; compressed: ContextItem }[] = [];
    for (const compressedItem of compressed) {
      const originalItem = original.find(item => item.id === compressedItem.id);
      if (originalItem && originalItem.content !== compressedItem.content) {
        modifiedItems.push({ original: originalItem, compressed: compressedItem });
      }
    }

    return {
      removedItems,
      modifiedItems,
    };
  }

  /**
   * Calculate average relevance score
   */
  private calculateAverageRelevance(items: ContextItem[]): number {
    if (items.length === 0) return 0;
    const total = items.reduce((sum, item) => sum + (item.metadata.relevanceScore || 0), 0);
    return total / items.length;
  }

  /**
   * Assess completeness of context
   */
  private assessCompleteness(items: ContextItem[]): number {
    // Simple heuristic: more diverse types = more complete
    const types = new Set(items.map(item => item.type));
    const maxTypes = 6; // message, page, gmail, memory, file, history
    return Math.min(types.size / maxTypes, 1.0);
  }

  /**
   * Assess coherence of context
   */
  private assessCoherence(items: ContextItem[]): number {
    // Simple heuristic: items from same workspace/session are more coherent
    const workspaces = new Set(items.map(item => item.metadata.workspaceId));
    const sessions = new Set(items.map(item => item.metadata.sessionId).filter(Boolean));

    // More coherent if items are from fewer workspaces/sessions
    const workspaceCoherence = 1 / Math.max(workspaces.size, 1);
    const sessionCoherence = sessions.size > 0 ? 1 / sessions.size : 0.5;

    return (workspaceCoherence + sessionCoherence) / 2;
  }

  /**
   * Sort items by importance for compression
   */
  private sortItemsByImportance(items: ContextItem[], strategy: CompressionStrategy): ContextItem[] {
    return [...items].sort((a, b) => {
      // Primary sort: priority (higher priority = more important)
      const priorityDiff = b.metadata.priority - a.metadata.priority;
      if (priorityDiff !== 0) return priorityDiff;

      // Secondary sort: relevance score
      const relevanceDiff = (b.metadata.relevanceScore || 0) - (a.metadata.relevanceScore || 0);
      if (Math.abs(relevanceDiff) > 0.1) return relevanceDiff;

      // Tertiary sort: recency (newer = more important for most strategies)
      if (strategy.name !== 'aggressive') {
        return b.metadata.timestamp - a.metadata.timestamp;
      }

      return 0;
    });
  }

  /**
   * Select items for compression based on strategy
   */
  private selectItemsForCompression(
    sortedItems: ContextItem[],
    tokensToRemove: number,
    strategy: CompressionStrategy,
  ): { itemsToKeep: ContextItem[]; itemsToRemove: ContextItem[] } {
    const itemsToKeep: ContextItem[] = [];
    const itemsToRemove: ContextItem[] = [];
    let tokensRemoved = 0;

    // Start from least important items (end of sorted array)
    for (let i = sortedItems.length - 1; i >= 0; i--) {
      const item = sortedItems[i];

      if (tokensRemoved < tokensToRemove) {
        // Check if we should preserve this item based on strategy
        const shouldPreserve = this.shouldPreserveItem(item, strategy);

        if (!shouldPreserve && tokensRemoved + item.metadata.tokens <= tokensToRemove * 1.1) {
          // Allow 10% overage to avoid keeping items that barely fit
          itemsToRemove.push(item);
          tokensRemoved += item.metadata.tokens;
        } else {
          itemsToKeep.unshift(item); // Add to beginning to maintain order
        }
      } else {
        itemsToKeep.unshift(item); // Add to beginning to maintain order
      }
    }

    return { itemsToKeep, itemsToRemove };
  }

  /**
   * Determine if an item should be preserved based on strategy
   */
  private shouldPreserveItem(item: ContextItem, strategy: CompressionStrategy): boolean {
    const now = Date.now();
    const itemAge = now - item.metadata.timestamp;
    const oneHour = 60 * 60 * 1000;
    const oneDay = 24 * oneHour;

    // Always preserve high-priority items
    if (item.metadata.priority >= 5) return true;

    // Strategy-specific preservation rules
    switch (strategy.name) {
      case 'conservative':
        // Preserve recent items (last hour) and important items
        return itemAge < oneHour || item.metadata.priority >= 4;

      case 'balanced':
        // Preserve very recent items and moderately important items
        return itemAge < oneHour * 2 || item.metadata.priority >= 4;

      case 'aggressive':
        // Only preserve very recent and very important items
        return itemAge < oneHour || item.metadata.priority >= 5;

      case 'semantic':
        // Preserve based on relevance score and importance
        return (item.metadata.relevanceScore || 0) > 0.7 || item.metadata.priority >= 4;

      default:
        return item.metadata.priority >= 4;
    }
  }

  /**
   * Estimate token count for text using shared utility
   */
  private estimateTokenCount(text: string): number {
    return estimateTokenCount(text);
  }
}

// Export singleton instance
export const contextManager = ContextManager.getInstance();
