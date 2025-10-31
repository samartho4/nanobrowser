/**
 * MemoryService - Three-Tier Memory System for Deep Agents
 *
 * Episodic Memory: Short-term per session - recent conversation steps and decisions
 * Semantic Memory: Long-term facts/preferences with vector embeddings for semantic search
 * Procedural Memory: Reusable workflows/skills - learned patterns as templates for one-click invocation
 */

import { langGraphStore, type MemoryNamespace } from '../../../../packages/storage/lib/chat/LangGraphStore';
import { createLogger } from '@src/background/log';
import { estimateTokenCount } from '@src/utils/tokenEstimator';

const logger = createLogger('MemoryService');

// ============================================================================
// EPISODIC MEMORY INTERFACES
// ============================================================================

export interface Episode {
  id: string;
  workspaceId: string;
  sessionId: string;
  query: string;
  actions: string[];
  outcome: 'success' | 'failure';
  reasoning: string;
  timestamp: number;
  tokens: number;
  metadata?: {
    agentId?: string;
    duration?: number;
    errorMessage?: string;
    contextUsed?: string[];
  };
}

// ============================================================================
// SEMANTIC MEMORY INTERFACES
// ============================================================================

export interface SemanticFact {
  id: string;
  key: string;
  value: any;
  category?: string;
  confidence: number; // 0-1
  source: string;
  timestamp: number;
  lastUsed: number;
  usageCount: number;
  workspaceId: string;
  tokens: number;
  metadata?: {
    extractedFrom?: string;
    relatedFacts?: string[];
    vectorEmbedding?: number[]; // For future semantic search
  };
}

export interface FactSearchResult {
  fact: SemanticFact;
  relevanceScore: number;
  matchType: 'exact' | 'partial' | 'semantic';
}

// ============================================================================
// PROCEDURAL MEMORY INTERFACES
// ============================================================================

export interface WorkflowStep {
  action: string;
  parameters: Record<string, any>;
  expectedResult: string;
  actualResult?: string;
  success?: boolean;
  duration?: number;
}

export interface WorkflowPattern {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  workspaceId: string;
  successRate: number;
  usageCount: number;
  lastUsed: number;
  createdAt: number;
  updatedAt: number;
  tokens: number;
  metadata?: {
    category?: string;
    tags?: string[];
    difficulty?: 'easy' | 'medium' | 'hard';
    estimatedDuration?: number;
  };
}

export interface PatternSummary {
  id: string;
  name: string;
  description: string;
  successRate: number;
  usageCount: number;
  lastUsed: number;
  category?: string;
  tags?: string[];
}

// ============================================================================
// MEMORY STATISTICS INTERFACES
// ============================================================================

export interface MemoryStats {
  episodic: {
    totalEpisodes: number;
    successfulEpisodes: number;
    failedEpisodes: number;
    totalTokens: number;
    averageTokensPerEpisode: number;
    oldestEpisode: number;
    newestEpisode: number;
    sessionCount: number;
  };
  semantic: {
    totalFacts: number;
    totalTokens: number;
    averageConfidence: number;
    categoryCounts: Record<string, number>;
    mostUsedFacts: Array<{ key: string; usageCount: number }>;
    oldestFact: number;
    newestFact: number;
  };
  procedural: {
    totalPatterns: number;
    totalTokens: number;
    averageSuccessRate: number;
    mostUsedPatterns: Array<{ name: string; usageCount: number; successRate: number }>;
    categoryCounts: Record<string, number>;
    oldestPattern: number;
    newestPattern: number;
  };
  overall: {
    totalItems: number;
    totalTokens: number;
    memoryEfficiency: number; // Ratio of successful retrievals to total items
  };
}

// ============================================================================
// MEMORY SERVICE IMPLEMENTATION
// ============================================================================

export class MemoryService {
  private static instance: MemoryService;

  private constructor() {}

  public static getInstance(): MemoryService {
    if (!MemoryService.instance) {
      MemoryService.instance = new MemoryService();
    }
    return MemoryService.instance;
  }

  // ============================================================================
  // EPISODIC MEMORY METHODS
  // ============================================================================

  /**
   * Save an episode to episodic memory
   */
  async saveEpisode(
    workspaceId: string,
    sessionId: string,
    episode: Omit<Episode, 'id' | 'workspaceId' | 'sessionId' | 'timestamp' | 'tokens'>,
  ): Promise<void> {
    try {
      const episodeData: Episode = {
        id: crypto.randomUUID(),
        workspaceId,
        sessionId,
        timestamp: Date.now(),
        tokens: this.estimateTokenCount(JSON.stringify(episode)),
        ...episode,
      };

      const namespace: MemoryNamespace = {
        userId: 'default', // TODO: Get from user context
        workspaceId,
        threadId: sessionId,
      };

      const key = `episodic_${Date.now()}_${episodeData.id}`;
      await langGraphStore.put(namespace, key, episodeData);

      logger.debug(`Saved episode ${episodeData.id} to workspace ${workspaceId}, session ${sessionId}`);
    } catch (error) {
      logger.error('Failed to save episode:', error);
      throw error;
    }
  }

  /**
   * Get recent episodes from episodic memory
   */
  async getRecentEpisodes(workspaceId: string, sessionId: string, limit: number = 10): Promise<Episode[]> {
    try {
      // This is a simplified implementation
      // In production, you'd want more sophisticated querying from LangGraphStore
      const episodes: Episode[] = [];

      // TODO: Implement proper search functionality in LangGraphStore
      // For now, return empty array as placeholder

      logger.debug(`Retrieved ${episodes.length} recent episodes for workspace ${workspaceId}, session ${sessionId}`);
      return episodes.slice(0, limit);
    } catch (error) {
      logger.error('Failed to get recent episodes:', error);
      return [];
    }
  }

  /**
   * Get episodes by outcome (success/failure)
   */
  async getEpisodesByOutcome(
    workspaceId: string,
    outcome: 'success' | 'failure',
    limit: number = 10,
  ): Promise<Episode[]> {
    try {
      const allEpisodes = await this.getAllEpisodes(workspaceId);
      return allEpisodes
        .filter(episode => episode.outcome === outcome)
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, limit);
    } catch (error) {
      logger.error('Failed to get episodes by outcome:', error);
      return [];
    }
  }

  // ============================================================================
  // SEMANTIC MEMORY METHODS
  // ============================================================================

  /**
   * Save a fact to semantic memory
   */
  async saveFact(workspaceId: string, key: string, value: any, metadata?: SemanticFact['metadata']): Promise<void> {
    try {
      // Check if fact already exists and update usage
      const existingFact = await this.getFact(workspaceId, key);

      const factData: SemanticFact = {
        id: existingFact?.id || crypto.randomUUID(),
        key,
        value,
        confidence: 0.8, // Default confidence
        source: metadata?.extractedFrom || 'user-input',
        timestamp: existingFact?.timestamp || Date.now(),
        lastUsed: Date.now(),
        usageCount: (existingFact?.usageCount || 0) + 1,
        workspaceId,
        tokens: this.estimateTokenCount(JSON.stringify({ key, value })),
        metadata,
      };

      const namespace: MemoryNamespace = {
        userId: 'default',
        workspaceId,
      };

      const storageKey = `semantic_${key}_${factData.id}`;
      await langGraphStore.put(namespace, storageKey, factData);

      logger.debug(`Saved semantic fact ${key} to workspace ${workspaceId}`);
    } catch (error) {
      logger.error('Failed to save semantic fact:', error);
      throw error;
    }
  }

  /**
   * Get a fact from semantic memory
   */
  async getFact(workspaceId: string, key: string): Promise<SemanticFact | null> {
    try {
      // This is a simplified implementation
      // In production, you'd search through all semantic facts for the key

      // TODO: Implement proper key-based search in LangGraphStore
      // For now, return null as placeholder

      return null;
    } catch (error) {
      logger.error('Failed to get semantic fact:', error);
      return null;
    }
  }

  /**
   * Search facts by query with semantic matching
   */
  async searchFacts(workspaceId: string, query: string, limit: number = 5): Promise<FactSearchResult[]> {
    try {
      const allFacts = await this.getAllFacts(workspaceId);
      const results: FactSearchResult[] = [];

      const queryLower = query.toLowerCase();

      for (const fact of allFacts) {
        let relevanceScore = 0;
        let matchType: FactSearchResult['matchType'] = 'semantic';

        // Exact key match
        if (fact.key.toLowerCase() === queryLower) {
          relevanceScore = 1.0;
          matchType = 'exact';
        }
        // Partial key match
        else if (fact.key.toLowerCase().includes(queryLower)) {
          relevanceScore = 0.8;
          matchType = 'partial';
        }
        // Value content match
        else if (JSON.stringify(fact.value).toLowerCase().includes(queryLower)) {
          relevanceScore = 0.6;
          matchType = 'partial';
        }
        // Semantic similarity (simplified - just keyword matching for now)
        else {
          const factText = `${fact.key} ${JSON.stringify(fact.value)}`.toLowerCase();
          const queryWords = queryLower.split(/\s+/);
          const matches = queryWords.filter(word => factText.includes(word)).length;
          relevanceScore = (matches / queryWords.length) * 0.4;
        }

        if (relevanceScore > 0.1) {
          results.push({
            fact,
            relevanceScore,
            matchType,
          });

          // Update usage tracking
          fact.lastUsed = Date.now();
          fact.usageCount++;
          await this.saveFact(workspaceId, fact.key, fact.value, fact.metadata);
        }
      }

      return results.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, limit);
    } catch (error) {
      logger.error('Failed to search semantic facts:', error);
      return [];
    }
  }

  /**
   * Delete a specific fact
   */
  async deleteFact(workspaceId: string, factId: string): Promise<void> {
    try {
      const namespace: MemoryNamespace = {
        userId: 'default',
        workspaceId,
      };

      // Find and delete the fact
      // This is simplified - in production you'd need better indexing
      const allFacts = await this.getAllFacts(workspaceId);
      const fact = allFacts.find(f => f.id === factId);

      if (fact) {
        const storageKey = `semantic_${fact.key}_${fact.id}`;
        await langGraphStore.delete(namespace, storageKey);
        logger.debug(`Deleted semantic fact ${factId} from workspace ${workspaceId}`);
      }
    } catch (error) {
      logger.error('Failed to delete semantic fact:', error);
      throw error;
    }
  }

  // ============================================================================
  // PROCEDURAL MEMORY METHODS
  // ============================================================================

  /**
   * Save a workflow pattern to procedural memory
   */
  async savePattern(
    workspaceId: string,
    pattern: Omit<
      WorkflowPattern,
      'id' | 'workspaceId' | 'createdAt' | 'updatedAt' | 'tokens' | 'usageCount' | 'lastUsed'
    >,
  ): Promise<void> {
    try {
      // Check if pattern already exists and update
      const existingPattern = await this.getPattern(workspaceId, pattern.name);

      const patternData: WorkflowPattern = {
        id: existingPattern?.id || crypto.randomUUID(),
        workspaceId,
        createdAt: existingPattern?.createdAt || Date.now(),
        updatedAt: Date.now(),
        tokens: this.estimateTokenCount(JSON.stringify(pattern)),
        usageCount: existingPattern?.usageCount || 0,
        lastUsed: existingPattern?.lastUsed || Date.now(),
        ...pattern,
      };

      const namespace: MemoryNamespace = {
        userId: 'default',
        workspaceId,
      };

      const key = `procedural_${pattern.name}_${patternData.id}`;
      await langGraphStore.put(namespace, key, patternData);

      logger.debug(`Saved workflow pattern ${pattern.name} to workspace ${workspaceId}`);
    } catch (error) {
      logger.error('Failed to save workflow pattern:', error);
      throw error;
    }
  }

  /**
   * Get a workflow pattern by name
   */
  async getPattern(workspaceId: string, name: string): Promise<WorkflowPattern | null> {
    try {
      // This is a simplified implementation
      // In production, you'd search through all procedural patterns for the name

      // TODO: Implement proper name-based search in LangGraphStore
      // For now, return null as placeholder

      return null;
    } catch (error) {
      logger.error('Failed to get workflow pattern:', error);
      return null;
    }
  }

  /**
   * List all workflow patterns with summary info
   */
  async listPatterns(workspaceId: string): Promise<PatternSummary[]> {
    try {
      const allPatterns = await this.getAllPatterns(workspaceId);

      return allPatterns.map(pattern => ({
        id: pattern.id,
        name: pattern.name,
        description: pattern.description,
        successRate: pattern.successRate,
        usageCount: pattern.usageCount,
        lastUsed: pattern.lastUsed,
        category: pattern.metadata?.category,
        tags: pattern.metadata?.tags,
      }));
    } catch (error) {
      logger.error('Failed to list workflow patterns:', error);
      return [];
    }
  }

  /**
   * Update pattern usage and success rate
   */
  async updatePatternUsage(workspaceId: string, patternId: string, success: boolean): Promise<void> {
    try {
      const allPatterns = await this.getAllPatterns(workspaceId);
      const pattern = allPatterns.find(p => p.id === patternId);

      if (pattern) {
        // Update usage statistics
        pattern.usageCount++;
        pattern.lastUsed = Date.now();

        // Update success rate using exponential moving average
        const alpha = 0.1; // Learning rate
        const newSuccessRate = success ? 1.0 : 0.0;
        pattern.successRate = pattern.successRate * (1 - alpha) + newSuccessRate * alpha;

        await this.savePattern(workspaceId, pattern);
        logger.debug(`Updated pattern usage for ${patternId}: success=${success}, new rate=${pattern.successRate}`);
      }
    } catch (error) {
      logger.error('Failed to update pattern usage:', error);
      throw error;
    }
  }

  /**
   * Get best workflow patterns sorted by usage and success rate
   */
  async getBestPatterns(workspaceId: string, limit: number = 5): Promise<WorkflowPattern[]> {
    try {
      const allPatterns = await this.getAllPatterns(workspaceId);

      return allPatterns
        .sort((a, b) => {
          // Sort by composite score: success rate * log(usage count + 1)
          const scoreA = a.successRate * Math.log(a.usageCount + 1);
          const scoreB = b.successRate * Math.log(b.usageCount + 1);
          return scoreB - scoreA;
        })
        .slice(0, limit);
    } catch (error) {
      logger.error('Failed to get best patterns:', error);
      return [];
    }
  }

  // ============================================================================
  // MEMORY MANAGEMENT METHODS (FOR OPTIONS UI)
  // ============================================================================

  /**
   * Get comprehensive memory statistics
   */
  async getMemoryStats(workspaceId: string): Promise<MemoryStats> {
    try {
      const [episodes, facts, patterns] = await Promise.all([
        this.getAllEpisodes(workspaceId),
        this.getAllFacts(workspaceId),
        this.getAllPatterns(workspaceId),
      ]);

      // Episodic stats
      const successfulEpisodes = episodes.filter(e => e.outcome === 'success').length;
      const episodicTokens = episodes.reduce((sum, e) => sum + e.tokens, 0);
      const sessionIds = new Set(episodes.map(e => e.sessionId));

      // Semantic stats
      const semanticTokens = facts.reduce((sum, f) => sum + f.tokens, 0);
      const categoryCounts: Record<string, number> = {};
      facts.forEach(fact => {
        const category = fact.category || 'uncategorized';
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      });
      const avgConfidence = facts.length > 0 ? facts.reduce((sum, f) => sum + f.confidence, 0) / facts.length : 0;

      // Procedural stats
      const proceduralTokens = patterns.reduce((sum, p) => sum + p.tokens, 0);
      const patternCategories: Record<string, number> = {};
      patterns.forEach(pattern => {
        const category = pattern.metadata?.category || 'uncategorized';
        patternCategories[category] = (patternCategories[category] || 0) + 1;
      });
      const avgSuccessRate =
        patterns.length > 0 ? patterns.reduce((sum, p) => sum + p.successRate, 0) / patterns.length : 0;

      return {
        episodic: {
          totalEpisodes: episodes.length,
          successfulEpisodes,
          failedEpisodes: episodes.length - successfulEpisodes,
          totalTokens: episodicTokens,
          averageTokensPerEpisode: episodes.length > 0 ? episodicTokens / episodes.length : 0,
          oldestEpisode: episodes.length > 0 ? Math.min(...episodes.map(e => e.timestamp)) : 0,
          newestEpisode: episodes.length > 0 ? Math.max(...episodes.map(e => e.timestamp)) : 0,
          sessionCount: sessionIds.size,
        },
        semantic: {
          totalFacts: facts.length,
          totalTokens: semanticTokens,
          averageConfidence: avgConfidence,
          categoryCounts,
          mostUsedFacts: facts
            .sort((a, b) => b.usageCount - a.usageCount)
            .slice(0, 5)
            .map(f => ({ key: f.key, usageCount: f.usageCount })),
          oldestFact: facts.length > 0 ? Math.min(...facts.map(f => f.timestamp)) : 0,
          newestFact: facts.length > 0 ? Math.max(...facts.map(f => f.timestamp)) : 0,
        },
        procedural: {
          totalPatterns: patterns.length,
          totalTokens: proceduralTokens,
          averageSuccessRate: avgSuccessRate,
          mostUsedPatterns: patterns
            .sort((a, b) => b.usageCount - a.usageCount)
            .slice(0, 5)
            .map(p => ({ name: p.name, usageCount: p.usageCount, successRate: p.successRate })),
          categoryCounts: patternCategories,
          oldestPattern: patterns.length > 0 ? Math.min(...patterns.map(p => p.createdAt)) : 0,
          newestPattern: patterns.length > 0 ? Math.max(...patterns.map(p => p.createdAt)) : 0,
        },
        overall: {
          totalItems: episodes.length + facts.length + patterns.length,
          totalTokens: episodicTokens + semanticTokens + proceduralTokens,
          memoryEfficiency: this.calculateMemoryEfficiency(episodes, facts, patterns),
        },
      };
    } catch (error) {
      logger.error('Failed to get memory stats:', error);
      throw error;
    }
  }

  /**
   * Clear all memory for a workspace
   */
  async clearMemory(workspaceId: string, memoryType?: 'episodic' | 'semantic' | 'procedural'): Promise<void> {
    try {
      const namespace: MemoryNamespace = {
        userId: 'default',
        workspaceId,
      };

      if (!memoryType) {
        // Clear all memory types
        await langGraphStore.clear(namespace);
        logger.info(`Cleared all memory for workspace ${workspaceId}`);
      } else {
        // Clear specific memory type
        // This would require pattern-based deletion in LangGraphStore
        // For now, this is a placeholder implementation
        logger.info(`Cleared ${memoryType} memory for workspace ${workspaceId}`);
      }
    } catch (error) {
      logger.error('Failed to clear memory:', error);
      throw error;
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Get all episodes for a workspace (simplified implementation)
   */
  private async getAllEpisodes(workspaceId: string): Promise<Episode[]> {
    // This is a placeholder implementation
    // In production, you'd implement proper querying in LangGraphStore
    return [];
  }

  /**
   * Get all facts for a workspace (simplified implementation)
   */
  private async getAllFacts(workspaceId: string): Promise<SemanticFact[]> {
    // This is a placeholder implementation
    // In production, you'd implement proper querying in LangGraphStore
    return [];
  }

  /**
   * Get all patterns for a workspace (simplified implementation)
   */
  private async getAllPatterns(workspaceId: string): Promise<WorkflowPattern[]> {
    // This is a placeholder implementation
    // In production, you'd implement proper querying in LangGraphStore
    return [];
  }

  /**
   * Calculate memory efficiency score
   */
  private calculateMemoryEfficiency(episodes: Episode[], facts: SemanticFact[], patterns: WorkflowPattern[]): number {
    const totalItems = episodes.length + facts.length + patterns.length;
    if (totalItems === 0) return 0;

    // Simple efficiency metric: ratio of used items to total items
    const usedFacts = facts.filter(f => f.usageCount > 0).length;
    const usedPatterns = patterns.filter(p => p.usageCount > 0).length;
    const successfulEpisodes = episodes.filter(e => e.outcome === 'success').length;

    const usedItems = usedFacts + usedPatterns + successfulEpisodes;
    return usedItems / totalItems;
  }

  /**
   * Estimate token count for text
   */
  private estimateTokenCount(text: string): number {
    return estimateTokenCount(text);
  }
}

// Export singleton instance
export const memoryService = MemoryService.getInstance();
