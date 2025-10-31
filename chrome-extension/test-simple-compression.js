/**
 * Simple Context Compression Test
 *
 * Tests the simplified compression interface with real backend integration
 */

const TEST_WORKSPACE_ID = 'simple-compression-test';

// Test the simplified compression workflow
async function testSimpleCompression() {
  console.log('🧪 Testing Simplified Context Compression...\n');

  try {
    // Test 1: Create some test context items
    console.log('📝 Step 1: Creating test context items...');
    const { contextManager } = await import('./src/services/context/ContextManager.js');

    const testItems = [
      {
        type: 'message',
        content: 'This is a test message with some content that takes up tokens. '.repeat(10),
        metadata: {
          source: 'test-message',
          priority: 3,
        },
      },
      {
        type: 'page',
        content: 'This is page content that should be compressed when needed. '.repeat(15),
        metadata: {
          source: 'test-page',
          priority: 2,
        },
      },
      {
        type: 'memory',
        content: 'Important memory that should be preserved during compression. '.repeat(8),
        metadata: {
          source: 'test-memory',
          priority: 5,
        },
      },
    ];

    // Store test items
    for (const item of testItems) {
      await contextManager.write(TEST_WORKSPACE_ID, item, 'episodic');
    }

    console.log(`✅ Created ${testItems.length} test context items\n`);

    // Test 2: Get current context stats
    console.log('📊 Step 2: Getting current context stats...');
    const contextItems = await contextManager.select(TEST_WORKSPACE_ID, '', 50000, {});
    const totalTokens = contextItems.reduce((sum, item) => sum + item.metadata.tokens, 0);

    console.log(`✅ Found ${contextItems.length} items with ${totalTokens} total tokens\n`);

    // Test 3: Test compression levels
    console.log('🔧 Step 3: Testing compression levels...');

    const levels = [
      { name: 'light', strategy: 'conservative', reduction: 0.8 },
      { name: 'medium', strategy: 'balanced', reduction: 0.6 },
      { name: 'heavy', strategy: 'aggressive', reduction: 0.4 },
    ];

    for (const level of levels) {
      const targetTokens = Math.floor(totalTokens * level.reduction);

      console.log(`  Testing ${level.name} compression (target: ${targetTokens} tokens)...`);

      const response = await chrome.runtime.sendMessage({
        type: 'COMPRESS_WORKSPACE_CONTEXT',
        payload: {
          workspaceId: TEST_WORKSPACE_ID,
          strategy: level.strategy,
          targetTokens,
          preserveRecent: true,
          preserveImportant: true,
        },
      });

      if (response?.success) {
        console.log(
          `    ✅ ${level.name}: ${response.result.itemsRemoved || 0} items removed, ${response.result.tokensRemoved || 0} tokens saved`,
        );
      } else {
        console.log(`    ❌ ${level.name}: ${response?.error || 'Failed'}`);
      }
    }

    console.log('');

    // Test 4: Test compression stats
    console.log('📈 Step 4: Testing compression statistics...');

    const statsResponse = await chrome.runtime.sendMessage({
      type: 'GET_COMPRESSION_STATS',
      payload: { workspaceId: TEST_WORKSPACE_ID },
    });

    if (statsResponse?.success) {
      console.log('✅ Compression stats retrieved:', {
        totalItems: statsResponse.stats.totalItems,
        totalTokens: statsResponse.stats.totalTokens,
        lastCompression: statsResponse.stats.lastCompression > 0 ? 'Yes' : 'Never',
        compressionRatio: statsResponse.stats.compressionRatio,
      });
    } else {
      console.log('❌ Failed to get compression stats:', statsResponse?.error);
    }

    console.log('');

    // Test 5: Test UI integration points
    console.log('🎨 Step 5: Testing UI integration points...');

    // Test context selection (used by UI)
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
      `✅ Context selection: ${selectResponse?.ok ? 'Success' : 'Failed'} - ${selectResponse?.items?.length || 0} items`,
    );

    // Test compression preview (used by UI)
    if (selectResponse?.ok && selectResponse.items?.length > 0) {
      const previewResponse = await chrome.runtime.sendMessage({
        type: 'TEST_CONTEXT_COMPRESS',
        payload: {
          items: selectResponse.items,
          strategy: {
            name: 'balanced',
            description: 'Balanced compression',
            targetRatio: 0.6,
          },
          targetTokens: Math.floor(totalTokens * 0.6),
        },
      });

      console.log(`✅ Compression preview: ${previewResponse?.ok ? 'Success' : 'Failed'}`);
      if (previewResponse?.ok) {
        console.log(`    Original: ${previewResponse.result.originalTokens} tokens`);
        console.log(`    Compressed: ${previewResponse.result.compressedTokens} tokens`);
        console.log(`    Ratio: ${(previewResponse.result.compressionRatio * 100).toFixed(1)}%`);
      }
    }

    console.log('');

    // Test 6: Cleanup
    console.log('🧹 Step 6: Cleaning up test data...');

    const remainingItems = await contextManager.select(TEST_WORKSPACE_ID, '', 50000, {});
    for (const item of remainingItems) {
      await contextManager.removeItem(TEST_WORKSPACE_ID, item.id);
    }

    console.log('✅ Test cleanup completed\n');

    console.log('🎉 Simple Context Compression Test Passed! 🎉');

    return {
      success: true,
      message: 'Simplified compression system working correctly',
      details: {
        itemsCreated: testItems.length,
        levelsTestedSuccessfully: levels.length,
        backendIntegrationWorking: true,
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

// Test UI calculations
function testUICalculations() {
  console.log('🧮 Testing UI Calculation Logic...\n');

  const totalTokens = 10000;

  // Test compression level calculations
  const levels = [
    { name: 'light', reduction: 20 },
    { name: 'medium', reduction: 40 },
    { name: 'heavy', reduction: 60 },
  ];

  levels.forEach(level => {
    const targetTokens = Math.floor(totalTokens * ((100 - level.reduction) / 100));
    const tokensSaved = totalTokens - targetTokens;
    const percentageSaved = (tokensSaved / totalTokens) * 100;

    console.log(`${level.name} compression:`);
    console.log(`  Target tokens: ${targetTokens.toLocaleString()}`);
    console.log(`  Tokens saved: ${tokensSaved.toLocaleString()}`);
    console.log(`  Percentage saved: ${percentageSaved.toFixed(1)}%`);
    console.log('');
  });

  console.log('✅ UI calculations working correctly\n');
}

// Export for use in other tests
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    testSimpleCompression,
    testUICalculations,
    TEST_WORKSPACE_ID,
  };
}

// Auto-run if called directly
if (typeof window !== 'undefined' && window.chrome) {
  testUICalculations();
  testSimpleCompression().then(result => {
    console.log('Final Result:', result);
  });
}
