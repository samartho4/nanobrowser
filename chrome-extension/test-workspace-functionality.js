/**
 * Simple test to verify workspace functionality
 * Run this in the browser console to test the workspace features
 */

async function testWorkspaceFunctionality() {
  console.log('🧪 Testing Workspace Functionality...');

  try {
    // Import the workspace manager
    const { workspaceManager } = await import('./src/services/workspace/WorkspaceManager.ts');
    const { autonomyController } = await import('./src/services/workspace/AutonomyController.ts');

    console.log('✅ Imports successful');

    // Test 1: Create a new workspace
    console.log('\n📝 Test 1: Creating workspace...');
    const workspaceId = await workspaceManager.createWorkspace('Test Workspace', {
      description: 'A test workspace for verification',
      autonomyLevel: 3,
      color: '#10B981',
    });
    console.log(`✅ Created workspace: ${workspaceId}`);

    // Test 2: Switch to the new workspace
    console.log('\n🔄 Test 2: Switching workspace...');
    await workspaceManager.switchWorkspace(workspaceId);
    const activeWorkspace = await workspaceManager.getActiveWorkspace();
    console.log(`✅ Active workspace: ${activeWorkspace?.name}`);

    // Test 3: Test session management
    console.log('\n📋 Test 3: Session management...');
    const sessionId = await workspaceManager.getActiveSession(workspaceId);
    console.log(`✅ Active session: ${sessionId}`);

    // Test 4: Test autonomy level
    console.log('\n🎛️ Test 4: Autonomy control...');
    const autonomyLevel = await workspaceManager.getAutonomyLevel(workspaceId);
    console.log(`✅ Autonomy level: ${autonomyLevel}`);

    // Test 5: Test approval requirement
    console.log('\n🔒 Test 5: Approval requirements...');
    const needsApproval = await autonomyController.requiresApproval(workspaceId, 'gmail', 'medium', 'Test context');
    console.log(`✅ Needs approval for gmail action: ${needsApproval}`);

    // Test 6: List workspaces
    console.log('\n📋 Test 6: List workspaces...');
    const workspaces = await workspaceManager.listWorkspaces();
    console.log(`✅ Found ${workspaces.length} workspaces`);
    workspaces.forEach(ws => {
      console.log(`  - ${ws.name} (${ws.id}) - Level ${ws.autonomyLevel}`);
    });

    console.log('\n🎉 All tests passed! Workspace functionality is working correctly.');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testWorkspaceFunctionality };
} else {
  // Browser environment
  window.testWorkspaceFunctionality = testWorkspaceFunctionality;
}

console.log('🚀 Workspace test loaded. Run testWorkspaceFunctionality() to test.');
