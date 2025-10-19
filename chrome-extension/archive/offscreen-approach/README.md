# Archived: Offscreen Document Approach

This folder contains the initial attempt to use Chrome's Offscreen Document API to access Gemini Nano.

## Why it was archived

The Offscreen Document API (`chrome.offscreen`) was not available in the Chrome Canary version being used, even though it should be supported in Chrome 109+. The API returned `undefined`.

## What was tried

1. **Offscreen Document** (`offscreen/offscreen.ts`, `offscreen/offscreen.html`)
   - Created an offscreen document that would have access to `window.ai`
   - Implemented message passing between service worker and offscreen document

2. **OffscreenBridge** (`OffscreenBridge/OffscreenBridge.ts`)
   - Bridge class to communicate with the offscreen document from the service worker
   - Handled message routing and response handling

3. **Test utilities** (`test-nano-offscreen.ts`)
   - Test functions to verify the offscreen approach worked

## Why we switched to Content Script approach

Content scripts are:
- ✅ More widely supported (no special API needed)
- ✅ Already injected into every page
- ✅ Can inject scripts into main page context to access `window.ai`
- ✅ Simpler architecture with fewer moving parts

## Current approach

See `chrome-extension/src/content/` for the content script approach:
- `inject-nano.ts` - Injected into main page context, has access to `window.ai`
- `nano-bridge.ts` - Content script that bridges between background and injected script
- Communication flow: Service Worker → Content Script → Injected Script → `window.ai`
