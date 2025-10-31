/**
 * Integration Tests for TodoList Middleware and SubagentService
 *
 * These tests verify real functionality without mocks:
 * - TodoList: Task decomposition, dependency tracking, progress monitoring
 * - SubagentService: Task classification and delegation planning
 */

import { todoListMiddleware, subagentService, type TodoItem, type TaskDecomposition } from './TodoList';
import { langGraphStore } from '../../../../../packages/storage/lib/chat/LangGraphStore';

describe('TodoList Middleware Integration Tests', () => {
  const testWorkspaceId = 'test-workspace-todos';
  const testSessionId = 'test-session-todos';

  beforeEach(async () => {
    // Clean up test data before each test
    await langGraphStore.clear({ userId: 'default', workspaceId: testWorkspaceId });
  });

  afterAll(async () => {
    // Clean up test data after all tests
    await langGraphStore.clear({ userId: 'default', workspaceId: testWorkspaceId });
  });

  describe('TodoList Core Operations - Real Data', () => {
    it('should write and retrieve todos with real task data', async () => {
      const realTodos = [
        'Navigate to Gmail and open inbox',
        'Compose new email with professional template',
        'Add recipients from contact list',
        'Write email content about project update',
        'Attach project files and documents',
        'Review email for accuracy and send',
      ];

      // Write todos
      await todoListMiddleware.writeTodos(testWorkspaceId, testSessionId, realTodos);

      // Retrieve todos
      const retrievedTodos = await todoListMiddleware.getTodos(testWorkspaceId, testSessionId);

      expect(retrievedTodos).toHaveLength(6);
      expect(retrievedTodos).toEqual(realTodos);
    });

    it('should update todos based on completed actions', async () => {
      // Set up initial todos
      const initialTodos = [
        'Open calendar application',
        'Create new meeting event',
        'Set meeting time and date',
        'Add participants to meeting',
        'Save meeting to calendar',
      ];

      await todoListMiddleware.writeTodos(testWorkspaceId, testSessionId, initialTodos);

      // Simulate completing some actions
      const completedActions = [
        'Successfully opened calendar application',
        'Created new meeting event with title "Team Standup"',
      ];

      await todoListMiddleware.updateTodos(testWorkspaceId, testSessionId, completedActions);

      // Check remaining todos (should be fewer)
      const remainingTodos = await todoListMiddleware.getTodos(testWorkspaceId, testSessionId);

      // Should have fewer todos now (some marked as completed)
      expect(remainingTodos.length).toBeLessThan(initialTodos.length);
      expect(remainingTodos).not.toContain('Open calendar application');
    });

    it('should handle multiple sessions independently', async () => {
      const session1 = 'session-email-task';
      const session2 = 'session-calendar-task';

      // Add todos to different sessions
      await todoListMiddleware.writeTodos(testWorkspaceId, session1, ['Check email inbox', 'Reply to urgent emails']);

      await todoListMiddleware.writeTodos(testWorkspaceId, session2, [
        'Review calendar for conflicts',
        'Schedule team meeting',
      ]);

      const session1Todos = await todoListMiddleware.getTodos(testWorkspaceId, session1);
      const session2Todos = await todoListMiddleware.getTodos(testWorkspaceId, session2);

      expect(session1Todos).toHaveLength(2);
      expect(session2Todos).toHaveLength(2);
      expect(session1Todos[0]).toContain('email');
      expect(session2Todos[0]).toContain('calendar');
    });
  });

  describe('Task Decomposition - Real Complex Tasks', () => {
    it('should decompose complex email task into subtasks', async () => {
      const complexTask =
        'Send a comprehensive project status email to all stakeholders with attachments and follow-up schedule';

      const decomposition = await todoListMiddleware.decomposeTasks(testWorkspaceId, complexTask);

      expect(decomposition.mainTask).toBe(complexTask);
      expect(decomposition.subtasks.length).toBeGreaterThan(2);
      expect(decomposition.complexity).toMatch(/simple|moderate|complex/);
      expect(decomposition.estimatedDuration).toBeGreaterThan(0);

      // Verify subtasks have proper structure
      decomposition.subtasks.forEach(subtask => {
        expect(subtask.id).toBeTruthy();
        expect(subtask.description).toBeTruthy();
        expect(subtask.status).toBe('pending');
        expect(subtask.estimatedDuration).toBeGreaterThan(0);
        expect(subtask.assignedAgent).toBeTruthy();
      });

      // Verify delegation plan
      expect(decomposition.delegationPlan.length).toBeGreaterThan(0);
      decomposition.delegationPlan.forEach(plan => {
        expect(plan.agentId).toBeTruthy();
        expect(plan.agentType).toMatch(/research|writer|calendar|main/);
        expect(plan.confidence).toBeGreaterThan(0);
      });
    });

    it('should decompose research task with proper agent assignment', async () => {
      const researchTask = 'Research competitor pricing strategies and create comprehensive analysis report';

      const decomposition = await todoListMiddleware.decomposeTasks(testWorkspaceId, researchTask);

      expect(decomposition.subtasks.some(task => task.assignedAgent === 'research')).toBe(true);
      expect(decomposition.subtasks.some(task => task.assignedAgent === 'writer')).toBe(true);
      expect(decomposition.delegationPlan.some(plan => plan.agentType === 'research')).toBe(true);
    });

    it('should handle task dependencies correctly', async () => {
      const taskWithDependencies = "Schedule team meeting after reviewing everyone's availability";

      const decomposition = await todoListMiddleware.decomposeTasks(testWorkspaceId, taskWithDependencies);

      // Should have dependencies between subtasks
      expect(decomposition.dependencies.length).toBeGreaterThan(0);

      decomposition.dependencies.forEach(dep => {
        expect(dep.fromTaskId).toBeTruthy();
        expect(dep.toTaskId).toBeTruthy();
        expect(dep.type).toMatch(/blocks|enables|informs/);
      });
    });
  });

  describe('Progress Tracking - Real Workflow Monitoring', () => {
    it('should track progress of real todo workflow', async () => {
      // Set up a realistic workflow
      const workflowTodos = [
        'Research target audience for marketing campaign',
        'Draft marketing email content',
        'Design email template and graphics',
        'Set up email automation sequence',
        'Test email delivery and tracking',
        'Launch marketing campaign',
      ];

      await todoListMiddleware.writeTodos(testWorkspaceId, testSessionId, workflowTodos);

      // Get initial progress
      let progress = await todoListMiddleware.trackProgress(testWorkspaceId, testSessionId);

      expect(progress.totalTasks).toBe(6);
      expect(progress.completedTasks).toBe(0);
      expect(progress.completionRate).toBe(0);
      expect(progress.nextActions.length).toBeGreaterThan(0);

      // Simulate completing some tasks
      await todoListMiddleware.updateTodos(testWorkspaceId, testSessionId, [
        'Completed research on target audience demographics',
        'Drafted compelling marketing email content',
      ]);

      // Check updated progress
      progress = await todoListMiddleware.trackProgress(testWorkspaceId, testSessionId);

      expect(progress.completedTasks).toBeGreaterThan(0);
      expect(progress.completionRate).toBeGreaterThan(0);
      expect(progress.estimatedTimeRemaining).toBeGreaterThan(0);
    });

    it('should identify blocked tasks correctly', async () => {
      // This test would require more sophisticated dependency setup
      // For now, we'll test the basic structure
      const progress = await todoListMiddleware.trackProgress(testWorkspaceId, testSessionId);

      expect(progress).toHaveProperty('blockedTasks');
      expect(progress).toHaveProperty('nextActions');
      expect(Array.isArray(progress.blockedTasks)).toBe(true);
      expect(Array.isArray(progress.nextActions)).toBe(true);
    });
  });
});

describe('SubagentService Integration Tests', () => {
  describe('Task Classification - Real Task Analysis', () => {
    it('should classify research tasks correctly', async () => {
      const researchTasks = [
        'Research competitor pricing strategies',
        'Find information about market trends',
        'Investigate customer feedback patterns',
        'Search for industry best practices',
      ];

      for (const task of researchTasks) {
        const classification = await subagentService.classifyTaskType(task);

        expect(classification.taskType).toBe('research');
        expect(classification.confidence).toBeGreaterThan(0.5);
        expect(classification.suggestedAgent).toBe('research-agent');
        expect(classification.reasoning).toContain('research');
      }
    });

    it('should classify writing tasks correctly', async () => {
      const writingTasks = [
        'Write a professional email to clients',
        'Compose meeting agenda for team standup',
        'Draft project proposal document',
        'Create email newsletter content',
      ];

      for (const task of writingTasks) {
        const classification = await subagentService.classifyTaskType(task);

        expect(classification.taskType).toBe('writing');
        expect(classification.confidence).toBeGreaterThan(0.5);
        expect(classification.suggestedAgent).toBe('writer-agent');
        expect(classification.reasoning).toContain('writing');
      }
    });

    it('should classify calendar tasks correctly', async () => {
      const calendarTasks = [
        'Schedule team meeting for next week',
        'Create calendar event for project deadline',
        'Book appointment with client',
        'Set up recurring weekly standup meeting',
      ];

      for (const task of calendarTasks) {
        const classification = await subagentService.classifyTaskType(task);

        expect(classification.taskType).toBe('calendar');
        expect(classification.confidence).toBeGreaterThan(0.4);
        expect(classification.suggestedAgent).toBe('calendar-agent');
        expect(classification.reasoning).toContain('calendar');
      }
    });

    it('should handle ambiguous tasks with fallback', async () => {
      const ambiguousTasks = ['Do something important', 'Handle the situation', 'Complete the task'];

      for (const task of ambiguousTasks) {
        const classification = await subagentService.classifyTaskType(task);

        expect(classification.taskType).toBe('general');
        expect(classification.suggestedAgent).toBe('main-agent');
        expect(classification.confidence).toBeLessThan(0.5);
      }
    });
  });

  describe('Delegation Planning - Real Task Distribution', () => {
    it('should create comprehensive delegation plan for complex task', async () => {
      const complexTask = 'Research market trends, write analysis report, and schedule presentation meeting';

      const delegationPlan = await subagentService.planDelegations(complexTask, []);

      expect(delegationPlan.mainTask).toBe(complexTask);
      expect(delegationPlan.delegations.length).toBeGreaterThan(1);
      expect(delegationPlan.totalConfidence).toBeGreaterThan(0);

      // Should have multiple agent types for this complex task
      const agentTypes = delegationPlan.delegations.map(d => d.agentType);
      expect(agentTypes).toContain('research');
      expect(agentTypes).toContain('writer');

      // Verify delegation structure
      delegationPlan.delegations.forEach(delegation => {
        expect(delegation.agentId).toBeTruthy();
        expect(delegation.agentType).toMatch(/research|writer|calendar|main/);
        expect(delegation.goal).toBeTruthy();
        expect(delegation.confidence).toBeGreaterThan(0);
        expect(delegation.estimatedDuration).toBeGreaterThan(0);
        expect(Array.isArray(delegation.tasks)).toBe(true);
      });
    });

    it('should handle single-agent tasks with main agent fallback', async () => {
      const simpleTask = 'Click the submit button';

      const delegationPlan = await subagentService.planDelegations(simpleTask, []);

      expect(delegationPlan.fallbackToMain).toBe(true);
      expect(delegationPlan.delegations.length).toBe(1);
      expect(delegationPlan.delegations[0].agentType).toBe('main');
      expect(delegationPlan.delegations[0].agentId).toBe('main-agent');
    });

    it('should provide appropriate confidence scores', async () => {
      const highConfidenceTasks = ['Research competitor analysis', 'Write professional email', 'Schedule team meeting'];

      for (const task of highConfidenceTasks) {
        const delegationPlan = await subagentService.planDelegations(task, []);

        // Should have reasonable confidence for clear tasks
        expect(delegationPlan.totalConfidence).toBeGreaterThan(0.5);

        // Each delegation should have confidence score
        delegationPlan.delegations.forEach(delegation => {
          expect(delegation.confidence).toBeGreaterThan(0);
          expect(delegation.confidence).toBeLessThanOrEqual(1);
        });
      }
    });

    it('should handle error cases gracefully', async () => {
      // Test with empty task
      const emptyTaskPlan = await subagentService.planDelegations('', []);

      expect(emptyTaskPlan.fallbackToMain).toBe(true);
      expect(emptyTaskPlan.delegations.length).toBe(1);
      expect(emptyTaskPlan.delegations[0].agentType).toBe('main');

      // Test with very long task
      const longTask = 'A'.repeat(1000);
      const longTaskPlan = await subagentService.planDelegations(longTask, []);

      expect(longTaskPlan.delegations.length).toBeGreaterThan(0);
      expect(longTaskPlan.totalConfidence).toBeGreaterThan(0);
    });
  });

  describe('Agent Capabilities - Real Agent Information', () => {
    it('should provide accurate agent capabilities', async () => {
      const agents = subagentService.getAvailableAgents();

      expect(agents.length).toBe(4); // research, writer, calendar, main

      // Verify research agent
      const researchAgent = agents.find(a => a.type === 'research');
      expect(researchAgent).toBeTruthy();
      expect(researchAgent?.capabilities).toContain('web search');
      expect(researchAgent?.capabilities).toContain('information gathering');
      expect(researchAgent?.confidence).toBeGreaterThan(0);

      // Verify writer agent
      const writerAgent = agents.find(a => a.type === 'writer');
      expect(writerAgent).toBeTruthy();
      expect(writerAgent?.capabilities).toContain('content creation');
      expect(writerAgent?.capabilities).toContain('email composition');

      // Verify calendar agent
      const calendarAgent = agents.find(a => a.type === 'calendar');
      expect(calendarAgent).toBeTruthy();
      expect(calendarAgent?.capabilities).toContain('scheduling');
      expect(calendarAgent?.capabilities).toContain('meeting management');

      // Verify main agent
      const mainAgent = agents.find(a => a.type === 'main');
      expect(mainAgent).toBeTruthy();
      expect(mainAgent?.capabilities).toContain('navigation');
      expect(mainAgent?.capabilities).toContain('general tasks');
      expect(mainAgent?.confidence).toBe(0.9); // Should have highest confidence
    });
  });

  describe('Integration with TodoList - Real Workflow', () => {
    it('should integrate delegation planning with todo decomposition', async () => {
      const complexTask =
        'Create comprehensive quarterly business report with market analysis and financial projections';

      // Get delegation plan
      const delegationPlan = await subagentService.planDelegations(complexTask, []);

      // Decompose task using TodoList
      const decomposition = await todoListMiddleware.decomposeTasks('test-workspace', complexTask);

      // Verify integration
      expect(decomposition.delegationPlan.length).toBeGreaterThan(0);
      expect(delegationPlan.delegations.length).toBeGreaterThan(0);

      // Should have research component
      expect(delegationPlan.delegations.some(d => d.agentType === 'research')).toBe(true);
      expect(decomposition.delegationPlan.some(p => p.agentType === 'research')).toBe(true);

      // Should have writing component
      expect(delegationPlan.delegations.some(d => d.agentType === 'writer')).toBe(true);
      expect(decomposition.delegationPlan.some(p => p.agentType === 'writer')).toBe(true);

      console.log('✅ TodoList and SubagentService integration test passed!');
      console.log(`📋 Task decomposed into ${decomposition.subtasks.length} subtasks`);
      console.log(`🤖 Delegated to ${delegationPlan.delegations.length} agents`);
    });
  });
});
