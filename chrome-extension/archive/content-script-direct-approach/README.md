# Archived: Content Script Direct Access Approach

This folder contains the attempt to access `window.ai` directly from content scripts.

## Why it was archived

**Content scripts run in an isolated JavaScript context** and do not have access to the page's `window.ai` object. Even though content scripts can access the DOM, they cannot access JavaScript objects created by the page or Chrome's built-in APIs like `window.ai`.

## What was tried

1. **ContentScriptBridge** (`content/ContentScriptBridge.ts`)
   - Bridge class in the service worker to communicate with content scripts
   - Used `chrome.tabs.sendMessage` to send requests to content scripts

2. **Test utilities** (`test-nano-content.ts`)
   - Test functions to verify content script could access Gemini Nano
   - Failed because content scripts couldn't access `window.ai`

## The problem

```javascript
// In content script (isolated context)
console.log(window.ai); // undefined ❌

// In main page context (via injected script)
console.log(window.ai); // Available ✅
```

## Current approach (Injected Script)

See `chrome-extension/src/content/` for the working approach:
- `inject-nano.ts` - **Injected into main page context** (not isolated), has access to `window.ai`
- `nano-bridge.ts` - Content script that uses `window.postMessage` to communicate with injected script
- Communication flow: Service Worker → Content Script → (postMessage) → Injected Script → `window.ai`

The key difference: We inject a script into the **main page context** using:
```javascript
const script = document.createElement('script');
script.src = chrome.runtime.getURL('content/inject-nano.js');
document.head.appendChild(script);
```

This injected script runs in the same context as the page and can access `window.ai`.
