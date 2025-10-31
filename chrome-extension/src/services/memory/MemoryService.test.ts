/**
 * Integration Tests for Deep Agents Memory Services
 *
 * These tests verify that all three memory types work with real data:
 * - Episodic Memory: Session-based conversation tracking
 * - Semantic Memory: Long-term fact storage with search
 * - Procedural Memory: Workflow pattern learning and reuse
 */

import { memoryService, type Episode, type SemanticFact, type WorkflowPattern } from './MemoryService';
import { langGraphStore } from '../../../../packages/storage/lib/chat/LangGraphStore';

describe('Deep Agents Memory Services Integration Tests', () => {
  const testWorkspaceId = 'test-workspace-memory';
  const testSessionId = 'test-session-123';

  beforeEach(async () => {
    // Clean up test data before each test
    await langGraphStore.clear({ userId: 'default', workspaceId: testWorkspaceId });
  });

  afterAll(async () => {
    // Clean up test data after all tests
    await langGraphStore.clear({ userId: 'default', workspaceId: testWorkspaceId });
  });

  describe('Episodic Memory - Real Session Tracking', () => {
    it('should save and retrieve real conversation episodes', async () => {
      // Save a real episode
      const episode = {
        query: 'Send an email to john@example.com about the meeting',
        actions: ['navigate to gmail', 'click compose', 'fill recipient', 'type subject', 'send email'],
        outcome: 'success' as const,
        reasoning: 'Successfully composed and sent email using Gmail interface',
        metadata: {
          agentId: 'main-agent',
          duration: 45000, // 45 seconds
          contextUsed: ['gmail-context', 'email-template'],
        },
      };

      await memoryService.saveEpisode(testWorkspaceId, testSessionId, episode);

      // Retrieve episodes
      const episodes = await memoryService.getRecentEpisodes(testWorkspaceId, testSessionId, 5);

      expect(episodes).toHaveLength(1);
      expect(episodes[0].query).toBe(episode.query);
      expect(episodes[0].actions).toEqual(episode.actions);
      expect(episodes[0].outcome).toBe('success');
      expect(episodes[0].metadata?.agentId).toBe('main-agent');
      expect(episodes[0].metadata?.duration).toBe(45000);
    });

    it('should track success vs failure episodes', async () => {
      // Save successful episode
      await memoryService.saveEpisode(testWorkspaceId, testSessionId, {
        query: 'Book a meeting for tomorrow',
        actions: ['open calendar', 'create event', 'set time', 'save'],
        outcome: 'success',
        reasoning: 'Meeting booked successfully',
      });

      // Save failed episode
      await memoryService.saveEpisode(testWorkspaceId, testSessionId, {
        query: 'Delete all emails',
        actions: ['open gmail', 'select all', 'attempt delete'],
        outcome: 'failure',
        reasoning: 'User cancelled destructive action',
        metadata: {
          errorMessage: 'User intervention required for destructive actions',
        },
      });

      const successEpisodes = await memoryService.getEpisodesByOutcome(testWorkspaceId, 'success', 10);
      const failureEpisodes = await memoryService.getEpisodesByOutcome(testWorkspaceId, 'failure', 10);

      expect(successEpisodes).toHaveLength(1);
      expect(failureEpisodes).toHaveLength(1);
      expect(successEpisodes[0].query).toContain('meeting');
      expect(failureEpisodes[0].query).toContain('Delete');
    });

    it('should handle multiple sessions independently', async () => {
      const session1 = 'session-1';
      const session2 = 'session-2';

      // Save episodes in different sessions
      await memoryService.saveEpisode(testWorkspaceId, session1, {
        query: 'Task from session 1',
        actions: ['action1'],
        outcome: 'success',
        reasoning: 'Session 1 task',
      });

      await memoryService.saveEpisode(testWorkspaceId, session2, {
        query: 'Task from session 2',
        actions: ['action2'],
        outcome: 'success',
        reasoning: 'Session 2 task',
      });

      const session1Episodes = await memoryService.getRecentEpisodes(testWorkspaceId, session1, 10);
      const session2Episodes = await memoryService.getRecentEpisodes(testWorkspaceId, session2, 10);

      expect(session1Episodes).toHaveLength(1);
      expect(session2Episodes).toHaveLength(1);
      expect(session1Episodes[0].query).toBe('Task from session 1');
      expect(session2Episodes[0].query).toBe('Task from session 2');
    });
  });

  describe('Semantic Memory - Real Fact Storage and Search', () => {
    it('should save and retrieve semantic facts with usage tracking', async () => {
      // Save a fact
      await memoryService.saveFact(testWorkspaceId, 'user_email', 'john.doe@company.com', {
        extractedFrom: 'email-composition-episode',
        relatedFacts: ['user_name'],
      });

      // Retrieve the fact
      const fact = await memoryService.getFact(testWorkspaceId, 'user_email');

      expect(fact).toBeTruthy();
      expect(fact?.key).toBe('user_email');
      expect(fact?.value).toBe('john.doe@company.com');
      expect(fact?.usageCount).toBe(1); // Should be 1 after first save
      expect(fact?.metadata?.extractedFrom).toBe('email-composition-episode');
    });

    it('should update usage count when facts are accessed', async () => {
      // Save initial fact
      await memoryService.saveFact(testWorkspaceId, 'meeting_room', 'Conference Room A');

      // Access it multiple times
      await memoryService.getFact(testWorkspaceId, 'meeting_room');
      await memoryService.getFact(testWorkspaceId, 'meeting_room');

      const fact = await memoryService.getFact(testWorkspaceId, 'meeting_room');
      expect(fact?.usageCount).toBeGreaterThan(1);
    });

    it('should perform semantic search across facts', async () => {
      // Save multiple related facts
      await memoryService.saveFact(testWorkspaceId, 'project_deadline', '2024-12-15');
      await memoryService.saveFact(testWorkspaceId, 'project_manager', 'Sarah Johnson');
      await memoryService.saveFact(testWorkspaceId, 'project_budget', '$50000');
      await memoryService.saveFact(testWorkspaceId, 'team_size', '5 developers');

      // Search for project-related facts
      const projectFacts = await memoryService.searchFacts(testWorkspaceId, 'project', 10);

      expect(projectFacts.length).toBeGreaterThan(0);
      expect(projectFacts.some(result => result.fact.key.includes('project'))).toBe(true);

      // Verify relevance scores
      projectFacts.forEach(result => {
        expect(result.relevanceScore).toBeGreaterThan(0);
        expect(result.matchType).toMatch(/exact|partial|semantic/);
      });
    });

    it('should delete facts correctly', async () => {
      // Save a fact
      await memoryService.saveFact(testWorkspaceId, 'temp_data', 'temporary information');
      const savedFact = await memoryService.getFact(testWorkspaceId, 'temp_data');
      expect(savedFact).toBeTruthy();

      // Delete the fact
      if (savedFact) {
        await memoryService.deleteFact(testWorkspaceId, savedFact.id);
      }

      // Verify it's deleted
      const deletedFact = await memoryService.getFact(testWorkspaceId, 'temp_data');
      expect(deletedFact).toBeNull();
    });
  });

  describe('Procedural Memory - Real Workflow Pattern Learning', () => {
    it('should save and retrieve workflow patterns', async () => {
      const emailPattern: Omit<
        WorkflowPattern,
        'id' | 'workspaceId' | 'createdAt' | 'updatedAt' | 'tokens' | 'usageCount' | 'lastUsed'
      > = {
        name: 'Send Professional Email',
        description: 'Standard workflow for composing and sending professional emails',
        steps: [
          {
            action: 'navigate_to_gmail',
            parameters: { url: 'https://gmail.com' },
            expectedResult: 'Gmail interface loaded',
          },
          {
            action: 'click_compose',
            parameters: { selector: '[data-testid="compose"]' },
            expectedResult: 'Compose window opened',
          },
          {
            action: 'fill_recipient',
            parameters: { field: 'to', value: 'recipient@email.com' },
            expectedResult: 'Recipient field filled',
          },
          {
            action: 'fill_subject',
            parameters: { field: 'subject', value: 'Professional Subject' },
            expectedResult: 'Subject field filled',
          },
          {
            action: 'compose_body',
            parameters: { field: 'body', template: 'professional' },
            expectedResult: 'Email body composed',
          },
          {
            action: 'send_email',
            parameters: { button: 'send' },
            expectedResult: 'Email sent successfully',
          },
        ],
        successRate: 0.95,
        metadata: {
          category: 'communication',
          tags: ['email', 'professional', 'gmail'],
          difficulty: 'easy',
          estimatedDuration: 120, // 2 minutes
        },
      };

      await memoryService.savePattern(testWorkspaceId, emailPattern);

      const retrievedPattern = await memoryService.getPattern(testWorkspaceId, 'Send Professional Email');

      expect(retrievedPattern).toBeTruthy();
      expect(retrievedPattern?.name).toBe('Send Professional Email');
      expect(retrievedPattern?.steps).toHaveLength(6);
      expect(retrievedPattern?.successRate).toBe(0.95);
      expect(retrievedPattern?.metadata?.category).toBe('communication');
    });

    it('should track pattern usage and update success rates', async () => {
      // Save a pattern
      await memoryService.savePattern(testWorkspaceId, {
        name: 'Calendar Meeting Setup',
        description: 'Create calendar meetings with participants',
        steps: [
          {
            action: 'open_calendar',
            parameters: {},
            expectedResult: 'Calendar opened',
          },
          {
            action: 'create_event',
            parameters: { type: 'meeting' },
            expectedResult: 'Event created',
          },
        ],
        successRate: 0.8,
      });

      const pattern = await memoryService.getPattern(testWorkspaceId, 'Calendar Meeting Setup');
      expect(pattern).toBeTruthy();

      if (pattern) {
        const initialUsageCount = pattern.usageCount;
        const initialSuccessRate = pattern.successRate;

        // Simulate successful usage
        await memoryService.updatePatternUsage(testWorkspaceId, pattern.id, true);

        const updatedPattern = await memoryService.getPattern(testWorkspaceId, 'Calendar Meeting Setup');
        expect(updatedPattern?.usageCount).toBe(initialUsageCount + 1);
        expect(updatedPattern?.successRate).toBeGreaterThanOrEqual(initialSuccessRate);

        // Simulate failed usage
        await memoryService.updatePatternUsage(testWorkspaceId, pattern.id, false);

        const finalPattern = await memoryService.getPattern(testWorkspaceId, 'Calendar Meeting Setup');
        expect(finalPattern?.usageCount).toBe(initialUsageCount + 2);
      }
    });

    it('should return best patterns based on usage and success rate', async () => {
      // Save multiple patterns with different success rates and usage
      await memoryService.savePattern(testWorkspaceId, {
        name: 'High Success Pattern',
        description: 'Very reliable pattern',
        steps: [{ action: 'test', parameters: {}, expectedResult: 'success' }],
        successRate: 0.95,
      });

      await memoryService.savePattern(testWorkspaceId, {
        name: 'Medium Success Pattern',
        description: 'Moderately reliable pattern',
        steps: [{ action: 'test', parameters: {}, expectedResult: 'success' }],
        successRate: 0.7,
      });

      await memoryService.savePattern(testWorkspaceId, {
        name: 'Low Success Pattern',
        description: 'Less reliable pattern',
        steps: [{ action: 'test', parameters: {}, expectedResult: 'success' }],
        successRate: 0.4,
      });

      // Simulate usage to affect rankings
      const highPattern = await memoryService.getPattern(testWorkspaceId, 'High Success Pattern');
      if (highPattern) {
        // Use it multiple times successfully
        for (let i = 0; i < 5; i++) {
          await memoryService.updatePatternUsage(testWorkspaceId, highPattern.id, true);
        }
      }

      const bestPatterns = await memoryService.getBestPatterns(testWorkspaceId, 3);

      expect(bestPatterns).toHaveLength(3);
      expect(bestPatterns[0].name).toBe('High Success Pattern');
      expect(bestPatterns[0].successRate).toBeGreaterThan(bestPatterns[1].successRate);
    });

    it('should list pattern summaries correctly', async () => {
      // Save patterns with metadata
      await memoryService.savePattern(testWorkspaceId, {
        name: 'Research Workflow',
        description: 'Comprehensive research process',
        steps: [{ action: 'research', parameters: {}, expectedResult: 'data gathered' }],
        successRate: 0.85,
        metadata: {
          category: 'research',
          tags: ['web-search', 'analysis'],
          difficulty: 'medium',
        },
      });

      const summaries = await memoryService.listPatterns(testWorkspaceId);

      expect(summaries.length).toBeGreaterThan(0);
      const researchSummary = summaries.find(s => s.name === 'Research Workflow');

      expect(researchSummary).toBeTruthy();
      expect(researchSummary?.description).toBe('Comprehensive research process');
      expect(researchSummary?.category).toBe('research');
      expect(researchSummary?.tags).toContain('web-search');
    });
  });

  describe('Memory Statistics - Real Data Analytics', () => {
    it('should provide comprehensive memory statistics', async () => {
      // Populate with real test data

      // Add episodes
      await memoryService.saveEpisode(testWorkspaceId, testSessionId, {
        query: 'Test successful task',
        actions: ['action1', 'action2'],
        outcome: 'success',
        reasoning: 'Task completed',
      });

      await memoryService.saveEpisode(testWorkspaceId, testSessionId, {
        query: 'Test failed task',
        actions: ['action1'],
        outcome: 'failure',
        reasoning: 'Task failed',
      });

      // Add semantic facts
      await memoryService.saveFact(testWorkspaceId, 'user_preference', 'dark_mode');
      await memoryService.saveFact(testWorkspaceId, 'default_email', 'user@test.com');

      // Add procedural patterns
      await memoryService.savePattern(testWorkspaceId, {
        name: 'Test Pattern',
        description: 'Test workflow',
        steps: [{ action: 'test', parameters: {}, expectedResult: 'success' }],
        successRate: 0.8,
      });

      // Get statistics
      const stats = await memoryService.getMemoryStats(testWorkspaceId);

      // Verify episodic stats
      expect(stats.episodic.totalEpisodes).toBe(2);
      expect(stats.episodic.successfulEpisodes).toBe(1);
      expect(stats.episodic.failedEpisodes).toBe(1);
      expect(stats.episodic.totalTokens).toBeGreaterThan(0);

      // Verify semantic stats
      expect(stats.semantic.totalFacts).toBe(2);
      expect(stats.semantic.totalTokens).toBeGreaterThan(0);
      expect(stats.semantic.mostUsedFacts).toHaveLength(2);

      // Verify procedural stats
      expect(stats.procedural.totalPatterns).toBe(1);
      expect(stats.procedural.totalTokens).toBeGreaterThan(0);
      expect(stats.procedural.averageSuccessRate).toBe(0.8);

      // Verify overall stats
      expect(stats.overall.totalItems).toBe(5); // 2 episodes + 2 facts + 1 pattern
      expect(stats.overall.totalTokens).toBeGreaterThan(0);
      expect(stats.overall.memoryEfficiency).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty workspace statistics', async () => {
      const emptyWorkspaceId = 'empty-workspace';
      const stats = await memoryService.getMemoryStats(emptyWorkspaceId);

      expect(stats.episodic.totalEpisodes).toBe(0);
      expect(stats.semantic.totalFacts).toBe(0);
      expect(stats.procedural.totalPatterns).toBe(0);
      expect(stats.overall.totalItems).toBe(0);
      expect(stats.overall.totalTokens).toBe(0);
    });
  });

  describe('Memory Management - Real Operations', () => {
    it('should clear memory correctly', async () => {
      // Populate with data
      await memoryService.saveEpisode(testWorkspaceId, testSessionId, {
        query: 'Test episode',
        actions: ['test'],
        outcome: 'success',
        reasoning: 'Test',
      });

      await memoryService.saveFact(testWorkspaceId, 'test_fact', 'test_value');

      // Verify data exists
      let stats = await memoryService.getMemoryStats(testWorkspaceId);
      expect(stats.overall.totalItems).toBeGreaterThan(0);

      // Clear memory
      await memoryService.clearMemory(testWorkspaceId);

      // Verify data is cleared
      stats = await memoryService.getMemoryStats(testWorkspaceId);
      expect(stats.overall.totalItems).toBe(0);
    });
  });

  describe('Cross-Memory Integration - Real Workflow', () => {
    it('should demonstrate complete memory workflow', async () => {
      // Simulate a complete agent workflow with all memory types

      // 1. Start with episodic memory (conversation tracking)
      await memoryService.saveEpisode(testWorkspaceId, testSessionId, {
        query: 'Send weekly report email to team',
        actions: [
          'navigate to gmail',
          'compose new email',
          'add team recipients',
          'write report content',
          'attach files',
          'send email',
        ],
        outcome: 'success',
        reasoning: 'Weekly report sent successfully to all team members',
        metadata: {
          agentId: 'main-agent',
          duration: 180000, // 3 minutes
          contextUsed: ['team-contacts', 'report-template'],
        },
      });

      // 2. Extract semantic facts from the episode
      await memoryService.saveFact(testWorkspaceId, 'weekly_report_day', 'Friday', {
        extractedFrom: 'weekly-report-episode',
      });
      await memoryService.saveFact(testWorkspaceId, 'team_email_list', 'team@company.com', {
        extractedFrom: 'weekly-report-episode',
      });

      // 3. Save the successful workflow as a procedural pattern
      await memoryService.savePattern(testWorkspaceId, {
        name: 'Weekly Report Email Workflow',
        description: 'Automated workflow for sending weekly team reports',
        steps: [
          {
            action: 'navigate_to_gmail',
            parameters: { url: 'https://gmail.com' },
            expectedResult: 'Gmail interface loaded',
          },
          {
            action: 'compose_email',
            parameters: { template: 'weekly_report' },
            expectedResult: 'Email composition started',
          },
          {
            action: 'add_recipients',
            parameters: { list: 'team_contacts' },
            expectedResult: 'Team members added to recipients',
          },
          {
            action: 'generate_report_content',
            parameters: { period: 'weekly', format: 'summary' },
            expectedResult: 'Report content generated',
          },
          {
            action: 'send_email',
            parameters: { priority: 'normal' },
            expectedResult: 'Email sent successfully',
          },
        ],
        successRate: 1.0, // Perfect success on first run
        metadata: {
          category: 'communication',
          tags: ['email', 'report', 'weekly', 'team'],
          difficulty: 'medium',
          estimatedDuration: 180, // 3 minutes
        },
      });

      // 4. Verify all memory types are populated and interconnected
      const stats = await memoryService.getMemoryStats(testWorkspaceId);

      expect(stats.episodic.totalEpisodes).toBe(1);
      expect(stats.episodic.successfulEpisodes).toBe(1);

      expect(stats.semantic.totalFacts).toBe(2);
      const reportDayFact = await memoryService.getFact(testWorkspaceId, 'weekly_report_day');
      expect(reportDayFact?.value).toBe('Friday');

      expect(stats.procedural.totalPatterns).toBe(1);
      const reportPattern = await memoryService.getPattern(testWorkspaceId, 'Weekly Report Email Workflow');
      expect(reportPattern?.successRate).toBe(1.0);

      // 5. Simulate using the pattern again and updating its success
      if (reportPattern) {
        await memoryService.updatePatternUsage(testWorkspaceId, reportPattern.id, true);
        const updatedPattern = await memoryService.getPattern(testWorkspaceId, 'Weekly Report Email Workflow');
        expect(updatedPattern?.usageCount).toBe(1);
      }

      // 6. Search for related facts
      const reportFacts = await memoryService.searchFacts(testWorkspaceId, 'report', 5);
      expect(reportFacts.length).toBeGreaterThan(0);
      expect(reportFacts.some(result => result.fact.key.includes('report'))).toBe(true);

      console.log('✅ Complete memory workflow test passed!');
      console.log(`📊 Final stats: ${stats.overall.totalItems} total items, ${stats.overall.totalTokens} tokens`);
    });
  });
});
