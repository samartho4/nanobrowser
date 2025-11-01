/**
 * Simple test to write and retrieve context items for the 'default' workspace
 * Run this in the browser console to test the context bridge
 */

async function testContextSimple() {
  console.log('🧪 Simple Context Test for default workspace\n');

  try {
    // Test writing a context item directly
    const response = await chrome.runtime.sendMessage({
      type: 'TEST_CONTEXT_WRITE',
      payload: {
        workspaceId: 'default',
        contextItem: {
          type: 'gmail',
          content:
            'Test Gmail context item: Important meeting with John Smith about Q4 planning. This is a test to verify the context bridge is working correctly.',
          metadata: {
            source: 'test-context-bridge',
            priority: 4,
            sessionId: 'test-session',
          },
        },
      },
    });

    console.log('✅ Write response:', response);

    // Test retrieving context items
    const selectResponse = await chrome.runtime.sendMessage({
      type: 'TEST_CONTEXT_SELECT',
      payload: {
        workspaceId: 'default',
        query: 'meeting planning',
        tokenLimit: 10000,
        options: {},
      },
    });

    console.log('📊 Select response:', selectResponse);

    if (selectResponse?.ok && selectResponse.items) {
      console.log(`Found ${selectResponse.items.length} context items:`);
      selectResponse.items.forEach((item, index) => {
        console.log(`  ${index + 1}. [${item.type}] ${item.content.substring(0, 80)}...`);
      });
    }

    // Test GET_CONTEXT_PILLS (same as UI uses)
    const pillsResponse = await chrome.runtime.sendMessage({
      type: 'GET_CONTEXT_PILLS',
      payload: { workspaceId: 'default' },
    });

    console.log('🎯 Pills response:', pillsResponse);

    if (pillsResponse?.ok && pillsResponse.pills) {
      console.log(`Found ${pillsResponse.pills.length} context pills:`);
      pillsResponse.pills.forEach((pill, index) => {
        console.log(`  ${index + 1}. ${pill.label} (${pill.tokens} tokens)`);
      });
    }

    // Check Chrome storage for context keys
    const storageKey = 'context_keys_default';
    const storageResult = await chrome.storage.local.get(storageKey);
    const contextKeys = storageResult[storageKey] || [];
    console.log(`📦 Chrome storage has ${contextKeys.length} context keys for 'default' workspace:`, contextKeys);

    return {
      writeSuccess: response?.ok || false,
      selectSuccess: selectResponse?.ok || false,
      pillsSuccess: pillsResponse?.ok || false,
      itemCount: selectResponse?.items?.length || 0,
      pillCount: pillsResponse?.pills?.length || 0,
      storageKeys: contextKeys.length,
    };
  } catch (error) {
    console.error('❌ Test failed:', error);
    return { error: error.message };
  }
}

// Auto-run the test
testContextSimple().then(result => {
  console.log('\n🎉 Test Results:', result);

  if (result.error) {
    console.log('❌ Test failed with error');
  } else if (result.itemCount > 0 || result.pillCount > 0) {
    console.log('✅ Context bridge is working!');
  } else {
    console.log('❌ No context items found - bridge may not be working');
  }
});

// Export for manual testing
if (typeof window !== 'undefined') {
  window.testContextSimple = testContextSimple;
  console.log('\n💡 You can also run this test manually by calling: testContextSimple()');
}
