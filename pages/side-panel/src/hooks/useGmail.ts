/**
 * useGmail Hook
 * React hook for Gmail operations in UI components
 */

import { useState, useCallback, useEffect } from 'react';
import type {
  GmailMessage,
  GmailThread,
  GmailLabel,
  GmailProfile,
  GmailListMessagesResponse,
  ToolMessage,
  ToolResponse,
} from '@src/services/gmail/types';
import { GMAIL_OPERATIONS, LOG_PREFIX } from '@src/services/gmail/constants';

interface UseGmailState {
  loading: boolean;
  error: string | null;
  authenticated: boolean;
}

export const useGmail = () => {
  const [state, setState] = useState<UseGmailState>({
    loading: false,
    error: null,
    authenticated: false,
  });

  /**
   * Send Gmail request to background worker
   */
  const sendRequest = useCallback(async (action: string, payload?: any): Promise<any> => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      console.log(`${LOG_PREFIX.HOOK} Sending request: ${action}`);

      const response = await chrome.runtime.sendMessage({
        type: 'TOOL_REQUEST',
        tool: 'gmail',
        action,
        payload,
      } as ToolMessage);

      const toolResponse = response as ToolResponse;

      if (!toolResponse.success) {
        throw new Error(toolResponse.error || 'Request failed');
      }

      console.log(`${LOG_PREFIX.HOOK} Request successful: ${action}`);
      return toolResponse.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      console.error(`${LOG_PREFIX.HOOK} Error:`, error);

      setState(prev => ({ ...prev, error: errorMessage }));
      throw error;
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  /**
   * Initialize and check authentication status
   */
  const initialize = useCallback(async () => {
    try {
      console.log(`${LOG_PREFIX.HOOK} Initializing...`);

      const result = await sendRequest(GMAIL_OPERATIONS.INITIALIZE);

      const authenticated = result.authenticated === true;
      setState(prev => ({ ...prev, authenticated }));

      console.log(`${LOG_PREFIX.HOOK} Initialized. Authenticated: ${authenticated}`);
      return authenticated;
    } catch (error) {
      console.error(`${LOG_PREFIX.HOOK} Initialization error:`, error);
      setState(prev => ({ ...prev, authenticated: false }));
      throw error;
    }
  }, [sendRequest]);

  /**
   * Get user profile
   */
  const getProfile = useCallback(async (): Promise<GmailProfile> => {
    console.log(`${LOG_PREFIX.HOOK} Getting profile...`);
    return sendRequest(GMAIL_OPERATIONS.GET_PROFILE);
  }, [sendRequest]);

  /**
   * Get all labels
   */
  const getLabels = useCallback(async (): Promise<GmailLabel[]> => {
    console.log(`${LOG_PREFIX.HOOK} Getting labels...`);
    return sendRequest(GMAIL_OPERATIONS.GET_LABELS);
  }, [sendRequest]);

  /**
   * List messages
   */
  const listMessages = useCallback(
    async (query?: string, pageToken?: string): Promise<GmailListMessagesResponse> => {
      console.log(`${LOG_PREFIX.HOOK} Listing messages...`, { query, pageToken });
      return sendRequest(GMAIL_OPERATIONS.LIST_MESSAGES, { query, pageToken });
    },
    [sendRequest],
  );

  /**
   * Get specific message
   */
  const getMessage = useCallback(
    async (messageId: string): Promise<GmailMessage> => {
      console.log(`${LOG_PREFIX.HOOK} Getting message:`, messageId);
      return sendRequest(GMAIL_OPERATIONS.GET_MESSAGE, { messageId });
    },
    [sendRequest],
  );

  /**
   * Get thread
   */
  const getThread = useCallback(
    async (threadId: string): Promise<GmailThread> => {
      console.log(`${LOG_PREFIX.HOOK} Getting thread:`, threadId);
      return sendRequest(GMAIL_OPERATIONS.GET_THREAD, { threadId });
    },
    [sendRequest],
  );

  /**
   * Search messages
   */
  const searchMessages = useCallback(
    async (query: string, pageToken?: string): Promise<GmailListMessagesResponse> => {
      console.log(`${LOG_PREFIX.HOOK} Searching messages:`, query);
      return sendRequest(GMAIL_OPERATIONS.SEARCH_MESSAGES, { query, pageToken });
    },
    [sendRequest],
  );

  /**
   * Authenticate (start OAuth flow)
   */
  const authenticate = useCallback(async () => {
    try {
      console.log(`${LOG_PREFIX.HOOK} Starting authentication...`);

      // First, try to initialize (which might trigger OAuth)
      const result = await initialize();

      if (!result) {
        throw new Error('Authentication failed');
      }

      console.log(`${LOG_PREFIX.HOOK} Authentication successful`);
    } catch (error) {
      console.error(`${LOG_PREFIX.HOOK} Authentication error:`, error);
      throw error;
    }
  }, [initialize]);

  /**
   * Disconnect/logout
   */
  const disconnect = useCallback(async () => {
    try {
      console.log(`${LOG_PREFIX.HOOK} Disconnecting...`);

      await sendRequest(GMAIL_OPERATIONS.DISCONNECT);

      setState(prev => ({ ...prev, authenticated: false }));

      console.log(`${LOG_PREFIX.HOOK} Disconnected`);
    } catch (error) {
      console.error(`${LOG_PREFIX.HOOK} Disconnect error:`, error);
      throw error;
    }
  }, [sendRequest]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    // State
    loading: state.loading,
    error: state.error,
    authenticated: state.authenticated,

    // Methods
    initialize,
    authenticate,
    disconnect,
    getProfile,
    getLabels,
    listMessages,
    getMessage,
    getThread,
    searchMessages,
    clearError,
  };
};
