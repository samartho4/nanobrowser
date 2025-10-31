/**
 * Workspace Memory Service
 *
 * Provides real memory statistics and Gmail integration for workspace detail views
 */

import { GmailService } from '../gmail/GmailService';
import { GmailMemoryIntegration } from '../gmail/GmailMemoryIntegration';
import { createLogger } from '@src/background/log';

const logger = createLogger('WorkspaceMemoryService');

export interface RealMemoryStats {
  totalItems: number;
  totalTokens: number;
  efficiency: number;
  estimatedSize: string;
  episodic: {
    episodes: number;
    successRate: number;
    avgTokens: number;
    sessions: number;
  };
  semantic: {
    facts: number;
    avgConfidence: number;
    categories: number;
    oldest: string;
  };
  procedural: {
    patterns: number;
    avgSuccess: number;
    categories: number;
    oldest: string;
  };
  lastUpdated: number;
  gmailIntegration: {
    enabled: boolean;
    lastSync: number;
    totalEmailsProcessed: number;
    syncStatus: 'idle' | 'syncing' | 'error';
  };
}

export class WorkspaceMemoryService {
  private static instance: WorkspaceMemoryService;
  private gmailService: GmailService | null = null;
  private gmailIntegration: GmailMemoryIntegration | null = null;
  private syncStatus = new Map<string, 'idle' | 'syncing' | 'error'>();

  private constructor() {}

  public static getInstance(): WorkspaceMemoryService {
    if (!WorkspaceMemoryService.instance) {
      WorkspaceMemoryService.instance = new WorkspaceMemoryService();
    }
    return WorkspaceMemoryService.instance;
  }

  /**
   * Initialize Gmail integration
   */
  async initializeGmailIntegration(clientId: string, clientSecret: string): Promise<void> {
    try {
      this.gmailService = new GmailService(clientId, clientSecret);
      await this.gmailService.initialize();

      if (this.gmailService.isAuthenticated()) {
        this.gmailIntegration = new GmailMemoryIntegration(this.gmailService);
        logger.info('Gmail integration initialized successfully');
      } else {
        logger.error('Gmail service not authenticated');
      }
    } catch (error) {
      logger.error('Failed to initialize Gmail integration:', error);
      throw error;
    }
  }

  /**
   * Get real memory statistics for a workspace
   */
  async getRealMemoryStats(workspaceId: string): Promise<RealMemoryStats> {
    try {
      logger.info(`Getting real memory stats for workspace ${workspaceId}`);

      // Use dynamic import to avoid blocking module initialization
      let baseStats;
      try {
        const { memoryService } = await import('../memory/MemoryService');

        // Add timeout to prevent hanging on memory service calls
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('MemoryService timeout')), 5000),
        );

        const statsPromise = memoryService.getMemoryStats(workspaceId);
        baseStats = await Promise.race([statsPromise, timeoutPromise]);

        logger.info(`Successfully got memory stats from MemoryService`);
      } catch (error) {
        logger.warn(`Failed to get memory stats from MemoryService, using fallback:`, error);
        // Fallback to mock data if MemoryService fails
        baseStats = {
          overall: {
            totalItems: 0,
            totalTokens: 0,
            memoryEfficiency: 0,
          },
          episodic: {
            totalEpisodes: 0,
            successfulEpisodes: 0,
            averageTokensPerEpisode: 0,
            sessionCount: 0,
          },
          semantic: {
            totalFacts: 0,
            averageConfidence: 0,
            categoryCounts: {},
            oldestFact: 0,
          },
          procedural: {
            totalPatterns: 0,
            averageSuccessRate: 0,
            categoryCounts: {},
            oldestPattern: 0,
          },
        };
      }

      // Convert to our format with additional Gmail integration info
      const realStats: RealMemoryStats = {
        totalItems: baseStats.overall.totalItems,
        totalTokens: baseStats.overall.totalTokens,
        efficiency: baseStats.overall.memoryEfficiency * 100,
        estimatedSize: this.formatBytes(baseStats.overall.totalTokens * 4), // Rough estimate: 4 bytes per token

        episodic: {
          episodes: baseStats.episodic.totalEpisodes,
          successRate:
            baseStats.episodic.totalEpisodes > 0
              ? (baseStats.episodic.successfulEpisodes / baseStats.episodic.totalEpisodes) * 100
              : 0,
          avgTokens: Math.round(baseStats.episodic.averageTokensPerEpisode),
          sessions: baseStats.episodic.sessionCount,
        },

        semantic: {
          facts: baseStats.semantic.totalFacts,
          avgConfidence: baseStats.semantic.averageConfidence,
          categories: Object.keys(baseStats.semantic.categoryCounts).length,
          oldest: this.formatTimestamp(baseStats.semantic.oldestFact),
        },

        procedural: {
          patterns: baseStats.procedural.totalPatterns,
          avgSuccess: baseStats.procedural.averageSuccessRate,
          categories: Object.keys(baseStats.procedural.categoryCounts).length,
          oldest: this.formatTimestamp(baseStats.procedural.oldestPattern),
        },

        lastUpdated: Date.now(),

        gmailIntegration: {
          enabled: this.gmailIntegration !== null && this.gmailService?.isAuthenticated() === true,
          lastSync: this.getLastSyncTime(workspaceId),
          totalEmailsProcessed: await this.getTotalEmailsProcessed(workspaceId),
          syncStatus: this.syncStatus.get(workspaceId) || 'idle',
        },
      };

      return realStats;
    } catch (error) {
      logger.error(`Failed to get real memory stats for workspace ${workspaceId}:`, error);
      throw error;
    }
  }

  /**
   * Sync Gmail data and update memory for a workspace
   */
  async syncGmailMemory(
    workspaceId: string,
    options: {
      maxMessages?: number;
      daysBack?: number;
      forceRefresh?: boolean;
    } = {},
  ): Promise<{
    success: boolean;
    episodicCount: number;
    semanticCount: number;
    proceduralCount: number;
    totalProcessed: number;
    error?: string;
  }> {
    try {
      if (!this.gmailIntegration) {
        throw new Error('Gmail integration not initialized');
      }

      if (!this.gmailService?.isAuthenticated()) {
        throw new Error('Gmail service not authenticated');
      }

      logger.info(`Starting Gmail memory sync for workspace ${workspaceId}`);
      this.syncStatus.set(workspaceId, 'syncing');

      // Check if we should skip sync (unless forced)
      if (!options.forceRefresh) {
        const lastSync = this.getLastSyncTime(workspaceId);
        const hoursSinceLastSync = (Date.now() - lastSync) / (1000 * 60 * 60);

        if (hoursSinceLastSync < 1) {
          // Don't sync more than once per hour
          logger.info(
            `Skipping sync for workspace ${workspaceId} - last sync was ${hoursSinceLastSync.toFixed(1)} hours ago`,
          );
          this.syncStatus.set(workspaceId, 'idle');
          return {
            success: true,
            episodicCount: 0,
            semanticCount: 0,
            proceduralCount: 0,
            totalProcessed: 0,
          };
        }
      }

      // Perform the sync
      const result = await this.gmailIntegration.analyzeAndPopulateMemory(workspaceId, {
        maxMessages: options.maxMessages || 50,
        daysBack: options.daysBack || 7,
        includeThreads: true,
      });

      // Update sync timestamp
      this.setLastSyncTime(workspaceId, Date.now());
      this.syncStatus.set(workspaceId, 'idle');

      logger.info(`Gmail memory sync completed for workspace ${workspaceId}:`, result);

      return {
        success: true,
        ...result,
      };
    } catch (error) {
      logger.error(`Gmail memory sync failed for workspace ${workspaceId}:`, error);
      this.syncStatus.set(workspaceId, 'error');

      return {
        success: false,
        episodicCount: 0,
        semanticCount: 0,
        proceduralCount: 0,
        totalProcessed: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Clear specific memory type for a workspace
   */
  async clearMemoryType(workspaceId: string, memoryType: 'episodic' | 'semantic' | 'procedural'): Promise<void> {
    try {
      logger.info(`Clearing ${memoryType} memory for workspace ${workspaceId}`);
      const { memoryService } = await import('../memory/MemoryService');
      await memoryService.clearMemory(workspaceId, memoryType);
      logger.info(`Successfully cleared ${memoryType} memory for workspace ${workspaceId}`);
    } catch (error) {
      logger.error(`Failed to clear ${memoryType} memory for workspace ${workspaceId}:`, error);
      throw error;
    }
  }

  /**
   * Get Gmail authentication status
   */
  getGmailAuthStatus(): {
    isInitialized: boolean;
    isAuthenticated: boolean;
    clientId?: string;
  } {
    return {
      isInitialized: this.gmailService !== null,
      isAuthenticated: this.gmailService?.isAuthenticated() === true,
      clientId: 'configured',
    };
  }

  /**
   * Authenticate with Gmail
   */
  async authenticateGmail(): Promise<void> {
    if (!this.gmailService) {
      throw new Error('Gmail service not initialized');
    }

    try {
      await this.gmailService.authenticate();

      if (this.gmailService.isAuthenticated()) {
        this.gmailIntegration = new GmailMemoryIntegration(this.gmailService);
        logger.info('Gmail authentication successful');
      }
    } catch (error) {
      logger.error('Gmail authentication failed:', error);
      throw error;
    }
  }

  /**
   * Disconnect from Gmail
   */
  async disconnectGmail(): Promise<void> {
    if (this.gmailService) {
      try {
        await this.gmailService.disconnect();
        this.gmailService = null;
        this.gmailIntegration = null;
        logger.info('Gmail disconnected successfully');
      } catch (error) {
        logger.error('Failed to disconnect Gmail:', error);
        throw error;
      }
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  private formatTimestamp(timestamp: number): string {
    if (timestamp === 0) return 'Never';

    const now = Date.now();
    const diff = now - timestamp;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return `${Math.floor(days / 30)}mo ago`;
  }

  private getLastSyncTime(workspaceId: string): number {
    try {
      const stored = localStorage.getItem(`gmail_sync_${workspaceId}`);
      return stored ? parseInt(stored) : 0;
    } catch (error) {
      return 0;
    }
  }

  private setLastSyncTime(workspaceId: string, timestamp: number): void {
    try {
      localStorage.setItem(`gmail_sync_${workspaceId}`, timestamp.toString());
    } catch (error) {
      logger.error('Failed to save sync timestamp:', error);
    }
  }

  private async getTotalEmailsProcessed(workspaceId: string): Promise<number> {
    try {
      // This would ideally come from the memory service statistics
      // For now, we'll estimate based on episodic memories
      const { memoryService } = await import('../memory/MemoryService');
      const stats = await memoryService.getMemoryStats(workspaceId);
      return stats.episodic.totalEpisodes * 2; // Rough estimate: 2 emails per episode
    } catch (error) {
      return 0;
    }
  }
}

// Export singleton instance
export const workspaceMemoryService = WorkspaceMemoryService.getInstance();
