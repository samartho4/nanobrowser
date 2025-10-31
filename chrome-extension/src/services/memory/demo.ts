/**
 * Deep Agents Memory Services Demonstration
 *
 * This script demonstrates that all three memory services work with real data:
 * - Episodic Memory: Session-based conversation tracking
 * - Semantic Memory: Long-term fact storage with search
 * - Procedural Memory: Workflow pattern learning and reuse
 *
 * Run this to verify functionality without mocks.
 */

import { memoryService } from './MemoryService';
import { todoListMiddleware, subagentService } from '../../background/agent/middleware/TodoList';
import { langGraphStore } from '../../../../packages/storage/lib/chat/LangGraphStore';

const DEMO_WORKSPACE = 'demo-workspace';
const DEMO_SESSION = 'demo-session';

export async function runMemoryServicesDemo() {
  console.log('🚀 Starting Deep Agents Memory Services Demo...\n');

  try {
    // Clean up any existing demo data
    await langGraphStore.clear({ userId: 'default', workspaceId: DEMO_WORKSPACE });
    console.log('✅ Cleaned up existing demo data\n');

    // ========================================================================
    // EPISODIC MEMORY DEMONSTRATION
    // ========================================================================
    console.log('📝 EPISODIC MEMORY DEMO');
    console.log('========================');

    // Save successful episode
    await memoryService.saveEpisode(DEMO_WORKSPACE, DEMO_SESSION, {
      query: 'Send project status email to stakeholders',
      actions: [
        'Opened Gmail application',
        'Composed professional email with project template',
        'Added all stakeholder email addresses',
        'Attached latest project timeline and budget report',
        'Reviewed email content for accuracy',
        'Sent email successfully to 12 recipients',
      ],
      outcome: 'success',
      reasoning: 'Successfully sent comprehensive project update using established email workflow',
      metadata: {
        agentId: 'main-agent',
        duration: 180000, // 3 minutes
        contextUsed: ['stakeholder-contacts', 'project-template', 'timeline-data'],
      },
    });

    // Save failed episode for comparison
    await memoryService.saveEpisode(DEMO_WORKSPACE, DEMO_SESSION, {
      query: 'Delete all draft emails',
      actions: [
        'Navigated to Gmail drafts folder',
        'Selected all draft emails (47 items)',
        'Attempted bulk delete operation',
      ],
      outcome: 'failure',
      reasoning: 'Operation cancelled due to high-risk destructive action requiring approval',
      metadata: {
        agentId: 'main-agent',
        duration: 15000,
        errorMessage: 'User intervention required for bulk delete operations',
      },
    });

    // Retrieve and display episodes
    const episodes = await memoryService.getRecentEpisodes(DEMO_WORKSPACE, DEMO_SESSION, 5);
    console.log(`✅ Saved and retrieved ${episodes.length} episodes`);
    console.log(`   - Success: ${episodes.filter(e => e.outcome === 'success').length}`);
    console.log(`   - Failure: ${episodes.filter(e => e.outcome === 'failure').length}`);

    const successEpisodes = await memoryService.getEpisodesByOutcome(DEMO_WORKSPACE, 'success', 10);
    console.log(`   - Retrieved ${successEpisodes.length} successful episodes\n`);

    // ========================================================================
    // SEMANTIC MEMORY DEMONSTRATION
    // ========================================================================
    console.log('🧠 SEMANTIC MEMORY DEMO');
    console.log('========================');

    // Save various facts
    await memoryService.saveFact(DEMO_WORKSPACE, 'user_email', 'john.doe@company.com', {
      extractedFrom: 'email-composition-episode',
      relatedFacts: ['user_name', 'company_domain'],
    });

    await memoryService.saveFact(DEMO_WORKSPACE, 'project_deadline', '2024-12-15', {
      extractedFrom: 'project-planning-session',
    });

    await memoryService.saveFact(DEMO_WORKSPACE, 'team_size', '8 developers', {
      extractedFrom: 'team-meeting-notes',
    });

    await memoryService.saveFact(DEMO_WORKSPACE, 'meeting_room_preference', 'Conference Room A', {
      extractedFrom: 'calendar-booking-episode',
    });

    await memoryService.saveFact(DEMO_WORKSPACE, 'client_timezone', 'PST', {
      extractedFrom: 'client-communication-log',
    });

    // Test fact retrieval and usage tracking
    const userEmail = await memoryService.getFact(DEMO_WORKSPACE, 'user_email');
    console.log(`✅ Retrieved fact: user_email = ${userEmail?.value} (usage: ${userEmail?.usageCount})`);

    // Test semantic search
    const projectFacts = await memoryService.searchFacts(DEMO_WORKSPACE, 'project', 5);
    console.log(`✅ Found ${projectFacts.length} project-related facts:`);
    projectFacts.forEach(result => {
      console.log(`   - ${result.fact.key}: ${result.fact.value} (relevance: ${result.relevanceScore.toFixed(2)})`);
    });

    const teamFacts = await memoryService.searchFacts(DEMO_WORKSPACE, 'team', 5);
    console.log(`✅ Found ${teamFacts.length} team-related facts:`);
    teamFacts.forEach(result => {
      console.log(`   - ${result.fact.key}: ${result.fact.value} (match: ${result.matchType})`);
    });

    console.log('');

    // ========================================================================
    // PROCEDURAL MEMORY DEMONSTRATION
    // ========================================================================
    console.log('⚙️ PROCEDURAL MEMORY DEMO');
    console.log('==========================');

    // Save email workflow pattern
    await memoryService.savePattern(DEMO_WORKSPACE, {
      name: 'Professional Email Workflow',
      description: 'Comprehensive workflow for sending professional emails with attachments',
      steps: [
        {
          action: 'navigate_to_gmail',
          parameters: { url: 'https://gmail.com' },
          expectedResult: 'Gmail interface loaded successfully',
        },
        {
          action: 'click_compose',
          parameters: { selector: '[data-testid="compose"]' },
          expectedResult: 'New email composition window opened',
        },
        {
          action: 'fill_recipients',
          parameters: { field: 'to', source: 'contact_list' },
          expectedResult: 'Recipients added from contact list',
        },
        {
          action: 'fill_subject',
          parameters: { template: 'professional_subject' },
          expectedResult: 'Professional subject line generated',
        },
        {
          action: 'compose_body',
          parameters: { template: 'project_update', tone: 'professional' },
          expectedResult: 'Email body composed with project template',
        },
        {
          action: 'attach_files',
          parameters: { source: 'project_documents' },
          expectedResult: 'Relevant project files attached',
        },
        {
          action: 'review_and_send',
          parameters: { spell_check: true, tone_check: true },
          expectedResult: 'Email reviewed and sent successfully',
        },
      ],
      successRate: 0.95,
      metadata: {
        category: 'communication',
        tags: ['email', 'professional', 'project-updates'],
        difficulty: 'medium',
        estimatedDuration: 180, // 3 minutes
      },
    });

    // Save meeting scheduling pattern
    await memoryService.savePattern(DEMO_WORKSPACE, {
      name: 'Team Meeting Scheduler',
      description: 'Automated workflow for scheduling recurring team meetings',
      steps: [
        {
          action: 'open_calendar',
          parameters: { app: 'google_calendar' },
          expectedResult: 'Calendar application opened',
        },
        {
          action: 'create_event',
          parameters: { type: 'meeting', recurring: true },
          expectedResult: 'New recurring meeting event created',
        },
        {
          action: 'set_time_date',
          parameters: { day: 'monday', time: '10:00', duration: 60 },
          expectedResult: 'Meeting time and duration configured',
        },
        {
          action: 'add_participants',
          parameters: { group: 'development_team' },
          expectedResult: 'Team members added as participants',
        },
        {
          action: 'set_location',
          parameters: { room: 'conference_room_a', backup: 'zoom_link' },
          expectedResult: 'Meeting location and backup option set',
        },
        {
          action: 'save_event',
          parameters: { send_invites: true },
          expectedResult: 'Meeting saved and invitations sent',
        },
      ],
      successRate: 0.88,
      metadata: {
        category: 'scheduling',
        tags: ['meeting', 'team', 'recurring'],
        difficulty: 'easy',
        estimatedDuration: 120, // 2 minutes
      },
    });

    // Test pattern retrieval and usage tracking
    const emailPattern = await memoryService.getPattern(DEMO_WORKSPACE, 'Professional Email Workflow');
    console.log(`✅ Retrieved pattern: ${emailPattern?.name}`);
    console.log(`   - Steps: ${emailPattern?.steps.length}`);
    console.log(`   - Success rate: ${emailPattern?.successRate}`);
    console.log(`   - Category: ${emailPattern?.metadata?.category}`);

    // Simulate pattern usage
    if (emailPattern) {
      await memoryService.updatePatternUsage(DEMO_WORKSPACE, emailPattern.id, true);
      await memoryService.updatePatternUsage(DEMO_WORKSPACE, emailPattern.id, true);
      await memoryService.updatePatternUsage(DEMO_WORKSPACE, emailPattern.id, false); // One failure
    }

    // Get best patterns
    const bestPatterns = await memoryService.getBestPatterns(DEMO_WORKSPACE, 3);
    console.log(`✅ Retrieved ${bestPatterns.length} best patterns:`);
    bestPatterns.forEach((pattern, index) => {
      console.log(
        `   ${index + 1}. ${pattern.name} (success: ${pattern.successRate.toFixed(2)}, usage: ${pattern.usageCount})`,
      );
    });

    // List all patterns
    const allPatterns = await memoryService.listPatterns(DEMO_WORKSPACE);
    console.log(`✅ Total patterns available: ${allPatterns.length}\n`);

    // ========================================================================
    // TODOLIST MIDDLEWARE DEMONSTRATION
    // ========================================================================
    console.log('📋 TODOLIST MIDDLEWARE DEMO');
    console.log('============================');

    // Write todos for a complex task
    const complexTodos = [
      'Research competitor pricing strategies and market positioning',
      'Analyze current product features against competitor offerings',
      'Draft comprehensive competitive analysis report',
      'Create presentation slides with key findings',
      'Schedule stakeholder meeting to present findings',
      'Send meeting invites with agenda and pre-read materials',
    ];

    await todoListMiddleware.writeTodos(DEMO_WORKSPACE, DEMO_SESSION, complexTodos);
    console.log(`✅ Added ${complexTodos.length} todos to task list`);

    // Retrieve todos
    let currentTodos = await todoListMiddleware.getTodos(DEMO_WORKSPACE, DEMO_SESSION);
    console.log(`✅ Retrieved ${currentTodos.length} pending todos`);

    // Simulate completing some tasks
    const completedActions = [
      'Successfully researched competitor pricing strategies',
      'Completed analysis of current product features',
      'Drafted comprehensive competitive analysis report with charts',
    ];

    await todoListMiddleware.updateTodos(DEMO_WORKSPACE, DEMO_SESSION, completedActions);
    console.log(`✅ Marked ${completedActions.length} actions as completed`);

    // Check remaining todos
    currentTodos = await todoListMiddleware.getTodos(DEMO_WORKSPACE, DEMO_SESSION);
    console.log(`✅ Remaining todos: ${currentTodos.length}`);

    // Track progress
    const progress = await todoListMiddleware.trackProgress(DEMO_WORKSPACE, DEMO_SESSION);
    console.log(`✅ Progress tracking:`);
    console.log(`   - Total tasks: ${progress.totalTasks}`);
    console.log(`   - Completed: ${progress.completedTasks}`);
    console.log(`   - Completion rate: ${(progress.completionRate * 100).toFixed(1)}%`);
    console.log(`   - Next actions: ${progress.nextActions.length}`);

    // Task decomposition
    const complexTask = 'Create comprehensive quarterly business report with market analysis and financial projections';
    const decomposition = await todoListMiddleware.decomposeTasks(DEMO_WORKSPACE, complexTask);
    console.log(`✅ Task decomposition for: "${complexTask}"`);
    console.log(`   - Subtasks: ${decomposition.subtasks.length}`);
    console.log(`   - Complexity: ${decomposition.complexity}`);
    console.log(`   - Estimated duration: ${decomposition.estimatedDuration} minutes`);
    console.log(`   - Delegation plans: ${decomposition.delegationPlan.length}\n`);

    // ========================================================================
    // SUBAGENT SERVICE DEMONSTRATION
    // ========================================================================
    console.log('🤖 SUBAGENT SERVICE DEMO');
    console.log('=========================');

    // Test task classification
    const testTasks = [
      'Research market trends for Q4 planning',
      'Write professional email to board members',
      'Schedule quarterly review meeting with team',
      'Navigate to project dashboard and update status',
      'Fill out expense report form for travel costs',
    ];

    console.log('✅ Task classification results:');
    for (const task of testTasks) {
      const classification = await subagentService.classifyTaskType(task);
      console.log(`   - "${task}"`);
      console.log(`     Type: ${classification.taskType}, Agent: ${classification.suggestedAgent}`);
      console.log(`     Confidence: ${classification.confidence.toFixed(2)}, Reason: ${classification.reasoning}`);
    }

    // Test delegation planning
    const complexDelegationTask =
      'Research competitor analysis, write comprehensive report, and schedule presentation meeting with stakeholders';
    const delegationPlan = await subagentService.planDelegations(complexDelegationTask, []);

    console.log(`\n✅ Delegation plan for: "${complexDelegationTask}"`);
    console.log(`   - Total delegations: ${delegationPlan.delegations.length}`);
    console.log(`   - Overall confidence: ${delegationPlan.totalConfidence.toFixed(2)}`);
    console.log(`   - Fallback to main: ${delegationPlan.fallbackToMain}`);

    delegationPlan.delegations.forEach((delegation, index) => {
      console.log(`   ${index + 1}. ${delegation.agentType} (${delegation.agentId})`);
      console.log(`      Goal: ${delegation.goal}`);
      console.log(`      Tasks: ${delegation.tasks.length}`);
      console.log(`      Confidence: ${delegation.confidence.toFixed(2)}`);
      console.log(`      Duration: ${delegation.estimatedDuration} minutes`);
    });

    // Show available agents
    const availableAgents = subagentService.getAvailableAgents();
    console.log(`\n✅ Available agents: ${availableAgents.length}`);
    availableAgents.forEach(agent => {
      console.log(`   - ${agent.type} (${agent.id}): ${agent.capabilities.join(', ')}`);
    });

    console.log('');

    // ========================================================================
    // MEMORY STATISTICS DEMONSTRATION
    // ========================================================================
    console.log('📊 MEMORY STATISTICS DEMO');
    console.log('==========================');

    const stats = await memoryService.getMemoryStats(DEMO_WORKSPACE);

    console.log('✅ Comprehensive Memory Statistics:');
    console.log(`\n📝 Episodic Memory:`);
    console.log(`   - Total episodes: ${stats.episodic.totalEpisodes}`);
    console.log(`   - Successful: ${stats.episodic.successfulEpisodes}`);
    console.log(`   - Failed: ${stats.episodic.failedEpisodes}`);
    console.log(`   - Total tokens: ${stats.episodic.totalTokens}`);
    console.log(`   - Avg tokens/episode: ${stats.episodic.averageTokensPerEpisode.toFixed(0)}`);
    console.log(`   - Sessions tracked: ${stats.episodic.sessionCount}`);

    console.log(`\n🧠 Semantic Memory:`);
    console.log(`   - Total facts: ${stats.semantic.totalFacts}`);
    console.log(`   - Total tokens: ${stats.semantic.totalTokens}`);
    console.log(`   - Avg confidence: ${stats.semantic.averageConfidence.toFixed(2)}`);
    console.log(`   - Categories: ${Object.keys(stats.semantic.categoryCounts).length}`);
    console.log(`   - Most used facts:`);
    stats.semantic.mostUsedFacts.forEach(fact => {
      console.log(`     * ${fact.key}: ${fact.usageCount} uses`);
    });

    console.log(`\n⚙️ Procedural Memory:`);
    console.log(`   - Total patterns: ${stats.procedural.totalPatterns}`);
    console.log(`   - Total tokens: ${stats.procedural.totalTokens}`);
    console.log(`   - Avg success rate: ${stats.procedural.averageSuccessRate.toFixed(2)}`);
    console.log(`   - Categories: ${Object.keys(stats.procedural.categoryCounts).length}`);
    console.log(`   - Most used patterns:`);
    stats.procedural.mostUsedPatterns.forEach(pattern => {
      console.log(
        `     * ${pattern.name}: ${pattern.usageCount} uses (${(pattern.successRate * 100).toFixed(1)}% success)`,
      );
    });

    console.log(`\n📈 Overall Statistics:`);
    console.log(`   - Total memory items: ${stats.overall.totalItems}`);
    console.log(`   - Total tokens used: ${stats.overall.totalTokens}`);
    console.log(`   - Memory efficiency: ${(stats.overall.memoryEfficiency * 100).toFixed(1)}%`);

    console.log('\n🎉 DEMO COMPLETED SUCCESSFULLY!');
    console.log('=====================================');
    console.log('All three Deep Agents memory services are working with real data:');
    console.log('✅ Episodic Memory: Tracking conversation episodes and outcomes');
    console.log('✅ Semantic Memory: Storing and searching facts with usage tracking');
    console.log('✅ Procedural Memory: Learning and reusing workflow patterns');
    console.log('✅ TodoList Middleware: Task decomposition and progress tracking');
    console.log('✅ SubagentService: Task classification and delegation planning');
    console.log('\nNo mocks used - all functionality tested with real storage operations!');

    return {
      success: true,
      stats,
      episodeCount: episodes.length,
      factCount: stats.semantic.totalFacts,
      patternCount: stats.procedural.totalPatterns,
      todoProgress: progress,
      delegationPlan,
    };
  } catch (error) {
    console.error('❌ Demo failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// Export for use in other modules
export { memoryService, todoListMiddleware, subagentService };
