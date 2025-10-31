/**
 * Gmail Task Client - Helper for managing long-running Gmail tasks
 */

export interface GmailTaskStatus {
  id: string;
  type: 'GET_STATS' | 'SYNC_MEMORY' | 'AUTHENTICATE' | 'GET_EMAILS';
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  result?: any;
  error?: string;
  startTime: number;
  endTime?: number;
}

export class GmailTaskClient {
  /**
   * Start a Gmail memory stats task
   */
  async getMemoryStats(workspaceId: string): Promise<{ taskId: string }> {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          type: 'GET_WORKSPACE_MEMORY_STATS',
          payload: { workspaceId },
        },
        response => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (response?.success) {
            resolve({ taskId: response.taskId });
          } else {
            reject(new Error(response?.error || 'Failed to start memory stats task'));
          }
        },
      );
    });
  }

  /**
   * Start a Gmail sync task
   */
  async syncGmail(
    workspaceId: string,
    options?: {
      maxMessages?: number;
      daysBack?: number;
      forceRefresh?: boolean;
    },
  ): Promise<{ taskId: string }> {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          type: 'SYNC_GMAIL_MEMORY',
          payload: { workspaceId, ...options },
        },
        response => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (response?.success) {
            resolve({ taskId: response.taskId });
          } else {
            reject(new Error(response?.error || 'Failed to start Gmail sync task'));
          }
        },
      );
    });
  }

  /**
   * Start a Gmail authentication task
   */
  async authenticateGmail(workspaceId: string): Promise<{ taskId: string }> {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          type: 'AUTHENTICATE_GMAIL',
          payload: { workspaceId },
        },
        response => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (response?.success) {
            resolve({ taskId: response.taskId });
          } else {
            reject(new Error(response?.error || 'Failed to start authentication task'));
          }
        },
      );
    });
  }

  /**
   * Get emails by memory type
   */
  async getEmailsByMemoryType(
    workspaceId: string,
    memoryType: 'episodic' | 'semantic' | 'procedural',
  ): Promise<{ taskId: string }> {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          type: 'GET_EMAILS_BY_MEMORY_TYPE',
          payload: { workspaceId, memoryType },
        },
        response => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (response?.success) {
            resolve({ taskId: response.taskId });
          } else {
            reject(new Error(response?.error || 'Failed to start email fetch task'));
          }
        },
      );
    });
  }

  /**
   * Get task status
   */
  async getTaskStatus(taskId: string): Promise<GmailTaskStatus> {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          type: 'GET_TASK_STATUS',
          payload: { taskId },
        },
        response => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (response?.success) {
            resolve(response.task);
          } else {
            reject(new Error(response?.error || 'Failed to get task status'));
          }
        },
      );
    });
  }

  /**
   * Poll task until completion
   */
  async waitForTask(taskId: string, onProgress?: (progress: number) => void): Promise<any> {
    return new Promise((resolve, reject) => {
      const pollInterval = 1000; // Poll every second
      const maxWaitTime = 5 * 60 * 1000; // 5 minutes max
      const startTime = Date.now();

      const poll = async () => {
        try {
          // Check for timeout
          if (Date.now() - startTime > maxWaitTime) {
            reject(new Error('Task timeout - operation took too long'));
            return;
          }

          const task = await this.getTaskStatus(taskId);

          // Update progress
          onProgress?.(task.progress);

          if (task.status === 'completed') {
            resolve(task.result);
          } else if (task.status === 'failed') {
            reject(new Error(task.error || 'Task failed'));
          } else {
            // Still running, poll again
            setTimeout(poll, pollInterval);
          }
        } catch (error) {
          reject(error);
        }
      };

      poll();
    });
  }

  /**
   * Start task and wait for completion with progress updates
   */
  async getMemoryStatsWithProgress(workspaceId: string, onProgress?: (progress: number) => void): Promise<any> {
    const { taskId } = await this.getMemoryStats(workspaceId);
    return this.waitForTask(taskId, onProgress);
  }

  /**
   * Sync Gmail and wait for completion with progress updates
   */
  async syncGmailWithProgress(
    workspaceId: string,
    options?: {
      maxMessages?: number;
      daysBack?: number;
      forceRefresh?: boolean;
    },
    onProgress?: (progress: number) => void,
  ): Promise<any> {
    const { taskId } = await this.syncGmail(workspaceId, options);
    return this.waitForTask(taskId, onProgress);
  }

  /**
   * Get workspace tasks
   */
  async getWorkspaceTasks(workspaceId: string): Promise<GmailTaskStatus[]> {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          type: 'GET_WORKSPACE_TASKS',
          payload: { workspaceId },
        },
        response => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (response?.success) {
            resolve(response.tasks);
          } else {
            reject(new Error(response?.error || 'Failed to get workspace tasks'));
          }
        },
      );
    });
  }
}

// Export singleton instance
export const gmailTaskClient = new GmailTaskClient();
