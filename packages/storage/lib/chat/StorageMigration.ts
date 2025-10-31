import { createStorage } from '../base/base';
import { StorageEnum } from '../base/enums';
import type { MemoryNamespace, LangGraphStore } from './LangGraphStore';
import type { ChatSession, ChatMessage } from './types';

/**
 * LangGraph checkpointing patterns for conversation time-travel and "what-if" exploration
 * Each checkpoint becomes its own runId branch for safe exploration without clobbering original data
 */

export interface Checkpoint {
  id: string;
  label: string;
  timestamp: number;
  workspaceId: string;
  sessionId: string;
  runId: string;
  metadata: CheckpointMetadata;
}

export interface CheckpointMetadata {
  messageCount: number;
  description?: string;
  tags?: string[];
  parentCheckpointId?: string;
  branchName?: string;
  compressionApplied?: boolean;
  tokenCount?: number;
}

export interface CheckpointData {
  messages: ChatMessage[];
  sessionMetadata: {
    title: string;
    createdAt: number;
    updatedAt: number;
  };
  contextData?: any;
  memoryData?: any;
}

export interface RestoreResult {
  success: boolean;
  newRunId: string;
  checkpointId: string;
  message: string;
}

export interface MigrationResult {
  success: boolean;
  migratedItems: number;
  errors: string[];
  version: string;
}

export interface StorageMigration {
  // Checkpoint management
  createCheckpoint(
    workspaceId: string,
    sessionId: string,
    label: string,
    metadata?: Partial<CheckpointMetadata>,
  ): Promise<string>;

  restoreCheckpoint(workspaceId: string, sessionId: string, checkpointId: string): Promise<RestoreResult>;

  listCheckpoints(workspaceId: string, sessionId: string): Promise<Checkpoint[]>;

  deleteCheckpoint(workspaceId: string, sessionId: string, checkpointId: string): Promise<void>;

  // Branching and forking
  forkFromCheckpoint(
    workspaceId: string,
    sessionId: string,
    checkpointId: string,
    newBranchName: string,
  ): Promise<string>;

  // Schema versioning and migration
  migrateToVersion(targetVersion: string): Promise<MigrationResult>;
  getCurrentVersion(): Promise<string>;
  rollbackToVersion(version: string): Promise<MigrationResult>;

  // Utility methods
  getCheckpointData(checkpointId: string): Promise<CheckpointData | null>;
  compareCheckpoints(checkpointId1: string, checkpointId2: string): Promise<any>;
}

/**
 * Helper function to create checkpoint storage key
 */
function createCheckpointKey(workspaceId: string, sessionId: string, checkpointId: string): string {
  return `checkpoint:${workspaceId}:${sessionId}:${checkpointId}`;
}

/**
 * Helper function to create checkpoint index key
 */
function createCheckpointIndexKey(workspaceId: string, sessionId: string): string {
  return `checkpoint_index:${workspaceId}:${sessionId}`;
}

/**
 * Helper function to create checkpoint data key
 */
function createCheckpointDataKey(checkpointId: string): string {
  return `checkpoint_data:${checkpointId}`;
}

/**
 * Helper function to create schema version key
 */
function getSchemaVersionKey(): string {
  return 'langraph:schema:version';
}

/**
 * Creates a StorageMigration instance with LangGraph checkpointing patterns
 */
export function createStorageMigration(langGraphStore: LangGraphStore): StorageMigration {
  // Storage for schema version
  const schemaVersionStorage = createStorage<string>(getSchemaVersionKey(), '1.0.0', {
    storageEnum: StorageEnum.Local,
    liveUpdate: true,
  });

  // Cache for checkpoint storages
  const checkpointStorages = new Map<string, any>();

  /**
   * Get or create storage for checkpoint index
   */
  function getCheckpointIndexStorage(workspaceId: string, sessionId: string) {
    const key = createCheckpointIndexKey(workspaceId, sessionId);

    if (!checkpointStorages.has(key)) {
      const storage = createStorage<Checkpoint[]>(key, [], {
        storageEnum: StorageEnum.Local,
        liveUpdate: true,
      });
      checkpointStorages.set(key, storage);
    }

    return checkpointStorages.get(key)!;
  }

  /**
   * Get or create storage for checkpoint data
   */
  function getCheckpointDataStorage(checkpointId: string) {
    const key = createCheckpointDataKey(checkpointId);

    if (!checkpointStorages.has(key)) {
      const storage = createStorage<CheckpointData>(
        key,
        {
          messages: [],
          sessionMetadata: {
            title: '',
            createdAt: 0,
            updatedAt: 0,
          },
        },
        {
          storageEnum: StorageEnum.Local,
          liveUpdate: true,
        },
      );
      checkpointStorages.set(key, storage);
    }

    return checkpointStorages.get(key)!;
  }

  /**
   * Capture current session state for checkpointing
   */
  async function captureSessionState(workspaceId: string, sessionId: string): Promise<CheckpointData> {
    // This would integrate with the existing ChatHistoryStore
    // For now, return a placeholder structure
    return {
      messages: [],
      sessionMetadata: {
        title: `Session ${sessionId}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      contextData: {},
      memoryData: {},
    };
  }

  return {
    async createCheckpoint(
      workspaceId: string,
      sessionId: string,
      label: string,
      metadata: Partial<CheckpointMetadata> = {},
    ): Promise<string> {
      const checkpointId = crypto.randomUUID();
      const runId = await langGraphStore.createRun({
        userId: 'default', // This would come from user context
        workspaceId,
        threadId: sessionId,
      });

      // Capture current session state
      const sessionData = await captureSessionState(workspaceId, sessionId);

      // Create checkpoint metadata
      const checkpoint: Checkpoint = {
        id: checkpointId,
        label,
        timestamp: Date.now(),
        workspaceId,
        sessionId,
        runId,
        metadata: {
          messageCount: sessionData.messages.length,
          tokenCount: sessionData.messages.reduce((sum, msg) => sum + (msg.content?.length || 0), 0),
          ...metadata,
        },
      };

      // Store checkpoint in index
      const indexStorage = getCheckpointIndexStorage(workspaceId, sessionId);
      await indexStorage.set((prev: Checkpoint[]) => [...prev, checkpoint]);

      // Store checkpoint data
      const dataStorage = getCheckpointDataStorage(checkpointId);
      await dataStorage.set(sessionData);

      return checkpointId;
    },

    async restoreCheckpoint(workspaceId: string, sessionId: string, checkpointId: string): Promise<RestoreResult> {
      try {
        // Get checkpoint data
        const dataStorage = getCheckpointDataStorage(checkpointId);
        const checkpointData = await dataStorage.get();

        if (!checkpointData || !checkpointData.messages) {
          return {
            success: false,
            newRunId: '',
            checkpointId,
            message: 'Checkpoint data not found',
          };
        }

        // Create new runId branch for restoration (key feature: don't overwrite original)
        const newRunId = await langGraphStore.createRun({
          userId: 'default',
          workspaceId,
          threadId: sessionId,
        });

        // Store restored data in new branch
        const namespace = {
          userId: 'default',
          workspaceId,
          threadId: sessionId,
          runId: newRunId,
        };

        await langGraphStore.put(namespace, 'restored_messages', checkpointData.messages);
        await langGraphStore.put(namespace, 'restored_metadata', checkpointData.sessionMetadata);

        return {
          success: true,
          newRunId,
          checkpointId,
          message: `Successfully restored checkpoint to new branch ${newRunId}`,
        };
      } catch (error) {
        return {
          success: false,
          newRunId: '',
          checkpointId,
          message: `Failed to restore checkpoint: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
      }
    },

    async listCheckpoints(workspaceId: string, sessionId: string): Promise<Checkpoint[]> {
      const indexStorage = getCheckpointIndexStorage(workspaceId, sessionId);
      const checkpoints = await indexStorage.get();

      // Sort by timestamp (newest first)
      return checkpoints.sort((a: Checkpoint, b: Checkpoint) => b.timestamp - a.timestamp);
    },

    async deleteCheckpoint(workspaceId: string, sessionId: string, checkpointId: string): Promise<void> {
      // Remove from index
      const indexStorage = getCheckpointIndexStorage(workspaceId, sessionId);
      await indexStorage.set((prev: Checkpoint[]) => prev.filter((cp: Checkpoint) => cp.id !== checkpointId));

      // Remove checkpoint data
      const dataKey = createCheckpointDataKey(checkpointId);
      checkpointStorages.delete(dataKey);
    },

    async forkFromCheckpoint(
      workspaceId: string,
      sessionId: string,
      checkpointId: string,
      newBranchName: string,
    ): Promise<string> {
      // Restore checkpoint to new branch
      const restoreResult = await this.restoreCheckpoint(workspaceId, sessionId, checkpointId);

      if (!restoreResult.success) {
        throw new Error(`Failed to fork from checkpoint: ${restoreResult.message}`);
      }

      // Create a new checkpoint for the fork with branch metadata
      const forkCheckpointId = await this.createCheckpoint(workspaceId, sessionId, `Fork: ${newBranchName}`, {
        branchName: newBranchName,
        parentCheckpointId: checkpointId,
        description: `Forked from checkpoint ${checkpointId}`,
      });

      return forkCheckpointId;
    },

    async migrateToVersion(targetVersion: string): Promise<MigrationResult> {
      const currentVersion = await this.getCurrentVersion();

      if (currentVersion === targetVersion) {
        return {
          success: true,
          migratedItems: 0,
          errors: [],
          version: targetVersion,
        };
      }

      // Placeholder migration logic
      // In a real implementation, this would contain version-specific migration steps
      try {
        await schemaVersionStorage.set(targetVersion);

        return {
          success: true,
          migratedItems: 0,
          errors: [],
          version: targetVersion,
        };
      } catch (error) {
        return {
          success: false,
          migratedItems: 0,
          errors: [error instanceof Error ? error.message : 'Unknown migration error'],
          version: currentVersion,
        };
      }
    },

    async getCurrentVersion(): Promise<string> {
      return await schemaVersionStorage.get();
    },

    async rollbackToVersion(version: string): Promise<MigrationResult> {
      // Placeholder rollback logic
      // In a real implementation, this would contain rollback steps
      return await this.migrateToVersion(version);
    },

    async getCheckpointData(checkpointId: string): Promise<CheckpointData | null> {
      try {
        const dataStorage = getCheckpointDataStorage(checkpointId);
        return await dataStorage.get();
      } catch {
        return null;
      }
    },

    async compareCheckpoints(checkpointId1: string, checkpointId2: string): Promise<any> {
      const data1 = await this.getCheckpointData(checkpointId1);
      const data2 = await this.getCheckpointData(checkpointId2);

      if (!data1 || !data2) {
        return null;
      }

      return {
        messageCountDiff: data2.messages.length - data1.messages.length,
        timeDiff: data2.sessionMetadata.updatedAt - data1.sessionMetadata.updatedAt,
        // Add more comparison logic as needed
      };
    },
  };
}

// Export factory function (removed duplicate export)
