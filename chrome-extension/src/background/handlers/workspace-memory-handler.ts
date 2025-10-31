/**
 * Background handler for workspace memory operations
 */

import { workspaceMemoryService } from '@src/services/workspace/WorkspaceMemoryService';
import { createLogger } from '@src/background/log';

const logger = createLogger('WorkspaceMemoryHandler');

// Gmail client credentials from environment
const GMAIL_CLIENT_ID = process.env.VITE_GMAIL_CLIENT_ID || '';
const GMAIL_CLIENT_SECRET = process.env.VITE_GMAIL_CLIENT_SECRET || '';

export interface WorkspaceMemoryMessage {
  type:
    | 'GET_WORKSPACE_MEMORY_STATS'
    | 'CLEAR_WORKSPACE_MEMORY'
    | 'SYNC_GMAIL_MEMORY'
    | 'AUTHENTICATE_GMAIL'
    | 'DISCONNECT_GMAIL';
  payload?: {
    workspaceId?: string;
    memoryType?: 'episodic' | 'semantic' | 'procedural';
    maxMessages?: number;
    daysBack?: number;
    forceRefresh?: boolean;
  };
}

export interface WorkspaceMemoryResponse {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Handle workspace memory related messages
 */
export async function handleWorkspaceMemoryMessage(
  message: WorkspaceMemoryMessage,
  sender: chrome.runtime.MessageSender,
): Promise<WorkspaceMemoryResponse> {
  try {
    logger.info(`Handling workspace memory message: ${message.type}`);

    // Initialize Gmail integration if not already done
    if (!workspaceMemoryService.getGmailAuthStatus().isInitialized) {
      if (GMAIL_CLIENT_ID && GMAIL_CLIENT_SECRET) {
        try {
          await workspaceMemoryService.initializeGmailIntegration(GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET);
        } catch (error) {
          logger.error('Failed to initialize Gmail integration:', error);
        }
      }
    }

    switch (message.type) {
      case 'GET_WORKSPACE_MEMORY_STATS':
        return await handleGetMemoryStats(message.payload?.workspaceId);

      case 'CLEAR_WORKSPACE_MEMORY':
        return await handleClearMemory(message.payload?.workspaceId, message.payload?.memoryType);

      case 'SYNC_GMAIL_MEMORY':
        return await handleSyncGmailMemory(message.payload);

      case 'AUTHENTICATE_GMAIL':
        return await handleAuthenticateGmail();

      case 'DISCONNECT_GMAIL':
        return await handleDisconnectGmail();

      default:
        return {
          success: false,
          error: `Unknown message type: ${message.type}`,
        };
    }
  } catch (error) {
    logger.error(`Error handling workspace memory message:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get memory statistics for a workspace
 */
async function handleGetMemoryStats(workspaceId?: string): Promise<WorkspaceMemoryResponse> {
  if (!workspaceId) {
    return {
      success: false,
      error: 'Workspace ID is required',
    };
  }

  try {
    logger.info(`Getting memory stats for workspace: ${workspaceId}`);

    // Add timeout to prevent hanging
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Memory stats request timeout')), 10000),
    );

    const statsPromise = workspaceMemoryService.getRealMemoryStats(workspaceId);
    const stats = await Promise.race([statsPromise, timeoutPromise]);

    logger.info(`Successfully got memory stats for workspace: ${workspaceId}`);
    return {
      success: true,
      data: stats,
    };
  } catch (error) {
    logger.error(`Failed to get memory stats for workspace ${workspaceId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get memory statistics',
    };
  }
}

/**
 * Clear specific memory type for a workspace
 */
async function handleClearMemory(
  workspaceId?: string,
  memoryType?: 'episodic' | 'semantic' | 'procedural',
): Promise<WorkspaceMemoryResponse> {
  if (!workspaceId) {
    return {
      success: false,
      error: 'Workspace ID is required',
    };
  }

  if (!memoryType) {
    return {
      success: false,
      error: 'Memory type is required',
    };
  }

  try {
    await workspaceMemoryService.clearMemoryType(workspaceId, memoryType);
    return {
      success: true,
      data: { message: `${memoryType} memory cleared successfully` },
    };
  } catch (error) {
    logger.error(`Failed to clear ${memoryType} memory for workspace ${workspaceId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : `Failed to clear ${memoryType} memory`,
    };
  }
}

/**
 * Sync Gmail data and update memory
 */
async function handleSyncGmailMemory(payload?: {
  workspaceId?: string;
  maxMessages?: number;
  daysBack?: number;
  forceRefresh?: boolean;
}): Promise<WorkspaceMemoryResponse> {
  if (!payload?.workspaceId) {
    return {
      success: false,
      error: 'Workspace ID is required',
    };
  }

  try {
    const result = await workspaceMemoryService.syncGmailMemory(payload.workspaceId, {
      maxMessages: payload.maxMessages,
      daysBack: payload.daysBack,
      forceRefresh: payload.forceRefresh,
    });

    return {
      success: result.success,
      data: result,
      error: result.error,
    };
  } catch (error) {
    logger.error(`Failed to sync Gmail memory for workspace ${payload.workspaceId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to sync Gmail memory',
    };
  }
}

/**
 * Authenticate with Gmail
 */
async function handleAuthenticateGmail(): Promise<WorkspaceMemoryResponse> {
  try {
    await workspaceMemoryService.authenticateGmail();

    const authStatus = workspaceMemoryService.getGmailAuthStatus();
    return {
      success: true,
      data: {
        message: 'Gmail authentication successful',
        authStatus,
      },
    };
  } catch (error) {
    logger.error('Failed to authenticate Gmail:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Gmail authentication failed',
    };
  }
}

/**
 * Disconnect from Gmail
 */
async function handleDisconnectGmail(): Promise<WorkspaceMemoryResponse> {
  try {
    await workspaceMemoryService.disconnectGmail();
    return {
      success: true,
      data: { message: 'Gmail disconnected successfully' },
    };
  } catch (error) {
    logger.error('Failed to disconnect Gmail:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to disconnect Gmail',
    };
  }
}
