/**
 * Gmail Tool Message Handler
 * Background worker message listener for Gmail operations
 */

import { GmailService } from '@src/services/gmail';
import type { ToolMessage, ToolResponse } from '@src/services/gmail/types';
import { GMAIL_OPERATIONS, LOG_PREFIX } from '@src/services/gmail/constants';

let gmailService: GmailService | null = null;

const GMAIL_CLIENT_ID = import.meta.env.VITE_GMAIL_CLIENT_ID || '';
const GMAIL_CLIENT_SECRET = import.meta.env.VITE_GMAIL_CLIENT_SECRET || '';

/**
 * Get or create Gmail service instance
 */
async function ensureServiceInitialized(): Promise<void> {
  if (!gmailService) {
    if (!GMAIL_CLIENT_ID) {
      throw new Error('Gmail client ID not configured. Check .env file.');
    }
    if (!GMAIL_CLIENT_SECRET) {
      throw new Error('Gmail client secret not configured. Check .env file.');
    }

    gmailService = new GmailService(GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET);
    await gmailService.initialize();

    console.log(`${LOG_PREFIX.HANDLER} Gmail service initialized`);
  }
}

/**
 * Handle Gmail tool requests
 */
export async function handleGmailMessage(
  message: ToolMessage,
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response: ToolResponse) => void,
): Promise<boolean> {
  // Validate message format
  if (message.type !== 'TOOL_REQUEST' || message.tool !== 'gmail') {
    return false;
  }

  try {
    const { action, payload } = message;

    console.log(`${LOG_PREFIX.HANDLER} Received request: ${action}`);

    let result: any;

    switch (action) {
      case GMAIL_OPERATIONS.INITIALIZE:
        await ensureServiceInitialized();
        result = {
          authenticated: gmailService!.isAuthenticated(),
          clientId: GMAIL_CLIENT_ID.substring(0, 20) + '...',
        };
        break;

      case GMAIL_OPERATIONS.AUTHENTICATE:
        await ensureServiceInitialized();
        // Trigger OAuth flow
        await gmailService!.authenticate();
        result = {
          authenticated: gmailService!.isAuthenticated(),
          message: 'Authentication successful',
        };
        break;

      case GMAIL_OPERATIONS.GET_PROFILE:
        await ensureServiceInitialized();
        result = await gmailService!.getProfile();
        break;

      case GMAIL_OPERATIONS.GET_LABELS:
        await ensureServiceInitialized();
        result = await gmailService!.getLabels();
        break;

      case GMAIL_OPERATIONS.LIST_MESSAGES:
        await ensureServiceInitialized();
        result = await gmailService!.listMessages(payload?.query, payload?.pageToken);
        break;

      case GMAIL_OPERATIONS.GET_MESSAGE:
        await ensureServiceInitialized();
        if (!payload?.messageId) {
          throw new Error('messageId is required');
        }
        result = await gmailService!.getMessage(payload.messageId);
        break;

      case GMAIL_OPERATIONS.GET_THREAD:
        await ensureServiceInitialized();
        if (!payload?.threadId) {
          throw new Error('threadId is required');
        }
        result = await gmailService!.getThread(payload.threadId);
        break;

      case GMAIL_OPERATIONS.SEARCH_MESSAGES:
        await ensureServiceInitialized();
        if (!payload?.query) {
          throw new Error('query is required');
        }
        result = await gmailService!.searchMessages(payload.query, payload?.pageToken);
        break;

      case GMAIL_OPERATIONS.DISCONNECT:
        if (gmailService) {
          await gmailService.disconnect();
          gmailService = null;
        }
        result = { success: true, message: 'Disconnected from Gmail' };
        break;

      default:
        throw new Error(`Unknown Gmail action: ${action}`);
    }

    console.log(`${LOG_PREFIX.HANDLER} Request successful: ${action}`);

    sendResponse({
      success: true,
      data: result,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    console.error(`${LOG_PREFIX.HANDLER} Error handling request:`, error);

    sendResponse({
      success: false,
      error: errorMessage,
    });
  }

  return true;
}

/**
 * Get Gmail service (for direct access if needed)
 */
export function getGmailService(): GmailService | null {
  return gmailService;
}

/**
 * Cleanup on extension unload
 */
export async function cleanupGmailService(): Promise<void> {
  if (gmailService) {
    try {
      await gmailService.disconnect();
    } catch (error) {
      console.error(`${LOG_PREFIX.HANDLER} Error during cleanup:`, error);
    }
    gmailService = null;
  }
}
