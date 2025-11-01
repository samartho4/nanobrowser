# 🚀 Quick Start: Context Pills Sunburst Visualization

## Installation (2 minutes)

```bash
# 1. Install dependencies
pnpm install

# 2. Build the extension
pnpm build

# 3. Load in Chrome
# Open chrome://extensions
# Enable "Developer mode"
# Click "Load unpacked" → Select dist folder
```

## Testing Prompt API Integration (5 minutes)

### Step 1: Enable Chrome Flags

```
chrome://flags/#optimization-guide-on-device-model → "Enabled BypassPerfRequirement"
chrome://flags/#prompt-api-for-gemini-nano → "Enabled"
```

**Restart Chrome**

### Step 2: Download Gemini Nano

Open DevTools Console (F12):

```javascript
await ai.languageModel.create();
// Wait 2-3 minutes for download

// Verify
(await ai.languageModel.capabilities()).available
// Should return: "readily"
```

### Step 3: Run Terminal Test

```bash
node chrome-extension/test-prompt-api-gmail.js
```

Follow the on-screen instructions to test in browser console.

### Step 4: Verify in Browser

Open DevTools Console and run:

```javascript
// Test Gmail sync with Prompt API
chrome.runtime.sendMessage({
  type: 'SYNC_GMAIL_MEMORY',
  payload: {
    workspaceId: 'test-' + Date.now(),
    maxMessages: 10,
    daysBack: 7,
    forceRefresh: true
  }
}, (response) => {
  console.log('Sync started:', response.taskId);
  
  // Poll for completion
  const poll = setInterval(() => {
    chrome.runtime.sendMessage({
      type: 'GET_TASK_STATUS',
      payload: { taskId: response.taskId }
    }, (r) => {
      console.log(`${r.task.progress}% - ${r.task.status}`);
      if (r.task.status === 'completed') {
        clearInterval(poll);
        console.log('✓ Complete!', r.task.result);
      }
    });
  }, 5000);
});
```

## What You Should See

### 1. Console Logs (Prompt API Usage)
```
[HybridAIClient] Nano availability: readily
[HybridAIClient] Using Gemini Nano for classification
[gmail-memory-handler] AI classification successful
[ContextManager] Successfully wrote 10 Gmail context items
```

### 2. Memory Stats
```
Episodic: 20 episodes
Semantic: 25 facts  
Procedural: 20 patterns
Total Tokens: 3456
```

### 3. Context Pills Sunburst

Open the side panel and you'll see:
- 🔵 Blue segments: Episodic (recent emails)
- 🟢 Green segments: Semantic (contacts/facts)
- 🟣 Purple segments: Procedural (workflows)

Click any segment to:
- View details
- See preview
- Delete context

## Verification Checklist

- [ ] Prompt API shows "readily"
- [ ] Gmail sync completes
- [ ] Memory stats show data (episodic/semantic/procedural > 0)
- [ ] Console shows Nano usage logs
- [ ] Context Pills display sunburst
- [ ] Click segment shows details
- [ ] Delete works and updates in real-time

## Troubleshooting

**Sunburst not showing?**
```javascript
// Check if data exists
chrome.runtime.sendMessage({
  type: 'GET_CONTEXT_PILLS',
  payload: { workspaceId: 'YOUR_WORKSPACE_ID' }
}, (r) => console.log('Pills:', r.pills.length));
```

**Prompt API not available?**
- Verify flags are enabled
- Restart Chrome
- Download model: `await ai.languageModel.create()`

**No Gmail data?**
- Check OAuth credentials in `.env`
- Verify Gmail API enabled in Google Cloud Console
- Check browser console for errors

## Next Steps

1. ✅ Test with more emails (increase `maxMessages`)
2. ✅ Test compression strategies
3. ✅ Test context deletion
4. ✅ Test workspace switching
5. ✅ Review detailed docs:
   - `PROMPT_API_TESTING_GUIDE.md`
   - `CONTEXT_PILLS_SUNBURST_IMPLEMENTATION.md`

## Support

- **Terminal Test**: `node chrome-extension/test-prompt-api-gmail.js`
- **Detailed Guide**: `PROMPT_API_TESTING_GUIDE.md`
- **Implementation**: `CONTEXT_PILLS_SUNBURST_IMPLEMENTATION.md`

---

**Ready to test! 🎉**
