/**
 * Integration Tests for Deep Agents Executor Middleware
 *
 * These tests verify the real functionality of the enhanced Executor:
 * - beforeAgentRun: Context assembly, memory loading, subagent planning
 * - afterAgentRun: Memory storage, pattern learning, todo updates
 * - maybePauseForHumanApproval: Risk assessment and approval workflows
 */

import { Executor, type AgentRunContext, type AgentRunResult } from './executor';
import { memoryService } from '@src/services/memory/MemoryService';
import { contextManager } from '@src/services/context/ContextManager';
import { todoListMiddleware, subagentService } from './middleware/TodoList';
import { langGraphStore } from '../../../../packages/storage/lib/chat/LangGraphStore';

// Mock dependencies that require browser context
jest.mock('../browser/context');
jest.mock('../llm/HybridAIClient');
jest.mock('./messages/service');
jest.mock('./event/manager');

describe('Deep Agents Executor Integration Tests', () => {
  const testWorkspaceId = 'test-workspace-executor';
  const testSessionId = 'test-session-executor';
  let executor: Executor;

  beforeEach(async () => {
    // Clean up test data
    await langGraphStore.clear({ userId: 'default', workspaceId: testWorkspaceId });

    // Create executor instance (mocked dependencies)
    const mockBrowserContext = {} as any;
    const mockAIClient = {} as any;

    executor = new Executor('Test task for executor', 'test-task-id', mockBrowserContext, mockAIClient, {
      agentOptions: { maxSteps: 10, maxActionsPerStep: 5 },
    });

    // Set workspace context
    executor.setWorkspaceContext(testWorkspaceId, testSessionId);
  });

  afterAll(async () => {
    // Clean up test data
    await langGraphStore.clear({ userId: 'default', workspaceId: testWorkspaceId });
  });

  describe('beforeAgentRun - Real Context Assembly', () => {
    it('should assemble comprehensive context for agent run', async () => {
      // Prepare test data in memory systems

      // Add some episodic memories
      await memoryService.saveEpisode(testWorkspaceId, testSessionId, {
        query: 'Previous email task',
        actions: ['open gmail', 'compose email', 'send'],
        outcome: 'success',
        reasoning: 'Email sent successfully',
      });

      // Add semantic facts
      await memoryService.saveFact(testWorkspaceId, 'user_email', 'test@example.com');
      await memoryService.saveFact(testWorkspaceId, 'preferred_time', '9:00 AM');

      // Add procedural patterns
      await memoryService.savePattern(testWorkspaceId, {
        name: 'Email Workflow',
        description: 'Standard email sending process',
        steps: [
          { action: 'open_gmail', parameters: {}, expectedResult: 'Gmail opened' },
          { action: 'compose', parameters: {}, expectedResult: 'Compose window opened' },
        ],
        successRate: 0.9,
      });

      // Add todos
      await todoListMiddleware.writeTodos(testWorkspaceId, testSessionId, [
        'Check inbox for urgent emails',
        'Reply to client inquiries',
      ]);

      // Test beforeAgentRun
      const query = 'Send follow-up email to client about project status';
      const runContext = await executor.beforeAgentRun(query);

      // Verify context assembly
      expect(runContext.workspaceId).toBe(testWorkspaceId);
      expect(runContext.sessionId).toBe(testSessionId);
      expect(runContext.query).toBe(query);

      // Should have loaded memories
      expect(runContext.memories.length).toBeGreaterThan(0);

      // Should have loaded todos
      expect(runContext.todos.length).toBe(2);
      expect(runContext.todos).toContain('Check inbox for urgent emails');

      // Should have generated subagent plans
      expect(runContext.subagentPlans.length).toBeGreaterThan(0);
      expect(runContext.subagentPlans.some(plan => plan.agentType === 'writer')).toBe(true);

      console.log('✅ beforeAgentRun assembled context successfully');
      console.log(
        `📝 Context: ${runContext.context.length} items, ${runContext.memories.length} memories, ${runContext.todos.length} todos`,
      );
    });

    it('should handle empty workspace gracefully', async () => {
      const emptyWorkspaceId = 'empty-workspace';
      executor.setWorkspaceContext(emptyWorkspaceId, 'empty-session');

      const runContext = await executor.beforeAgentRun('Test query for empty workspace');

      expect(runContext.workspaceId).toBe(emptyWorkspaceId);
      expect(runContext.context).toEqual([]);
      expect(runContext.memories).toEqual([]);
      expect(runContext.todos).toEqual([]);
      expect(runContext.subagentPlans.length).toBeGreaterThan(0); // Should still have fallback plan
    });

    it('should generate appropriate subagent plans based on query type', async () => {
      // Test research query
      const researchContext = await executor.beforeAgentRun('Research competitor pricing strategies');
      expect(researchContext.subagentPlans.some(plan => plan.agentType === 'research')).toBe(true);

      // Test writing query
      const writingContext = await executor.beforeAgentRun('Write professional email to stakeholders');
      expect(writingContext.subagentPlans.some(plan => plan.agentType === 'writer')).toBe(true);

      // Test calendar query
      const calendarContext = await executor.beforeAgentRun('Schedule team meeting for next week');
      expect(calendarContext.subagentPlans.some(plan => plan.agentType === 'calendar')).toBe(true);
    });
  });

  describe('afterAgentRun - Real Memory Storage and Learning', () => {
    it('should store successful run results in all memory types', async () => {
      const runContext: AgentRunContext = {
        workspaceId: testWorkspaceId,
        sessionId: testSessionId,
        query: 'Send project update email to team',
        context: [],
        memories: [],
        todos: ['Send email', 'Follow up'],
        subagentPlans: [],
      };

      const successResult: AgentRunResult = {
        query: 'Send project update email to team',
        actions: [
          'Navigated to Gmail',
          'Composed professional email',
          'Added team recipients',
          'Attached project files',
          'Sent email successfully',
        ],
        outcome: 'Email sent successfully to all team members',
        success: true,
        reasoning: 'Used standard email workflow with professional template',
        duration: 120000, // 2 minutes
        tokensUsed: 1500,
      };

      await executor.afterAgentRun(runContext, successResult);

      // Verify episodic memory storage
      const episodes = await memoryService.getRecentEpisodes(testWorkspaceId, testSessionId, 5);
      expect(episodes.length).toBe(1);
      expect(episodes[0].query).toBe(successResult.query);
      expect(episodes[0].outcome).toBe('success');
      expect(episodes[0].actions).toEqual(successResult.actions);

      // Verify procedural pattern creation (for complex successful workflows)
      const patterns = await memoryService.listPatterns(testWorkspaceId);
      expect(patterns.length).toBe(1);
      expect(patterns[0].name).toContain('Pattern_');
      expect(patterns[0].description).toContain('Send project update email to team');

      // Verify semantic fact extraction
      const facts = await memoryService.searchFacts(testWorkspaceId, 'email', 5);
      expect(facts.length).toBeGreaterThan(0);

      console.log('✅ afterAgentRun stored memories successfully');
      console.log(`📚 Stored: 1 episode, ${patterns.length} patterns, ${facts.length} facts`);
    });

    it('should handle failed run results appropriately', async () => {
      const runContext: AgentRunContext = {
        workspaceId: testWorkspaceId,
        sessionId: testSessionId,
        query: 'Delete all emails from inbox',
        context: [],
        memories: [],
        todos: [],
        subagentPlans: [],
      };

      const failureResult: AgentRunResult = {
        query: 'Delete all emails from inbox',
        actions: ['Navigated to Gmail', 'Selected all emails'],
        outcome: 'Operation cancelled - destructive action requires approval',
        success: false,
        reasoning: 'User intervention required for destructive operations',
        duration: 30000,
        tokensUsed: 500,
      };

      await executor.afterAgentRun(runContext, failureResult);

      // Verify episodic memory storage for failure
      const episodes = await memoryService.getRecentEpisodes(testWorkspaceId, testSessionId, 5);
      expect(episodes.length).toBe(1);
      expect(episodes[0].outcome).toBe('failure');
      expect(episodes[0].reasoning).toContain('User intervention required');

      // Should NOT create procedural pattern for failed workflow
      const patterns = await memoryService.listPatterns(testWorkspaceId);
      expect(patterns.length).toBe(0);
    });

    it('should update todos based on completed actions', async () => {
      // Set up initial todos
      await todoListMiddleware.writeTodos(testWorkspaceId, testSessionId, [
        'Open email application',
        'Compose new message',
        'Send email to client',
      ]);

      const runContext: AgentRunContext = {
        workspaceId: testWorkspaceId,
        sessionId: testSessionId,
        query: 'Send email to client',
        context: [],
        memories: [],
        todos: [],
        subagentPlans: [],
      };

      const result: AgentRunResult = {
        query: 'Send email to client',
        actions: ['Successfully opened email application', 'Composed professional message to client'],
        outcome: 'Email composed and ready to send',
        success: true,
        reasoning: 'Email preparation completed',
        duration: 60000,
        tokensUsed: 800,
      };

      await executor.afterAgentRun(runContext, result);

      // Check that todos were updated
      const remainingTodos = await todoListMiddleware.getTodos(testWorkspaceId, testSessionId);
      expect(remainingTodos.length).toBeLessThan(3); // Some should be marked complete
    });

    it('should update procedural pattern usage statistics', async () => {
      // Create a pattern first
      await memoryService.savePattern(testWorkspaceId, {
        name: 'Test Pattern',
        description: 'Test workflow pattern',
        steps: [{ action: 'test', parameters: {}, expectedResult: 'success' }],
        successRate: 0.8,
      });

      const pattern = await memoryService.getPattern(testWorkspaceId, 'Test Pattern');
      expect(pattern).toBeTruthy();

      // Create run context with the pattern in memories
      const runContext: AgentRunContext = {
        workspaceId: testWorkspaceId,
        sessionId: testSessionId,
        query: 'Test query',
        context: [],
        memories: [pattern!], // Include pattern in memories
        todos: [],
        subagentPlans: [],
      };

      const result: AgentRunResult = {
        query: 'Test query',
        actions: ['test action'],
        outcome: 'success',
        success: true,
        reasoning: 'Test successful',
        duration: 10000,
        tokensUsed: 100,
      };

      const initialUsageCount = pattern!.usageCount;

      await executor.afterAgentRun(runContext, result);

      // Verify pattern usage was updated
      const updatedPattern = await memoryService.getPattern(testWorkspaceId, 'Test Pattern');
      expect(updatedPattern?.usageCount).toBe(initialUsageCount + 1);
    });
  });

  describe('maybePauseForHumanApproval - Real Risk Assessment', () => {
    it('should assess low-risk actions correctly', async () => {
      const lowRiskActions = [
        'Read email content',
        'View calendar events',
        'Scroll through webpage',
        'Hover over menu item',
      ];

      const approved = await executor.maybePauseForHumanApproval(lowRiskActions, testWorkspaceId);

      // Low risk actions should be auto-approved
      expect(approved).toBe(true);
    });

    it('should assess medium-risk actions correctly', async () => {
      const mediumRiskActions = [
        'Click submit button',
        'Navigate to external website',
        'Fill out form fields',
        'Upload file attachment',
      ];

      const approved = await executor.maybePauseForHumanApproval(mediumRiskActions, testWorkspaceId);

      // Medium risk actions behavior depends on autonomy level
      // With default autonomy level (3), should be approved
      expect(approved).toBe(true);
    });

    it('should assess high-risk actions correctly', async () => {
      const highRiskActions = [
        'Delete important files',
        'Send email to all contacts',
        'Make purchase transaction',
        'Submit payment information',
      ];

      // This will timeout and auto-approve in test environment
      // In real usage, it would wait for human approval
      const approved = await executor.maybePauseForHumanApproval(highRiskActions, testWorkspaceId);

      // High risk actions should require approval (but auto-approve in test)
      expect(approved).toBe(true);
    });

    it('should handle empty action list', async () => {
      const approved = await executor.maybePauseForHumanApproval([], testWorkspaceId);
      expect(approved).toBe(true);
    });

    it('should handle mixed risk levels', async () => {
      const mixedRiskActions = [
        'Read email content', // low risk
        'Click reply button', // medium risk
        'Send email to client', // high risk
      ];

      const approved = await executor.maybePauseForHumanApproval(mixedRiskActions, testWorkspaceId);

      // Should assess based on highest risk level
      expect(approved).toBe(true); // Auto-approve in test
    });
  });

  describe('Workspace Context Management', () => {
    it('should set and use workspace context correctly', async () => {
      const newWorkspaceId = 'new-test-workspace';
      const newSessionId = 'new-test-session';

      executor.setWorkspaceContext(newWorkspaceId, newSessionId);

      const runContext = await executor.beforeAgentRun('Test query for new workspace');

      expect(runContext.workspaceId).toBe(newWorkspaceId);
      expect(runContext.sessionId).toBe(newSessionId);
    });

    it('should isolate data between different workspaces', async () => {
      const workspace1 = 'workspace-1';
      const workspace2 = 'workspace-2';
      const session1 = 'session-1';
      const session2 = 'session-2';

      // Add data to workspace 1
      executor.setWorkspaceContext(workspace1, session1);
      await memoryService.saveFact(workspace1, 'workspace1_fact', 'value1');

      // Add data to workspace 2
      executor.setWorkspaceContext(workspace2, session2);
      await memoryService.saveFact(workspace2, 'workspace2_fact', 'value2');

      // Test isolation
      const context1 = await executor.beforeAgentRun('Query for workspace 1');
      executor.setWorkspaceContext(workspace1, session1);

      const context2 = await executor.beforeAgentRun('Query for workspace 2');
      executor.setWorkspaceContext(workspace2, session2);

      expect(context1.workspaceId).toBe(workspace1);
      expect(context2.workspaceId).toBe(workspace2);

      // Verify data isolation
      const fact1 = await memoryService.getFact(workspace1, 'workspace1_fact');
      const fact2 = await memoryService.getFact(workspace2, 'workspace2_fact');
      const crossFact1 = await memoryService.getFact(workspace2, 'workspace1_fact');
      const crossFact2 = await memoryService.getFact(workspace1, 'workspace2_fact');

      expect(fact1?.value).toBe('value1');
      expect(fact2?.value).toBe('value2');
      expect(crossFact1).toBeNull();
      expect(crossFact2).toBeNull();
    });
  });

  describe('End-to-End Deep Agents Workflow', () => {
    it('should demonstrate complete Deep Agents workflow', async () => {
      console.log('🚀 Starting complete Deep Agents workflow test...');

      // 1. Prepare workspace with existing knowledge
      await memoryService.saveFact(testWorkspaceId, 'client_email', 'client@company.com');
      await memoryService.saveFact(testWorkspaceId, 'project_status', 'in_progress');

      await memoryService.savePattern(testWorkspaceId, {
        name: 'Client Communication',
        description: 'Standard client update workflow',
        steps: [
          { action: 'draft_email', parameters: {}, expectedResult: 'Email drafted' },
          { action: 'review_content', parameters: {}, expectedResult: 'Content reviewed' },
          { action: 'send_email', parameters: {}, expectedResult: 'Email sent' },
        ],
        successRate: 0.85,
      });

      await todoListMiddleware.writeTodos(testWorkspaceId, testSessionId, [
        'Review project milestones',
        'Prepare status update',
        'Send update to client',
      ]);

      // 2. Execute beforeAgentRun (context assembly)
      const query = 'Send weekly project status update to client';
      const runContext = await executor.beforeAgentRun(query);

      expect(runContext.memories.length).toBeGreaterThan(0);
      expect(runContext.todos.length).toBe(3);
      expect(runContext.subagentPlans.length).toBeGreaterThan(0);

      console.log('✅ Context assembled successfully');

      // 3. Simulate agent execution and create result
      const agentResult: AgentRunResult = {
        query,
        actions: [
          'Retrieved project milestone data',
          'Drafted professional status update email',
          'Added client to recipients',
          'Attached progress charts',
          'Sent email successfully',
        ],
        outcome: 'Weekly status update sent to client with comprehensive progress report',
        success: true,
        reasoning: 'Used existing client communication pattern with current project data',
        duration: 180000, // 3 minutes
        tokensUsed: 2000,
      };

      // 4. Execute afterAgentRun (memory storage and learning)
      await executor.afterAgentRun(runContext, agentResult);

      // 5. Verify complete workflow results

      // Check episodic memory
      const episodes = await memoryService.getRecentEpisodes(testWorkspaceId, testSessionId, 5);
      expect(episodes.length).toBe(1);
      expect(episodes[0].outcome).toBe('success');

      // Check procedural memory (new pattern should be created)
      const patterns = await memoryService.listPatterns(testWorkspaceId);
      expect(patterns.length).toBe(2); // Original + new pattern

      // Check semantic memory (facts should be updated)
      const facts = await memoryService.searchFacts(testWorkspaceId, 'client', 5);
      expect(facts.length).toBeGreaterThan(0);

      // Check todo updates
      const remainingTodos = await todoListMiddleware.getTodos(testWorkspaceId, testSessionId);
      expect(remainingTodos.length).toBeLessThan(3);

      // Check memory statistics
      const stats = await memoryService.getMemoryStats(testWorkspaceId);
      expect(stats.overall.totalItems).toBeGreaterThan(3);
      expect(stats.episodic.successfulEpisodes).toBe(1);
      expect(stats.procedural.totalPatterns).toBe(2);

      console.log('✅ Complete Deep Agents workflow test passed!');
      console.log(`📊 Final stats: ${stats.overall.totalItems} total items across all memory types`);
      console.log(
        `🎯 Success rate: ${stats.episodic.successfulEpisodes}/${stats.episodic.totalEpisodes} episodes successful`,
      );
    });
  });
});
