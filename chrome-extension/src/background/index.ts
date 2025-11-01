import 'webextension-polyfill';
import { firewallStore, generalSettingsStore, llmProviderStore, analyticsSettingsStore } from '@extension/storage';
import { t } from '@extension/i18n';
import BrowserContext from './browser/context';
import { Executor } from './agent/executor';
import { createLogger } from './log';
import { ExecutionState } from './agent/event/types';
import { DEFAULT_AGENT_OPTIONS } from './agent/types';
import { SpeechToTextService } from './services/speechToText';
import { injectBuildDomTreeScripts } from './browser/dom/service';
import { analytics } from './services/analytics';
import { HybridAIClient } from './llm/HybridAIClient';
import { handleDOMCaptureMessage } from './handlers/dom-capture-handler';
import { handleTestMultimodal } from './handlers/multimodal-test-handler';
import { handleGmailMessage, cleanupGmailService } from './toolHandlers/gmailHandler';
// import { handleWorkspaceMemoryMessage } from './handlers/workspace-memory-handler'; // Replaced with isolated Gmail handler

const logger = createLogger('background');

const browserContext = new BrowserContext({});
let currentExecutor: Executor | null = null;
let currentPort: chrome.runtime.Port | null = null;
let hybridAIClient: HybridAIClient | null = null;

// Setup side panel behavior
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(error => console.error(error));

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (tabId && changeInfo.status === 'complete' && tab.url?.startsWith('http')) {
    await injectBuildDomTreeScripts(tabId);
  }
});

// Listen for debugger detached event
// if canceled_by_user, remove the tab from the browser context
chrome.debugger.onDetach.addListener(async (source, reason) => {
  console.log('Debugger detached:', source, reason);
  if (reason === 'canceled_by_user') {
    if (source.tabId) {
      currentExecutor?.cancel();
      await browserContext.cleanup();
    }
  }
});

// Cleanup when tab is closed
chrome.tabs.onRemoved.addListener(tabId => {
  browserContext.removeAttachedPage(tabId);
});

logger.info('background loaded');

// Initialize HybridAIClient
(async () => {
  try {
    hybridAIClient = new HybridAIClient();
    await hybridAIClient.initialize();
    const status = hybridAIClient.getStatus();
    logger.info('HybridAIClient initialized:', status);
  } catch (error) {
    logger.error('Failed to initialize HybridAIClient:', error);
    // Continue without HybridAIClient - will be created on-demand if needed
  }
})();

// Initialize analytics
analytics.init().catch(error => {
  logger.error('Failed to initialize analytics:', error);
});

// Listen for analytics settings changes
analyticsSettingsStore.subscribe(() => {
  analytics.updateSettings().catch(error => {
    logger.error('Failed to update analytics settings:', error);
  });
});

// Helper function to get target reduction based on strategy
const getTargetReduction = (strategy: string): number => {
  const reductions = {
    aggressive: 70,
    balanced: 50,
    conservative: 30,
    semantic: 60,
  };
  return reductions[strategy as keyof typeof reductions] || 50;
};

// Listen for simple messages (e.g., from options page, side panel)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle get_ai_status message
  if (message.type === 'get_ai_status') {
    if (hybridAIClient) {
      const status = hybridAIClient.getStatus();
      sendResponse({ status });
    } else {
      sendResponse({ status: null });
    }
    return true; // Indicates async response
  }

  // Handle get_provider_preference message
  if (message.type === 'get_provider_preference') {
    if (hybridAIClient) {
      const preference = hybridAIClient.getProviderPreference();
      sendResponse({ preference });
    } else {
      sendResponse({ preference: { userPreference: 'cloud', nanoAvailable: false } });
    }
    return true; // Indicates async response
  }

  // Handle set_provider_preference message
  if (message.type === 'set_provider_preference') {
    (async () => {
      try {
        if (hybridAIClient) {
          await hybridAIClient.setUserPreference(message.payload?.userPreference || 'cloud');
          const preference = hybridAIClient.getProviderPreference();
          sendResponse({ ok: true, preference });
        } else {
          sendResponse({ ok: false, error: 'HybridAIClient not initialized' });
        }
      } catch (error) {
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : 'Failed to set provider preference',
        });
      }
    })();
    return true; // Indicates async response
  }

  // Handle DOM capture requests
  if (message.type === 'CAPTURE_CURRENT_PAGE') {
    handleDOMCaptureMessage(message, sender, sendResponse);
    return true; // Indicates async response
  }

  // Handle multimodal test requests
  if (message.type === 'TEST_MULTIMODAL') {
    (async () => {
      try {
        const response = await handleTestMultimodal(message.payload, hybridAIClient);
        sendResponse(response);
      } catch (error) {
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    })();
    return true; // Indicates async response
  }

  // Handle Gmail tool requests
  if (message.type === 'TOOL_REQUEST' && message.tool === 'gmail') {
    handleGmailMessage(message, sender, sendResponse);
    return true; // Indicates async response
  }

  // Handle Gmail context fetch from @gmail mention
  if (message.type === 'GMAIL_FETCH_CONTEXT') {
    (async () => {
      try {
        const { workspaceId, maxMessages, daysBack } = message.payload;
        logger.info(`Fetching Gmail context for workspace: ${workspaceId}`);

        // Import GmailService and GmailMemoryIntegration
        const { GmailService } = await import('@src/services/gmail/GmailService');
        const { GmailMemoryIntegration } = await import('@src/services/gmail/GmailMemoryIntegration');

        // Get Gmail credentials from environment
        const GMAIL_CLIENT_ID = process.env.VITE_GMAIL_CLIENT_ID || '';
        const GMAIL_CLIENT_SECRET = process.env.VITE_GMAIL_CLIENT_SECRET || '';

        if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET) {
          sendResponse({
            success: false,
            error: 'Gmail credentials not configured. Please set up Gmail in Tools settings.',
          });
          return;
        }

        // Initialize Gmail service
        const gmailService = new GmailService(GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET);
        await gmailService.initialize();

        if (!gmailService.isAuthenticated()) {
          sendResponse({
            success: false,
            error: 'Gmail not authenticated. Please authenticate in Tools settings.',
          });
          return;
        }

        // Create Gmail memory integration and analyze
        const gmailMemory = new GmailMemoryIntegration(gmailService);
        const result = await gmailMemory.analyzeAndPopulateMemory(workspaceId, {
          maxMessages: maxMessages || 20,
          daysBack: daysBack || 7,
          includeThreads: true,
        });

        logger.info(`Gmail context fetch completed:`, result);

        sendResponse({
          success: true,
          result,
        });
      } catch (error) {
        logger.error('Failed to fetch Gmail context:', error);
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    })();
    return true; // Indicates async response
  }

  // Handle workspace memory requests using task queue to prevent timeouts
  if (
    [
      'GET_WORKSPACE_MEMORY_STATS',
      'CLEAR_WORKSPACE_MEMORY',
      'SYNC_GMAIL_MEMORY',
      'AUTHENTICATE_GMAIL',
      'DISCONNECT_GMAIL',
      'GET_EMAILS_BY_MEMORY_TYPE',
    ].includes(message.type)
  ) {
    (async () => {
      try {
        const { gmailTaskQueue } = await import('./services/gmail-task-queue');
        logger.info(`Handling workspace memory message: ${message.type}`);

        const workspaceId = message.payload?.workspaceId || 'default';

        if (message.type === 'GET_WORKSPACE_MEMORY_STATS') {
          const taskId = gmailTaskQueue.addTask('GET_STATS', workspaceId);
          sendResponse({
            success: true,
            taskId,
            message: 'Memory stats task queued - use GET_TASK_STATUS to check progress',
          });
        } else if (message.type === 'SYNC_GMAIL_MEMORY') {
          const taskId = gmailTaskQueue.addTask('SYNC_MEMORY', workspaceId, {
            maxMessages: message.payload?.maxMessages || 50,
            daysBack: message.payload?.daysBack || 7,
            forceRefresh: message.payload?.forceRefresh || false,
          });
          sendResponse({
            success: true,
            taskId,
            message: 'Gmail sync task queued - use GET_TASK_STATUS to check progress',
          });
        } else if (message.type === 'AUTHENTICATE_GMAIL') {
          const taskId = gmailTaskQueue.addTask('AUTHENTICATE', workspaceId);
          sendResponse({
            success: true,
            taskId,
            message: 'Authentication task queued - use GET_TASK_STATUS to check progress',
          });
        } else if (message.type === 'CLEAR_WORKSPACE_MEMORY') {
          // This is a quick operation, handle immediately
          const { clearWorkspaceMemory } = await import('./services/gmail-memory-handler');
          const memoryType = message.payload?.memoryType;
          const result = await clearWorkspaceMemory(workspaceId, memoryType);
          sendResponse({
            success: result.success,
            data: result,
            error: result.error,
          });
        } else if (message.type === 'GET_EMAILS_BY_MEMORY_TYPE') {
          const taskId = gmailTaskQueue.addTask('GET_EMAILS', workspaceId, {
            memoryType: message.payload?.memoryType,
          });
          sendResponse({
            success: true,
            taskId,
            message: 'Email fetch task queued - use GET_TASK_STATUS to check progress',
          });
        } else {
          sendResponse({
            success: true,
            data: { message: `${message.type} completed successfully` },
          });
        }
      } catch (error) {
        logger.error('Error in workspace memory handler:', error);
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    })();
    return true; // Indicates async response
  }

  // Handle task status requests
  if (message.type === 'GET_TASK_STATUS') {
    (async () => {
      try {
        const { gmailTaskQueue } = await import('./services/gmail-task-queue');
        const taskId = message.payload?.taskId;

        if (!taskId) {
          sendResponse({
            success: false,
            error: 'Task ID is required',
          });
          return;
        }

        const task = gmailTaskQueue.getTask(taskId);
        if (!task) {
          sendResponse({
            success: false,
            error: 'Task not found',
          });
          return;
        }

        sendResponse({
          success: true,
          task: {
            id: task.id,
            type: task.type,
            status: task.status,
            progress: task.progress,
            result: task.result,
            error: task.error,
            startTime: task.startTime,
            endTime: task.endTime,
          },
        });
      } catch (error) {
        logger.error('Error getting task status:', error);
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    })();
    return true;
  }

  // Handle workspace task list requests
  if (message.type === 'GET_WORKSPACE_TASKS') {
    (async () => {
      try {
        const { gmailTaskQueue } = await import('./services/gmail-task-queue');
        const workspaceId = message.payload?.workspaceId || 'default';

        const tasks = gmailTaskQueue.getWorkspaceTasks(workspaceId);
        sendResponse({
          success: true,
          tasks: tasks.map(task => ({
            id: task.id,
            type: task.type,
            status: task.status,
            progress: task.progress,
            startTime: task.startTime,
            endTime: task.endTime,
          })),
        });
      } catch (error) {
        logger.error('Error getting workspace tasks:', error);
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    })();
    return true;
  }

  // Handle ContextManager UI requests
  if (message.type === 'GET_CONTEXT_STATS') {
    (async () => {
      try {
        const { contextManager } = await import('../services/context/ContextManager');
        const workspaceId = message.payload?.workspaceId || 'work-workspace';
        const stats = await contextManager.getContextStats(workspaceId);
        sendResponse({ ok: true, stats });
      } catch (error) {
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : 'Failed to get context stats',
        });
      }
    })();
    return true;
  }

  if (message.type === 'TEST_CONTEXT_WRITE') {
    (async () => {
      try {
        const { contextManager } = await import('../services/context/ContextManager');
        const { workspaceId, contextItem } = message.payload;

        await contextManager.write(workspaceId, contextItem, 'episodic');
        sendResponse({ ok: true });
      } catch (error) {
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : 'WRITE test failed',
        });
      }
    })();
    return true;
  }

  if (message.type === 'TEST_CONTEXT_SELECT') {
    (async () => {
      try {
        const { contextManager } = await import('../services/context/ContextManager');
        const { workspaceId, query, tokenLimit, options } = message.payload;

        const items = await contextManager.select(workspaceId, query, tokenLimit, options);
        sendResponse({ ok: true, items });
      } catch (error) {
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : 'SELECT test failed',
        });
      }
    })();
    return true;
  }

  if (message.type === 'TEST_CONTEXT_COMPRESS') {
    (async () => {
      try {
        const { contextManager } = await import('../services/context/ContextManager');
        const { items, strategy, targetTokens } = message.payload;

        const strategyObj = {
          name: strategy,
          description: `${strategy} compression strategy`,
          targetRatio: strategy === 'minimal' ? 0.8 : strategy === 'balanced' ? 0.5 : 0.3,
        };

        const result = await contextManager.compress(items, strategyObj, targetTokens);
        sendResponse({ ok: true, result });
      } catch (error) {
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : 'COMPRESS test failed',
        });
      }
    })();
    return true;
  }

  if (message.type === 'TEST_CONTEXT_ISOLATE') {
    (async () => {
      try {
        const { contextManager } = await import('../services/context/ContextManager');
        const { workspaceId } = message.payload;

        const workspace = await contextManager.isolate(workspaceId);
        sendResponse({ ok: true, workspace });
      } catch (error) {
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : 'ISOLATE test failed',
        });
      }
    })();
    return true;
  }

  if (message.type === 'REMOVE_CONTEXT_ITEM') {
    (async () => {
      try {
        const { contextManager } = await import('../services/context/ContextManager');
        const { workspaceId, itemId } = message.payload;

        await contextManager.removeItem(workspaceId, itemId);
        sendResponse({ ok: true });
      } catch (error) {
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : 'Failed to remove context item',
        });
      }
    })();
    return true;
  }

  if (message.type === 'GET_CONTEXT_PILLS') {
    (async () => {
      try {
        console.log(`[DEBUG] GET_CONTEXT_PILLS request for workspace: ${message.payload.workspaceId}`);
        const { contextManager } = await import('../services/context/ContextManager');
        const { workspaceId } = message.payload;

        // Get context items and convert to pills format
        const contextItems = await contextManager.select(workspaceId, '', 10000, {});
        console.log(
          `[DEBUG] contextManager.select returned ${contextItems.length} items for workspace: ${workspaceId}`,
        );

        const pills = contextItems.map(item => ({
          id: item.id,
          type: item.type,
          label: `${item.type}: ${item.content.substring(0, 30)}...`,
          tokens: item.metadata.tokens,
          removable: true,
          priority: item.metadata.priority,
          agentId: item.agentId,
          sourceType: item.sourceType,
          preview: item.content.substring(0, 100) + '...',
        }));

        console.log(`[DEBUG] Returning ${pills.length} context pills for workspace: ${workspaceId}`);
        sendResponse({ ok: true, pills });
      } catch (error) {
        console.error(`[DEBUG] GET_CONTEXT_PILLS failed for workspace: ${message.payload.workspaceId}`, error);
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : 'Failed to get context pills',
        });
      }
    })();
    return true;
  }

  // Handle compression stats requests
  if (message.type === 'GET_COMPRESSION_STATS') {
    (async () => {
      try {
        const { contextManager } = await import('../services/context/ContextManager');
        const { workspaceId } = message.payload;

        // Get compression statistics from context manager
        const stats = await contextManager.getCompressionStats(workspaceId);

        sendResponse({
          success: true,
          stats: {
            totalItems: stats.totalItems || 0,
            totalTokens: stats.totalTokens || 0,
            compressedItems: stats.compressedItems || 0,
            compressedTokens: stats.compressedTokens || 0,
            compressionRatio: stats.compressionRatio || 0,
            lastCompression: stats.lastCompression || 0,
            isCompressing: stats.isCompressing || false,
          },
        });
      } catch (error) {
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get compression stats',
        });
      }
    })();
    return true;
  }

  // Handle workspace context compression
  if (message.type === 'COMPRESS_WORKSPACE_CONTEXT') {
    (async () => {
      try {
        const { contextManager } = await import('../services/context/ContextManager');
        const { workspaceId, strategy, targetTokens, preserveRecent, preserveImportant } = message.payload;

        // Get all context items for the workspace
        const items = await contextManager.select(workspaceId, '', 50000, {
          includeMetadata: true,
          sortBy: 'timestamp',
          sortOrder: 'desc',
        });

        if (items.length === 0) {
          throw new Error('No context items found for compression');
        }

        // Create compression strategy object
        const compressionStrategy = {
          name: strategy,
          description: `${strategy} compression strategy`,
          targetRatio: getTargetReduction(strategy) / 100,
        };

        // Perform compression
        const compressionResult = await contextManager.compress(items, compressionStrategy, targetTokens);

        // Apply compression results (remove compressed items)
        if (compressionResult.itemsToRemove && compressionResult.itemsToRemove.length > 0) {
          for (const itemId of compressionResult.itemsToRemove) {
            await contextManager.removeItem(workspaceId, itemId);
          }

          // Update compression statistics
          await contextManager.updateCompressionStats(workspaceId, {
            compressedItems: compressionResult.itemsRemoved,
            compressedTokens: compressionResult.tokensRemoved,
            compressionRatio: compressionResult.compressionRatio * 100,
            isCompressing: false,
          });
        }

        sendResponse({
          success: true,
          result: compressionResult,
        });
      } catch (error) {
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : 'Compression failed',
        });
      }
    })();
    return true;
  }

  // Handle auto-compression settings
  if (message.type === 'SET_AUTO_COMPRESSION') {
    (async () => {
      try {
        const { workspaceId, enabled, strategy, targetTokens } = message.payload;

        // Store auto-compression settings
        const settings = {
          enabled,
          strategy,
          targetTokens,
          workspaceId,
        };

        await chrome.storage.local.set({
          [`autoCompression_${workspaceId}`]: settings,
        });

        sendResponse({
          success: true,
          settings,
        });
      } catch (error) {
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to set auto-compression',
        });
      }
    })();
    return true;
  }

  if (message.type === 'GET_CONTEXT_SUGGESTIONS') {
    (async () => {
      try {
        // Generate mock suggestions for now - in production this would come from AmbientMonitor
        const suggestions = [
          {
            id: 'suggestion-page',
            type: 'page',
            label: '@page',
            tokens: 450,
            reason: 'Current page has relevant content',
            confidence: 0.8,
            preview: 'Include visible content from current page',
          },
          {
            id: 'suggestion-research',
            type: 'message',
            label: '@agent:research',
            tokens: 320,
            reason: 'Research agent has relevant findings',
            confidence: 0.9,
            preview: 'Include results from research subagent',
            agentId: 'research-agent',
          },
        ];

        sendResponse({ ok: true, suggestions });
      } catch (error) {
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : 'Failed to get context suggestions',
        });
      }
    })();
    return true;
  }

  if (message.type === 'UPDATE_PILL_PRIORITIES') {
    (async () => {
      try {
        const { contextManager } = await import('../services/context/ContextManager');
        const { workspaceId, priorities } = message.payload;

        await contextManager.updatePillPriorities(workspaceId, priorities);
        sendResponse({ ok: true });
      } catch (error) {
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : 'Failed to update pill priorities',
        });
      }
    })();
    return true;
  }

  if (message.type === 'ACCEPT_CONTEXT_SUGGESTION') {
    (async () => {
      try {
        const { contextManager } = await import('../services/context/ContextManager');
        const { workspaceId, suggestion } = message.payload;

        // Convert suggestion to context item and write it
        const contextItem = {
          type: suggestion.type,
          content: suggestion.preview || suggestion.label,
          agentId: suggestion.agentId,
          sourceType: suggestion.sourceType || 'main',
          metadata: {
            source: 'user-suggestion',
            priority: suggestion.priority || 3,
          },
        };

        await contextManager.write(workspaceId, contextItem, 'episodic');
        sendResponse({ ok: true });
      } catch (error) {
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : 'Failed to accept suggestion',
        });
      }
    })();
    return true;
  }

  // Handle Memory Service requests from Options page
  if (message.type === 'GET_MEMORY_STATS') {
    (async () => {
      try {
        const { memoryService } = await import('../services/memory/MemoryService');
        const workspaceId = message.workspaceId || 'default-workspace';
        const stats = await memoryService.getMemoryStats(workspaceId);
        sendResponse({ success: true, data: stats });
      } catch (error) {
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get memory stats',
        });
      }
    })();
    return true;
  }

  if (message.type === 'LIST_PATTERNS') {
    (async () => {
      try {
        const { memoryService } = await import('../services/memory/MemoryService');
        const workspaceId = message.workspaceId || 'default-workspace';
        const patterns = await memoryService.listPatterns(workspaceId);
        sendResponse({ success: true, data: patterns });
      } catch (error) {
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to list patterns',
        });
      }
    })();
    return true;
  }

  if (message.type === 'CLEAR_MEMORY') {
    (async () => {
      try {
        const { memoryService } = await import('../services/memory/MemoryService');
        const workspaceId = message.workspaceId || 'default-workspace';
        const memoryType = message.payload?.memoryType;
        await memoryService.clearMemory(workspaceId, memoryType);
        sendResponse({ success: true });
      } catch (error) {
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to clear memory',
        });
      }
    })();
    return true;
  }

  if (message.type === 'DELETE_FACT') {
    (async () => {
      try {
        const { memoryService } = await import('../services/memory/MemoryService');
        const workspaceId = message.workspaceId || 'default-workspace';
        const factId = message.payload?.factId;
        await memoryService.deleteFact(workspaceId, factId);
        sendResponse({ success: true });
      } catch (error) {
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to delete fact',
        });
      }
    })();
    return true;
  }

  // Handle Context Manager requests from Options page
  if (message.type === 'GET_CONTEXT_STATS') {
    (async () => {
      try {
        const { contextManager } = await import('../services/context/ContextManager');
        const workspaceId = message.workspaceId || 'default-workspace';
        const stats = await contextManager.getContextStats(workspaceId);
        sendResponse({ success: true, data: stats });
      } catch (error) {
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get context stats',
        });
      }
    })();
    return true;
  }

  if (message.type === 'SELECT_CONTEXT') {
    (async () => {
      try {
        const { contextManager } = await import('../services/context/ContextManager');
        const workspaceId = message.workspaceId || 'default-workspace';
        const { query, tokenLimit, options } = message.payload;
        const items = await contextManager.select(workspaceId, query, tokenLimit, options);
        sendResponse({ success: true, data: items });
      } catch (error) {
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to select context',
        });
      }
    })();
    return true;
  }

  if (message.type === 'COMPRESS_CONTEXT') {
    (async () => {
      try {
        const { contextManager } = await import('../services/context/ContextManager');
        const { items, strategy, targetTokens } = message.payload;
        const result = await contextManager.compress(items, strategy, targetTokens);
        sendResponse({ success: true, data: result });
      } catch (error) {
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to compress context',
        });
      }
    })();
    return true;
  }

  if (message.type === 'CREATE_CHECKPOINT') {
    (async () => {
      try {
        const { createStorageMigration } = await import('@extension/storage/lib/chat/StorageMigration');
        const { langGraphStore } = await import('@extension/storage/lib/chat/LangGraphStore');
        const storageMigration = createStorageMigration(langGraphStore);

        const workspaceId = message.workspaceId || 'default-workspace';
        const sessionId = message.sessionId || 'default-session';
        const { label, metadata } = message.payload;

        const checkpointId = await storageMigration.createCheckpoint(workspaceId, sessionId, label, metadata);
        sendResponse({ success: true, data: { checkpointId } });
      } catch (error) {
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to create checkpoint',
        });
      }
    })();
    return true;
  }

  if (message.type === 'RESTORE_CHECKPOINT') {
    (async () => {
      try {
        const { createStorageMigration } = await import('@extension/storage/lib/chat/StorageMigration');
        const { langGraphStore } = await import('@extension/storage/lib/chat/LangGraphStore');
        const storageMigration = createStorageMigration(langGraphStore);

        const workspaceId = message.workspaceId || 'default-workspace';
        const sessionId = message.sessionId || 'default-session';
        const { checkpointId } = message.payload;

        const result = await storageMigration.restoreCheckpoint(workspaceId, sessionId, checkpointId);
        sendResponse({ success: true, data: result });
      } catch (error) {
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to restore checkpoint',
        });
      }
    })();
    return true;
  }

  if (message.type === 'APPLY_COMPRESSION') {
    (async () => {
      try {
        // In a real implementation, this would apply the compression to the actual message history
        // For now, we'll just log the compression result
        const { compressionResult } = message.payload;
        console.log('Applying compression:', compressionResult);

        // TODO: Implement actual compression application
        // This would involve:
        // 1. Updating the message history with compressed items
        // 2. Notifying other components of the change
        // 3. Updating context storage

        sendResponse({ success: true });
      } catch (error) {
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to apply compression',
        });
      }
    })();
    return true;
  }

  // Handle other message types if needed in the future
  // Return false if response is not sent asynchronously
  return false;
});

// Setup connection listener for long-lived connections (e.g., side panel)
chrome.runtime.onConnect.addListener(port => {
  // Handle approval modal connections
  if (port.name === 'approval-modal-connection') {
    port.onMessage.addListener(async message => {
      // Forward approval requests to the side panel
      if (currentPort && message.type === 'AGENT_APPROVAL_REQUIRED') {
        currentPort.postMessage(message);
      }
    });
    return;
  }

  // Handle approval response connections
  if (port.name === 'approval-response-connection') {
    port.onMessage.addListener(async message => {
      if (message.type === 'AGENT_APPROVAL_GRANTED' || message.type === 'AGENT_APPROVAL_REJECTED') {
        // Import and handle approval response
        const { autonomyController } = await import('../services/workspace/AutonomyController');
        autonomyController.handleApprovalResponse({
          requestId: message.requestId,
          approved: message.type === 'AGENT_APPROVAL_GRANTED',
          workspaceId: message.workspaceId,
          timestamp: message.timestamp,
        });
      }
    });
    return;
  }

  if (port.name === 'side-panel-connection') {
    currentPort = port;

    port.onMessage.addListener(async message => {
      try {
        switch (message.type) {
          case 'heartbeat':
            // Acknowledge heartbeat
            port.postMessage({ type: 'heartbeat_ack' });
            break;

          case 'new_task': {
            if (!message.task) return port.postMessage({ type: 'error', error: t('bg_cmd_newTask_noTask') });
            if (!message.tabId) return port.postMessage({ type: 'error', error: t('bg_errors_noTabId') });

            logger.info('new_task', message.tabId, message.task);
            currentExecutor = await setupExecutor(message.taskId, message.task, browserContext);

            // DEEP AGENTS: Set workspace context from message
            const workspaceId = message.workspaceId || 'default';
            const sessionId = message.taskId;
            currentExecutor.setWorkspaceContext(workspaceId, sessionId);
            logger.info('Set workspace context:', workspaceId, sessionId);

            subscribeToExecutorEvents(currentExecutor);

            const result = await currentExecutor.execute();
            logger.info('new_task execution result', message.tabId, result);
            break;
          }

          case 'follow_up_task': {
            if (!message.task) return port.postMessage({ type: 'error', error: t('bg_cmd_followUpTask_noTask') });
            if (!message.tabId) return port.postMessage({ type: 'error', error: t('bg_errors_noTabId') });

            logger.info('follow_up_task', message.tabId, message.task);

            // If executor exists, add follow-up task
            if (currentExecutor) {
              // DEEP AGENTS: Update workspace context for follow-up
              const workspaceId = message.workspaceId || 'default';
              const sessionId = message.taskId;
              currentExecutor.setWorkspaceContext(workspaceId, sessionId);

              currentExecutor.addFollowUpTask(message.task);
              // Re-subscribe to events in case the previous subscription was cleaned up
              subscribeToExecutorEvents(currentExecutor);
              const result = await currentExecutor.execute();
              logger.info('follow_up_task execution result', message.tabId, result);
            } else {
              // executor was cleaned up, can not add follow-up task
              logger.info('follow_up_task: executor was cleaned up, can not add follow-up task');
              return port.postMessage({ type: 'error', error: t('bg_cmd_followUpTask_cleaned') });
            }
            break;
          }

          case 'cancel_task': {
            if (!currentExecutor) return port.postMessage({ type: 'error', error: t('bg_errors_noRunningTask') });
            await currentExecutor.cancel();
            break;
          }

          case 'resume_task': {
            if (!currentExecutor) return port.postMessage({ type: 'error', error: t('bg_cmd_resumeTask_noTask') });
            await currentExecutor.resume();
            return port.postMessage({ type: 'success' });
          }

          case 'pause_task': {
            if (!currentExecutor) return port.postMessage({ type: 'error', error: t('bg_errors_noRunningTask') });
            await currentExecutor.pause();
            return port.postMessage({ type: 'success' });
          }

          case 'screenshot': {
            if (!message.tabId) return port.postMessage({ type: 'error', error: t('bg_errors_noTabId') });
            const page = await browserContext.switchTab(message.tabId);
            const screenshot = await page.takeScreenshot();
            logger.info('screenshot', message.tabId, screenshot);
            return port.postMessage({ type: 'success', screenshot });
          }

          case 'state': {
            try {
              const browserState = await browserContext.getState(true);
              const elementsText = browserState.elementTree.clickableElementsToString(
                DEFAULT_AGENT_OPTIONS.includeAttributes,
              );

              logger.info('state', browserState);
              logger.info('interactive elements', elementsText);
              return port.postMessage({ type: 'success', msg: t('bg_cmd_state_printed') });
            } catch (error) {
              logger.error('Failed to get state:', error);
              return port.postMessage({ type: 'error', error: t('bg_cmd_state_failed') });
            }
          }

          case 'nohighlight': {
            const page = await browserContext.getCurrentPage();
            await page.removeHighlight();
            return port.postMessage({ type: 'success', msg: t('bg_cmd_nohighlight_ok') });
          }

          case 'speech_to_text': {
            try {
              if (!message.audio) {
                return port.postMessage({
                  type: 'speech_to_text_error',
                  error: t('bg_cmd_stt_noAudioData'),
                });
              }

              logger.info('Processing speech-to-text request...');

              // Get all providers for speech-to-text service
              const providers = await llmProviderStore.getAllProviders();

              // Create speech-to-text service with all providers
              const speechToTextService = await SpeechToTextService.create(providers);

              // Extract base64 audio data (remove data URL prefix if present)
              let base64Audio = message.audio;
              if (base64Audio.startsWith('data:')) {
                base64Audio = base64Audio.split(',')[1];
              }

              // Transcribe audio
              const transcribedText = await speechToTextService.transcribeAudio(base64Audio);

              logger.info('Speech-to-text completed successfully');
              return port.postMessage({
                type: 'speech_to_text_result',
                text: transcribedText,
              });
            } catch (error) {
              logger.error('Speech-to-text failed:', error);
              return port.postMessage({
                type: 'speech_to_text_error',
                error: error instanceof Error ? error.message : t('bg_cmd_stt_failed'),
              });
            }
          }

          case 'replay': {
            if (!message.tabId) return port.postMessage({ type: 'error', error: t('bg_errors_noTabId') });
            if (!message.taskId) return port.postMessage({ type: 'error', error: t('bg_errors_noTaskId') });
            if (!message.historySessionId)
              return port.postMessage({ type: 'error', error: t('bg_cmd_replay_noHistory') });
            logger.info('replay', message.tabId, message.taskId, message.historySessionId);

            try {
              // Switch to the specified tab
              await browserContext.switchTab(message.tabId);
              // Setup executor with the new taskId and a dummy task description
              currentExecutor = await setupExecutor(message.taskId, message.task, browserContext);
              subscribeToExecutorEvents(currentExecutor);

              // Run replayHistory with the history session ID
              const result = await currentExecutor.replayHistory(message.historySessionId);
              logger.debug('replay execution result', message.tabId, result);
            } catch (error) {
              logger.error('Replay failed:', error);
              return port.postMessage({
                type: 'error',
                error: error instanceof Error ? error.message : t('bg_cmd_replay_failed'),
              });
            }
            break;
          }

          default:
            return port.postMessage({ type: 'error', error: t('errors_cmd_unknown', [message.type]) });
        }
      } catch (error) {
        console.error('Error handling port message:', error);
        port.postMessage({
          type: 'error',
          error: error instanceof Error ? error.message : t('errors_unknown'),
        });
      }
    });

    port.onDisconnect.addListener(() => {
      // this event is also triggered when the side panel is closed, so we need to cancel the task
      console.log('Side panel disconnected');
      currentPort = null;
      currentExecutor?.cancel();
    });
  }
});

async function setupExecutor(taskId: string, task: string, browserContext: BrowserContext) {
  // Ensure HybridAIClient is initialized
  if (!hybridAIClient) {
    try {
      logger.info('HybridAIClient not initialized, creating new instance...');
      hybridAIClient = new HybridAIClient();
      await hybridAIClient.initialize();
      const status = hybridAIClient.getStatus();
      logger.info('HybridAIClient initialized on-demand:', status);
    } catch (error) {
      logger.error('Failed to initialize HybridAIClient:', error);
      throw new Error(`Failed to initialize AI client: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Apply firewall settings to browser context
  const firewall = await firewallStore.getFirewall();
  if (firewall.enabled) {
    browserContext.updateConfig({
      allowedUrls: firewall.allowList,
      deniedUrls: firewall.denyList,
    });
  } else {
    browserContext.updateConfig({
      allowedUrls: [],
      deniedUrls: [],
    });
  }

  const generalSettings = await generalSettingsStore.getSettings();
  browserContext.updateConfig({
    minimumWaitPageLoadTime: generalSettings.minWaitPageLoad / 1000.0,
    displayHighlights: generalSettings.displayHighlights,
  });

  const executor = new Executor(task, taskId, browserContext, hybridAIClient, {
    agentOptions: {
      maxSteps: generalSettings.maxSteps,
      maxFailures: generalSettings.maxFailures,
      maxActionsPerStep: generalSettings.maxActionsPerStep,
      useVision: generalSettings.useVision,
      useVisionForPlanner: true,
      planningInterval: generalSettings.planningInterval,
    },
    generalSettings: generalSettings,
  });

  return executor;
}

// Update subscribeToExecutorEvents to use port
async function subscribeToExecutorEvents(executor: Executor) {
  // Clear previous event listeners to prevent multiple subscriptions
  executor.clearExecutionEvents();

  // Subscribe to new events
  executor.subscribeExecutionEvents(async event => {
    try {
      if (currentPort) {
        currentPort.postMessage(event);
      }
    } catch (error) {
      logger.error('Failed to send message to side panel:', error);
    }

    if (
      event.state === ExecutionState.TASK_OK ||
      event.state === ExecutionState.TASK_FAIL ||
      event.state === ExecutionState.TASK_CANCEL
    ) {
      await currentExecutor?.cleanup();
    }
  });
}
