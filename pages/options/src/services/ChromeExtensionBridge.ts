/**
 * Chrome Extension Bridge Service
 * Handles communication between Options page and Chrome Extension background script
 */

export interface ChromeMessage {
  type: string;
  payload?: any;
  workspaceId?: string;
  sessionId?: string;
}

export interface ChromeResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export class ChromeExtensionBridge {
  private static instance: ChromeExtensionBridge;

  private constructor() {}

  public static getInstance(): ChromeExtensionBridge {
    if (!ChromeExtensionBridge.instance) {
      ChromeExtensionBridge.instance = new ChromeExtensionBridge();
    }
    return ChromeExtensionBridge.instance;
  }

  /**
   * Send message to chrome extension background script
   */
  async sendMessage(message: ChromeMessage): Promise<ChromeResponse> {
    return new Promise(resolve => {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage(message, (response: ChromeResponse) => {
          if (chrome.runtime.lastError) {
            resolve({
              success: false,
              error: chrome.runtime.lastError.message,
            });
          } else {
            resolve(response || { success: false, error: 'No response received' });
          }
        });
      } else {
        // Fallback for development/testing
        console.warn('Chrome extension API not available, using fallback');
        resolve({
          success: false,
          error: 'Chrome extension API not available',
        });
      }
    });
  }

  /**
   * Get memory statistics from extension
   */
  async getMemoryStats(workspaceId: string): Promise<any> {
    const response = await this.sendMessage({
      type: 'GET_MEMORY_STATS',
      workspaceId,
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to get memory stats');
    }

    return response.data;
  }

  /**
   * List workflow patterns from extension
   */
  async listPatterns(workspaceId: string): Promise<any[]> {
    const response = await this.sendMessage({
      type: 'LIST_PATTERNS',
      workspaceId,
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to list patterns');
    }

    return response.data || [];
  }

  /**
   * Clear memory in extension
   */
  async clearMemory(workspaceId: string, memoryType?: string): Promise<void> {
    const response = await this.sendMessage({
      type: 'CLEAR_MEMORY',
      workspaceId,
      payload: { memoryType },
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to clear memory');
    }
  }

  /**
   * Delete fact from extension
   */
  async deleteFact(workspaceId: string, factId: string): Promise<void> {
    const response = await this.sendMessage({
      type: 'DELETE_FACT',
      workspaceId,
      payload: { factId },
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to delete fact');
    }
  }

  /**
   * Get context statistics from extension
   */
  async getContextStats(workspaceId: string): Promise<any> {
    const response = await this.sendMessage({
      type: 'GET_CONTEXT_STATS',
      workspaceId,
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to get context stats');
    }

    return response.data;
  }

  /**
   * Select context items from extension
   */
  async selectContext(workspaceId: string, query: string, tokenLimit: number, options?: any): Promise<any[]> {
    const response = await this.sendMessage({
      type: 'SELECT_CONTEXT',
      workspaceId,
      payload: { query, tokenLimit, options },
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to select context');
    }

    return response.data || [];
  }

  /**
   * Compress context items in extension
   */
  async compressContext(workspaceId: string, items: any[], strategy: any, targetTokens: number): Promise<any> {
    const response = await this.sendMessage({
      type: 'COMPRESS_CONTEXT',
      workspaceId,
      payload: { items, strategy, targetTokens },
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to compress context');
    }

    return response.data;
  }

  /**
   * Create checkpoint in extension
   */
  async createCheckpoint(workspaceId: string, sessionId: string, label: string, metadata?: any): Promise<string> {
    const response = await this.sendMessage({
      type: 'CREATE_CHECKPOINT',
      workspaceId,
      sessionId,
      payload: { label, metadata },
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to create checkpoint');
    }

    return response.data.checkpointId;
  }

  /**
   * Restore checkpoint in extension
   */
  async restoreCheckpoint(workspaceId: string, sessionId: string, checkpointId: string): Promise<any> {
    const response = await this.sendMessage({
      type: 'RESTORE_CHECKPOINT',
      workspaceId,
      sessionId,
      payload: { checkpointId },
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to restore checkpoint');
    }

    return response.data;
  }

  /**
   * Apply compression in extension
   */
  async applyCompression(workspaceId: string, sessionId: string, compressionResult: any): Promise<void> {
    const response = await this.sendMessage({
      type: 'APPLY_COMPRESSION',
      workspaceId,
      sessionId,
      payload: { compressionResult },
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to apply compression');
    }
  }
}

export const chromeExtensionBridge = ChromeExtensionBridge.getInstance();
