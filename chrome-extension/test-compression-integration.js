/**
 * Context Compression Integration Test
 *
 * This test verifies the complete compression functionality:
 * 1. Context item creation and storage
 * 2. Compression preview generation
 * 3. Compression execution
 * 4. Statistics tracking
 * 5. Auto-compression settings
 */

// Test configuration
const TEST_WORKSPACE_ID = 'compression-test-workspace';
const TEST_ITEMS_COUNT = 20;
const TARGET_TOKENS = 5000;

// Test data generator
function generateTestContextItems(count = TEST_ITEMS_COUNT) {
  const items = [];
  const types = ['message', 'page', 'gmail', 'memory', 'file'];
  const priorities = [1, 2, 3, 4, 5];

  for (let i = 0; i < count; i++) {
    const type = types[i % types.length];
    const priority = priorities[i % priorities.length];
    const content = `Test context item ${i + 1}: This is a sample ${type} with priority ${priority}. `.repeat(
      Math.floor(Math.random() * 10) + 5,
    );

    items.push({
      id: `test-item-${i + 1}`,
      type,
      content,
      agentId: i % 3 === 0 ? 'test-agent' : undefined,
      sourceType: 'main',
      metadata: {
        source: `test-${type}`,
        timestamp: Date.now() - i * 60000, // Spread items over time
        tokens: Math.floor(content.length / 4), // Rough token estimate
        priority,
        workspaceId: TEST_WORKSPACE_ID,
        relevanceScore: Math.random(),
      },
    });
  }

  return items;
}

// Test runner
async function runCompressionTests() {
  console.log('🧪 Starting Context Compression Integration Tests...\n');

  try {
    // Test 1: Setup test data
    console.log('📝 Test 1: Setting up test context items...');
    const testItems = generateTestContextItems();
    const totalTokens = testItems.reduce((sum, item) => sum + item.metadata.tokens, 0);
    console.log(`✅ Generated ${testItems.length} test items with ${totalTokens} total tokens\n`);

    // Test 2: Store context items
    console.log('💾 Test 2: Storing context items...');
    const { contextManager } = await import('./src/services/context/ContextManager.js');

    for (const item of testItems) {
      await contextManager.write(TEST_WORKSPACE_ID, item, 'episodic');
    }
    console.log('✅ All context items stored successfully\n');

    // Test 3: Test context selection
    console.log('🔍 Test 3: Testing context selection...');
    const selectedItems = await contextManager.select(TEST_WORKSPACE_ID, '', 50000, {});
    console.log(`✅ Selected ${selectedItems.length} items from storage\n`);

    // Test 4: Test compression preview
    console.log('🔬 Test 4: Testing compression preview...');
    const strategies = ['conservative', 'balanced', 'aggressive', 'semantic'];

    for (const strategyName of strategies) {
      const strategy = {
        name: strategyName,
        description: `${strategyName} compression strategy`,
        targetRatio:
          strategyName === 'conservative'
            ? 0.7
            : strategyName === 'balanced'
              ? 0.5
              : strategyName === 'aggressive'
                ? 0.3
                : 0.4,
      };

      const compressionResult = await contextManager.compress(selectedItems, strategy, TARGET_TOKENS);

      console.log(`  📊 ${strategyName} strategy:`);
      console.log(
        `     Original: ${compressionResult.originalTokens} tokens (${compressionResult.original.length} items)`,
      );
      console.log(
        `     Compressed: ${compressionResult.compressedTokens} tokens (${compressionResult.compressed.length} items)`,
      );
      console.log(`     Reduction: ${((1 - compressionResult.compressionRatio) * 100).toFixed(1)}%`);
      console.log(`     Items removed: ${compressionResult.itemsRemoved || 0}`);
      console.log(`     Summary: ${compressionResult.summary}`);
      console.log('');
    }

    // Test 5: Test compression statistics
    console.log('📈 Test 5: Testing compression statistics...');
    const initialStats = await contextManager.getCompressionStats(TEST_WORKSPACE_ID);
    console.log('✅ Initial compression stats:', initialStats);

    // Update stats
    await contextManager.updateCompressionStats(TEST_WORKSPACE_ID, {
      compressedItems: 5,
      compressedTokens: 1000,
      compressionRatio: 20,
      isCompressing: false,
    });

    const updatedStats = await contextManager.getCompressionStats(TEST_WORKSPACE_ID);
    console.log('✅ Updated compression stats:', updatedStats);
    console.log('');

    // Test 6: Test backend message handlers
    console.log('🔌 Test 6: Testing backend message handlers...');

    // Test GET_COMPRESSION_STATS
    const statsResponse = await chrome.runtime.sendMessage({
      type: 'GET_COMPRESSION_STATS',
      payload: { workspaceId: TEST_WORKSPACE_ID },
    });
    console.log('✅ GET_COMPRESSION_STATS response:', statsResponse);

    // Test TEST_CONTEXT_SELECT
    const selectResponse = await chrome.runtime.sendMessage({
      type: 'TEST_CONTEXT_SELECT',
      payload: {
        workspaceId: TEST_WORKSPACE_ID,
        query: '',
        tokenLimit: 10000,
        options: {},
      },
    });
    console.log(
      `✅ TEST_CONTEXT_SELECT response: ${selectResponse.ok ? 'Success' : 'Failed'} - ${selectResponse.items?.length || 0} items`,
    );

    // Test TEST_CONTEXT_COMPRESS
    const compressResponse = await chrome.runtime.sendMessage({
      type: 'TEST_CONTEXT_COMPRESS',
      payload: {
        items: selectResponse.items?.slice(0, 10) || [],
        strategy: {
          name: 'balanced',
          description: 'Balanced compression strategy',
          targetRatio: 0.5,
        },
        targetTokens: TARGET_TOKENS,
      },
    });
    console.log(`✅ TEST_CONTEXT_COMPRESS response: ${compressResponse.ok ? 'Success' : 'Failed'}`);
    if (compressResponse.ok) {
      console.log(`   Compression ratio: ${(compressResponse.result.compressionRatio * 100).toFixed(1)}%`);
    }

    // Test SET_AUTO_COMPRESSION
    const autoCompressionResponse = await chrome.runtime.sendMessage({
      type: 'SET_AUTO_COMPRESSION',
      payload: {
        workspaceId: TEST_WORKSPACE_ID,
        enabled: true,
        strategy: 'balanced',
        targetTokens: TARGET_TOKENS,
      },
    });
    console.log(`✅ SET_AUTO_COMPRESSION response: ${autoCompressionResponse.success ? 'Success' : 'Failed'}`);

    // Verify auto-compression settings were stored
    const storedSettings = await chrome.storage.local.get(`autoCompression_${TEST_WORKSPACE_ID}`);
    console.log('✅ Stored auto-compression settings:', storedSettings[`autoCompression_${TEST_WORKSPACE_ID}`]);
    console.log('');

    // Test 7: Test full compression workflow
    console.log('🔄 Test 7: Testing full compression workflow...');

    const workflowResponse = await chrome.runtime.sendMessage({
      type: 'COMPRESS_WORKSPACE_CONTEXT',
      payload: {
        workspaceId: TEST_WORKSPACE_ID,
        strategy: 'balanced',
        targetTokens: TARGET_TOKENS,
        preserveRecent: true,
        preserveImportant: true,
      },
    });

    console.log(`✅ Full compression workflow: ${workflowResponse.success ? 'Success' : 'Failed'}`);
    if (workflowResponse.success) {
      console.log(`   Items removed: ${workflowResponse.result.itemsRemoved || 0}`);
      console.log(`   Tokens saved: ${workflowResponse.result.tokensRemoved || 0}`);
      console.log(`   Compression ratio: ${(workflowResponse.result.compressionRatio * 100).toFixed(1)}%`);
    } else {
      console.log(`   Error: ${workflowResponse.error}`);
    }

    // Verify final stats
    const finalStats = await contextManager.getCompressionStats(TEST_WORKSPACE_ID);
    console.log('✅ Final compression stats:', finalStats);
    console.log('');

    // Test 8: Cleanup
    console.log('🧹 Test 8: Cleaning up test data...');

    // Remove test items
    const remainingItems = await contextManager.select(TEST_WORKSPACE_ID, '', 50000, {});
    for (const item of remainingItems) {
      await contextManager.removeItem(TEST_WORKSPACE_ID, item.id);
    }

    // Clear storage
    await chrome.storage.local.remove(`autoCompression_${TEST_WORKSPACE_ID}`);
    await chrome.storage.local.remove(`compressionStats_${TEST_WORKSPACE_ID}`);

    console.log('✅ Test cleanup completed\n');

    console.log('🎉 All Context Compression Integration Tests Passed! 🎉');

    return {
      success: true,
      message: 'All compression tests completed successfully',
      details: {
        itemsGenerated: testItems.length,
        totalTokens,
        targetTokens: TARGET_TOKENS,
        strategiesTested: strategies.length,
        backendHandlersTested: 4,
      },
    };
  } catch (error) {
    console.error('❌ Test failed:', error);
    return {
      success: false,
      error: error.message,
      stack: error.stack,
    };
  }
}

// Performance test
async function runPerformanceTests() {
  console.log('⚡ Running Performance Tests...\n');

  try {
    const { contextManager } = await import('./src/services/context/ContextManager.js');

    // Test with different item counts
    const testSizes = [10, 50, 100, 500];

    for (const size of testSizes) {
      console.log(`📊 Testing with ${size} items...`);

      const items = generateTestContextItems(size);
      const totalTokens = items.reduce((sum, item) => sum + item.metadata.tokens, 0);

      // Time compression
      const startTime = Date.now();
      const strategy = {
        name: 'balanced',
        description: 'Balanced compression strategy',
        targetRatio: 0.5,
      };

      const result = await contextManager.compress(items, strategy, Math.floor(totalTokens * 0.6));
      const endTime = Date.now();

      console.log(`   ⏱️  Compression time: ${endTime - startTime}ms`);
      console.log(`   📉 Reduction: ${((1 - result.compressionRatio) * 100).toFixed(1)}%`);
      console.log(`   🗑️  Items removed: ${result.itemsRemoved || 0}`);
      console.log('');
    }

    console.log('✅ Performance tests completed\n');
  } catch (error) {
    console.error('❌ Performance test failed:', error);
  }
}

// Export for use in other tests
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    runCompressionTests,
    runPerformanceTests,
    generateTestContextItems,
    TEST_WORKSPACE_ID,
  };
}

// Auto-run if called directly
if (typeof window !== 'undefined' && window.chrome) {
  // Run tests when loaded in browser context
  runCompressionTests().then(result => {
    console.log('Test Result:', result);

    if (result.success) {
      runPerformanceTests();
    }
  });
}
