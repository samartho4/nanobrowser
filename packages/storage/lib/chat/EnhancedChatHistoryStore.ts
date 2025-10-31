import { createStorage } from '../base/base';
import { StorageEnum } from '../base/enums';
import type {
  ChatSession,
  ChatMessage,
  ChatHistoryStorage,
  Message,
  ChatSessionMetadata,
  ChatAgentStepHistory,
} from './types';
import type { MemoryNamespace, LangGraphStore } from './LangGraphStore';
import type { StorageMigration } from './StorageMigration';

/**
 * Enhanced ChatHistoryStore with workspace + run awareness maintaining backward compatibility
 * Integrates with LangGraphStore for workspace isolation and runId branching
 */

export interface EnhancedChatSession extends ChatSession {
  workspaceId?: string;
  runId?: string;
  namespace?: MemoryNamespace;
}

export interface EnhancedChatMessage extends ChatMessage {
  workspaceId?: string;
  runId?: string;
  agentId?: string; // For subagent attribution
}

export interface CompressionSession {
  sessionId: string;
  workspaceId: string;
  originalMessages: ChatMessage[];
  compressedMessages: ChatMessage[];
  compressionRatio: number;
  strategy: 'minimal' | 'balanced' | 'aggressive';
  timestamp: number;
}

export interface EnhancedChatHistoryStorage extends ChatHistoryStorage {
  // Workspace-aware methods
  getWorkspaceSessions(workspaceId: string): Promise<ChatSession[]>;
  createWorkspaceSession(workspaceId: string, title: string, runId?: string): Promise<EnhancedChatSession>;

  // Run-aware methods
  getSessionRuns(sessionId: string): Promise<string[]>;
  switchToRun(sessionId: string, runId: string): Promise<EnhancedChatSession | null>;

  // Compression integration
  saveCompressedSession(compression: CompressionSession): Promise<void>;
  getCompressionHistory(sessionId: string): Promise<CompressionSession[]>;

  // Enhanced message methods with workspace context
  addWorkspaceMessage(
    workspaceId: string,
    sessionId: string,
    message: Message,
    runId?: string,
    agentId?: string,
  ): Promise<EnhancedChatMessage>;

  // Migration and compatibility
  migrateToWorkspaceAware(): Promise<void>;
  isWorkspaceAware(): Promise<boolean>;
}

// Key for storing workspace session metadata
const WORKSPACE_SESSIONS_META_KEY = 'workspace_sessions_meta';

// Key for storing compression history
const COMPRESSION_HISTORY_KEY = 'compression_history';

// Helper function to get workspace session key
const getWorkspaceSessionKey = (workspaceId: string) => `workspace_${workspaceId}_sessions`;

// Helper function to get run-specific session key
const getRunSessionKey = (sessionId: string, runId: string) => `session_${sessionId}_run_${runId}`;

// Helper function to get compression history key
const getCompressionHistoryKey = (sessionId: string) => `compression_${sessionId}`;

/**
 * Creates an enhanced chat history storage instance with workspace and run awareness
 */
export function createEnhancedChatHistoryStorage(
  langGraphStore: LangGraphStore,
  storageMigration: StorageMigration,
): EnhancedChatHistoryStorage {
  // Storage for workspace session metadata
  const workspaceSessionsStorage = createStorage<Record<string, ChatSessionMetadata[]>>(
    WORKSPACE_SESSIONS_META_KEY,
    {},
    {
      storageEnum: StorageEnum.Local,
      liveUpdate: true,
    },
  );

  // Storage for compression history
  const compressionHistoryStorage = createStorage<CompressionSession[]>(COMPRESSION_HISTORY_KEY, [], {
    storageEnum: StorageEnum.Local,
    liveUpdate: true,
  });

  // Cache for workspace-specific storages
  const workspaceStorages = new Map<string, any>();

  /**
   * Get or create storage for workspace sessions
   */
  function getWorkspaceStorage(workspaceId: string) {
    const key = getWorkspaceSessionKey(workspaceId);

    if (!workspaceStorages.has(key)) {
      const storage = createStorage<ChatSessionMetadata[]>(key, [], {
        storageEnum: StorageEnum.Local,
        liveUpdate: true,
      });
      workspaceStorages.set(key, storage);
    }

    return workspaceStorages.get(key)!;
  }

  /**
   * Get or create storage for run-specific messages
   */
  function getRunMessagesStorage(sessionId: string, runId: string) {
    const key = getRunSessionKey(sessionId, runId);

    if (!workspaceStorages.has(key)) {
      const storage = createStorage<EnhancedChatMessage[]>(key, [], {
        storageEnum: StorageEnum.Local,
        liveUpdate: true,
      });
      workspaceStorages.set(key, storage);
    }

    return workspaceStorages.get(key)!;
  }

  // Import original ChatHistoryStorage methods
  const originalStorage = createOriginalChatHistoryStorage();

  return {
    // Original methods (backward compatibility)
    getAllSessions: originalStorage.getAllSessions,
    clearAllSessions: originalStorage.clearAllSessions,
    getSessionsMetadata: originalStorage.getSessionsMetadata,
    getSession: originalStorage.getSession,
    createSession: originalStorage.createSession,
    updateTitle: originalStorage.updateTitle,
    deleteSession: originalStorage.deleteSession,
    addMessage: originalStorage.addMessage,
    deleteMessage: originalStorage.deleteMessage,
    storeAgentStepHistory: originalStorage.storeAgentStepHistory,
    loadAgentStepHistory: originalStorage.loadAgentStepHistory,

    // Enhanced workspace-aware methods
    async getWorkspaceSessions(workspaceId: string): Promise<ChatSession[]> {
      const workspaceStorage = getWorkspaceStorage(workspaceId);
      const sessionsMeta = await workspaceStorage.get();

      return sessionsMeta.map((meta: ChatSessionMetadata) => ({
        ...meta,
        messages: [], // Empty for listing performance
      }));
    },

    async createWorkspaceSession(workspaceId: string, title: string, runId?: string): Promise<EnhancedChatSession> {
      const sessionId = crypto.randomUUID();
      const currentRunId =
        runId ||
        (await langGraphStore.createRun({
          userId: 'default', // This would come from user context
          workspaceId,
          threadId: sessionId,
        }));

      const currentTime = Date.now();
      const sessionMeta: ChatSessionMetadata = {
        id: sessionId,
        title,
        createdAt: currentTime,
        updatedAt: currentTime,
        messageCount: 0,
      };

      // Store in workspace-specific storage
      const workspaceStorage = getWorkspaceStorage(workspaceId);
      await workspaceStorage.set((prev: ChatSessionMetadata[]) => [...prev, sessionMeta]);

      // Create empty messages storage for this run
      const runMessagesStorage = getRunMessagesStorage(sessionId, currentRunId);
      await runMessagesStorage.set([]);

      // Store in LangGraph Store for namespace isolation
      const namespace: MemoryNamespace = {
        userId: 'default',
        workspaceId,
        threadId: sessionId,
        runId: currentRunId,
      };

      await langGraphStore.put(namespace, 'session_metadata', sessionMeta);

      return {
        ...sessionMeta,
        messages: [],
        workspaceId,
        runId: currentRunId,
        namespace,
      };
    },

    async getSessionRuns(sessionId: string): Promise<string[]> {
      // This would require indexing runs in the LangGraphStore
      // For now, return placeholder
      return [];
    },

    async switchToRun(sessionId: string, runId: string): Promise<EnhancedChatSession | null> {
      try {
        const runMessagesStorage = getRunMessagesStorage(sessionId, runId);
        const messages = await runMessagesStorage.get();

        // Get session metadata (this would need to be stored per run)
        const sessionMeta: ChatSessionMetadata = {
          id: sessionId,
          title: `Session ${sessionId} - Run ${runId}`,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          messageCount: messages.length,
        };

        return {
          ...sessionMeta,
          messages,
          runId,
        };
      } catch {
        return null;
      }
    },

    async saveCompressedSession(compression: CompressionSession): Promise<void> {
      await compressionHistoryStorage.set(prev => [...prev, compression]);

      // Also store in LangGraph Store for workspace isolation
      const namespace: MemoryNamespace = {
        userId: 'default',
        workspaceId: compression.workspaceId,
        threadId: compression.sessionId,
      };

      await langGraphStore.put(namespace, `compression_${compression.timestamp}`, compression);
    },

    async getCompressionHistory(sessionId: string): Promise<CompressionSession[]> {
      const history = await compressionHistoryStorage.get();
      return history.filter(comp => comp.sessionId === sessionId);
    },

    async addWorkspaceMessage(
      workspaceId: string,
      sessionId: string,
      message: Message,
      runId?: string,
      agentId?: string,
    ): Promise<EnhancedChatMessage> {
      const currentRunId = runId || 'default';

      const enhancedMessage: EnhancedChatMessage = {
        ...message,
        id: crypto.randomUUID(),
        workspaceId,
        runId: currentRunId,
        agentId,
      };

      // Store in run-specific storage
      const runMessagesStorage = getRunMessagesStorage(sessionId, currentRunId);
      await runMessagesStorage.set((prev: EnhancedChatMessage[]) => [...prev, enhancedMessage]);

      // Store in LangGraph Store for namespace isolation
      const namespace: MemoryNamespace = {
        userId: 'default',
        workspaceId,
        threadId: sessionId,
        runId: currentRunId,
      };

      await langGraphStore.put(namespace, `message_${enhancedMessage.id}`, enhancedMessage);

      // Update workspace session metadata
      const workspaceStorage = getWorkspaceStorage(workspaceId);
      await workspaceStorage.set((prev: ChatSessionMetadata[]) =>
        prev.map((session: ChatSessionMetadata) =>
          session.id === sessionId
            ? { ...session, updatedAt: Date.now(), messageCount: session.messageCount + 1 }
            : session,
        ),
      );

      return enhancedMessage;
    },

    async migrateToWorkspaceAware(): Promise<void> {
      // Migration logic to convert existing sessions to workspace-aware format
      const existingSessions = await originalStorage.getAllSessions();

      for (const session of existingSessions) {
        // Create default workspace for existing sessions
        const defaultWorkspaceId = 'default';

        // Migrate to workspace storage
        const workspaceStorage = getWorkspaceStorage(defaultWorkspaceId);
        await workspaceStorage.set((prev: ChatSessionMetadata[]) => {
          const exists = prev.some((s: ChatSessionMetadata) => s.id === session.id);
          if (!exists) {
            return [
              ...prev,
              {
                id: session.id,
                title: session.title,
                createdAt: session.createdAt,
                updatedAt: session.updatedAt,
                messageCount: session.messageCount,
              },
            ];
          }
          return prev;
        });
      }
    },

    async isWorkspaceAware(): Promise<boolean> {
      const workspaceSessions = await workspaceSessionsStorage.get();
      return Object.keys(workspaceSessions).length > 0;
    },
  };
}

/**
 * Helper function to create original ChatHistoryStorage for backward compatibility
 */
function createOriginalChatHistoryStorage(): ChatHistoryStorage {
  // Key for storing chat session metadata
  const CHAT_SESSIONS_META_KEY = 'chat_sessions_meta';

  // Create storage for session metadata
  const chatSessionsMetaStorage = createStorage<ChatSessionMetadata[]>(CHAT_SESSIONS_META_KEY, [], {
    storageEnum: StorageEnum.Local,
    liveUpdate: true,
  });

  // Helper function to get storage key for a specific session's messages
  const getSessionMessagesKey = (sessionId: string) => `chat_messages_${sessionId}`;

  // Helper function to create storage for a specific session's messages
  const getSessionMessagesStorage = (sessionId: string) => {
    return createStorage<ChatMessage[]>(getSessionMessagesKey(sessionId), [], {
      storageEnum: StorageEnum.Local,
      liveUpdate: true,
    });
  };

  // Helper function to get storage key for a specific session's agent state history
  const getSessionAgentStepHistoryKey = (sessionId: string) => `chat_agent_step_${sessionId}`;

  // Helper function to get storage for a specific session's agent state history
  const getSessionAgentStepHistoryStorage = (sessionId: string) => {
    return createStorage<ChatAgentStepHistory>(
      getSessionAgentStepHistoryKey(sessionId),
      {
        task: '',
        history: '',
        timestamp: 0,
      },
      {
        storageEnum: StorageEnum.Local,
        liveUpdate: true,
      },
    );
  };

  // Helper function to get current timestamp in milliseconds
  const getCurrentTimestamp = (): number => Date.now();

  return {
    getAllSessions: async (): Promise<ChatSession[]> => {
      const sessionsMeta = await chatSessionsMetaStorage.get();

      return sessionsMeta.map(meta => ({
        ...meta,
        messages: [],
      }));
    },

    clearAllSessions: async (): Promise<void> => {
      const sessionsMeta = await chatSessionsMetaStorage.get();
      for (const sessionMeta of sessionsMeta) {
        const messagesStorage = getSessionMessagesStorage(sessionMeta.id);
        await messagesStorage.set([]);
      }
      await chatSessionsMetaStorage.set([]);
    },

    getSessionsMetadata: async (): Promise<ChatSessionMetadata[]> => {
      return await chatSessionsMetaStorage.get();
    },

    getSession: async (sessionId: string): Promise<ChatSession | null> => {
      const sessionsMeta = await chatSessionsMetaStorage.get();
      const sessionMeta = sessionsMeta.find(session => session.id === sessionId);

      if (!sessionMeta) return null;

      const messagesStorage = getSessionMessagesStorage(sessionId);
      const messages = await messagesStorage.get();

      return {
        ...sessionMeta,
        messages,
      };
    },

    createSession: async (title: string): Promise<ChatSession> => {
      const newSessionId = crypto.randomUUID();
      const currentTime = getCurrentTimestamp();
      const newSessionMeta: ChatSessionMetadata = {
        id: newSessionId,
        title,
        createdAt: currentTime,
        updatedAt: currentTime,
        messageCount: 0,
      };

      const messagesStorage = getSessionMessagesStorage(newSessionId);
      await messagesStorage.set([]);

      await chatSessionsMetaStorage.set(prevSessions => [...prevSessions, newSessionMeta]);

      return {
        ...newSessionMeta,
        messages: [],
      };
    },

    updateTitle: async (sessionId: string, title: string): Promise<ChatSessionMetadata> => {
      let updatedSessionMeta: ChatSessionMetadata | undefined;

      await chatSessionsMetaStorage.set(prevSessions => {
        return prevSessions.map(session => {
          if (session.id === sessionId) {
            const updated = {
              ...session,
              title,
              updatedAt: getCurrentTimestamp(),
            };
            updatedSessionMeta = updated;
            return updated;
          }
          return session;
        });
      });

      if (!updatedSessionMeta) {
        throw new Error('Session not found');
      }

      return updatedSessionMeta;
    },

    deleteSession: async (sessionId: string): Promise<void> => {
      await chatSessionsMetaStorage.set(prevSessions => prevSessions.filter(session => session.id !== sessionId));

      const messagesStorage = getSessionMessagesStorage(sessionId);
      await messagesStorage.set([]);
    },

    addMessage: async (sessionId: string, message: Message): Promise<ChatMessage> => {
      const newMessage: ChatMessage = {
        ...message,
        id: crypto.randomUUID(),
      };

      let sessionFound = false;

      await chatSessionsMetaStorage.set(prevSessions => {
        return prevSessions.map(session => {
          if (session.id === sessionId) {
            sessionFound = true;
            return {
              ...session,
              updatedAt: getCurrentTimestamp(),
              messageCount: session.messageCount + 1,
            };
          }
          return session;
        });
      });

      if (!sessionFound) {
        throw new Error(`Session with ID ${sessionId} not found`);
      }

      const messagesStorage = getSessionMessagesStorage(sessionId);
      await messagesStorage.set(prevMessages => [...prevMessages, newMessage]);

      return newMessage;
    },

    deleteMessage: async (sessionId: string, messageId: string): Promise<void> => {
      const messagesStorage = getSessionMessagesStorage(sessionId);

      const currentMessages = await messagesStorage.get();
      const messageToDelete = currentMessages.find(msg => msg.id === messageId);

      if (!messageToDelete) return;

      await messagesStorage.set(prevMessages => prevMessages.filter(msg => msg.id !== messageId));

      await chatSessionsMetaStorage.set(prevSessions => {
        return prevSessions.map(session => {
          if (session.id === sessionId) {
            return {
              ...session,
              updatedAt: getCurrentTimestamp(),
              messageCount: Math.max(0, session.messageCount - 1),
            };
          }
          return session;
        });
      });
    },

    storeAgentStepHistory: async (sessionId: string, task: string, history: string): Promise<void> => {
      const sessionsMeta = await chatSessionsMetaStorage.get();
      const sessionMeta = sessionsMeta.find(session => session.id === sessionId);
      if (!sessionMeta) {
        throw new Error(`Session with ID ${sessionId} not found`);
      }

      const agentStepHistoryStorage = getSessionAgentStepHistoryStorage(sessionId);
      await agentStepHistoryStorage.set({
        task,
        history,
        timestamp: getCurrentTimestamp(),
      });
    },

    loadAgentStepHistory: async (sessionId: string): Promise<ChatAgentStepHistory | null> => {
      const agentStepHistoryStorage = getSessionAgentStepHistoryStorage(sessionId);
      const history = await agentStepHistoryStorage.get();
      if (!history || !history.task || !history.timestamp || history.history === '' || history.history === '[]')
        return null;
      return history;
    },
  };
}

// Export factory function (removed duplicate export)
