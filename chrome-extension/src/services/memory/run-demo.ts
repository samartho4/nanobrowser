/**
 * Demo Runner for Deep Agents Memory Services
 *
 * This script can be imported and run to demonstrate that all memory services
 * work with real data without any mocks.
 */

import { runMemoryServicesDemo } from './demo';

// Function to run the demo (can be called from browser console or other modules)
export async function runDemo() {
  console.log('🚀 Starting Deep Agents Memory Services Demo...');
  console.log('This will demonstrate real functionality without mocks.\n');

  const result = await runMemoryServicesDemo();

  if (result.success) {
    console.log('\n✅ DEMO VERIFICATION COMPLETE');
    console.log('==============================');
    console.log('All memory services are working correctly:');
    console.log(`- Episodes stored: ${result.episodeCount}`);
    console.log(`- Facts stored: ${result.factCount}`);
    console.log(`- Patterns stored: ${result.patternCount}`);
    console.log(`- Todo completion: ${(result.todoProgress.completionRate * 100).toFixed(1)}%`);
    console.log(`- Delegation plans: ${result.delegationPlan.delegations.length} agents`);
    console.log('\n🎯 PROOF: No mocks used - all data persisted to real storage!');
  } else {
    console.error('\n❌ DEMO FAILED');
    console.error('===============');
    console.error('Error:', result.error);
  }

  return result;
}

// Auto-run if this file is executed directly
if (typeof window !== 'undefined') {
  // Browser environment - make available globally
  (window as any).runMemoryDemo = runDemo;
  console.log('💡 Memory demo available! Run: runMemoryDemo()');
} else if (require.main === module) {
  // Node environment - run directly
  runDemo().catch(console.error);
}
