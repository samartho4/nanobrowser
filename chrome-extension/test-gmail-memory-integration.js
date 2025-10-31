/**
 * Gmail Memory Integration Test Script
 *
 * Run this in the browser console to test the Gmail memory integration
 */

console.log('🧪 Gmail Memory Integration Test Script');
console.log('=====================================');

// Test function to verify Gmail memory integration
async function testGmailMemoryIntegration() {
  try {
    console.log('📧 Testing Gmail Memory Integration...');

    // Test 1: Check if workspace memory service is available
    console.log('\n1️⃣ Testing workspace memory service availability...');

    const testWorkspaceId = 'test-workspace-' + Date.now();

    // Test getting memory stats
    const statsResponse = await chrome.runtime.sendMessage({
      type: 'GET_WORKSPACE_MEMORY_STATS',
      payload: { workspaceId: testWorkspaceId },
    });

    console.log('Memory stats response:', statsResponse);

    if (statsResponse.success) {
      console.log('✅ Workspace memory service is working');
      console.log('📊 Memory Statistics:');
      console.log('  - Total Items:', statsResponse.data.totalItems);
      console.log('  - Total Tokens:', statsResponse.data.totalTokens);
      console.log('  - Efficiency:', statsResponse.data.efficiency + '%');
      console.log('  - Gmail Integration Enabled:', statsResponse.data.gmailIntegration.enabled);
      console.log('  - Last Sync:', new Date(statsResponse.data.gmailIntegration.lastSync).toLocaleString());
      console.log('  - Emails Processed:', statsResponse.data.gmailIntegration.totalEmailsProcessed);
    } else {
      console.log('❌ Workspace memory service failed:', statsResponse.error);
    }

    // Test 2: Check Gmail authentication status
    console.log('\n2️⃣ Testing Gmail authentication...');

    const authResponse = await chrome.runtime.sendMessage({
      type: 'AUTHENTICATE_GMAIL',
    });

    console.log('Gmail auth response:', authResponse);

    if (authResponse.success) {
      console.log('✅ Gmail authentication successful');
    } else {
      console.log('⚠️ Gmail authentication needed:', authResponse.error);
    }

    // Test 3: Test Gmail sync (if authenticated)
    if (authResponse.success) {
      console.log('\n3️⃣ Testing Gmail sync...');

      const syncResponse = await chrome.runtime.sendMessage({
        type: 'SYNC_GMAIL_MEMORY',
        payload: {
          workspaceId: testWorkspaceId,
          maxMessages: 10,
          daysBack: 7,
          forceRefresh: true,
        },
      });

      console.log('Gmail sync response:', syncResponse);

      if (syncResponse.success) {
        console.log('✅ Gmail sync successful');
        console.log('📈 Sync Results:');
        console.log('  - Episodic Memories Created:', syncResponse.data.episodicCount);
        console.log('  - Semantic Facts Created:', syncResponse.data.semanticCount);
        console.log('  - Procedural Patterns Created:', syncResponse.data.proceduralCount);
        console.log('  - Total Emails Processed:', syncResponse.data.totalProcessed);
      } else {
        console.log('❌ Gmail sync failed:', syncResponse.error);
      }

      // Test 4: Get updated memory stats after sync
      console.log('\n4️⃣ Getting updated memory stats...');

      const updatedStatsResponse = await chrome.runtime.sendMessage({
        type: 'GET_WORKSPACE_MEMORY_STATS',
        payload: { workspaceId: testWorkspaceId },
      });

      if (updatedStatsResponse.success) {
        console.log('✅ Updated memory stats retrieved');
        console.log('📊 Updated Statistics:');
        console.log('  - Total Items:', updatedStatsResponse.data.totalItems);
        console.log('  - Total Tokens:', updatedStatsResponse.data.totalTokens);
        console.log('  - Efficiency:', updatedStatsResponse.data.efficiency + '%');
        console.log('  - Episodic Episodes:', updatedStatsResponse.data.episodic.episodes);
        console.log('  - Semantic Facts:', updatedStatsResponse.data.semantic.facts);
        console.log('  - Procedural Patterns:', updatedStatsResponse.data.procedural.patterns);
      }
    }

    console.log('\n🎉 Gmail Memory Integration Test Complete!');
    console.log('=====================================');
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Test function to verify real vs mock data
function analyzeMemoryData(memoryStats) {
  console.log('\n🔍 Analyzing Memory Data Quality...');
  console.log('===================================');

  const indicators = {
    realData: [],
    mockData: [],
    suspicious: [],
  };

  // Check for real data indicators
  if (memoryStats.totalItems > 0) {
    indicators.realData.push('Non-zero total items');
  } else {
    indicators.mockData.push('Zero total items');
  }

  if (memoryStats.totalTokens > 0 && memoryStats.totalTokens % 100 !== 0) {
    indicators.realData.push('Realistic token count (not round number)');
  } else if (memoryStats.totalTokens === 0) {
    indicators.mockData.push('Zero token count');
  } else {
    indicators.suspicious.push('Round token number (might be mock)');
  }

  if (memoryStats.efficiency > 0 && memoryStats.efficiency < 100) {
    indicators.realData.push('Realistic efficiency percentage');
  } else if (memoryStats.efficiency === 0) {
    indicators.mockData.push('Zero efficiency');
  } else {
    indicators.suspicious.push('Perfect 100% efficiency (suspicious)');
  }

  if (memoryStats.gmailIntegration.enabled && memoryStats.gmailIntegration.lastSync > 0) {
    indicators.realData.push('Gmail integration active with recent sync');
  } else {
    indicators.mockData.push('Gmail integration not active');
  }

  if (memoryStats.gmailIntegration.totalEmailsProcessed > 0) {
    indicators.realData.push('Emails have been processed');
  } else {
    indicators.mockData.push('No emails processed');
  }

  // Analyze episodic memory
  if (memoryStats.episodic.episodes > 0 && memoryStats.episodic.successRate < 100) {
    indicators.realData.push('Realistic episodic data');
  } else if (memoryStats.episodic.episodes === 0) {
    indicators.mockData.push('No episodic memories');
  }

  // Analyze semantic memory
  if (memoryStats.semantic.facts > 0 && memoryStats.semantic.avgConfidence < 100) {
    indicators.realData.push('Realistic semantic data');
  } else if (memoryStats.semantic.facts === 0) {
    indicators.mockData.push('No semantic facts');
  }

  // Analyze procedural memory
  if (memoryStats.procedural.patterns > 0 && memoryStats.procedural.avgSuccess < 100) {
    indicators.realData.push('Realistic procedural data');
  } else if (memoryStats.procedural.patterns === 0) {
    indicators.mockData.push('No procedural patterns');
  }

  // Report results
  console.log('✅ Real Data Indicators:');
  indicators.realData.forEach(indicator => console.log('  - ' + indicator));

  console.log('\n❌ Mock Data Indicators:');
  indicators.mockData.forEach(indicator => console.log('  - ' + indicator));

  console.log('\n⚠️ Suspicious Indicators:');
  indicators.suspicious.forEach(indicator => console.log('  - ' + indicator));

  // Overall assessment
  const realScore = indicators.realData.length;
  const mockScore = indicators.mockData.length;

  console.log('\n📊 Overall Assessment:');
  console.log('Real Data Score:', realScore);
  console.log('Mock Data Score:', mockScore);

  if (realScore > mockScore) {
    console.log('🎉 VERDICT: This appears to be REAL Gmail data!');
  } else if (mockScore > realScore) {
    console.log('🤖 VERDICT: This appears to be MOCK data');
  } else {
    console.log('🤔 VERDICT: Mixed signals - needs further investigation');
  }
}

// Helper function to test specific workspace
async function testSpecificWorkspace(workspaceId) {
  console.log(`🔍 Testing specific workspace: ${workspaceId}`);

  const response = await chrome.runtime.sendMessage({
    type: 'GET_WORKSPACE_MEMORY_STATS',
    payload: { workspaceId },
  });

  if (response.success) {
    console.log('📊 Workspace Memory Stats:', response.data);
    analyzeMemoryData(response.data);
  } else {
    console.log('❌ Failed to get workspace stats:', response.error);
  }
}

// Export functions for manual testing
window.testGmailMemoryIntegration = testGmailMemoryIntegration;
window.analyzeMemoryData = analyzeMemoryData;
window.testSpecificWorkspace = testSpecificWorkspace;

console.log('\n🚀 Test functions available:');
console.log('- testGmailMemoryIntegration() - Run full integration test');
console.log('- analyzeMemoryData(stats) - Analyze memory data quality');
console.log('- testSpecificWorkspace(id) - Test specific workspace');
console.log('\nTo start testing, run: testGmailMemoryIntegration()');
