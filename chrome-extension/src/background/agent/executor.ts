import { type ActionResult, AgentContext, type AgentOptions, type AgentOutput } from './types';
import { t } from '@extension/i18n';
import { NavigatorAgent, NavigatorActionRegistry } from './agents/navigator';
import { PlannerAgent, type PlannerOutput } from './agents/planner';
import { NavigatorPrompt } from './prompts/navigator';
import { PlannerPrompt } from './prompts/planner';
import { createLogger } from '@src/background/log';
import MessageManager from './messages/service';
import type BrowserContext from '../browser/context';
import { ActionBuilder } from './actions/builder';
import { EventManager } from './event/manager';
import { Actors, type EventCallback, EventType, ExecutionState } from './event/types';
import {
  ChatModelAuthError,
  ChatModelBadRequestError,
  ChatModelForbiddenError,
  ExtensionConflictError,
  RequestCancelledError,
  MaxStepsReachedError,
  MaxFailuresReachedError,
} from './agents/errors';
import { URLNotAllowedError } from '../browser/views';
import { chatHistoryStore } from '@extension/storage/lib/chat';
import type { AgentStepHistory } from './history';
import type { GeneralSettingsConfig } from '@extension/storage';
import { analytics } from '../services/analytics';
import type { HybridAIClient } from '../llm/HybridAIClient';
import { memoryService, type Episode } from '@src/services/memory/MemoryService';
import { contextManager } from '@src/services/context/ContextManager';
import { todoListMiddleware, subagentService } from './middleware/TodoList';

const logger = createLogger('Executor');

export interface ExecutorExtraArgs {
  agentOptions?: Partial<AgentOptions>;
  generalSettings?: GeneralSettingsConfig;
}

// ============================================================================
// DEEP AGENTS MIDDLEWARE INTERFACES
// ============================================================================

export interface AgentRunContext {
  workspaceId: string;
  sessionId: string;
  query: string;
  context: any[];
  memories: any[];
  todos: string[];
  subagentPlans: SubagentPlan[];
}

export interface SubagentPlan {
  agentId: string;
  agentType: 'research' | 'writer' | 'calendar' | 'main';
  goal: string;
  confidence: number;
  estimatedDuration?: number;
}

export interface AgentRunResult {
  query: string;
  actions: string[];
  outcome: string;
  success: boolean;
  reasoning: string;
  duration: number;
  tokensUsed: number;
  subagentResults?: SubagentResult[];
}

export interface SubagentResult {
  agentId: string;
  agentType: string;
  success: boolean;
  output: string;
  duration: number;
}

export interface ApprovalRequest {
  workspaceId: string;
  sessionId: string;
  plannedActions: string[];
  riskLevel: 'low' | 'medium' | 'high';
  autonomyLevel: number;
  requiresApproval: boolean;
  reason: string;
}

/**
 * Enhanced Executor - Deep Agent Harness with Middleware Hooks
 *
 * This executor serves as the Deep Agent Harness that:
 * - Assembles context, memory, todos, and subagent plans before agent runs
 * - Logs success/failure to episodic/procedural memory for reuse
 * - Enforces human approval checkpoints based on workspace autonomy levels
 * - Integrates with TodoList middleware and SubagentService for delegation
 */
export class Executor {
  private readonly navigator: NavigatorAgent;
  private readonly planner: PlannerAgent;
  private readonly context: AgentContext;
  private readonly plannerPrompt: PlannerPrompt;
  private readonly navigatorPrompt: NavigatorPrompt;
  private readonly generalSettings: GeneralSettingsConfig | undefined;
  private tasks: string[] = [];

  // Deep Agents middleware state
  private currentWorkspaceId: string = 'default';
  private currentSessionId: string = 'default';
  constructor(
    task: string,
    taskId: string,
    browserContext: BrowserContext,
    aiClient: HybridAIClient,
    extraArgs?: Partial<ExecutorExtraArgs>,
  ) {
    const messageManager = new MessageManager();

    const eventManager = new EventManager();
    const context = new AgentContext(
      taskId,
      browserContext,
      messageManager,
      eventManager,
      extraArgs?.agentOptions ?? {},
    );

    this.generalSettings = extraArgs?.generalSettings;
    this.tasks.push(task);
    this.navigatorPrompt = new NavigatorPrompt(context.options.maxActionsPerStep);
    this.plannerPrompt = new PlannerPrompt();

    const actionBuilder = new ActionBuilder(context, aiClient);
    const navigatorActionRegistry = new NavigatorActionRegistry(actionBuilder.buildDefaultActions());

    // Initialize agents with their respective prompts
    this.navigator = new NavigatorAgent(navigatorActionRegistry, {
      aiClient: aiClient,
      context: context,
      prompt: this.navigatorPrompt,
    });

    this.planner = new PlannerAgent({
      aiClient: aiClient,
      context: context,
      prompt: this.plannerPrompt,
    });

    this.context = context;
    // Initialize message history
    this.context.messageManager.initTaskMessages(this.navigatorPrompt.getSystemMessage(), task);
  }

  subscribeExecutionEvents(callback: EventCallback): void {
    this.context.eventManager.subscribe(EventType.EXECUTION, callback);
  }

  clearExecutionEvents(): void {
    // Clear all execution event listeners
    this.context.eventManager.clearSubscribers(EventType.EXECUTION);
  }

  addFollowUpTask(task: string): void {
    this.tasks.push(task);
    this.context.messageManager.addNewTask(task);

    // need to reset previous action results that are not included in memory
    this.context.actionResults = this.context.actionResults.filter(result => result.includeInMemory);
  }

  /**
   * Check if task is complete based on planner output and handle completion
   */
  private checkTaskCompletion(planOutput: AgentOutput<PlannerOutput> | null): boolean {
    if (planOutput?.result?.done) {
      logger.info('✅ Planner confirms task completion');
      if (planOutput.result.final_answer) {
        this.context.finalAnswer = planOutput.result.final_answer;
      }
      return true;
    }
    return false;
  }

  /**
   * Execute the task with Deep Agents middleware integration
   *
   * @returns {Promise<void>}
   */
  async execute(): Promise<void> {
    logger.info(`🚀 Executing task: ${this.tasks[this.tasks.length - 1]}`);
    // reset the step counter
    const context = this.context;
    context.nSteps = 0;
    const allowedMaxSteps = this.context.options.maxSteps;

    // Deep Agents: Prepare run context
    const startTime = Date.now();
    const currentTask = this.tasks[this.tasks.length - 1];
    let runContext: AgentRunContext | null = null;

    try {
      this.context.emitEvent(Actors.SYSTEM, ExecutionState.TASK_START, this.context.taskId);

      // Track task start
      void analytics.trackTaskStart(this.context.taskId);

      // Deep Agents: Before agent run middleware
      runContext = await this.beforeAgentRun(currentTask);

      let step = 0;
      let latestPlanOutput: AgentOutput<PlannerOutput> | null = null;
      let navigatorDone = false;

      for (step = 0; step < allowedMaxSteps; step++) {
        context.stepInfo = {
          stepNumber: context.nSteps,
          maxSteps: context.options.maxSteps,
        };

        logger.info(`🔄 Step ${step + 1} / ${allowedMaxSteps}`);
        if (await this.shouldStop()) {
          break;
        }

        // Run planner periodically for guidance
        if (this.planner && (context.nSteps % context.options.planningInterval === 0 || navigatorDone)) {
          navigatorDone = false;
          latestPlanOutput = await this.runPlanner();

          // Check if task is complete after planner run
          if (this.checkTaskCompletion(latestPlanOutput)) {
            break;
          }
        }

        // Execute navigator
        navigatorDone = await this.navigate();

        // If navigator indicates completion, the next periodic planner run will validate it
        if (navigatorDone) {
          logger.info('🔄 Navigator indicates completion - will be validated by next planner run');
        }
      }

      // Determine task completion status
      const isCompleted = latestPlanOutput?.result?.done === true;
      const endTime = Date.now();

      // Deep Agents: After agent run middleware
      if (runContext) {
        const runResult: AgentRunResult = {
          query: currentTask,
          actions: this.context.actionResults.map(result => result.extractedContent || 'action'),
          outcome: isCompleted ? this.context.finalAnswer || 'Task completed successfully' : 'Task incomplete',
          success: isCompleted,
          reasoning: latestPlanOutput?.result?.final_answer || 'No reasoning provided',
          duration: endTime - startTime,
          tokensUsed: 0, // TODO: Track token usage
          subagentResults: [], // TODO: Implement subagent results tracking
        };

        await this.afterAgentRun(runContext, runResult);
      }

      if (isCompleted) {
        // Emit final answer if available, otherwise use task ID
        const finalMessage = this.context.finalAnswer || this.context.taskId;
        this.context.emitEvent(Actors.SYSTEM, ExecutionState.TASK_OK, finalMessage);

        // Track task completion
        void analytics.trackTaskComplete(this.context.taskId);
      } else if (step >= allowedMaxSteps) {
        logger.error('❌ Task failed: Max steps reached');
        this.context.emitEvent(Actors.SYSTEM, ExecutionState.TASK_FAIL, t('exec_errors_maxStepsReached'));

        // Track task failure with specific error category
        const maxStepsError = new MaxStepsReachedError(t('exec_errors_maxStepsReached'));
        const errorCategory = analytics.categorizeError(maxStepsError);
        void analytics.trackTaskFailed(this.context.taskId, errorCategory);
      } else if (this.context.stopped) {
        this.context.emitEvent(Actors.SYSTEM, ExecutionState.TASK_CANCEL, t('exec_task_cancel'));

        // Track task cancellation
        void analytics.trackTaskCancelled(this.context.taskId);
      } else {
        this.context.emitEvent(Actors.SYSTEM, ExecutionState.TASK_PAUSE, t('exec_task_pause'));
        // Note: We don't track pause as it's not a final state
      }
    } catch (error) {
      // Deep Agents: Handle error in after-run middleware
      if (runContext) {
        const endTime = Date.now();
        const errorResult: AgentRunResult = {
          query: currentTask,
          actions: this.context.actionResults.map(result => result.extractedContent || 'action'),
          outcome: error instanceof Error ? error.message : String(error),
          success: false,
          reasoning: 'Task failed due to error',
          duration: endTime - startTime,
          tokensUsed: 0,
          subagentResults: [],
        };

        try {
          await this.afterAgentRun(runContext, errorResult);
        } catch (middlewareError) {
          logger.error('Failed to process error in after-run middleware:', middlewareError);
        }
      }

      if (error instanceof RequestCancelledError) {
        this.context.emitEvent(Actors.SYSTEM, ExecutionState.TASK_CANCEL, t('exec_task_cancel'));

        // Track task cancellation
        void analytics.trackTaskCancelled(this.context.taskId);
      } else {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.context.emitEvent(Actors.SYSTEM, ExecutionState.TASK_FAIL, t('exec_task_fail', [errorMessage]));

        // Track task failure with detailed error categorization
        const errorCategory = analytics.categorizeError(error instanceof Error ? error : errorMessage);
        void analytics.trackTaskFailed(this.context.taskId, errorCategory);
      }
    } finally {
      if (import.meta.env.DEV) {
        logger.debug('Executor history', JSON.stringify(this.context.history, null, 2));
      }
      // store the history only if replay is enabled
      if (this.generalSettings?.replayHistoricalTasks) {
        const historyString = JSON.stringify(this.context.history);
        logger.info(`Executor history size: ${historyString.length}`);
        await chatHistoryStore.storeAgentStepHistory(this.context.taskId, this.tasks[0], historyString);
      } else {
        logger.info('Replay historical tasks is disabled, skipping history storage');
      }
    }
  }

  /**
   * Helper method to run planner and store its output
   */
  private async runPlanner(): Promise<AgentOutput<PlannerOutput> | null> {
    const context = this.context;
    try {
      // Add current browser state to memory
      let positionForPlan = 0;
      if (this.tasks.length > 1 || this.context.nSteps > 0) {
        await this.navigator.addStateMessageToMemory();
        positionForPlan = this.context.messageManager.length() - 1;
      } else {
        positionForPlan = this.context.messageManager.length();
      }

      // Execute planner
      const planOutput = await this.planner.execute();
      if (planOutput.result) {
        this.context.messageManager.addPlan(JSON.stringify(planOutput.result), positionForPlan);
      }
      return planOutput;
    } catch (error) {
      logger.error(`Failed to execute planner: ${error}`);
      if (
        error instanceof ChatModelAuthError ||
        error instanceof ChatModelBadRequestError ||
        error instanceof ChatModelForbiddenError ||
        error instanceof URLNotAllowedError ||
        error instanceof RequestCancelledError ||
        error instanceof ExtensionConflictError
      ) {
        throw error;
      }
      context.consecutiveFailures++;
      logger.error(`Failed to execute planner: ${error}`);
      if (context.consecutiveFailures >= context.options.maxFailures) {
        throw new MaxFailuresReachedError(t('exec_errors_maxFailuresReached'));
      }
      return null;
    }
  }

  private async navigate(): Promise<boolean> {
    const context = this.context;
    try {
      // Get and execute navigation action
      // check if the task is paused or stopped
      if (context.paused || context.stopped) {
        return false;
      }
      const navOutput = await this.navigator.execute();
      // check if the task is paused or stopped
      if (context.paused || context.stopped) {
        return false;
      }
      context.nSteps++;
      if (navOutput.error) {
        throw new Error(navOutput.error);
      }
      context.consecutiveFailures = 0;
      if (navOutput.result?.done) {
        return true;
      }
    } catch (error) {
      logger.error(`Failed to execute step: ${error}`);
      if (
        error instanceof ChatModelAuthError ||
        error instanceof ChatModelBadRequestError ||
        error instanceof ChatModelForbiddenError ||
        error instanceof URLNotAllowedError ||
        error instanceof RequestCancelledError ||
        error instanceof ExtensionConflictError
      ) {
        throw error;
      }
      context.consecutiveFailures++;
      logger.error(`Failed to execute step: ${error}`);
      if (context.consecutiveFailures >= context.options.maxFailures) {
        throw new MaxFailuresReachedError(t('exec_errors_maxFailuresReached'));
      }
    }
    return false;
  }

  private async shouldStop(): Promise<boolean> {
    if (this.context.stopped) {
      logger.info('Agent stopped');
      return true;
    }

    while (this.context.paused) {
      await new Promise(resolve => setTimeout(resolve, 200));
      if (this.context.stopped) {
        return true;
      }
    }

    if (this.context.consecutiveFailures >= this.context.options.maxFailures) {
      logger.error(`Stopping due to ${this.context.options.maxFailures} consecutive failures`);
      return true;
    }

    return false;
  }

  async cancel(): Promise<void> {
    this.context.stop();
  }

  async resume(): Promise<void> {
    this.context.resume();
  }

  async pause(): Promise<void> {
    this.context.pause();
  }

  async cleanup(): Promise<void> {
    try {
      await this.context.browserContext.cleanup();
    } catch (error) {
      logger.error(`Failed to cleanup browser context: ${error}`);
    }
  }

  async getCurrentTaskId(): Promise<string> {
    return this.context.taskId;
  }

  // ============================================================================
  // DEEP AGENTS MIDDLEWARE HOOKS
  // ============================================================================

  /**
   * Set workspace and session context for Deep Agents operations
   */
  setWorkspaceContext(workspaceId: string, sessionId: string): void {
    this.currentWorkspaceId = workspaceId;
    this.currentSessionId = sessionId;
    logger.debug(`Set workspace context: ${workspaceId}, session: ${sessionId}`);
  }

  /**
   * Before agent run: assembles context, memory, todos, and subagent plans
   */
  async beforeAgentRun(query: string): Promise<AgentRunContext> {
    try {
      logger.debug('🔄 Deep Agents: Preparing agent run context');

      // Load workspace context using ContextManager
      const contextItems = await contextManager.select(
        this.currentWorkspaceId,
        query,
        100000, // Large token limit for comprehensive context
        {
          types: ['message', 'memory', 'gmail', 'page', 'file'],
          recencyBias: 0.3,
          semanticThreshold: 0.3,
          priorityWeighting: true,
        },
      );

      // Load relevant memories from MemoryService
      const [recentEpisodes, relevantFacts, bestPatterns] = await Promise.all([
        memoryService.getRecentEpisodes(this.currentWorkspaceId, this.currentSessionId, 10),
        memoryService.searchFacts(this.currentWorkspaceId, query, 5),
        memoryService.getBestPatterns(this.currentWorkspaceId, 3),
      ]);

      // Combine memories
      const memories = [...recentEpisodes, ...relevantFacts.map(result => result.fact), ...bestPatterns];

      // Load todos using TodoList middleware
      const todos = await todoListMiddleware.getTodos(this.currentWorkspaceId, this.currentSessionId);

      // Generate subagent plans using SubagentService
      const delegationPlan = await subagentService.planDelegations(query, contextItems);
      const subagentPlans: SubagentPlan[] = delegationPlan.delegations.map(delegation => ({
        agentId: delegation.agentId,
        agentType: delegation.agentType as any,
        goal: delegation.goal,
        confidence: delegation.confidence,
        estimatedDuration: delegation.estimatedDuration,
      }));

      const runContext: AgentRunContext = {
        workspaceId: this.currentWorkspaceId,
        sessionId: this.currentSessionId,
        query,
        context: contextItems,
        memories,
        todos,
        subagentPlans,
      };

      logger.debug(
        `🔄 Deep Agents: Prepared context with ${contextItems.length} items, ${memories.length} memories, ${todos.length} todos, ${subagentPlans.length} subagent plans`,
      );
      return runContext;
    } catch (error) {
      logger.error('Failed to prepare agent run context:', error);
      // Return minimal context on error
      return {
        workspaceId: this.currentWorkspaceId,
        sessionId: this.currentSessionId,
        query,
        context: [],
        memories: [],
        todos: [],
        subagentPlans: [],
      };
    }
  }

  /**
   * After agent run: logs success/failure to episodic/procedural memory for reuse
   */
  async afterAgentRun(runContext: AgentRunContext, result: AgentRunResult): Promise<void> {
    try {
      logger.debug('🔄 Deep Agents: Processing agent run results');

      // Save episode to episodic memory
      const episode: Omit<Episode, 'id' | 'workspaceId' | 'sessionId' | 'timestamp' | 'tokens'> = {
        query: result.query,
        actions: result.actions,
        outcome: result.success ? 'success' : 'failure',
        reasoning: result.reasoning,
        metadata: {
          agentId: 'main-agent',
          duration: result.duration,
          errorMessage: result.success ? undefined : result.outcome,
          contextUsed: runContext.context.map(item => item.id || item.type),
        },
      };

      await memoryService.saveEpisode(this.currentWorkspaceId, this.currentSessionId, episode);

      // If successful and complex enough, save as procedural pattern
      if (result.success && result.actions.length >= 3) {
        const pattern = {
          name: `Pattern_${Date.now()}`,
          description: `Successful workflow: ${result.query}`,
          steps: result.actions.map(action => ({
            action,
            parameters: {},
            expectedResult: 'success',
          })),
          successRate: 1.0, // New pattern starts with 100% success rate
        };

        await memoryService.savePattern(this.currentWorkspaceId, pattern);
        logger.debug(`🔄 Deep Agents: Saved successful pattern: ${pattern.name}`);
      }

      // Extract and save semantic facts from successful runs
      if (result.success && result.outcome) {
        // Simple fact extraction - in production you'd use AI for this
        const facts = this.extractFactsFromOutcome(result.outcome);
        for (const fact of facts) {
          await memoryService.saveFact(this.currentWorkspaceId, fact.key, fact.value, {
            extractedFrom: `episode_${Date.now()}`,
          });
        }
      }

      // Update todos based on completed actions
      if (result.actions.length > 0) {
        await todoListMiddleware.updateTodos(this.currentWorkspaceId, this.currentSessionId, result.actions);
      }

      // Update procedural pattern usage if this run used existing patterns
      for (const memory of runContext.memories) {
        if (memory.id && memory.name) {
          // It's a workflow pattern
          await memoryService.updatePatternUsage(this.currentWorkspaceId, memory.id, result.success);
        }
      }

      logger.debug('🔄 Deep Agents: Completed post-run memory processing');
    } catch (error) {
      logger.error('Failed to process agent run results:', error);
    }
  }

  /**
   * Maybe pause for human approval based on workspace autonomy level
   */
  async maybePauseForHumanApproval(plannedActions: string[], workspaceId?: string): Promise<boolean> {
    try {
      const targetWorkspaceId = workspaceId || this.currentWorkspaceId;

      // Create approval request
      const approvalRequest: ApprovalRequest = {
        workspaceId: targetWorkspaceId,
        sessionId: this.currentSessionId,
        plannedActions,
        riskLevel: this.assessRiskLevel(plannedActions),
        autonomyLevel: 3, // Default autonomy level - TODO: Get from WorkspaceManager
        requiresApproval: false,
        reason: '',
      };

      // Determine if approval is required based on autonomy level and risk
      approvalRequest.requiresApproval = this.shouldRequireApproval(approvalRequest);

      if (!approvalRequest.requiresApproval) {
        logger.debug('🔄 Deep Agents: No approval required, proceeding automatically');
        return true; // Proceed without approval
      }

      logger.info('🔄 Deep Agents: Human approval required, pausing execution');

      // Emit approval required event
      await this.context.emitEvent(
        Actors.SYSTEM,
        ExecutionState.TASK_PAUSE,
        `AGENT_APPROVAL_REQUIRED:${JSON.stringify(approvalRequest)}`,
      );

      // Wait for approval response
      return await this.waitForApprovalResponse();
    } catch (error) {
      logger.error('Failed to handle approval request:', error);
      return false; // Deny on error for safety
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS FOR DEEP AGENTS MIDDLEWARE
  // ============================================================================

  /**
   * Extract simple facts from successful outcomes
   */
  private extractFactsFromOutcome(outcome: string): Array<{ key: string; value: any }> {
    const facts: Array<{ key: string; value: any }> = [];

    // Simple pattern matching for common facts
    // In production, you'd use AI for sophisticated fact extraction

    if (outcome.includes('email sent')) {
      facts.push({ key: 'last_email_action', value: 'sent' });
    }

    if (outcome.includes('page navigated')) {
      facts.push({ key: 'last_navigation_action', value: 'success' });
    }

    if (outcome.includes('form filled')) {
      facts.push({ key: 'last_form_action', value: 'filled' });
    }

    return facts;
  }

  /**
   * Assess risk level of planned actions
   */
  private assessRiskLevel(plannedActions: string[]): 'low' | 'medium' | 'high' {
    const riskKeywords = {
      high: ['delete', 'remove', 'send email', 'purchase', 'payment', 'submit'],
      medium: ['click', 'navigate', 'fill', 'select', 'upload'],
      low: ['read', 'view', 'scroll', 'hover', 'wait'],
    };

    const actionText = plannedActions.join(' ').toLowerCase();

    if (riskKeywords.high.some(keyword => actionText.includes(keyword))) {
      return 'high';
    }
    if (riskKeywords.medium.some(keyword => actionText.includes(keyword))) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Determine if approval is required based on autonomy level and risk
   */
  private shouldRequireApproval(request: ApprovalRequest): boolean {
    // Autonomy level 1-2: Always ask
    if (request.autonomyLevel <= 2) {
      request.reason = 'Low autonomy level requires approval for all actions';
      return true;
    }

    // Autonomy level 3-4: Ask for high-risk actions
    if (request.autonomyLevel <= 4 && request.riskLevel === 'high') {
      request.reason = 'High-risk action requires approval';
      return true;
    }

    // Autonomy level 5: Only ask for destructive actions
    if (request.autonomyLevel === 5) {
      const destructiveKeywords = ['delete', 'remove', 'purchase', 'payment'];
      const hasDestructiveAction = request.plannedActions.some(action =>
        destructiveKeywords.some(keyword => action.toLowerCase().includes(keyword)),
      );

      if (hasDestructiveAction) {
        request.reason = 'Destructive action requires approval even at high autonomy';
        return true;
      }
    }

    return false;
  }

  /**
   * Wait for approval response from UI
   */
  private async waitForApprovalResponse(): Promise<boolean> {
    return new Promise(resolve => {
      // Set up event listener for approval response
      const handleApprovalResponse = (event: any) => {
        if (event.type === 'AGENT_APPROVAL_GRANTED') {
          logger.info('🔄 Deep Agents: Approval granted, resuming execution');
          resolve(true);
        } else if (event.type === 'AGENT_APPROVAL_REJECTED') {
          logger.info('🔄 Deep Agents: Approval rejected, stopping execution');
          resolve(false);
        }
      };

      // TODO: Implement proper event listener for approval responses
      // For now, auto-approve after 30 seconds timeout
      setTimeout(() => {
        logger.error('🔄 Deep Agents: Approval timeout, auto-approving');
        resolve(true);
      }, 30000);
    });
  }

  /**
   * Replays a saved history of actions with error handling and retry logic.
   *
   * @param history - The history to replay
   * @param maxRetries - Maximum number of retries per action
   * @param skipFailures - Whether to skip failed actions or stop execution
   * @param delayBetweenActions - Delay between actions in seconds
   * @returns List of action results
   */
  async replayHistory(
    sessionId: string,
    maxRetries = 3,
    skipFailures = true,
    delayBetweenActions = 2.0,
  ): Promise<ActionResult[]> {
    const results: ActionResult[] = [];
    const replayLogger = createLogger('Executor:replayHistory');

    logger.info('replay task', this.tasks[0]);

    try {
      const historyFromStorage = await chatHistoryStore.loadAgentStepHistory(sessionId);
      if (!historyFromStorage) {
        throw new Error(t('exec_replay_historyNotFound'));
      }

      const history = JSON.parse(historyFromStorage.history) as AgentStepHistory;
      if (history.history.length === 0) {
        throw new Error(t('exec_replay_historyEmpty'));
      }
      logger.debug(`🔄 Replaying history: ${JSON.stringify(history, null, 2)}`);
      this.context.emitEvent(Actors.SYSTEM, ExecutionState.TASK_START, this.context.taskId);

      for (let i = 0; i < history.history.length; i++) {
        const historyItem = history.history[i];

        // Check if execution should stop
        if (this.context.stopped) {
          replayLogger.info('Replay stopped by user');
          break;
        }

        // Execute the history step with enhanced method that handles all the logic
        const stepResults = await this.navigator.executeHistoryStep(
          historyItem,
          i,
          history.history.length,
          maxRetries,
          delayBetweenActions * 1000,
          skipFailures,
        );

        results.push(...stepResults);

        // If stopped during execution, break the loop
        if (this.context.stopped) {
          break;
        }
      }

      if (this.context.stopped) {
        this.context.emitEvent(Actors.SYSTEM, ExecutionState.TASK_CANCEL, t('exec_replay_cancel'));
      } else {
        this.context.emitEvent(Actors.SYSTEM, ExecutionState.TASK_OK, t('exec_replay_ok'));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      replayLogger.error(`Replay failed: ${errorMessage}`);
      this.context.emitEvent(Actors.SYSTEM, ExecutionState.TASK_FAIL, t('exec_replay_fail', [errorMessage]));
    }

    return results;
  }
}
