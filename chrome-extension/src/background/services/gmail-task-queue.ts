/**
 * Gmail Task Queue - Handles long-running Gmail operations without blocking message channels
 */

import { createLogger } from '@src/background/log';

const logger = createLogger('GmailTaskQueue');

export interface GmailTask {
  id: string;
  type: 'GET_STATS' | 'SYNC_MEMORY' | 'AUTHENTICATE' | 'GET_EMAILS';
  workspaceId: string;
  payload?: any;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  result?: any;
  error?: string;
  startTime: number;
  endTime?: number;
}

class GmailTaskQueue {
  private tasks = new Map<string, GmailTask>();
  private runningTasks = new Set<string>();
  private maxConcurrentTasks = 2;

  /**
   * Add a new task to the queue
   */
  addTask(type: GmailTask['type'], workspaceId: string, payload?: any): string {
    const taskId = `${type}_${workspaceId}_${Date.now()}`;

    const task: GmailTask = {
      id: taskId,
      type,
      workspaceId,
      payload,
      status: 'pending',
      progress: 0,
      startTime: Date.now(),
    };

    this.tasks.set(taskId, task);
    logger.info(`Added task ${taskId} to queue`);

    // Start processing immediately if we have capacity
    this.processQueue();

    return taskId;
  }

  /**
   * Get task status and result
   */
  getTask(taskId: string): GmailTask | null {
    return this.tasks.get(taskId) || null;
  }

  /**
   * Get all tasks for a workspace
   */
  getWorkspaceTasks(workspaceId: string): GmailTask[] {
    return Array.from(this.tasks.values()).filter(task => task.workspaceId === workspaceId);
  }

  /**
   * Process the task queue
   */
  private async processQueue() {
    if (this.runningTasks.size >= this.maxConcurrentTasks) {
      return; // Already at capacity
    }

    // Find next pending task
    const pendingTask = Array.from(this.tasks.values()).find(task => task.status === 'pending');

    if (!pendingTask) {
      return; // No pending tasks
    }

    // Start processing the task
    this.runningTasks.add(pendingTask.id);
    pendingTask.status = 'running';

    logger.info(`Starting task ${pendingTask.id}`);

    try {
      await this.executeTask(pendingTask);
      pendingTask.status = 'completed';
      pendingTask.progress = 100;
      pendingTask.endTime = Date.now();

      logger.info(`Task ${pendingTask.id} completed successfully`);
    } catch (error) {
      pendingTask.status = 'failed';
      pendingTask.error = error instanceof Error ? error.message : 'Unknown error';
      pendingTask.endTime = Date.now();

      logger.error(`Task ${pendingTask.id} failed:`, error);
    } finally {
      this.runningTasks.delete(pendingTask.id);

      // Process next task if any
      setTimeout(() => this.processQueue(), 100);
    }
  }

  /**
   * Execute a specific task
   */
  private async executeTask(task: GmailTask) {
    const { getRealGmailMemoryStats, syncGmailToMemory, authenticateGmail, getEmailsByMemoryType } = await import(
      './gmail-memory-handler'
    );

    switch (task.type) {
      case 'GET_STATS':
        task.progress = 25;
        task.result = await getRealGmailMemoryStats(task.workspaceId);
        break;

      case 'SYNC_MEMORY':
        task.progress = 10;
        const syncOptions = {
          maxMessages: task.payload?.maxMessages || 50,
          daysBack: task.payload?.daysBack || 7,
          forceRefresh: task.payload?.forceRefresh || false,
        };

        // Create a progress callback
        const progressCallback = (progress: number) => {
          task.progress = Math.min(90, 10 + progress * 0.8); // 10% to 90%
        };

        task.result = await syncGmailToMemory(task.workspaceId, syncOptions, progressCallback);
        break;

      case 'AUTHENTICATE':
        task.progress = 50;
        task.result = await authenticateGmail();
        break;

      case 'GET_EMAILS':
        task.progress = 25;
        const memoryType = task.payload?.memoryType;
        const emailResult = await getEmailsByMemoryType(task.workspaceId, memoryType);
        task.result = emailResult.success ? emailResult.emails : [];
        break;

      default:
        throw new Error(`Unknown task type: ${task.type}`);
    }
  }

  /**
   * Clean up old completed tasks
   */
  cleanup() {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes

    for (const [taskId, task] of this.tasks.entries()) {
      if (task.status === 'completed' || task.status === 'failed') {
        if (task.endTime && now - task.endTime > maxAge) {
          this.tasks.delete(taskId);
          logger.debug(`Cleaned up old task ${taskId}`);
        }
      }
    }
  }
}

// Global task queue instance
export const gmailTaskQueue = new GmailTaskQueue();

// Clean up old tasks every 5 minutes
setInterval(
  () => {
    gmailTaskQueue.cleanup();
  },
  5 * 60 * 1000,
);
