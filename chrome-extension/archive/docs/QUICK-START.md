# Gemini Nano Quick Start Guide

## ✅ What You've Done So Far

Based on your screenshot, you've successfully:
1. ✅ Enabled the Gemini Nano flags in Chrome
2. ✅ Verified `window.ai.LanguageModel` is available
3. ✅ Tested basic text generation in the console

## 🚀 Next Steps to Complete Integration

### Step 1: Build the Extension
```bash
cd chrome-extension
pnpm build
```

### Step 2: Load Extension in Chrome
1. Open Chrome Canary
2. Go to `chrome://extensions/`
3. Enable "Developer mode" (top right)
4. Click "Load unpacked"
5. Select the `dist` folder from your project

### Step 3: Test the Integration

#### Option A: Quick Console Test
1. Open any webpage (e.g., google.com)
2. Open DevTools Console
3. Run this command:
```javascript
// Test detection
window.postMessage({ type: 'nano:detect', id: 'test-1' }, window.location.origin);

// Listen for response
window.addEventListener('message', (e) => {
  if (e.data.type === 'nano:response') {
    console.log('✅ Response:', e.data);
  }
});
```

#### Option B: Use Test Page
1. Open `chrome-extension/test-integration.html` in Chrome
2. Click "Test Direct API" to verify window.ai works
3. Click "Test Via Extension Bridge" to verify the bridge works
4. Click "Quick Generation Test" for end-to-end test

### Step 4: Verify Everything Works

You should see in the console:
```
[Nano Inject] Script injected into main page context
[Nano Inject] window.ai available: true
[Nano Inject] window.ai.LanguageModel available: true
[Nano Inject] Ready to handle requests
```

## 🔍 Current API Structure

Based on your screenshot, Chrome uses:
```javascript
window.ai.LanguageModel.availability()  // Check if available
window.ai.LanguageModel.create(options) // Create session
session.prompt(text)                     // Generate text
```

## 📝 Example Usage

```javascript
// Create a session
const session = await window.ai.LanguageModel.create({
  outputLanguage: 'en'
});

// Generate text
const response = await session.prompt('Write a haiku about coding');
console.log(response);

// Clean up
session.destroy();
```

## 🐛 Troubleshooting

### Extension not injecting script?
- Check console for "[Nano Inject]" messages
- Reload the extension: chrome://extensions/ → click reload
- Refresh the webpage

### API not available?
- Verify flags are enabled (your screenshot shows they are)
- Check `chrome://components/` - "Optimization Guide" should be updated
- Try: `console.log(window.ai)` in console

### Bridge not responding?
- Check for "[Nano Bridge]" messages in console
- Verify extension is loaded
- Check for any error messages

## 📊 Architecture Overview

```
Your Extension
    ↓
Service Worker (background.js)
    ↓ chrome.tabs.sendMessage
Content Script (nano-bridge.ts)
    ↓ window.postMessage
Injected Script (inject-nano.ts)
    ↓ Direct access
window.ai.LanguageModel ✅
```

## 🎯 What's Next?

After verifying the integration works:
1. Implement CloudFallbackProvider (for when Nano isn't available)
2. Implement HybridAIClient (tries Nano first, falls back to cloud)
3. Update existing agents to use HybridAIClient
4. Test with real extension features

## 📚 Files to Know

- `chrome-extension/src/content/inject-nano.ts` - Runs in page context, has window.ai access
- `chrome-extension/src/content/nano-bridge.ts` - Content script bridge
- `chrome-extension/src/background/llm/providers/GeminiNanoProvider.ts` - Provider implementation
- `chrome-extension/GEMINI_NANO_PROGRESS.md` - Detailed progress tracking

## 💡 Tips

- Always specify `outputLanguage: 'en'` to avoid warnings
- Remember to rebuild after code changes: `pnpm build`
- Must reload extension AND refresh page to see changes
- Check both extension console and page console for logs
