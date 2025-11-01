/**
 * Test script to verify context items are being stored and retrieved correctly
 * Run this in the browser console after Gmail processing completes
 */

async function testContextRetrieval() {
  console.log('🧪 Testing Context Retrieval for default workspace\n');

  try {
    // Test 1: Check Chrome storage for context keys
    console.log('📋 Step 1: Check Chrome storage for context keys');
    const storageKey = 'context_keys_default';
    const storageResult = await chrome.storage.local.get(storageKey);
    const contextKeys = storageResult[storageKey] || [];
    console.log(`📦 Found ${contextKeys.length} context keys in Chrome storage:`, contextKeys);

    // Test 2: Test GET_CONTEXT_PILLS message (same as UI uses)
    console.log('\n📋 Step 2: Test GET_CONTEXT_PILLS message');
    const pillsResponse = await chrome.runtime.sendMessage({
      type: 'GET_CONTEXT_PILLS',
      payload: { workspaceId: 'default' },
    });
    console.log('🎯 GET_CONTEXT_PILLS response:', pillsResponse);

    if (pillsResponse?.ok && pillsResponse.pills) {
      console.log(`✅ Found ${pillsResponse.pills.length} context pills:`);
      pillsResponse.pills.forEach((pill, index) => {
        console.log(`  ${index + 1}. [${pill.type}] ${pill.label} (${pill.tokens} tokens, priority: ${pill.priority})`);
      });
    } else {
      console.log('❌ No context pills found');
    }

    // Test 3: Test TEST_CONTEXT_SELECT message (alternative method)
    console.log('\n📋 Step 3: Test TEST_CONTEXT_SELECT message');
    const selectResponse = await chrome.runtime.sendMessage({
      type: 'TEST_CONTEXT_SELECT',
      payload: {
        workspaceId: 'default',
        query: '',
        tokenLimit: 50000,
        options: {},
      },
    });
    console.log('🔍 TEST_CONTEXT_SELECT response:', selectResponse);

    if (selectResponse?.ok && selectResponse.items) {
      console.log(`✅ Found ${selectResponse.items.length} context items via select:`);
      selectResponse.items.forEach((item, index) => {
        console.log(
          `  ${index + 1}. [${item.type}] ${item.content.substring(0, 60)}... (${item.metadata.tokens} tokens)`,
        );
      });
    } else {
      console.log('❌ No context items found via select');
    }

    // Test 4: Check if there's a timing issue - wait and try again
    console.log('\n📋 Step 4: Wait 2 seconds and try again (timing test)');
    await new Promise(resolve => setTimeout(resolve, 2000));

    const delayedPillsResponse = await chrome.runtime.sendMessage({
      type: 'GET_CONTEXT_PILLS',
      payload: { workspaceId: 'default' },
    });
    console.log('⏰ Delayed GET_CONTEXT_PILLS response:', delayedPillsResponse);

    // Summary
    console.log('\n🎉 Test Summary:');
    console.log(`📦 Chrome storage keys: ${contextKeys.length}`);
    console.log(`🎯 Context pills: ${pillsResponse?.pills?.length || 0}`);
    console.log(`🔍 Context items (select): ${selectResponse?.items?.length || 0}`);
    console.log(`⏰ Delayed context pills: ${delayedPillsResponse?.pills?.length || 0}`);

    if (contextKeys.length > 0 && (pillsResponse?.pills?.length > 0 || selectResponse?.items?.length > 0)) {
      console.log('✅ Context bridge is working - items are being stored and retrieved!');
    } else if (contextKeys.length > 0) {
      console.log('⚠️ Context items are being stored but not retrieved - retrieval issue');
    } else {
      console.log('❌ No context items found - storage issue');
    }

    return {
      storageKeys: contextKeys.length,
      pills: pillsResponse?.pills?.length || 0,
      selectItems: selectResponse?.items?.length || 0,
      delayedPills: delayedPillsResponse?.pills?.length || 0,
    };
  } catch (error) {
    console.error('❌ Test failed:', error);
    return { error: error.message };
  }
}

// Auto-run the test
testContextRetrieval().then(result => {
  console.log('\n📊 Final Results:', result);
});

// Export for manual testing
if (typeof window !== 'undefined') {
  window.testContextRetrieval = testContextRetrieval;
  console.log('\n💡 You can also run this test manually by calling: testContextRetrieval()');
}
