# 🧪 PROMPT API GMAIL INTEGRATION - COMPLETE TESTING GUIDE

## Overview
This guide provides step-by-step instructions for testing the Gmail → Prompt API → 3-Tier Memory integration.

## Prerequisites

### 1. Enable Chrome Flags
Open Chrome Canary and enable these flags:

```
chrome://flags/#optimization-guide-on-device-model
→ Set to: "Enabled BypassPerfRequirement"

chrome://flags/#prompt-api-for-gemini-nano  
→ Set to: "Enabled"
```

**Restart Chrome after enabling flags.**

### 2. Download Gemini Nano Model
Open DevTools Console (F12) and run:

```javascript
// Download the model (takes 2-3 minutes)
await ai.languageModel.create();

// Verify download complete
const capabilities = await ai.languageModel.capabilities();
console.log('Status:', capabilities.available);
// Should return: "readily" or "available"
```

### 3. Load Extension
1. Open `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `dist` folder from your project

---

## Testing Method 1: Automated Terminal Test

### Run the Test Script
```bash
node chrome-extension/test-prompt-api-gmail.js
```

This will output step-by-step instructions for testing in the browser console.

---

## Testing Method 2: Manual Browser Console Testing

### Step 1: Verify Prompt API Availability

```javascript
// Check if Prompt API is available
if (globalThis.ai && globalThis.ai.languageModel) {
  const capabilities = await ai.languageModel.capabilities();
  console.log('✓ Prompt API Status:', capabilities.available);
} else {
  console.log('✗ Prompt API not available');
}
```

**Expected Output:** `✓ Prompt API Status: readily`

---

### Step 2: Authenticate Gmail

```javascript
chrome.runtime.sendMessage({
  type: 'AUTHENTICATE_GMAIL'
}, (response) => {
  console.log('Gmail Auth:', response);
});
```

**Expected Output:**
```json
{
  "success": true,
  "data": { ... }
}
```

---

### Step 3: Sync Gmail with Prompt API Classification

```javascript
// Start Gmail sync
chrome.runtime.sendMessage({
  type: 'SYNC_GMAIL_MEMORY',
  payload: {
    workspaceId: 'test-workspace-' + Date.now(),
    maxMessages: 10,
    daysBack: 7,
    forceRefresh: true
  }
}, (response) => {
  console.log('Sync started:', response);
  
  if (response.success && response.taskId) {
    // Poll for completion
    const taskId = response.taskId;
    const pollInterval = setInterval(() => {
      chrome.runtime.sendMessage({
        type: 'GET_TASK_STATUS',
        payload: { taskId }
      }, (taskResponse) => {
        const task = taskResponse.task;
        console.log(`Progress: ${task.progress}% - ${task.status}`);
        
        if (task.status === 'completed') {
          clearInterval(pollInterval);
          console.log('✓ Sync Complete!');
          console.log('Results:', task.result);
          
          // Display results
          console.table({
            'Episodic Memories': task.result.episodicCount,
            'Semantic Facts': task.result.semanticCount,
            'Procedural Patterns': task.result.proceduralCount
          });
        } else if (task.status === 'failed') {
          clearInterval(pollInterval);
          console.error('✗ Sync Failed:', task.error);
        }
      });
    }, 5000); // Poll every 5 seconds
  }
});
```

**Expected Output:**
```
Progress: 10% - running
Progress: 30% - running
Progress: 80% - running
✓ Sync Complete!
┌─────────────────────┬────────┐
│ Episodic Memories   │ 20     │
│ Semantic Facts      │ 25     │
│ Procedural Patterns │ 20     │
└─────────────────────┴────────┘
```

---

### Step 4: Verify Memory Storage

```javascript
chrome.runtime.sendMessage({
  type: 'GET_WORKSPACE_MEMORY_STATS',
  payload: { workspaceId: 'test-workspace-YOUR_ID' }
}, (response) => {
  if (response.success && response.taskId) {
    const pollInterval = setInterval(() => {
      chrome.runtime.sendMessage({
        type: 'GET_TASK_STATUS',
        payload: { taskId: response.taskId }
      }, (taskResponse) => {
        if (taskResponse.task.status === 'completed') {
          clearInterval(pollInterval);
          const stats = taskResponse.task.result;
          
          console.log('=== MEMORY STATISTICS ===');
          console.log('Episodic:', stats.episodic.episodes, 'episodes');
          console.log('Semantic:', stats.semantic.facts, 'facts');
          console.log('Procedural:', stats.procedural.patterns, 'patterns');
          console.log('Total Tokens:', stats.totalTokens);
          console.log('Gmail Processed:', stats.gmailIntegration.totalEmailsProcessed, 'emails');
        }
      });
    }, 5000);
  }
});
```

**Expected Output:**
```
=== MEMORY STATISTICS ===
Episodic: 20 episodes
Semantic: 25 facts
Procedural: 20 patterns
Total Tokens: 3456
Gmail Processed: 65 emails
```

---

### Step 5: Verify Prompt API Usage in Logs

Open the browser console and look for these log messages:

```
[HybridAIClient] Nano availability: readily
[HybridAIClient] Using Gemini Nano for classification
[gmail-memory-handler] AI classification successful: project/episodic
[ContextManager] Successfully wrote 10 Gmail context items
```

**These logs confirm Prompt API is being used for classification.**

---

### Step 6: Test Context Pills Display

```javascript
chrome.runtime.sendMessage({
  type: 'GET_CONTEXT_PILLS',
  payload: { workspaceId: 'test-workspace-YOUR_ID' }
}, (response) => {
  console.log('Context Pills:', response.pills);
  console.log('Total Pills:', response.pills.length);
  
  // Display pills by memory type
  const byType = response.pills.reduce((acc, pill) => {
    const type = pill.memoryType || 'other';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});
  
  console.table(byType);
});
```

**Expected Output:**
```
Context Pills: [...]
Total Pills: 10
┌────────────┬───────┐
│ episodic   │ 5     │
│ semantic   │ 3     │
│ procedural │ 2     │
└────────────┴───────┘
```

---

### Step 7: Test Context Deletion

```javascript
// Get a pill ID from the previous step
const pillId = 'YOUR_PILL_ID';

chrome.runtime.sendMessage({
  type: 'REMOVE_CONTEXT_ITEM',
  payload: { 
    workspaceId: 'test-workspace-YOUR_ID',
    itemId: pillId
  }
}, (response) => {
  console.log('Delete result:', response);
  
  // Verify deletion
  chrome.runtime.sendMessage({
    type: 'GET_CONTEXT_PILLS',
    payload: { workspaceId: 'test-workspace-YOUR_ID' }
  }, (response) => {
    console.log('Remaining pills:', response.pills.length);
  });
});
```

---

## Verification Checklist

Use this checklist to ensure everything is working:

- [ ] Prompt API status shows "readily" or "available"
- [ ] Gmail authentication succeeds
- [ ] Sync task completes without errors
- [ ] Episodic count > 0
- [ ] Semantic count > 0
- [ ] Procedural count > 0
- [ ] Console logs show "[HybridAIClient] Using Gemini Nano"
- [ ] Console logs show successful AI classification
- [ ] Context pills array contains Gmail items
- [ ] Context pills display in sunburst visualization
- [ ] Context deletion works and updates in real-time
- [ ] Memory stats update after deletion

---

## Troubleshooting

### Issue: "Prompt API not available"
**Solution:** 
1. Verify Chrome flags are enabled
2. Restart Chrome
3. Download model: `await ai.languageModel.create()`

### Issue: "Gmail authentication failed"
**Solution:**
1. Check OAuth credentials in `.env`
2. Verify Gmail API is enabled in Google Cloud Console
3. Check browser console for detailed error

### Issue: "Sync task timeout"
**Solution:**
1. Reduce `maxMessages` to 5
2. Check network connection
3. Verify Gmail API quota

### Issue: "Context pills empty"
**Solution:**
1. Check console for "[ContextManager] Successfully wrote" logs
2. Verify namespace consistency in LangGraphStore
3. Run: `chrome.storage.local.get('context_keys_YOUR_WORKSPACE_ID')`

### Issue: "AI classification using cloud instead of Nano"
**Solution:**
1. Check HybridAIClient logs for availability status
2. Verify model download: `(await ai.languageModel.capabilities()).available`
3. Check user preference: `chrome.storage.local.get('provider_preference')`

---

## Advanced Testing

### Test Individual Email Classification

```javascript
// Test Prompt API classification directly
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
  console.log('Classification:', response);
  // Expected: { category: 'project', priority: 'urgent', memoryType: 'episodic' }
});
```

### Monitor Real-Time Updates

```javascript
// Listen for context updates
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'CONTEXT_UPDATED') {
    console.log('Context updated:', message.payload);
  }
});
```

---

## Performance Benchmarks

Expected performance metrics:

| Operation | Time | Notes |
|-----------|------|-------|
| Prompt API availability check | < 100ms | Instant |
| Gmail authentication | 1-2s | OAuth flow |
| Fetch 10 emails | 2-3s | Gmail API |
| AI classification (Nano) | 0.5-1s per email | On-device |
| AI classification (Cloud) | 1-2s per email | Network latency |
| Memory storage | < 100ms | Local storage |
| Context retrieval | < 50ms | Indexed lookup |

---

## Success Criteria

Your implementation is working correctly if:

1. ✅ Prompt API is used for classification (check logs)
2. ✅ Real Gmail data is fetched and processed
3. ✅ Emails are correctly classified into 3 memory types
4. ✅ Memory statistics show non-zero counts
5. ✅ Context pills display Gmail data
6. ✅ Sunburst visualization renders correctly
7. ✅ Context deletion works in real-time
8. ✅ No errors in console during sync

---

## Next Steps

After successful testing:

1. Test with larger email volumes (50-100 emails)
2. Test compression strategies
3. Test agent integration with context
4. Test workspace isolation
5. Performance profiling with Chrome DevTools

---

## Support

If you encounter issues:

1. Check browser console for errors
2. Review `CONTEXT_BRIDGE_FIX_SUMMARY.md`
3. Run the automated test script
4. Check Gmail API quota in Google Cloud Console

---

**Happy Testing! 🚀**
