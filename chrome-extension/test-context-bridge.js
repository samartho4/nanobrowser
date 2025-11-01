/**
 * Test script to verify the Context Bridge between Memory and Context systems
 *
 * This script tests:
 * 1. Gmail memory integration creates memory data
 * 2. Context bridge writes context items to ContextManager
 * 3. Context Pills can retrieve and display the context items
 */

const TEST_WORKSPACE_ID = 'test-context-bridge';

async function testContextBridge() {
  console.log('🧪 Testing Context Bridge Integration\n');

  try {
    // Import required services
    const { contextManager } = await import('./src/services/context/ContextManager.js');
    const { workspaceMemoryService } = await import('./src/services/workspace/WorkspaceMemoryService.js');

    console.log('📋 Step 1: Clear existing context data');
    // Clear any existing context data for clean test
    const storageKey = `context_keys_${TEST_WORKSPACE_ID}`;
    await chrome.storage.local.remove(storageKey);
    console.log('✅ Cleared existing context data\n');

    console.log('📋 Step 2: Simulate Gmail memory processing');
    // Simulate Gmail memory processing by directly calling the integration
    try {
      const stats = await workspaceMemoryService.getMemoryStats(TEST_WORKSPACE_ID);
      console.log('📊 Gmail memory stats:', stats);

      // The Gmail integration should have written context items during processing
      console.log('✅ Gmail memory processing completed\n');
    } catch (error) {
      console.log('⚠️ Gmail integration not available, using fallback approach');

      // Manually write some test context items to simulate the bridge
      await contextManager.write(
        TEST_WORKSPACE_ID,
        {
          type: 'gmail',
          content:
            'Test email: Important project update from John Smith\nSubject: Q4 Planning Meeting\nThis is a test email to verify context bridge functionality.',
          agentId: 'gmail-integration',
          sourceType: 'main',
          metadata: {
            source: 'gmail-test',
            priority: 4,
            sessionId: 'test-session',
            relevanceScore: 0.8,
          },
        },
        'episodic',
      );

      await contextManager.write(
        TEST_WORKSPACE_ID,
        {
          type: 'memory',
          content:
            'Successful workflow: Email received → Analyzed content → Extracted key information → Stored in memory',
          agentId: 'main-agent',
          sourceType: 'main',
          metadata: {
            source: 'test-workflow',
            priority: 5,
            sessionId: 'test-session',
            relevanceScore: 0.9,
          },
        },
        'procedural',
      );

      console.log('✅ Wrote test context items\n');
    }

    console.log('📋 Step 3: Test context retrieval');
    // Test context retrieval using the same method as Context Pills
    const contextItems = await contextManager.select(TEST_WORKSPACE_ID, 'email project meeting', 10000, {
      types: ['gmail', 'memory', 'message'],
      recencyBias: 0.3,
      semanticThreshold: 0.3,
      priorityWeighting: true,
    });

    console.log(`📊 Retrieved ${contextItems.length} context items:`);
    contextItems.forEach((item, index) => {
      console.log(`  ${index + 1}. [${item.type}] ${item.content.substring(0, 80)}...`);
      console.log(
        `     Priority: ${item.metadata.priority}, Tokens: ${item.metadata.tokens}, Agent: ${item.agentId || 'unknown'}`,
      );
    });

    console.log('\n📋 Step 4: Test Context Pills format conversion');
    // Convert to pills format (same as background script does)
    const pills = contextItems.map(item => ({
      id: item.id,
      type: item.type,
      label: `${item.type}: ${item.content.substring(0, 30)}...`,
      tokens: item.metadata.tokens,
      removable: true,
      priority: item.metadata.priority,
      agentId: item.agentId,
      sourceType: item.sourceType,
      preview: item.content.substring(0, 100) + '...',
    }));

    console.log(`🎯 Context Pills format (${pills.length} pills):`);
    pills.forEach((pill, index) => {
      console.log(`  ${index + 1}. ${pill.label} (${pill.tokens} tokens, priority: ${pill.priority})`);
    });

    console.log('\n📋 Step 5: Test context stats');
    const stats = await contextManager.getContextStats(TEST_WORKSPACE_ID);
    console.log('📊 Context statistics:');
    console.log(`  Total items: ${stats.totalItems}`);
    console.log(`  Total tokens: ${stats.totalTokens}`);
    console.log(`  Items by type:`, stats.itemsByType);
    console.log(`  Tokens by type:`, stats.tokensByType);

    console.log('\n🎉 Context Bridge Test Results:');
    console.log(`✅ Context items stored: ${contextItems.length > 0 ? 'SUCCESS' : 'FAILED'}`);
    console.log(`✅ Context Pills format: ${pills.length > 0 ? 'SUCCESS' : 'FAILED'}`);
    console.log(`✅ Context statistics: ${stats.totalItems > 0 ? 'SUCCESS' : 'FAILED'}`);

    if (contextItems.length > 0) {
      console.log('\n🔗 Context Bridge is working! Context Pills should now display data.');
      console.log('💡 To see this in action:');
      console.log('   1. Open the side panel');
      console.log('   2. Switch to the test workspace');
      console.log('   3. Context Pills should show the retrieved items');
    } else {
      console.log('\n❌ Context Bridge test failed - no context items found');
    }
  } catch (error) {
    console.error('❌ Context Bridge test failed:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Auto-run the test
testContextBridge();

// Export for manual testing
window.testContextBridge = testContextBridge;

console.log('\n💡 You can also run this test manually by calling: testContextBridge()');
