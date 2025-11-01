#!/usr/bin/env node

/**
 * PROMPT API GMAIL INTEGRATION TEST
 *
 * This script tests the complete Gmail → Prompt API → 3-Tier Memory flow
 * Run from terminal to verify real data classification
 *
 * PREREQUISITES:
 * 1. Chrome Canary with flags enabled:
 *    - chrome://flags/#optimization-guide-on-device-model → "Enabled BypassPerfRequirement"
 *    - chrome://flags/#prompt-api-for-gemini-nano → "Enabled"
 * 2. Gemini Nano model downloaded (run in DevTools: await ai.languageModel.create())
 * 3. Extension loaded and Gmail authenticated
 *
 * USAGE:
 *   node chrome-extension/test-prompt-api-gmail.js
 */

console.log('🧪 PROMPT API GMAIL INTEGRATION TEST');
console.log('=====================================\n');

// Test configuration
const TEST_CONFIG = {
  workspaceId: 'test-workspace-' + Date.now(),
  maxMessages: 10,
  daysBack: 7,
  timeout: 120000, // 2 minutes
};

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(level, message, data) {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  const prefix =
    {
      info: `${colors.blue}ℹ${colors.reset}`,
      success: `${colors.green}✓${colors.reset}`,
      error: `${colors.red}✗${colors.reset}`,
      warning: `${colors.yellow}⚠${colors.reset}`,
      test: `${colors.cyan}▶${colors.reset}`,
    }[level] || '•';

  console.log(`[${timestamp}] ${prefix} ${message}`);
  if (data) {
    console.log(`${colors.bright}Data:${colors.reset}`, JSON.stringify(data, null, 2));
  }
}

async function checkPromptAPIAvailability() {
  log('test', 'Step 1: Checking Prompt API availability...');

  try {
    // This test must be run in a browser context with extension loaded
    // We'll provide instructions for manual verification

    log('info', 'To verify Prompt API availability, run in Chrome DevTools console:');
    console.log(`
${colors.cyan}// Check if Prompt API is available
if (globalThis.ai && globalThis.ai.languageModel) {
  const capabilities = await ai.languageModel.capabilities();
  console.log('Prompt API Status:', capabilities.available);
  // Should return: "readily" or "available"
} else {
  console.log('Prompt API not available');
}${colors.reset}
    `);

    return true;
  } catch (error) {
    log('error', 'Failed to check Prompt API availability', error.message);
    return false;
  }
}

async function testGmailAuthentication() {
  log('test', 'Step 2: Testing Gmail authentication...');

  console.log(`
${colors.cyan}// Run in Chrome DevTools console (with extension loaded):
chrome.runtime.sendMessage({
  type: 'AUTHENTICATE_GMAIL'
}, (response) => {
  console.log('Gmail Auth Response:', response);
});${colors.reset}
  `);

  log('info', 'Expected response: { success: true, data: {...} }');
  return true;
}

async function testGmailSync() {
  log('test', 'Step 3: Testing Gmail sync with Prompt API classification...');

  console.log(`
${colors.cyan}// Run in Chrome DevTools console:
chrome.runtime.sendMessage({
  type: 'SYNC_GMAIL_MEMORY',
  payload: {
    workspaceId: '${TEST_CONFIG.workspaceId}',
    maxMessages: ${TEST_CONFIG.maxMessages},
    daysBack: ${TEST_CONFIG.daysBack},
    forceRefresh: true
  }
}, (response) => {
  console.log('Sync Response:', response);
  
  if (response.success && response.taskId) {
    // Poll for task completion
    const pollInterval = setInterval(async () => {
      chrome.runtime.sendMessage({
        type: 'GET_TASK_STATUS',
        payload: { taskId: response.taskId }
      }, (taskResponse) => {
        console.log('Task Status:', taskResponse.task.status, 
                    'Progress:', taskResponse.task.progress + '%');
        
        if (taskResponse.task.status === 'completed') {
          clearInterval(pollInterval);
          console.log('${colors.green}✓ Sync Complete!${colors.reset}');
          console.log('Results:', taskResponse.task.result);
        } else if (taskResponse.task.status === 'failed') {
          clearInterval(pollInterval);
          console.error('${colors.red}✗ Sync Failed:${colors.reset}', taskResponse.task.error);
        }
      });
    }, 5000);
  }
});${colors.reset}
  `);

  log('info', 'Expected result: episodicCount, semanticCount, proceduralCount > 0');
  return true;
}

async function testMemoryRetrieval() {
  log('test', 'Step 4: Testing 3-tier memory retrieval...');

  console.log(`
${colors.cyan}// Run in Chrome DevTools console:
chrome.runtime.sendMessage({
  type: 'GET_WORKSPACE_MEMORY_STATS',
  payload: { workspaceId: '${TEST_CONFIG.workspaceId}' }
}, (response) => {
  if (response.success && response.taskId) {
    // Poll for completion
    const pollInterval = setInterval(() => {
      chrome.runtime.sendMessage({
        type: 'GET_TASK_STATUS',
        payload: { taskId: response.taskId }
      }, (taskResponse) => {
        if (taskResponse.task.status === 'completed') {
          clearInterval(pollInterval);
          const stats = taskResponse.task.result;
          
          console.log('${colors.bright}=== MEMORY STATISTICS ===${colors.reset}');
          console.log('${colors.blue}Episodic:${colors.reset}', stats.episodic.episodes, 'episodes');
          console.log('${colors.green}Semantic:${colors.reset}', stats.semantic.facts, 'facts');
          console.log('${colors.magenta}Procedural:${colors.reset}', stats.procedural.patterns, 'patterns');
          console.log('${colors.cyan}Total Tokens:${colors.reset}', stats.totalTokens);
          console.log('${colors.yellow}Gmail Processed:${colors.reset}', 
                      stats.gmailIntegration.totalEmailsProcessed, 'emails');
        }
      });
    }, 5000);
  }
});${colors.reset}
  `);

  return true;
}

async function testPromptAPIClassification() {
  log('test', 'Step 5: Testing Prompt API email classification...');

  console.log(`
${colors.cyan}// Verify Prompt API is being used for classification
// Check browser console logs for:
// "[HybridAIClient] Nano availability: readily"
// "[HybridAIClient] Using Gemini Nano for classification"
// "[gmail-memory-handler] AI classification successful"

// To manually test classification:
const testEmail = {
  subject: "Urgent: Project Deadline Tomorrow",
  from: "manager@company.com",
  body: "Please complete the report by EOD tomorrow. This is critical."
};

// This will use Prompt API if available
chrome.runtime.sendMessage({
  type: 'TEST_EMAIL_CLASSIFICATION',
  payload: testEmail
}, (response) => {
  console.log('Classification Result:', response);
  // Expected: { category: 'project', priority: 'urgent', memoryType: 'episodic' }
});${colors.reset}
  `);

  return true;
}

async function verifyContextBridge() {
  log('test', 'Step 6: Verifying Context Bridge (Memory → Context Pills)...');

  console.log(`
${colors.cyan}// Verify context items are written to ContextManager
chrome.runtime.sendMessage({
  type: 'GET_CONTEXT_PILLS',
  payload: { workspaceId: '${TEST_CONFIG.workspaceId}' }
}, (response) => {
  console.log('Context Pills:', response.pills);
  console.log('${colors.green}✓ Context Bridge Working${colors.reset} if pills.length > 0');
});${colors.reset}
  `);

  return true;
}

async function runFullTest() {
  console.log(`${colors.bright}Starting comprehensive Prompt API test...${colors.reset}\n`);

  const steps = [
    { name: 'Prompt API Availability', fn: checkPromptAPIAvailability },
    { name: 'Gmail Authentication', fn: testGmailAuthentication },
    { name: 'Gmail Sync with AI Classification', fn: testGmailSync },
    { name: 'Memory Retrieval', fn: testMemoryRetrieval },
    { name: 'Prompt API Classification', fn: testPromptAPIClassification },
    { name: 'Context Bridge Verification', fn: verifyContextBridge },
  ];

  for (const step of steps) {
    try {
      await step.fn();
      console.log(''); // Empty line for readability
    } catch (error) {
      log('error', `Step failed: ${step.name}`, error.message);
    }
  }

  console.log(`${colors.bright}${colors.green}=== TEST INSTRUCTIONS COMPLETE ===${colors.reset}\n`);
  console.log(`${colors.yellow}NEXT STEPS:${colors.reset}`);
  console.log('1. Open Chrome DevTools (F12) on any page with extension loaded');
  console.log('2. Copy and paste each code block above into the console');
  console.log('3. Verify the responses match expected outputs');
  console.log('4. Check browser console for Prompt API usage logs\n');

  console.log(`${colors.cyan}VERIFICATION CHECKLIST:${colors.reset}`);
  console.log('□ Prompt API status shows "readily" or "available"');
  console.log('□ Gmail authentication succeeds');
  console.log('□ Sync task completes with episodic/semantic/procedural counts > 0');
  console.log('□ Memory stats show real Gmail data');
  console.log('□ Console logs show "[HybridAIClient] Using Gemini Nano"');
  console.log('□ Context pills array has items from Gmail\n');

  console.log(`${colors.green}✓ Test script complete!${colors.reset}`);
  console.log(`${colors.bright}For automated testing, load extension and run commands in DevTools.${colors.reset}\n`);
}

// Run the test
runFullTest().catch(error => {
  log('error', 'Test script failed', error.message);
  process.exit(1);
});
