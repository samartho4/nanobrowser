# Gemini Nano Integration Guide

## Overview

This guide covers the complete Gemini Nano integration for Nanobrowser, including the parameter name mapping fix and testing instructions.

## What Was Fixed

### The Problem
Gemini Nano was inventing creative parameter names (e.g., "element_index") instead of using the expected names (e.g., "index"), causing "action not exists" errors.

### The Solution
Explicitly defined ALL possible parameter fields in the JSON Schema to prevent Gemini Nano from being creative with field names.

## Implementation Details

### 1. Session Management
**File**: `chrome-extension/src/background/llm/langchain/GeminiNanoChatModel.ts`

- Implements session reuse pattern per Chrome documentation
- Prevents "session has been destroyed" errors
- Thread-safe session creation

### 2. Simplified Schema
**File**: `chrome-extension/src/background/agent/agents/navigator.ts`

Instead of 20+ optional action properties, we use:
```json
{
  "action_type": "click_element",
  "parameters": {
    "index": 5
  }
}
```

With ALL possible parameters explicitly defined:
```typescript
parameters: {
  type: 'object',
  properties: {
    intent: { type: 'string' },
    url: { type: 'string' },
    query: { type: 'string' },
    index: { type: 'integer' },
    text: { type: 'string' },
    tab_id: { type: 'integer' },
    yPercent: { type: 'integer' },
    nth: { type: 'integer' },
    content: { type: 'string' },
    keys: { type: 'string' },
    seconds: { type: 'integer' },
    success: { type: 'boolean' }
  }
}
```

### 3. Response Conversion
Transforms Gemini Nano's output back to expected format:
- From: `{ action_type: "go_to_url", parameters: {url: "..."} }`
- To: `{ go_to_url: {url: "..."} }`

## Testing Instructions

### Prerequisites
1. Chrome 127+ with Gemini Nano enabled (see `chrome-extension/TEST_GEMINI_NANO.md`)
2. Extension built and loaded from `dist/` folder

### Quick Setup

#### 1. Enable Gemini Nano Provider
```javascript
// In Chrome DevTools Console (extension background page)
chrome.storage.local.get('llm-api-keys', (result) => {
  const config = result['llm-api-keys'] || { providers: {} };
  config.providers['gemini-nano'] = {
    apiKey: 'local',
    name: 'Gemini Nano',
    type: 'gemini-nano',
    baseUrl: 'local',
    modelNames: ['gemini-nano'],
    createdAt: Date.now()
  };
  chrome.storage.local.set({ 'llm-api-keys': config }, () => {
    console.log('✅ Gemini Nano provider added');
  });
});
```

#### 2. Configure Navigator Agent
```javascript
chrome.storage.local.get('agent-settings', (result) => {
  const settings = result['agent-settings'] || {};
  if (!settings.navigator) settings.navigator = {};
  settings.navigator.providerId = 'gemini-nano';
  settings.navigator.modelName = 'gemini-nano';
  chrome.storage.local.set({ 'agent-settings': settings }, () => {
    console.log('✅ Navigator configured for Gemini Nano');
  });
});
```

#### 3. Reload Extension
Go to `chrome://extensions` and reload Nanobrowser

#### 4. Test
Give it a simple task: "Go to google.com"

### Verification

#### ✅ Success Indicators
- Console shows: `[GeminiNano] Session created`
- Actions use correct parameter names (index, url, text, etc.)
- No "action not exists" errors
- Tasks complete successfully

#### ❌ Failure Indicators
- "LanguageModel API is not available" → Gemini Nano not enabled in Chrome
- Still seeing OpenAI/Anthropic logs → Provider not configured correctly
- "action not exists" → Parameter names wrong (shouldn't happen with fix)

### Test Cases

#### Test 1: Navigation
**Task**: "Go to google.com"
**Expected**: `{ action_type: "go_to_url", parameters: { url: "https://google.com" } }`

#### Test 2: Element Interaction
**Task**: "Click the first button"
**Expected**: `{ action_type: "click_element", parameters: { index: 0 } }`

#### Test 3: Text Input
**Task**: "Type 'hello' in the search box"
**Expected**: `{ action_type: "input_text", parameters: { index: 1, text: "hello" } }`

#### Test 4: Search
**Task**: "Search for 'AI news'"
**Expected**: `{ action_type: "search_google", parameters: { query: "AI news" } }`

## Troubleshooting

### Check Gemini Nano Availability
```javascript
(async () => {
  if (!globalThis.LanguageModel) {
    console.error('❌ LanguageModel API not available');
    return;
  }
  const status = await globalThis.LanguageModel.availability();
  console.log('Gemini Nano status:', status);
})();
```

### Check Current Configuration
```javascript
chrome.storage.local.get(['agent-settings', 'llm-api-keys'], (result) => {
  console.log('Agent Settings:', result['agent-settings']);
  console.log('Available Providers:', Object.keys(result['llm-api-keys']?.providers || {}));
});
```

### Common Issues

**Issue**: "session has been destroyed"
- **Solution**: Fixed with session reuse pattern

**Issue**: "action not exists"
- **Solution**: Fixed with explicit parameter definitions

**Issue**: Extension uses wrong provider
- **Solution**: Check agent-settings configuration

## Action Reference

| Action | Required Parameters | Optional Parameters |
|--------|-------------------|-------------------|
| `go_to_url` | `url` | `intent` |
| `search_google` | `query` | `intent` |
| `click_element` | `index` | `intent`, `xpath` |
| `input_text` | `index`, `text` | `intent`, `xpath` |
| `switch_tab` | `tab_id` | `intent` |
| `scroll_to_percent` | `yPercent` | `intent`, `index` |
| `cache_content` | `content` | `intent` |
| `send_keys` | `keys` | `intent` |
| `done` | `text`, `success` | - |

## Performance Notes

### Benefits
- ✅ No API costs (runs locally)
- ✅ Better privacy (no data sent to servers)
- ✅ Fast response times
- ✅ Session reuse for efficiency

### Limitations
- ⚠️ Requires Chrome 127+
- ⚠️ Limited capabilities vs cloud models
- ⚠️ Needs simplified schema format

## Architecture

### Flow
```
Navigator Agent
  ↓
Detect Gemini Nano → Use simplified schema
  ↓
GeminiNanoChatModel.withStructuredOutput()
  ↓
session.prompt(prompt, { responseConstraint: schema })
  ↓
Parse JSON response
  ↓
convertSimplifiedResponse()
  ↓
Return to Navigator
```

### Key Files
- `chrome-extension/src/background/llm/langchain/GeminiNanoChatModel.ts` - Session management
- `chrome-extension/src/background/agent/agents/navigator.ts` - Schema & conversion
- `chrome-extension/src/background/agent/helper.ts` - Model creation
- `packages/storage/lib/settings/llmProviders.ts` - Provider config

## Build & Deploy

```bash
cd chrome-extension
pnpm build
# Load dist/ folder in chrome://extensions
```

## Status

- ✅ Code complete
- ✅ Build successful
- ✅ Documentation complete
- ⏳ Testing pending

---

For Chrome setup and Gemini Nano enablement, see `chrome-extension/TEST_GEMINI_NANO.md`
