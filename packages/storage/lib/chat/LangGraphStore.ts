import { createStorage } from '../base/base';
import { StorageEnum } from '../base/enums';
import type { BaseStorage } from '../base/types';

/**
 * LangGraph Store-inspired backend with workspace namespacing and runId branching
 * Implements namespace pattern: userId/workspaceId/threadId/runId
 */

export interface MemoryNamespace {
  userId: string;
  workspaceId: string;
  threadId?: string;
  runId?: string;
}

export interface WorkspaceConfig {
  name: string;
  description: string;
  autonomyLevel: 1 | 2 | 3 | 4 | 5;
  approvalPolicies: {
    gmail: boolean;
    calendar: boolean;
    slack: boolean;
    [tool: string]: boolean;
  };
  color: string;
  createdAt: number;
  updatedAt: number;
  trustScore?: number; // Optional trust score for autonomy adjustments
}

export interface StoredItem {
  key: string;
  value: any;
  namespace: MemoryNamespace;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface SearchQuery {
  namespace?: Partial<MemoryNamespace>;
  keyPattern?: string;
  valuePattern?: string;
  timestampRange?: {
    start?: number;
    end?: number;
  };
  metadata?: Record<string, any>;
}

export interface LangGraphStore {
  // Core Store API (inspired by LangGraph Store)
  put(namespace: MemoryNamespace, key: string, value: any, metadata?: Record<string, any>): Promise<void>;
  get(namespace: MemoryNamespace, key: string): Promise<any>;
  search(query: SearchQuery): Promise<StoredItem[]>;
  delete(namespace: MemoryNamespace, key: string): Promise<void>;

  // Workspace management
  createNamespace(workspaceId: string, config: WorkspaceConfig): Promise<void>;
  cleanupNamespace(workspaceId: string): Promise<void>;
  getWorkspaceConfig(workspaceId: string): Promise<WorkspaceConfig | null>;
  updateWorkspaceConfig(workspaceId: string, config: Partial<WorkspaceConfig>): Promise<void>;
  listWorkspaces(): Promise<string[]>;

  // RunId branching support
  createRun(namespace: MemoryNamespace): Promise<string>;
  listRuns(namespace: Omit<MemoryNamespace, 'runId'>): Promise<string[]>;

  // Utility methods
  exists(namespace: MemoryNamespace, key: string): Promise<boolean>;
  clear(namespace: Partial<MemoryNamespace>): Promise<void>;
}

/**
 * Helper function to create a storage key from namespace and key
 */
function createStorageKey(namespace: MemoryNamespace, key: string): string {
  const parts = [
    'langraph',
    namespace.userId,
    namespace.workspaceId,
    namespace.threadId || 'default',
    namespace.runId || 'default',
    key,
  ];
  return parts.join(':');
}

/**
 * Helper function to create workspace config storage key
 */
function createWorkspaceConfigKey(workspaceId: string): string {
  return `langraph:workspace:${workspaceId}:config`;
}

/**
 * Helper function to create workspace index key
 */
function getWorkspaceIndexKey(): string {
  return 'langraph:workspaces:index';
}

/**
 * Helper function to parse storage key back to namespace and key
 */
function parseStorageKey(storageKey: string): { namespace: MemoryNamespace; key: string } | null {
  const parts = storageKey.split(':');
  if (parts.length < 6 || parts[0] !== 'langraph') {
    return null;
  }

  return {
    namespace: {
      userId: parts[1],
      workspaceId: parts[2],
      threadId: parts[3] === 'default' ? undefined : parts[3],
      runId: parts[4] === 'default' ? undefined : parts[4],
    },
    key: parts.slice(5).join(':'),
  };
}

/**
 * Creates a LangGraph Store instance with workspace isolation and runId branching
 */
export function createLangGraphStore(): LangGraphStore {
  // Storage for workspace index
  const workspaceIndexStorage = createStorage<string[]>(getWorkspaceIndexKey(), [], {
    storageEnum: StorageEnum.Local,
    liveUpdate: true,
  });

  // Cache for workspace config storages
  const workspaceConfigStorages = new Map<string, BaseStorage<WorkspaceConfig>>();

  // Cache for item storages
  const itemStorages = new Map<string, BaseStorage<StoredItem>>();

  /**
   * Get or create storage for a workspace config
   */
  function getWorkspaceConfigStorage(workspaceId: string): BaseStorage<WorkspaceConfig> {
    const key = createWorkspaceConfigKey(workspaceId);

    if (!workspaceConfigStorages.has(key)) {
      const storage = createStorage<WorkspaceConfig>(
        key,
        {
          name: '',
          description: '',
          autonomyLevel: 3,
          approvalPolicies: {
            gmail: false,
            calendar: false,
            slack: false,
          },
          color: '#3B82F6',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          storageEnum: StorageEnum.Local,
          liveUpdate: true,
        },
      );

      workspaceConfigStorages.set(key, storage);
    }

    return workspaceConfigStorages.get(key)!;
  }

  /**
   * Get or create storage for an item
   */
  function getItemStorage(storageKey: string): BaseStorage<StoredItem> {
    if (!itemStorages.has(storageKey)) {
      const storage = createStorage<StoredItem>(
        storageKey,
        {
          key: '',
          value: null,
          namespace: { userId: '', workspaceId: '' },
          timestamp: 0,
        },
        {
          storageEnum: StorageEnum.Local,
          liveUpdate: true,
        },
      );

      itemStorages.set(storageKey, storage);
    }

    return itemStorages.get(storageKey)!;
  }

  return {
    async put(namespace: MemoryNamespace, key: string, value: any, metadata?: Record<string, any>): Promise<void> {
      const storageKey = createStorageKey(namespace, key);
      const itemStorage = getItemStorage(storageKey);

      const item: StoredItem = {
        key,
        value,
        namespace,
        timestamp: Date.now(),
        metadata,
      };

      await itemStorage.set(item);
    },

    async get(namespace: MemoryNamespace, key: string): Promise<any> {
      const storageKey = createStorageKey(namespace, key);
      const itemStorage = getItemStorage(storageKey);

      try {
        const item = await itemStorage.get();
        return item.value;
      } catch {
        return null;
      }
    },

    async search(query: SearchQuery): Promise<StoredItem[]> {
      // This is a simplified search implementation
      // In a production system, you'd want more sophisticated indexing
      const results: StoredItem[] = [];

      try {
        // Get all cached storage instances and search through them
        for (const [storageKey, storage] of itemStorages.entries()) {
          try {
            const item = await storage.get();
            if (item && item.value && item.namespace) {
              // Check if item matches query criteria
              let matches = true;

              if (query.namespace) {
                if (query.namespace.workspaceId && item.namespace.workspaceId !== query.namespace.workspaceId) {
                  matches = false;
                }
                if (query.namespace.userId && item.namespace.userId !== query.namespace.userId) {
                  matches = false;
                }
                if (query.namespace.threadId && item.namespace.threadId !== query.namespace.threadId) {
                  matches = false;
                }
              }

              if (query.keyPattern && !item.key.includes(query.keyPattern)) {
                matches = false;
              }

              if (query.timestampRange) {
                if (query.timestampRange.start && item.timestamp < query.timestampRange.start) {
                  matches = false;
                }
                if (query.timestampRange.end && item.timestamp > query.timestampRange.end) {
                  matches = false;
                }
              }

              if (matches) {
                results.push(item);
              }
            }
          } catch (error) {
            // Skip items that can't be read
          }
        }

        // Also try to search through workspace-specific storage
        if (query.namespace?.workspaceId) {
          const workspaceId = query.namespace.workspaceId;
          const contextTypes = ['episodic', 'semantic', 'procedural'];

          for (const type of contextTypes) {
            try {
              // Try to get items with common patterns
              const patterns = [`${type}_`, `context:${type}:`];

              for (const pattern of patterns) {
                // Try recent timestamps
                const now = Date.now();
                for (let i = 0; i < 50; i++) {
                  const timestamp = now - i * 60000; // Go back in 1-minute intervals
                  const testKeys = [`${pattern}${timestamp}`, `${pattern}${timestamp}_test`, `${pattern}item_${i}`];

                  for (const testKey of testKeys) {
                    try {
                      const namespace = { userId: 'default', workspaceId };
                      const storageKey = createStorageKey(namespace, testKey);

                      if (itemStorages.has(storageKey)) {
                        const storage = itemStorages.get(storageKey)!;
                        const item = await storage.get();
                        if (item && item.value) {
                          results.push({
                            key: testKey,
                            value: item.value,
                            namespace,
                            timestamp: item.timestamp || Date.now(),
                            metadata: item.metadata,
                          });
                        }
                      }
                    } catch {
                      // Continue searching
                    }
                  }
                }
              }
            } catch {
              // Continue with next type
            }
          }
        }
      } catch (error) {
        console.error('Search error:', error);
      }

      return results;
    },

    async delete(namespace: MemoryNamespace, key: string): Promise<void> {
      const storageKey = createStorageKey(namespace, key);
      const itemStorage = getItemStorage(storageKey);

      await itemStorage.set({
        key: '',
        value: null,
        namespace: { userId: '', workspaceId: '' },
        timestamp: 0,
      });

      // Remove from cache
      itemStorages.delete(storageKey);
    },

    async createNamespace(workspaceId: string, config: WorkspaceConfig): Promise<void> {
      // Add workspace to index
      await workspaceIndexStorage.set(prev => {
        if (!prev.includes(workspaceId)) {
          return [...prev, workspaceId];
        }
        return prev;
      });

      // Store workspace config
      const configStorage = getWorkspaceConfigStorage(workspaceId);
      await configStorage.set({
        ...config,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    },

    async cleanupNamespace(workspaceId: string): Promise<void> {
      // Remove workspace from index
      await workspaceIndexStorage.set(prev => prev.filter(id => id !== workspaceId));

      // Remove workspace config
      const configKey = createWorkspaceConfigKey(workspaceId);
      workspaceConfigStorages.delete(configKey);

      // Note: In a production system, you'd also want to clean up all items
      // in this workspace namespace, but that requires more sophisticated indexing
    },

    async getWorkspaceConfig(workspaceId: string): Promise<WorkspaceConfig | null> {
      try {
        const configStorage = getWorkspaceConfigStorage(workspaceId);
        return await configStorage.get();
      } catch {
        return null;
      }
    },

    async updateWorkspaceConfig(workspaceId: string, config: Partial<WorkspaceConfig>): Promise<void> {
      const configStorage = getWorkspaceConfigStorage(workspaceId);
      await configStorage.set(prev => ({
        ...prev,
        ...config,
        updatedAt: Date.now(),
      }));
    },

    async listWorkspaces(): Promise<string[]> {
      return await workspaceIndexStorage.get();
    },

    async createRun(namespace: MemoryNamespace): Promise<string> {
      const runId = crypto.randomUUID();
      return runId;
    },

    async listRuns(namespace: Omit<MemoryNamespace, 'runId'>): Promise<string[]> {
      // This would require indexing runs in a production system
      // For now, return empty array as placeholder
      return [];
    },

    async exists(namespace: MemoryNamespace, key: string): Promise<boolean> {
      const value = await this.get(namespace, key);
      return value !== null && value !== undefined;
    },

    async clear(namespace: Partial<MemoryNamespace>): Promise<void> {
      // This would require iterating through all matching keys
      // For now, this is a placeholder implementation
    },
  };
}

// Export the store instance for direct use
export const langGraphStore = createLangGraphStore();
