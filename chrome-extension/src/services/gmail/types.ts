/**
 * Gmail API Types and Interfaces
 * Comprehensive type definitions for Gmail integration
 */

/**
 * Gmail Message Structure
 */
export interface GmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  internalDate: string;
  sizeEstimate: number;
  historyId: string;
  payload?: {
    partId: string;
    mimeType: string;
    filename: string;
    headers: Array<{
      name: string;
      value: string;
    }>;
    body: {
      size: number;
      data?: string;
    };
    parts?: any[];
  };
  raw?: string;
}

/**
 * Gmail Thread Structure
 */
export interface GmailThread {
  id: string;
  snippet: string;
  historyId: string;
  messages: GmailMessage[];
}

/**
 * Gmail Label Structure
 */
export interface GmailLabel {
  id: string;
  name: string;
  type: 'system' | 'user';
  labelListVisibility: 'labelShow' | 'labelHide';
  messageListVisibility: 'show' | 'hide';
  messagesTotal: number;
  messagesUnread: number;
  threadsTotal: number;
  threadsUnread: number;
}

/**
 * User Profile Structure
 */
export interface GmailProfile {
  emailAddress: string;
  messagesTotal: number;
  threadsTotal: number;
  historyId: string;
}

/**
 * List Messages Response
 */
export interface GmailListMessagesResponse {
  messages: Array<{
    id: string;
    threadId: string;
  }>;
  nextPageToken?: string;
  resultSizeEstimate: number;
}

/**
 * Authentication Token
 */
export interface GmailAuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}

/**
 * Tool Request Message
 */
export interface ToolMessage {
  type: 'TOOL_REQUEST';
  tool: 'gmail';
  action: string;
  payload?: any;
}

/**
 * Tool Response
 */
export interface ToolResponse {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Gmail Service Options
 */
export interface GmailServiceOptions {
  maxRetries?: number;
  retryDelay?: number;
  cacheTimeout?: number;
}

/**
 * Error Response from Gmail API
 */
export interface GmailErrorResponse {
  error: {
    code: number;
    message: string;
    errors: Array<{
      domain: string;
      reason: string;
      message: string;
    }>;
  };
}
