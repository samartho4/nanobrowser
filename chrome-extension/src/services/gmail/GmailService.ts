/**
 * Gmail API Service
 * Main service for Gmail API interactions with caching and retry logic
 */

import {
  GmailAuthToken,
  GmailMessage,
  GmailThread,
  GmailLabel,
  GmailProfile,
  GmailListMessagesResponse,
} from './types';
import { GmailStorageManager } from './StorageManager';
import { OAuthManager } from './OAuthManager';
import { GMAIL_API_CONFIG, GMAIL_SERVICE_CONFIG, LOG_PREFIX } from './constants';

export class GmailService {
  private oauthManager: OAuthManager | null = null;
  private token: GmailAuthToken | null = null;
  private clientId: string;
  private clientSecret: string;

  constructor(clientId: string, clientSecret: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    console.log(`${LOG_PREFIX.SERVICE} Initialized with client ID: ${clientId.substring(0, 20)}...`);
  }

  /**
   * Initialize Gmail service
   */
  async initialize(): Promise<void> {
    try {
      console.log(`${LOG_PREFIX.SERVICE} Initializing...`);

      // Load existing token
      this.token = await GmailStorageManager.loadToken();

      if (this.token) {
        console.log(`${LOG_PREFIX.SERVICE} Existing token found`);

        // Check if token is expired
        if (this.isTokenExpired()) {
          console.log(`${LOG_PREFIX.SERVICE} Token expired, refreshing...`);

          this.oauthManager = new OAuthManager(this.clientId, this.clientSecret);
          this.token = await this.oauthManager.refreshAccessToken(this.token);
          return;
        }

        console.log(`${LOG_PREFIX.SERVICE} Token is still valid`);
        return;
      }

      console.log(`${LOG_PREFIX.SERVICE} No existing token, OAuth needed`);
    } catch (error) {
      console.error(`${LOG_PREFIX.SERVICE} Initialization error:`, error);
      throw error;
    }
  }

  /**
   * Start OAuth authentication
   */
  async authenticate(): Promise<void> {
    try {
      console.log(`${LOG_PREFIX.SERVICE} Starting authentication...`);

      this.oauthManager = new OAuthManager(this.clientId, this.clientSecret);
      this.token = await this.oauthManager.startAuthFlow();

      console.log(`${LOG_PREFIX.SERVICE} Authentication successful`);
    } catch (error) {
      console.error(`${LOG_PREFIX.SERVICE} Authentication failed:`, error);
      throw error;
    }
  }

  /**
   * Make authenticated API request with retry logic
   */
  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    if (!this.token) {
      throw new Error('Not authenticated. Call authenticate() first.');
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < GMAIL_SERVICE_CONFIG.MAX_RETRIES; attempt++) {
      try {
        // Check if token is expired before request
        if (this.isTokenExpired() && this.oauthManager && this.token.refreshToken) {
          console.log(`${LOG_PREFIX.SERVICE} Token expired, refreshing before request...`);
          this.token = await this.oauthManager.refreshAccessToken(this.token);
        }

        const response = await fetch(endpoint, {
          ...options,
          headers: {
            Authorization: `Bearer ${this.token.accessToken}`,
            'Content-Type': 'application/json',
            ...options.headers,
          },
        });

        // Handle token expiration (401)
        if (response.status === 401) {
          console.warn(`${LOG_PREFIX.SERVICE} Received 401, token might be expired`);

          if (this.oauthManager && this.token.refreshToken) {
            console.log(`${LOG_PREFIX.SERVICE} Refreshing token...`);
            this.token = await this.oauthManager.refreshAccessToken(this.token);
            continue; // Retry with new token
          }

          throw new Error('Authentication failed');
        }

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error?.message || `API Error: ${response.status} ${response.statusText}`);
        }

        return await response.json();
      } catch (error) {
        lastError = error as Error;
        console.warn(
          `${LOG_PREFIX.SERVICE} Request attempt ${attempt + 1}/${GMAIL_SERVICE_CONFIG.MAX_RETRIES} failed:`,
          lastError.message,
        );

        // If it's the last attempt, throw
        if (attempt === GMAIL_SERVICE_CONFIG.MAX_RETRIES - 1) {
          break;
        }

        // Exponential backoff
        const delay =
          GMAIL_SERVICE_CONFIG.RETRY_DELAY * Math.pow(GMAIL_SERVICE_CONFIG.RETRY_BACKOFF_MULTIPLIER, attempt);

        console.log(`${LOG_PREFIX.SERVICE} Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError || new Error('API request failed after all retries');
  }

  /**
   * Get user profile
   */
  async getProfile(): Promise<GmailProfile> {
    try {
      console.log(`${LOG_PREFIX.SERVICE} Fetching profile...`);

      const cacheKey = 'profile';
      const cached = await GmailStorageManager.loadCache(cacheKey);

      if (cached) {
        return cached;
      }

      const profile = await this.makeRequest<GmailProfile>(`${GMAIL_API_CONFIG.BASE_URL}/users/me/profile`);

      await GmailStorageManager.saveCache(cacheKey, profile);
      return profile;
    } catch (error) {
      console.error(`${LOG_PREFIX.SERVICE} Failed to get profile:`, error);
      throw error;
    }
  }

  /**
   * Get all labels
   */
  async getLabels(): Promise<GmailLabel[]> {
    try {
      console.log(`${LOG_PREFIX.SERVICE} Fetching labels...`);

      const cacheKey = 'labels';
      const cached = await GmailStorageManager.loadCache(cacheKey);

      if (cached) {
        return cached;
      }

      const response = await this.makeRequest<{ labels: GmailLabel[] }>(`${GMAIL_API_CONFIG.BASE_URL}/users/me/labels`);

      await GmailStorageManager.saveCache(cacheKey, response.labels);
      return response.labels;
    } catch (error) {
      console.error(`${LOG_PREFIX.SERVICE} Failed to get labels:`, error);
      throw error;
    }
  }

  /**
   * List messages with pagination
   */
  async listMessages(query: string = '', pageToken?: string): Promise<GmailListMessagesResponse> {
    try {
      console.log(`${LOG_PREFIX.SERVICE} Listing messages...`, { query, pageToken });

      const params = new URLSearchParams({
        maxResults: String(GMAIL_SERVICE_CONFIG.MAX_MESSAGES_PER_PAGE),
        ...(query && { q: query }),
        ...(pageToken && { pageToken }),
      });

      const response = await this.makeRequest<GmailListMessagesResponse>(
        `${GMAIL_API_CONFIG.BASE_URL}/users/me/messages?${params}`,
      );

      // Fetch full details for each message (with headers)
      if (response.messages && response.messages.length > 0) {
        const messagesWithDetails = await Promise.all(
          response.messages.map(async msg => {
            try {
              const fullMessage = await this.getMessage(msg.id);
              // Extract headers
              const headers = fullMessage.payload?.headers || [];
              const fromHeader = headers.find(h => h.name === 'From')?.value || '';
              const subjectHeader = headers.find(h => h.name === 'Subject')?.value || '(No Subject)';

              return {
                ...msg,
                from: fromHeader,
                subject: subjectHeader,
                snippet: fullMessage.snippet || '(No preview)',
                internalDate: fullMessage.internalDate || '',
              };
            } catch (error) {
              console.warn(`${LOG_PREFIX.SERVICE} Failed to get message ${msg.id}:`, error);
              return {
                ...msg,
                from: '(Unknown)',
                subject: '(No Subject)',
                snippet: '(No preview)',
                internalDate: '',
              };
            }
          }),
        );

        response.messages = messagesWithDetails as any;
      }

      return response;
    } catch (error) {
      console.error(`${LOG_PREFIX.SERVICE} Failed to list messages:`, error);
      throw error;
    }
  }

  /**
   * Get message details
   */
  async getMessage(messageId: string): Promise<GmailMessage> {
    try {
      console.log(`${LOG_PREFIX.SERVICE} Fetching message:`, messageId);

      const cacheKey = `message:${messageId}`;
      const cached = await GmailStorageManager.loadCache(cacheKey);

      if (cached) {
        return cached;
      }

      const message = await this.makeRequest<GmailMessage>(
        `${GMAIL_API_CONFIG.BASE_URL}/users/me/messages/${messageId}?format=full`,
      );

      await GmailStorageManager.saveCache(cacheKey, message);
      return message;
    } catch (error) {
      console.error(`${LOG_PREFIX.SERVICE} Failed to get message:`, error);
      throw error;
    }
  }

  /**
   * Get thread details
   */
  async getThread(threadId: string): Promise<GmailThread> {
    try {
      console.log(`${LOG_PREFIX.SERVICE} Fetching thread:`, threadId);

      const cacheKey = `thread:${threadId}`;
      const cached = await GmailStorageManager.loadCache(cacheKey);

      if (cached) {
        return cached;
      }

      const thread = await this.makeRequest<GmailThread>(
        `${GMAIL_API_CONFIG.BASE_URL}/users/me/threads/${threadId}?format=full`,
      );

      await GmailStorageManager.saveCache(cacheKey, thread);
      return thread;
    } catch (error) {
      console.error(`${LOG_PREFIX.SERVICE} Failed to get thread:`, error);
      throw error;
    }
  }

  /**
   * Search messages
   */
  async searchMessages(query: string, pageToken?: string): Promise<GmailListMessagesResponse> {
    try {
      console.log(`${LOG_PREFIX.SERVICE} Searching messages:`, query);

      return await this.listMessages(query, pageToken);
    } catch (error) {
      console.error(`${LOG_PREFIX.SERVICE} Search failed:`, error);
      throw error;
    }
  }

  /**
   * Disconnect and logout
   */
  async disconnect(): Promise<void> {
    try {
      console.log(`${LOG_PREFIX.SERVICE} Disconnecting...`);

      if (this.token && this.oauthManager) {
        await this.oauthManager.revokeToken(this.token);
      }

      // Clear storage
      await GmailStorageManager.clearAll();

      // Clean up
      if (this.oauthManager) {
        this.oauthManager.destroy();
      }

      this.token = null;
      this.oauthManager = null;

      console.log(`${LOG_PREFIX.SERVICE} Disconnected`);
    } catch (error) {
      console.error(`${LOG_PREFIX.SERVICE} Disconnect error:`, error);
      throw error;
    }
  }

  /**
   * Check if authenticated
   */
  isAuthenticated(): boolean {
    return !this.isTokenExpired();
  }

  /**
   * Check if token is expired
   */
  private isTokenExpired(): boolean {
    return !this.token || this.token.expiresAt < Date.now();
  }

  /**
   * Get current token (for debugging)
   */
  getToken(): GmailAuthToken | null {
    return this.token;
  }
}
