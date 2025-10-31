import { workspaceManager, type WorkspaceConfig } from '@extension/storage';

/**
 * AutonomyController - Manages human-in-the-loop approval gates
 * Implements LangGraph-style interrupts based on workspace autonomy levels
 */

export interface ApprovalRequest {
  id: string;
  workspaceId: string;
  autonomyLevel: number;
  actionType: string;
  plannedActions: string[];
  riskLevel: 'low' | 'medium' | 'high';
  context: string;
  timestamp: number;
}

export interface ApprovalResponse {
  requestId: string;
  approved: boolean;
  workspaceId: string;
  timestamp: number;
}

export class AutonomyController {
  private pendingRequests: Map<string, ApprovalRequest> = new Map();
  private approvalCallbacks: Map<string, (approved: boolean) => void> = new Map();

  /**
   * Check if an action requires approval based on workspace autonomy settings
   */
  async requiresApproval(
    workspaceId: string,
    actionType: string,
    riskLevel: 'low' | 'medium' | 'high',
    context: string = '',
  ): Promise<boolean> {
    try {
      return await workspaceManager.requiresApproval(workspaceId, actionType, riskLevel);
    } catch (error) {
      console.error('Error checking approval requirements:', error);
      return true; // Default to requiring approval on error
    }
  }

  /**
   * Request approval for an action (LangGraph-style interrupt)
   */
  async requestApproval(
    workspaceId: string,
    actionType: string,
    plannedActions: string[],
    riskLevel: 'low' | 'medium' | 'high',
    context: string = '',
  ): Promise<boolean> {
    const workspace = await workspaceManager.getWorkspace(workspaceId);
    if (!workspace) {
      throw new Error(`Workspace ${workspaceId} not found`);
    }

    // Check if approval is actually required
    const needsApproval = await this.requiresApproval(workspaceId, actionType, riskLevel, context);
    if (!needsApproval) {
      console.log(`Action ${actionType} approved automatically for workspace ${workspaceId}`);
      return true;
    }

    // Create approval request
    const requestId = `approval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const request: ApprovalRequest = {
      id: requestId,
      workspaceId,
      autonomyLevel: workspace.autonomyLevel,
      actionType,
      plannedActions,
      riskLevel,
      context,
      timestamp: Date.now(),
    };

    this.pendingRequests.set(requestId, request);

    // Send approval request to UI
    try {
      const port = chrome.runtime.connect({ name: 'approval-request-connection' });
      port.postMessage({
        type: 'AGENT_APPROVAL_REQUIRED',
        requestId,
        workspaceId,
        autonomyLevel: workspace.autonomyLevel,
        actionType,
        plannedActions,
        riskLevel,
        context,
      });
      port.disconnect();

      console.log(`Approval request sent for ${actionType} in workspace ${workspaceId}`);
    } catch (error) {
      console.error('Failed to send approval request to UI:', error);
      this.pendingRequests.delete(requestId);
      return false;
    }

    // Wait for approval response
    return new Promise<boolean>(resolve => {
      this.approvalCallbacks.set(requestId, (approved: boolean) => {
        this.pendingRequests.delete(requestId);
        this.approvalCallbacks.delete(requestId);

        // Update trust score based on approval outcome
        if (approved) {
          workspaceManager.updateTrustScore(workspaceId, true).catch(console.error);
        }

        resolve(approved);
      });

      // Set timeout for approval request (5 minutes)
      setTimeout(
        () => {
          if (this.approvalCallbacks.has(requestId)) {
            console.log(`Approval request ${requestId} timed out`);
            this.approvalCallbacks.get(requestId)?.(false);
          }
        },
        5 * 60 * 1000,
      );
    });
  }

  /**
   * Handle approval response from UI
   */
  handleApprovalResponse(response: ApprovalResponse): void {
    const callback = this.approvalCallbacks.get(response.requestId);
    if (callback) {
      console.log(
        `Approval response received: ${response.approved ? 'APPROVED' : 'REJECTED'} for request ${response.requestId}`,
      );
      callback(response.approved);
    } else {
      console.warn(`No callback found for approval request ${response.requestId}`);
    }
  }

  /**
   * Get pending approval requests for a workspace
   */
  getPendingRequests(workspaceId?: string): ApprovalRequest[] {
    const requests = Array.from(this.pendingRequests.values());
    return workspaceId ? requests.filter(req => req.workspaceId === workspaceId) : requests;
  }

  /**
   * Cancel pending approval request
   */
  cancelRequest(requestId: string): void {
    const callback = this.approvalCallbacks.get(requestId);
    if (callback) {
      callback(false);
    }
    this.pendingRequests.delete(requestId);
    this.approvalCallbacks.delete(requestId);
  }

  /**
   * Get autonomy level description
   */
  getAutonomyDescription(level: number): string {
    switch (level) {
      case 1:
        return 'Ask First - Always ask before any action';
      case 2:
        return 'Cautious - Ask for most actions';
      case 3:
        return 'Balanced - Ask for sensitive actions';
      case 4:
        return 'Confident - Act unless risky';
      case 5:
        return 'Autonomous - Act independently';
      default:
        return 'Unknown autonomy level';
    }
  }

  /**
   * Suggest autonomy level adjustment based on trust score
   */
  async suggestAutonomyAdjustment(workspaceId: string): Promise<{
    currentLevel: number;
    suggestedLevel: number;
    reason: string;
  } | null> {
    const workspace = await workspaceManager.getWorkspace(workspaceId);
    if (!workspace) {
      return null;
    }

    const trustScore = (workspace as any).trustScore || 0.5;
    const currentLevel = workspace.autonomyLevel;
    let suggestedLevel = currentLevel;
    let reason = '';

    // Suggest level increase if trust score is high
    if (trustScore > 0.8 && currentLevel < 5) {
      suggestedLevel = Math.min(5, currentLevel + 1) as 1 | 2 | 3 | 4 | 5;
      reason = 'High success rate suggests you can increase autonomy level';
    }
    // Suggest level decrease if trust score is low
    else if (trustScore < 0.3 && currentLevel > 1) {
      suggestedLevel = Math.max(1, currentLevel - 1) as 1 | 2 | 3 | 4 | 5;
      reason = 'Low success rate suggests decreasing autonomy level for better oversight';
    }

    return suggestedLevel !== currentLevel ? { currentLevel, suggestedLevel, reason } : null;
  }
}

// Export singleton instance
export const autonomyController = new AutonomyController();
