/**
 * StorageMigration service for Options page
 * Communicates with Chrome Extension for checkpoint operations
 */

import { chromeExtensionBridge } from './ChromeExtensionBridge';

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

export interface RestoreResult {
  success: boolean;
  newRunId: string;
  checkpointId: string;
  message: string;
}

export interface StorageMigration {
  createCheckpoint(
    workspaceId: string,
    sessionId: string,
    label: string,
    metadata?: Partial<CheckpointMetadata>,
  ): Promise<string>;

  restoreCheckpoint(workspaceId: string, sessionId: string, checkpointId: string): Promise<RestoreResult>;
}

export function createStorageMigration(): StorageMigration {
  return {
    async createCheckpoint(
      workspaceId: string,
      sessionId: string,
      label: string,
      metadata: Partial<CheckpointMetadata> = {},
    ): Promise<string> {
      try {
        return await chromeExtensionBridge.createCheckpoint(workspaceId, sessionId, label, metadata);
      } catch (error) {
        console.error('Failed to create checkpoint via extension:', error);
        // Return a mock checkpoint ID as fallback
        return `checkpoint-${Date.now()}`;
      }
    },

    async restoreCheckpoint(workspaceId: string, sessionId: string, checkpointId: string): Promise<RestoreResult> {
      try {
        return await chromeExtensionBridge.restoreCheckpoint(workspaceId, sessionId, checkpointId);
      } catch (error) {
        console.error('Failed to restore checkpoint via extension:', error);
        return {
          success: false,
          newRunId: '',
          checkpointId,
          message: `Failed to restore checkpoint: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
      }
    },
  };
}
