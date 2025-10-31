import { createLangGraphStore, createEnhancedChatHistoryStorage, createStorageMigration } from '../chat';
import type { MemoryNamespace, WorkspaceConfig, LangGraphStore } from '../chat';

/**
 * WorkspaceManager - Manages workspace lifecycle and isolation
 * Integrates with LangGraph Store for runID branching and memory isolation
 */

export interface WorkspaceInfo extends WorkspaceConfig {
  id: string;
  isActive: boolean;
  sessionCount: number;
  lastActivity: number;
  currentRunId?: string;
  currentSessionId?: string;
}

export interface SessionInfo {
  id: string;
  workspaceId: string;
  runId: string;
  title: string;
  createdAt: number;
  lastActivity: number;
  messageCount: number;
}

export interface AutonomyLevel {
  level: number;
  name: string;
  description: string;
  permissions: string[];
}

export interface SynthesisResult {
  success: boolean;
  synthesizedData?: any;
  error?: string;
}

export const AUTONOMY_LEVELS: Record<number, AutonomyLevel> = {
  1: {
    level: 1,
    name: 'Ask First',
    description: 'Always ask before any action',
    permissions: [],
  },
  2: {
    level: 2,
    name: 'Cautious',
    description: 'Ask for most actions',
    permissions: ['read_only'],
  },
  3: {
    level: 3,
    name: 'Balanced',
    description: 'Ask for sensitive actions',
    permissions: ['read_only', 'safe_actions'],
  },
  4: {
    level: 4,
    name: 'Confident',
    description: 'Act unless risky',
    permissions: ['read_only', 'safe_actions', 'moderate_actions'],
  },
  5: {
    level: 5,
    name: 'Autonomous',
    description: 'Act independently',
    permissions: ['read_only', 'safe_actions', 'moderate_actions', 'advanced_actions'],
  },
};

export class WorkspaceManager {
  private langGraphStore: LangGraphStore;
  private enhancedChatHistory: ReturnType<typeof createEnhancedChatHistoryStorage>;
  private storageMigration: ReturnType<typeof createStorageMigration>;
  private activeWorkspaceId: string = 'default';
  private activeSessions: Map<string, string> = new Map(); // workspaceId -> sessionId
  private activeRuns: Map<string, string> = new Map(); // sessionId -> runId

  constructor() {
    this.langGraphStore = createLangGraphStore();
    this.storageMigration = createStorageMigration(this.langGraphStore);
    this.enhancedChatHistory = createEnhancedChatHistoryStorage(this.langGraphStore, this.storageMigration);
    this.initializeDefaultWorkspace();
  }

  private async initializeDefaultWorkspace() {
    try {
      const defaultConfig: WorkspaceConfig = {
        name: 'Default Workspace',
        description: 'Your main workspace for general tasks',
        autonomyLevel: 3,
        approvalPolicies: {
          gmail: true,
          calendar: false,
          slack: false,
        },
        color: '#3B82F6',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await this.langGraphStore.createNamespace('default', defaultConfig);
      console.log('✓ Default workspace initialized');
    } catch (error) {
      console.warn('Default workspace may already exist:', error);
    }
  }

  /**
   * Create a new workspace with configuration
   */
  async createWorkspace(name: string, config: Partial<WorkspaceConfig> = {}): Promise<string> {
    const workspaceId = `workspace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const fullConfig: WorkspaceConfig = {
      name,
      description: config.description || `Workspace for ${name}`,
      autonomyLevel: config.autonomyLevel || 3,
      approvalPolicies: {
        gmail: false,
        calendar: false,
        slack: false,
        ...config.approvalPolicies,
      },
      color: config.color || this.generateWorkspaceColor(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await this.langGraphStore.createNamespace(workspaceId, fullConfig);
    console.log(`✓ Created workspace: ${name} (${workspaceId})`);

    return workspaceId;
  }

  /**
   * Switch to a different workspace
   */
  async switchWorkspace(workspaceId: string): Promise<void> {
    const workspace = await this.langGraphStore.getWorkspaceConfig(workspaceId);
    if (!workspace) {
      throw new Error(`Workspace ${workspaceId} not found`);
    }

    this.activeWorkspaceId = workspaceId;
    console.log(`✓ Switched to workspace: ${workspace.name} (${workspaceId})`);
  }

  /**
   * Get the currently active workspace
   */
  getActiveWorkspaceId(): string {
    return this.activeWorkspaceId;
  }

  /**
   * Get workspace configuration
   */
  async getWorkspace(workspaceId: string): Promise<WorkspaceConfig | null> {
    return await this.langGraphStore.getWorkspaceConfig(workspaceId);
  }

  /**
   * Get active workspace configuration
   */
  async getActiveWorkspace(): Promise<WorkspaceConfig | null> {
    return await this.getWorkspace(this.activeWorkspaceId);
  }

  /**
   * List all workspaces with activity info
   */
  async listWorkspaces(): Promise<WorkspaceInfo[]> {
    const workspaceIds = await this.langGraphStore.listWorkspaces();
    const workspaces: WorkspaceInfo[] = [];

    for (const workspaceId of workspaceIds) {
      const config = await this.langGraphStore.getWorkspaceConfig(workspaceId);
      if (config) {
        const sessions = await this.enhancedChatHistory.getWorkspaceSessions(workspaceId);

        workspaces.push({
          ...config,
          id: workspaceId,
          isActive: workspaceId === this.activeWorkspaceId,
          sessionCount: sessions.length,
          lastActivity: Math.max(...sessions.map(s => s.updatedAt), config.updatedAt),
          currentRunId: this.activeRuns.get(this.activeSessions.get(workspaceId) || ''),
          currentSessionId: this.activeSessions.get(workspaceId),
        });
      }
    }

    return workspaces.sort((a, b) => b.lastActivity - a.lastActivity);
  }

  /**
   * Get or create active session for workspace
   */
  async getActiveSession(workspaceId: string): Promise<string> {
    let sessionId = this.activeSessions.get(workspaceId);

    if (!sessionId) {
      // Create new session for this workspace
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.activeSessions.set(workspaceId, sessionId);

      // Create the session in enhanced chat history
      await this.enhancedChatHistory.createWorkspaceSession(workspaceId, `Session ${new Date().toLocaleTimeString()}`);

      console.log(`✓ Created new session: ${sessionId} for workspace: ${workspaceId}`);
    }

    return sessionId;
  }

  /**
   * Create a new run for the current session
   */
  async createRun(workspaceId?: string, sessionId?: string): Promise<string> {
    const targetWorkspaceId = workspaceId || this.activeWorkspaceId;
    const targetSessionId = sessionId || (await this.getActiveSession(targetWorkspaceId));

    const namespace: MemoryNamespace = {
      userId: 'default', // This would come from user context in production
      workspaceId: targetWorkspaceId,
      threadId: targetSessionId,
    };

    const runId = await this.langGraphStore.createRun(namespace);
    this.activeRuns.set(targetSessionId, runId);

    console.log(`✓ Created new run: ${runId} for session: ${targetSessionId}`);
    return runId;
  }

  /**
   * Get current run ID for active session
   */
  async getCurrentRunId(workspaceId?: string): Promise<string> {
    const targetWorkspaceId = workspaceId || this.activeWorkspaceId;
    const sessionId = await this.getActiveSession(targetWorkspaceId);

    let runId = this.activeRuns.get(sessionId);
    if (!runId) {
      runId = await this.createRun(targetWorkspaceId, sessionId);
    }

    return runId;
  }

  /**
   * Get namespace for current workspace/session/run
   */
  async getCurrentNamespace(workspaceId?: string): Promise<MemoryNamespace> {
    const targetWorkspaceId = workspaceId || this.activeWorkspaceId;
    const sessionId = await this.getActiveSession(targetWorkspaceId);
    const runId = await this.getCurrentRunId(targetWorkspaceId);

    return {
      userId: 'default',
      workspaceId: targetWorkspaceId,
      threadId: sessionId,
      runId,
    };
  }

  /**
   * Update workspace configuration
   */
  async updateWorkspace(workspaceId: string, updates: Partial<WorkspaceConfig>): Promise<void> {
    await this.langGraphStore.updateWorkspaceConfig(workspaceId, {
      ...updates,
      updatedAt: Date.now(),
    });

    console.log(`✓ Updated workspace: ${workspaceId}`);
  }

  /**
   * Delete workspace and all its data
   */
  async deleteWorkspace(workspaceId: string): Promise<void> {
    if (workspaceId === 'default') {
      throw new Error('Cannot delete default workspace');
    }

    if (workspaceId === this.activeWorkspaceId) {
      await this.switchWorkspace('default');
    }

    await this.langGraphStore.cleanupNamespace(workspaceId);
    this.activeSessions.delete(workspaceId);

    console.log(`✓ Deleted workspace: ${workspaceId}`);
  }

  /**
   * Update autonomy level for workspace
   */
  async setAutonomyLevel(workspaceId: string, level: 1 | 2 | 3 | 4 | 5): Promise<void> {
    const workspace = await this.langGraphStore.getWorkspaceConfig(workspaceId);
    if (!workspace) {
      throw new Error(`Workspace ${workspaceId} not found`);
    }

    // Update approval policies based on autonomy level
    const approvalPolicies = {
      gmail: level <= 3,
      calendar: level <= 2,
      slack: level <= 3,
      // Add more policies as needed
    };

    await this.langGraphStore.updateWorkspaceConfig(workspaceId, {
      autonomyLevel: level,
      approvalPolicies,
      updatedAt: Date.now(),
    });

    console.log(`✓ Updated autonomy level for workspace ${workspaceId} to level ${level}`);
  }

  /**
   * Get autonomy level for workspace
   */
  async getAutonomyLevel(workspaceId: string): Promise<number> {
    const workspace = await this.langGraphStore.getWorkspaceConfig(workspaceId);
    return workspace?.autonomyLevel || 3;
  }

  /**
   * Update trust score for workspace based on task success
   */
  async updateTrustScore(workspaceId: string, taskSuccess: boolean): Promise<void> {
    const workspace = await this.langGraphStore.getWorkspaceConfig(workspaceId);
    if (!workspace) {
      throw new Error(`Workspace ${workspaceId} not found`);
    }

    // Simple trust score calculation (can be enhanced)
    const currentTrustScore = (workspace as any).trustScore || 0.5;
    const adjustment = taskSuccess ? 0.1 : -0.1;
    const newTrustScore = Math.max(0, Math.min(1, currentTrustScore + adjustment));

    await this.langGraphStore.updateWorkspaceConfig(workspaceId, {
      trustScore: newTrustScore,
      updatedAt: Date.now(),
    });

    console.log(`✓ Updated trust score for workspace ${workspaceId}: ${newTrustScore.toFixed(2)}`);
  }

  /**
   * Check if action requires approval based on workspace autonomy level
   */
  async requiresApproval(
    workspaceId: string,
    actionType: string,
    riskLevel: 'low' | 'medium' | 'high',
  ): Promise<boolean> {
    const workspace = await this.langGraphStore.getWorkspaceConfig(workspaceId);
    if (!workspace) {
      return true; // Default to requiring approval
    }

    const autonomyLevel = workspace.autonomyLevel;
    const approvalPolicies = workspace.approvalPolicies || {};

    // High risk actions always require approval
    if (riskLevel === 'high') {
      return true;
    }

    // Check autonomy level rules
    switch (autonomyLevel) {
      case 1:
      case 2:
        return true; // Always ask
      case 3:
        return riskLevel === 'medium' || !approvalPolicies[actionType];
      case 4:
        return riskLevel === 'medium' && !approvalPolicies[actionType];
      case 5:
        return false; // Mostly autonomous
      default:
        return true;
    }
  }

  /**
   * Cross-workspace synthesis with controlled sharing
   */
  async synthesizeWorkspaces(
    sourceIds: string[],
    targetId: string,
    userConsent: boolean = false,
  ): Promise<{
    success: boolean;
    synthesizedData?: any;
    error?: string;
  }> {
    if (!userConsent) {
      return {
        success: false,
        error: 'User consent required for cross-workspace synthesis',
      };
    }

    try {
      const synthesizedData: any = {
        sourceWorkspaces: [],
        combinedContext: [],
        sharedMemories: [],
        timestamp: Date.now(),
      };

      // Collect data from source workspaces
      for (const sourceId of sourceIds) {
        const workspace = await this.langGraphStore.getWorkspaceConfig(sourceId);
        if (workspace) {
          synthesizedData.sourceWorkspaces.push({
            id: sourceId,
            name: workspace.name,
            autonomyLevel: workspace.autonomyLevel,
          });

          // Get recent sessions for context
          const sessions = await this.enhancedChatHistory.getWorkspaceSessions(sourceId);
          synthesizedData.combinedContext.push(...sessions.slice(0, 3)); // Last 3 sessions
        }
      }

      // Store synthesis result in target workspace
      const targetNamespace: MemoryNamespace = {
        userId: 'default',
        workspaceId: targetId,
        threadId: 'synthesis',
      };

      await this.langGraphStore.put(targetNamespace, 'synthesis_result', synthesizedData);

      console.log(`✓ Synthesized data from ${sourceIds.length} workspaces into ${targetId}`);

      return {
        success: true,
        synthesizedData,
      };
    } catch (error) {
      console.error('Cross-workspace synthesis failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Generate a random color for workspace
   */
  private generateWorkspaceColor(): string {
    const colors = [
      '#3B82F6', // Blue
      '#10B981', // Green
      '#F59E0B', // Yellow
      '#EF4444', // Red
      '#8B5CF6', // Purple
      '#06B6D4', // Cyan
      '#F97316', // Orange
      '#84CC16', // Lime
    ];

    return colors[Math.floor(Math.random() * colors.length)];
  }

  /**
   * Create a new session for workspace
   */
  async createSession(workspaceId: string, title?: string): Promise<string> {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const sessionTitle = title || `Session ${new Date().toLocaleTimeString()}`;

    // Create the session in enhanced chat history
    await this.enhancedChatHistory.createWorkspaceSession(workspaceId, sessionTitle);

    console.log(`✓ Created session: ${sessionId} for workspace: ${workspaceId}`);
    return sessionId;
  }

  /**
   * Switch to a different session within the current workspace
   */
  async switchSession(workspaceId: string, sessionId: string): Promise<void> {
    // Verify session exists
    const sessions = await this.enhancedChatHistory.getWorkspaceSessions(workspaceId);
    const sessionExists = sessions.some(s => s.id === sessionId);

    if (!sessionExists) {
      throw new Error(`Session ${sessionId} not found in workspace ${workspaceId}`);
    }

    this.activeSessions.set(workspaceId, sessionId);
    console.log(`✓ Switched to session: ${sessionId} in workspace: ${workspaceId}`);
  }

  /**
   * List all sessions for a workspace
   */
  async listSessions(workspaceId: string): Promise<SessionInfo[]> {
    const sessions = await this.enhancedChatHistory.getWorkspaceSessions(workspaceId);

    return sessions.map(session => ({
      id: session.id,
      workspaceId,
      runId: this.activeRuns.get(session.id) || '',
      title: session.title,
      createdAt: session.createdAt,
      lastActivity: session.updatedAt,
      messageCount: session.messageCount,
    }));
  }

  /**
   * Get workspace statistics
   */
  async getWorkspaceStats(workspaceId: string): Promise<{
    messageCount: number;
    sessionCount: number;
    runCount: number;
    lastActivity: number;
  }> {
    const sessions = await this.enhancedChatHistory.getWorkspaceSessions(workspaceId);
    const totalMessages = sessions.reduce((sum, session) => sum + session.messageCount, 0);

    return {
      messageCount: totalMessages,
      sessionCount: sessions.length,
      runCount: this.activeRuns.size, // Simplified for now
      lastActivity: Math.max(...sessions.map(s => s.updatedAt), 0),
    };
  }
}

// Export singleton instance
export const workspaceManager = new WorkspaceManager();
