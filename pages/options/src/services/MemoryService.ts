/**
 * MemoryService for Options page
 * Communicates with Chrome Extension background script for real memory operations
 */

import { estimateTokenCount } from '../utils/tokenEstimator';
import { chromeExtensionBridge } from './ChromeExtensionBridge';

// ============================================================================
// MEMORY INTERFACES (copied from main MemoryService)
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

export interface SemanticFact {
  id: string;
  key: string;
  value: any;
  category?: string;
  confidence: number;
  source: string;
  timestamp: number;
  lastUsed: number;
  usageCount: number;
  workspaceId: string;
  tokens: number;
  metadata?: {
    extractedFrom?: string;
    relatedFacts?: string[];
    vectorEmbedding?: number[];
  };
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

export interface WorkflowStep {
  action: string;
  parameters: Record<string, any>;
  expectedResult: string;
  actualResult?: string;
  success?: boolean;
  duration?: number;
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
    memoryEfficiency: number;
  };
}

// ============================================================================
// MOCK MEMORY SERVICE FOR OPTIONS UI
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

  /**
   * Get memory statistics from chrome extension
   */
  async getMemoryStats(workspaceId: string): Promise<MemoryStats> {
    try {
      return await chromeExtensionBridge.getMemoryStats(workspaceId);
    } catch (error) {
      console.error('Failed to get memory stats from extension:', error);
      // Return empty stats as fallback
      return {
        episodic: {
          totalEpisodes: 0,
          successfulEpisodes: 0,
          failedEpisodes: 0,
          totalTokens: 0,
          averageTokensPerEpisode: 0,
          oldestEpisode: 0,
          newestEpisode: 0,
          sessionCount: 0,
        },
        semantic: {
          totalFacts: 0,
          totalTokens: 0,
          averageConfidence: 0,
          categoryCounts: {},
          mostUsedFacts: [],
          oldestFact: 0,
          newestFact: 0,
        },
        procedural: {
          totalPatterns: 0,
          totalTokens: 0,
          averageSuccessRate: 0,
          mostUsedPatterns: [],
          categoryCounts: {},
          oldestPattern: 0,
          newestPattern: 0,
        },
        overall: {
          totalItems: 0,
          totalTokens: 0,
          memoryEfficiency: 0,
        },
      };
    }
  }

  /**
   * Get workflow patterns from chrome extension
   */
  async listPatterns(workspaceId: string): Promise<PatternSummary[]> {
    try {
      return await chromeExtensionBridge.listPatterns(workspaceId);
    } catch (error) {
      console.error('Failed to list patterns from extension:', error);
      return [];
    }
  }

  /**
   * Clear memory via chrome extension
   */
  async clearMemory(workspaceId: string, memoryType?: 'episodic' | 'semantic' | 'procedural'): Promise<void> {
    try {
      await chromeExtensionBridge.clearMemory(workspaceId, memoryType);
    } catch (error) {
      console.error('Failed to clear memory via extension:', error);
      throw error;
    }
  }

  /**
   * Delete fact via chrome extension
   */
  async deleteFact(workspaceId: string, factId: string): Promise<void> {
    try {
      await chromeExtensionBridge.deleteFact(workspaceId, factId);
    } catch (error) {
      console.error('Failed to delete fact via extension:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const memoryService = MemoryService.getInstance();
