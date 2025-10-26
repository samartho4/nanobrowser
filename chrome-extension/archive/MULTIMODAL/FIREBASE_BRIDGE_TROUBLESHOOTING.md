# Firebase Bridge Connection Error - Troubleshooting Guide

## The Error You're Seeing

```
[HybridAIClient] Bridge invocation failed: Error: Firebase bridge connection failed. 
TypeError: Failed to fetch. This may be due to large image data. Try with a smaller image.
```

## Root Cause

**The side panel message listener isn't receiving the message from the background script.** This typically means:

1. ✅ Image compression IS working (you would've seen errors before this)
2. ❌ Message from background → side panel is failing
3. The side panel listener (`firebaseBridge.ts`) may not be loaded/ready

## Why This Happens

`chrome.runtime.sendMessage()` fails when:
- **Side panel not fully initialized** - The page loads but firebaseBridge hasn't registered yet
- **Side panel page is closed** - Message listener doesn't exist
- **Timing race condition** - Message sent before listener attached
- **Actual network issue** - Rarely happens, but possible

## Solution: Ensure Side Panel is Active

### Step 1: Open the Side Panel First
**IMPORTANT:** Before testing multimodal, make sure the side panel is visible:

1. Click the extension icon in toolbar
2. You should see the "Multimodal Testing Dashboard" appear
3. Wait 2-3 seconds for it to fully load
4. NOW try uploading an image

### Step 2: Check Console Logs

To verify side panel is ready, check console for:

```
[FirebaseBridge] Initialization complete - ready to receive HYBRID_SDK_INVOKE messages
[FirebaseBridge] Ready signal sent successfully
```

### Step 3: Open Service Worker Logs

1. Go to `chrome://extensions/`
2. Find your extension
3. Click "Service Worker" link
4. Look for messages like:
   - `[HybridAIClient] Sending message to side panel bridge`
   - `[HybridAIClient] Received response from bridge`

### Step 4: Open Side Panel Console

1. Right-click the side panel
2. Select "Inspect"
3. Go to Console tab
4. Look for `[FirebaseBridge]` messages
5. Look for `[MultimodalTest]` messages (image size, compression, etc.)

## What Should Happen (Correct Flow)

### Timeline of Correct Execution:

```
[React Component]
   ↓
[MultimodalTest] Original file size: 5.23 MB
   ↓
[MultimodalTest] Compressed file size: 1.45 MB
   ↓
[MultimodalTest] Base64 size: 1.93 MB
   ↓
[MultimodalTest] Message payload size: 1.95 MB
   ↓
[MultimodalTest] Sending message to background...
   ↓
[Background Script]
   ↓
[HybridAIClient] Sending message to side panel bridge
   ↓
[Side Panel]
   ↓
[FirebaseBridge] Received HYBRID_SDK_INVOKE message
   ↓
[FirebaseBridge] Extracted payload...
   ↓
[FirebaseBridge] Generating non-streaming content
   ↓
[FirebaseBridge] Final response length: 207
   ↓
✅ Success!
```

## Debugging Checklist

- [ ] Side panel is open and visible
- [ ] Waited 2-3 seconds after opening side panel
- [ ] Image is compressed (check console for compression logs)
- [ ] Message payload size is under 50 MB (check console)
- [ ] No "Failed to fetch" in background logs... or if there is, it shows "Ready signal sent successfully" in side panel console
- [ ] Firebase API key is configured in Settings

## If It Still Fails

### Try This Sequence:

1. **Close extension completely**
   - Go to `chrome://extensions/`
   - Toggle extension OFF
   - Wait 5 seconds
   - Toggle extension ON
   - Wait for full load

2. **Close and reopen side panel**
   - Click extension icon to close side panel
   - Wait 2 seconds
   - Click extension icon to open again
   - Wait 3 seconds for full initialization
   - Try image upload again

3. **Clear Chrome storage**
   - Go to `chrome://extensions/`
   - Find extension
   - Click "Clear data" (if available)
   - Reload extension

4. **Test with smaller image**
   - Use a small image (< 1 MB)
   - This eliminates compression/size issues
   - If small image works, large images need more compression

5. **Check Firebase Setup**
   - Go to extension Settings
   - Verify Gemini API key is saved
   - Try with API key in place

## Understanding "Failed to fetch"

This error from `chrome.runtime.sendMessage()` literally means:
- The destination listener is not responding
- NOT a network/internet issue
- IS a Chrome extension messaging issue

**Common causes:**
- ❌ Side panel page not loaded
- ❌ firebaseBridge.ts listener not registered
- ❌ Side panel iframe not ready
- ❌ Message passing service interrupted

**NOT caused by:**
- ❌ Image size (would fail at React component first)
- ❌ API key missing (would fail at Firebase SDK call)
- ❌ Internet connection (messaging is local)

## Next Steps if Issue Persists

1. **Share console output:**
   - Take screenshot of Service Worker console showing the error
   - Take screenshot of Side Panel console (if it appears)
   - Share both

2. **Share what you see when you:**
   - Open extension
   - Open side panel
   - Wait 3 seconds
   - Check side panel console for `[FirebaseBridge]` logs

3. **Check if side panel even loads:**
   - Right-click side panel
   - Select Inspect
   - Should see HTML/CSS loading
   - If nothing loads, side panel has a loading issue

## Temporary Workaround

If side panel isn't loading properly:

1. Go to `chrome://extensions/`
2. Find your extension
3. Look for "Inspect views" section
4. Click on any available page (might be "side-panel")
5. This might force it to initialize
6. Return to extension and try again

## Important Note

The "side panel not responding" error is usually:
- **Temporary** - Happens on first test after reload
- **Fixable** - Just reopen side panel and try again
- **Not a code bug** - Timing/initialization issue
- **Expected sometimes** - Complex multi-process systems have race conditions

Try the **"Close and reopen side panel"** step multiple times - often works after retry!
