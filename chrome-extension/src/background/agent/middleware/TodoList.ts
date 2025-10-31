/**
 * TodoList Middleware - Deep Agents Planning Tool
 *
 * Implements Deep Agents TodoList pattern for task decomposition and execution tracking.
 * The TodoList serves as a persistent plan that survives across turns (agent's scratchpad).
 *
 * Integration with SubagentService provides delegation mapping - classify tasks and route
 * to focused subagents following the Deep Agents scaling pattern.
 */

import { langGraphStore, type MemoryNamespace } from '../../../../../packages/storage/lib/chat/LangGraphStore';
import { createLogger } from '@src/background/log';
import { estimateTokenCount } from '@src/utils/tokenEstimator';

const logger = createLogger('TodoListMiddleware');

// ============================================================================
// TODOLIST INTERFACES
// ============================================================================

export interface TodoItem {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'delegated';
  priority: number; // 1-5, higher is more important
  dependencies: string[]; // IDs of other todos this depends on
  assignedAgent?: string; // Which agent is responsible (main, research, writer, etc.)
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  estimatedDuration?: number; // in minutes
  actualDuration?: number; // in minutes
  metadata?: {
    category?: string;
    tags?: string[];
    parentTaskId?: string;
    subTasks?: string[];
  };
}

export interface TodoList {
  id: string;
  workspaceId: string;
  sessionId: string;
  mainTask: string;
  todos: TodoItem[];
  createdAt: number;
  updatedAt: number;
  completionRate: number; // 0-1
  totalEstimatedDuration: number;
  totalActualDuration: number;
}

export interface TaskDecomposition {
  mainTask: string;
  subtasks: SubTask[];
  dependencies: TaskDependency[];
  estimatedDuration: number;
  complexity: 'simple' | 'moderate' | 'complex';
  delegationPlan: SubagentPlan[];
}

export interface SubTask {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  dependencies: string[];
  estimatedDuration: number;
  assignedAgent: string;
  priority: number;
}

export interface TaskDependency {
  fromTaskId: string;
  toTaskId: string;
  type: 'blocks' | 'enables' | 'informs';
}

export interface ProgressReport {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  inProgressTasks: number;
  completionRate: number;
  estimatedTimeRemaining: number;
  blockedTasks: string[];
  nextActions: string[];
}

export interface SubagentPlan {
  agentId: string;
  agentType: 'research' | 'writer' | 'calendar' | 'main';
  goal: string;
  assignedTasks: string[];
  confidence: number; // 0-1
  estimatedDuration: number;
  priority: number;
}

// ============================================================================
// SUBAGENT SERVICE INTERFACES
// ============================================================================

export interface TaskClassification {
  taskType: 'research' | 'writing' | 'calendar' | 'navigation' | 'form_filling' | 'email' | 'general';
  confidence: number;
  reasoning: string;
  suggestedAgent: string;
}

export interface DelegationPlan {
  mainTask: string;
  delegations: SubagentDelegation[];
  fallbackToMain: boolean;
  totalConfidence: number;
}

export interface SubagentDelegation {
  agentId: string;
  agentType: string;
  tasks: string[];
  goal: string;
  confidence: number;
  estimatedDuration: number;
}

// ============================================================================
// TODOLIST MIDDLEWARE IMPLEMENTATION
// ============================================================================

export class TodoListMiddleware {
  private static instance: TodoListMiddleware;

  private constructor() {}

  public static getInstance(): TodoListMiddleware {
    if (!TodoListMiddleware.instance) {
      TodoListMiddleware.instance = new TodoListMiddleware();
    }
    return TodoListMiddleware.instance;
  }

  // ============================================================================
  // CORE TODOLIST OPERATIONS (Deep Agents write_todos pattern)
  // ============================================================================

  /**
   * Write todos using Deep Agents write_todos pattern
   */
  async writeTodos(workspaceId: string, sessionId: string, todos: string[]): Promise<void> {
    try {
      const todoList = await this.getOrCreateTodoList(workspaceId, sessionId, 'Main Task');

      // Convert string todos to TodoItem objects
      const todoItems: TodoItem[] = todos.map((description, index) => ({
        id: crypto.randomUUID(),
        description,
        status: 'pending',
        priority: 3, // Default priority
        dependencies: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        estimatedDuration: this.estimateTaskDuration(description),
      }));

      // Add new todos to the list
      todoList.todos.push(...todoItems);
      todoList.updatedAt = Date.now();
      todoList.completionRate = this.calculateCompletionRate(todoList.todos);

      // Save updated todo list
      await this.saveTodoList(todoList);

      logger.debug(`Added ${todos.length} todos to workspace ${workspaceId}, session ${sessionId}`);
    } catch (error) {
      logger.error('Failed to write todos:', error);
      throw error;
    }
  }

  /**
   * Get current todos for a session
   */
  async getTodos(workspaceId: string, sessionId: string): Promise<string[]> {
    try {
      const todoList = await this.loadTodoList(workspaceId, sessionId);

      if (!todoList) {
        return [];
      }

      // Return pending and in-progress todos as strings
      return todoList.todos
        .filter(todo => todo.status === 'pending' || todo.status === 'in_progress')
        .sort((a, b) => b.priority - a.priority) // Sort by priority
        .map(todo => todo.description);
    } catch (error) {
      logger.error('Failed to get todos:', error);
      return [];
    }
  }

  /**
   * Update todos based on completed actions
   */
  async updateTodos(workspaceId: string, sessionId: string, completedActions: string[]): Promise<void> {
    try {
      const todoList = await this.loadTodoList(workspaceId, sessionId);

      if (!todoList) {
        logger.error('No todo list found for update');
        return;
      }

      // Mark todos as completed based on action descriptions
      for (const action of completedActions) {
        const matchingTodo = todoList.todos.find(
          todo => todo.status !== 'completed' && this.actionMatchesTodo(action, todo.description),
        );

        if (matchingTodo) {
          matchingTodo.status = 'completed';
          matchingTodo.completedAt = Date.now();
          matchingTodo.updatedAt = Date.now();

          if (matchingTodo.createdAt && matchingTodo.completedAt) {
            matchingTodo.actualDuration = Math.round((matchingTodo.completedAt - matchingTodo.createdAt) / 60000); // minutes
          }

          logger.debug(`Marked todo as completed: ${matchingTodo.description}`);
        }
      }

      // Update completion rate and save
      todoList.completionRate = this.calculateCompletionRate(todoList.todos);
      todoList.updatedAt = Date.now();
      await this.saveTodoList(todoList);
    } catch (error) {
      logger.error('Failed to update todos:', error);
      throw error;
    }
  }

  // ============================================================================
  // TASK DECOMPOSITION AND PLANNING
  // ============================================================================

  /**
   * Decompose complex task into manageable subtasks
   */
  async decomposeTasks(workspaceId: string, complexTask: string): Promise<TaskDecomposition> {
    try {
      // Simple task decomposition logic
      // In production, you'd use AI for sophisticated decomposition
      const subtasks = this.simpleTaskDecomposition(complexTask);
      const dependencies = this.inferTaskDependencies(subtasks);
      const estimatedDuration = subtasks.reduce((sum, task) => sum + task.estimatedDuration, 0);

      // Generate delegation plan using SubagentService
      const subagentService = SubagentService.getInstance();
      const delegationPlan = await subagentService.planDelegations(complexTask, []);

      const decomposition: TaskDecomposition = {
        mainTask: complexTask,
        subtasks,
        dependencies,
        estimatedDuration,
        complexity: this.assessTaskComplexity(subtasks.length, estimatedDuration),
        delegationPlan: delegationPlan.delegations.map(delegation => ({
          agentId: delegation.agentId,
          agentType: delegation.agentType as any,
          goal: delegation.goal,
          assignedTasks: delegation.tasks,
          confidence: delegation.confidence,
          estimatedDuration: delegation.estimatedDuration,
          priority: 3, // Default priority
        })),
      };

      logger.debug(`Decomposed task "${complexTask}" into ${subtasks.length} subtasks`);
      return decomposition;
    } catch (error) {
      logger.error('Failed to decompose tasks:', error);
      throw error;
    }
  }

  /**
   * Track progress of current todo list
   */
  async trackProgress(workspaceId: string, sessionId: string): Promise<ProgressReport> {
    try {
      const todoList = await this.loadTodoList(workspaceId, sessionId);

      if (!todoList) {
        return {
          totalTasks: 0,
          completedTasks: 0,
          failedTasks: 0,
          inProgressTasks: 0,
          completionRate: 0,
          estimatedTimeRemaining: 0,
          blockedTasks: [],
          nextActions: [],
        };
      }

      const todos = todoList.todos;
      const completedTasks = todos.filter(t => t.status === 'completed').length;
      const failedTasks = todos.filter(t => t.status === 'failed').length;
      const inProgressTasks = todos.filter(t => t.status === 'in_progress').length;

      // Find blocked tasks (tasks with incomplete dependencies)
      const blockedTasks = todos
        .filter(todo => todo.dependencies.length > 0)
        .filter(todo => {
          const incompleteDeps = todo.dependencies.filter(depId => {
            const depTodo = todos.find(t => t.id === depId);
            return depTodo && depTodo.status !== 'completed';
          });
          return incompleteDeps.length > 0;
        })
        .map(todo => todo.description);

      // Find next actionable tasks (pending tasks with no incomplete dependencies)
      const nextActions = todos
        .filter(todo => todo.status === 'pending')
        .filter(todo => {
          if (todo.dependencies.length === 0) return true;
          const incompleteDeps = todo.dependencies.filter(depId => {
            const depTodo = todos.find(t => t.id === depId);
            return depTodo && depTodo.status !== 'completed';
          });
          return incompleteDeps.length === 0;
        })
        .sort((a, b) => b.priority - a.priority)
        .slice(0, 3) // Top 3 next actions
        .map(todo => todo.description);

      // Estimate remaining time
      const remainingTasks = todos.filter(t => t.status === 'pending' || t.status === 'in_progress');
      const estimatedTimeRemaining = remainingTasks.reduce((sum, task) => sum + (task.estimatedDuration || 0), 0);

      return {
        totalTasks: todos.length,
        completedTasks,
        failedTasks,
        inProgressTasks,
        completionRate: todoList.completionRate,
        estimatedTimeRemaining,
        blockedTasks,
        nextActions,
      };
    } catch (error) {
      logger.error('Failed to track progress:', error);
      throw error;
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Get or create todo list for workspace/session
   */
  private async getOrCreateTodoList(workspaceId: string, sessionId: string, mainTask: string): Promise<TodoList> {
    let todoList = await this.loadTodoList(workspaceId, sessionId);

    if (!todoList) {
      todoList = {
        id: crypto.randomUUID(),
        workspaceId,
        sessionId,
        mainTask,
        todos: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        completionRate: 0,
        totalEstimatedDuration: 0,
        totalActualDuration: 0,
      };
    }

    return todoList;
  }

  /**
   * Load todo list from storage
   */
  private async loadTodoList(workspaceId: string, sessionId: string): Promise<TodoList | null> {
    try {
      const namespace: MemoryNamespace = {
        userId: 'default',
        workspaceId,
        threadId: sessionId,
      };

      const key = `todolist_${sessionId}`;
      const todoList = await langGraphStore.get(namespace, key);
      return todoList;
    } catch (error) {
      logger.error('Failed to load todo list:', error);
      return null;
    }
  }

  /**
   * Save todo list to storage
   */
  private async saveTodoList(todoList: TodoList): Promise<void> {
    try {
      const namespace: MemoryNamespace = {
        userId: 'default',
        workspaceId: todoList.workspaceId,
        threadId: todoList.sessionId,
      };

      const key = `todolist_${todoList.sessionId}`;
      await langGraphStore.put(namespace, key, todoList);
    } catch (error) {
      logger.error('Failed to save todo list:', error);
      throw error;
    }
  }

  /**
   * Calculate completion rate for todos
   */
  private calculateCompletionRate(todos: TodoItem[]): number {
    if (todos.length === 0) return 0;
    const completed = todos.filter(todo => todo.status === 'completed').length;
    return completed / todos.length;
  }

  /**
   * Check if an action description matches a todo description
   */
  private actionMatchesTodo(action: string, todoDescription: string): boolean {
    // Simple keyword matching - in production you'd use semantic similarity
    const actionWords = action.toLowerCase().split(/\s+/);
    const todoWords = todoDescription.toLowerCase().split(/\s+/);

    const commonWords = actionWords.filter(word => todoWords.includes(word));
    return commonWords.length >= Math.min(2, todoWords.length / 2);
  }

  /**
   * Estimate task duration based on description
   */
  private estimateTaskDuration(description: string): number {
    // Simple heuristic - in production you'd use ML or historical data
    const words = description.split(/\s+/).length;

    if (words <= 3) return 5; // 5 minutes for simple tasks
    if (words <= 6) return 15; // 15 minutes for moderate tasks
    if (words <= 10) return 30; // 30 minutes for complex tasks
    return 60; // 1 hour for very complex tasks
  }

  /**
   * Simple task decomposition logic
   */
  private simpleTaskDecomposition(complexTask: string): SubTask[] {
    // This is a simplified implementation
    // In production, you'd use AI for sophisticated task decomposition

    const subtasks: SubTask[] = [];
    const taskLower = complexTask.toLowerCase();

    // Common task patterns
    if (taskLower.includes('email')) {
      subtasks.push({
        id: crypto.randomUUID(),
        description: 'Open email application',
        status: 'pending',
        dependencies: [],
        estimatedDuration: 2,
        assignedAgent: 'main',
        priority: 3,
      });
      subtasks.push({
        id: crypto.randomUUID(),
        description: 'Compose email content',
        status: 'pending',
        dependencies: [subtasks[0].id],
        estimatedDuration: 10,
        assignedAgent: 'writer',
        priority: 4,
      });
      subtasks.push({
        id: crypto.randomUUID(),
        description: 'Send email',
        status: 'pending',
        dependencies: [subtasks[1].id],
        estimatedDuration: 1,
        assignedAgent: 'main',
        priority: 5,
      });
    } else if (taskLower.includes('research')) {
      subtasks.push({
        id: crypto.randomUUID(),
        description: 'Define research scope',
        status: 'pending',
        dependencies: [],
        estimatedDuration: 5,
        assignedAgent: 'research',
        priority: 4,
      });
      subtasks.push({
        id: crypto.randomUUID(),
        description: 'Gather information',
        status: 'pending',
        dependencies: [subtasks[0].id],
        estimatedDuration: 20,
        assignedAgent: 'research',
        priority: 5,
      });
      subtasks.push({
        id: crypto.randomUUID(),
        description: 'Summarize findings',
        status: 'pending',
        dependencies: [subtasks[1].id],
        estimatedDuration: 10,
        assignedAgent: 'writer',
        priority: 3,
      });
    } else {
      // Generic decomposition
      subtasks.push({
        id: crypto.randomUUID(),
        description: `Plan: ${complexTask}`,
        status: 'pending',
        dependencies: [],
        estimatedDuration: 5,
        assignedAgent: 'main',
        priority: 3,
      });
      subtasks.push({
        id: crypto.randomUUID(),
        description: `Execute: ${complexTask}`,
        status: 'pending',
        dependencies: [subtasks[0].id],
        estimatedDuration: 15,
        assignedAgent: 'main',
        priority: 4,
      });
      subtasks.push({
        id: crypto.randomUUID(),
        description: `Verify: ${complexTask}`,
        status: 'pending',
        dependencies: [subtasks[1].id],
        estimatedDuration: 5,
        assignedAgent: 'main',
        priority: 2,
      });
    }

    return subtasks;
  }

  /**
   * Infer task dependencies from subtasks
   */
  private inferTaskDependencies(subtasks: SubTask[]): TaskDependency[] {
    const dependencies: TaskDependency[] = [];

    for (const subtask of subtasks) {
      for (const depId of subtask.dependencies) {
        dependencies.push({
          fromTaskId: depId,
          toTaskId: subtask.id,
          type: 'blocks', // Default dependency type
        });
      }
    }

    return dependencies;
  }

  /**
   * Assess task complexity based on subtasks and duration
   */
  private assessTaskComplexity(subtaskCount: number, totalDuration: number): 'simple' | 'moderate' | 'complex' {
    if (subtaskCount <= 2 && totalDuration <= 15) return 'simple';
    if (subtaskCount <= 5 && totalDuration <= 60) return 'moderate';
    return 'complex';
  }
}

// ============================================================================
// SUBAGENT SERVICE IMPLEMENTATION
// ============================================================================

/**
 * SubagentService - Delegation mapping for Deep Agents
 *
 * Classifies tasks and routes them to focused subagents following the
 * Deep Agents scaling pattern where planner breaks work into explicit
 * subtasks for helper agents.
 */
export class SubagentService {
  private static instance: SubagentService;

  private constructor() {}

  public static getInstance(): SubagentService {
    if (!SubagentService.instance) {
      SubagentService.instance = new SubagentService();
    }
    return SubagentService.instance;
  }

  /**
   * Plan delegations for a complex task
   * CRITICAL: This replaces the placeholder implementation
   */
  async planDelegations(mainTask: string, contextItems: any[]): Promise<DelegationPlan> {
    try {
      logger.debug(`Planning delegations for task: ${mainTask}`);

      // Classify the main task type
      const taskClassification = await this.classifyTaskType(mainTask);

      // Generate delegation plan based on task type and complexity
      const delegations: SubagentDelegation[] = [];
      let totalConfidence = 0;

      // Research tasks
      if (taskClassification.taskType === 'research' || mainTask.toLowerCase().includes('research')) {
        delegations.push({
          agentId: 'research-agent',
          agentType: 'research',
          tasks: [`Research: ${mainTask}`],
          goal: `Gather comprehensive information about: ${mainTask}`,
          confidence: 0.8,
          estimatedDuration: 20,
        });
        totalConfidence += 0.8;
      }

      // Writing tasks
      if (
        taskClassification.taskType === 'writing' ||
        mainTask.toLowerCase().includes('write') ||
        mainTask.toLowerCase().includes('email')
      ) {
        delegations.push({
          agentId: 'writer-agent',
          agentType: 'writer',
          tasks: [`Write content for: ${mainTask}`],
          goal: `Create well-structured content for: ${mainTask}`,
          confidence: 0.7,
          estimatedDuration: 15,
        });
        totalConfidence += 0.7;
      }

      // Calendar tasks
      if (
        taskClassification.taskType === 'calendar' ||
        mainTask.toLowerCase().includes('calendar') ||
        mainTask.toLowerCase().includes('schedule')
      ) {
        delegations.push({
          agentId: 'calendar-agent',
          agentType: 'calendar',
          tasks: [`Manage calendar for: ${mainTask}`],
          goal: `Handle scheduling aspects of: ${mainTask}`,
          confidence: 0.6,
          estimatedDuration: 10,
        });
        totalConfidence += 0.6;
      }

      // If no specific delegations or low confidence, fallback to main agent
      const fallbackToMain = delegations.length === 0 || totalConfidence < 0.5;

      if (fallbackToMain) {
        delegations.push({
          agentId: 'main-agent',
          agentType: 'main',
          tasks: [mainTask],
          goal: `Complete task: ${mainTask}`,
          confidence: 0.9, // Main agent has high confidence as fallback
          estimatedDuration: 30,
        });
        totalConfidence = 0.9;
      }

      const plan: DelegationPlan = {
        mainTask,
        delegations,
        fallbackToMain,
        totalConfidence: totalConfidence / delegations.length, // Average confidence
      };

      logger.debug(
        `Generated delegation plan with ${delegations.length} delegations, confidence: ${plan.totalConfidence}`,
      );
      return plan;
    } catch (error) {
      logger.error('Failed to plan delegations:', error);

      // Return fallback plan on error
      return {
        mainTask,
        delegations: [
          {
            agentId: 'main-agent',
            agentType: 'main',
            tasks: [mainTask],
            goal: `Complete task: ${mainTask}`,
            confidence: 0.5,
            estimatedDuration: 30,
          },
        ],
        fallbackToMain: true,
        totalConfidence: 0.5,
      };
    }
  }

  /**
   * Classify task type for agent routing
   * CRITICAL: This implements the actual classification logic
   */
  async classifyTaskType(task: string): Promise<TaskClassification> {
    try {
      const taskLower = task.toLowerCase();

      // Research classification
      if (
        taskLower.includes('research') ||
        taskLower.includes('find') ||
        taskLower.includes('search') ||
        taskLower.includes('investigate')
      ) {
        return {
          taskType: 'research',
          confidence: 0.8,
          reasoning: 'Task contains research-related keywords',
          suggestedAgent: 'research-agent',
        };
      }

      // Writing classification
      if (
        taskLower.includes('write') ||
        taskLower.includes('compose') ||
        taskLower.includes('draft') ||
        taskLower.includes('email')
      ) {
        return {
          taskType: 'writing',
          confidence: 0.7,
          reasoning: 'Task contains writing-related keywords',
          suggestedAgent: 'writer-agent',
        };
      }

      // Calendar classification
      if (
        taskLower.includes('calendar') ||
        taskLower.includes('schedule') ||
        taskLower.includes('meeting') ||
        taskLower.includes('appointment')
      ) {
        return {
          taskType: 'calendar',
          confidence: 0.6,
          reasoning: 'Task contains calendar-related keywords',
          suggestedAgent: 'calendar-agent',
        };
      }

      // Navigation classification
      if (
        taskLower.includes('navigate') ||
        taskLower.includes('go to') ||
        taskLower.includes('visit') ||
        taskLower.includes('open')
      ) {
        return {
          taskType: 'navigation',
          confidence: 0.5,
          reasoning: 'Task contains navigation-related keywords',
          suggestedAgent: 'main-agent',
        };
      }

      // Form filling classification
      if (
        taskLower.includes('fill') ||
        taskLower.includes('form') ||
        taskLower.includes('submit') ||
        taskLower.includes('enter')
      ) {
        return {
          taskType: 'form_filling',
          confidence: 0.5,
          reasoning: 'Task contains form-related keywords',
          suggestedAgent: 'main-agent',
        };
      }

      // Email classification
      if (taskLower.includes('email') || taskLower.includes('send') || taskLower.includes('reply')) {
        return {
          taskType: 'email',
          confidence: 0.6,
          reasoning: 'Task contains email-related keywords',
          suggestedAgent: 'writer-agent',
        };
      }

      // Default to general
      return {
        taskType: 'general',
        confidence: 0.3,
        reasoning: 'No specific task type identified',
        suggestedAgent: 'main-agent',
      };
    } catch (error) {
      logger.error('Failed to classify task type:', error);

      // Return safe default on error
      return {
        taskType: 'general',
        confidence: 0.1,
        reasoning: 'Classification failed, defaulting to general',
        suggestedAgent: 'main-agent',
      };
    }
  }

  /**
   * Get available subagent types and their capabilities
   */
  getAvailableAgents(): Array<{ id: string; type: string; capabilities: string[]; confidence: number }> {
    return [
      {
        id: 'research-agent',
        type: 'research',
        capabilities: ['web search', 'information gathering', 'fact checking', 'data analysis'],
        confidence: 0.8,
      },
      {
        id: 'writer-agent',
        type: 'writer',
        capabilities: ['content creation', 'email composition', 'text editing', 'summarization'],
        confidence: 0.7,
      },
      {
        id: 'calendar-agent',
        type: 'calendar',
        capabilities: ['scheduling', 'meeting management', 'time planning', 'availability checking'],
        confidence: 0.6,
      },
      {
        id: 'main-agent',
        type: 'main',
        capabilities: ['navigation', 'form filling', 'general tasks', 'coordination'],
        confidence: 0.9,
      },
    ];
  }
}

// Export singleton instances
export const todoListMiddleware = TodoListMiddleware.getInstance();
export const subagentService = SubagentService.getInstance();
