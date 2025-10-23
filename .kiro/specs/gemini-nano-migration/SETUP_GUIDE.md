# Setup Guide - Get Gemini API Key for Cloud Fallback

## The Problem

You're seeing these errors:
```
[HybridAIClient] Nano failed, falling back to cloud: QuotaExceededError: The input is too large
[FirebaseBridge] Initialization failed: Gemini API key not configured
```

**What's happening:**
1. Gemini Nano tries to process the request
2. Input is too large (complex GitHub page)
3. Falls back to cloud (Firebase/Gemini API)
4. Cloud fails because no API key is configured

## The Solution

Add a Gemini API key so cloud fallback works.

## Step-by-Step Instructions

### 1. Get a Free Gemini API Key

1. **Go to Google AI Studio**:
   - Visit: https://aistudio.google.com/app/apikey
   - Sign in with your Google account

2. **Create API Key**:
   - Click "Create API Key" button
   - Select "Create API key in new project" (or use existing project)
   - Copy the API key (starts with `AIza...`)

**Note**: The free tier includes:
- 15 requests per minute
- 1 million tokens per minute
- 1,500 requests per day
- Completely free!

### 2. Add API Key to Shannon Extension

1. **Open Shannon Options**:
   - Right-click the Shannon extension icon in Chrome
   - Click "Options"
   - OR go to: `chrome-extension://[your-extension-id]/options/index.html`

2. **Find Gemini Provider**:
   - Scroll to "LLM Providers" section
   - Look for "Gemini" provider

3. **Add API Key**:
   - Paste your API key in the "API Key" field
   - Click "Save" or "Update"

4. **Verify**:
   - The key is saved to Chrome storage
   - Extension will use it automatically for cloud fallback

### 3. Test It Works

1. **Reload Extension**:
   - Go to `chrome://extensions/`
   - Find Shannon extension
   - Click the reload icon

2. **Try a Task**:
   - Open Shannon
   - Try the same task that failed before
   - Should now work with cloud fallback!

3. **Check Console**:
   - Click "service worker" link in extensions page
   - Look for:
     ```
     [FirebaseBridge] Loaded API key from storage
     [FirebaseBridge] Initialized successfully
     ```

## How It Works

### Hybrid Strategy

```
User Request
    ↓
Try Gemini Nano (on-device)
    ↓
Success? → Return result ✅
    ↓
Failed? → Check reason
    ↓
Input too large / Complex page?
    ↓
Fallback to Cloud (Gemini 1.5 Flash)
    ↓
Use API key from storage
    ↓
Return result ✅
```

### When Each is Used

**Gemini Nano (On-Device)**:
- ✅ Simple pages (Google search, news articles)
- ✅ Short conversations
- ✅ Small DOM (<100 elements)
- ⚡ Fast (no network)
- 🔒 Private (stays on device)

**Cloud (Gemini 1.5 Flash)**:
- ✅ Complex pages (GitHub, documentation)
- ✅ Long conversations
- ✅ Large DOM (>100 elements)
- 🌐 Requires internet
- 🔑 Requires API key

## Troubleshooting

### "API key not configured" Error

**Problem**: Extension can't find the API key

**Solution**:
1. Check you saved the key in Options page
2. Reload the extension
3. Check Chrome storage:
   ```javascript
   // In console:
   chrome.storage.local.get('llm-api-keys', console.log)
   ```

### "Invalid API key" Error

**Problem**: API key is wrong or expired

**Solution**:
1. Go back to https://aistudio.google.com/app/apikey
2. Verify the key is active
3. Copy it again (don't include spaces)
4. Update in Options page

### "Quota exceeded" Error

**Problem**: Hit free tier limits

**Solution**:
1. Wait a minute (15 requests/minute limit)
2. Or wait until tomorrow (1,500 requests/day limit)
3. Or upgrade to paid tier (if needed)

### Still Using Nano When It Should Use Cloud

**Problem**: Nano tries even when it will fail

**Solution**: This is expected behavior - we try Nano first for speed/privacy, then fallback to cloud. The fallback is automatic.

## What You Get

### With API Key Configured:
- ✅ Simple pages: Fast (Nano)
- ✅ Complex pages: Reliable (Cloud)
- ✅ No visible failures
- ✅ Seamless experience

### Without API Key:
- ✅ Simple pages: Works (Nano)
- ❌ Complex pages: Fails
- ❌ Visible errors
- ❌ Poor experience

## Cost

**Free Tier** (what you get):
- 15 requests/minute
- 1,500 requests/day
- 1 million tokens/minute
- $0.00 cost

**Typical Usage**:
- 10-50 requests per day
- Well within free tier
- No charges

**If You Exceed Free Tier**:
- Gemini 1.5 Flash pricing:
- Input: $0.075 per 1M tokens
- Output: $0.30 per 1M tokens
- Still very cheap!

## Privacy Note

**With Nano Only**:
- Everything stays on your device
- No data sent to cloud
- Maximum privacy

**With Cloud Fallback**:
- Simple requests: Stay on device (Nano)
- Complex requests: Sent to Google Cloud
- Google's privacy policy applies
- Data used to improve services (unless you opt out)

**Recommendation**: Use cloud fallback for best experience. Google's privacy policy is reasonable, and you control when cloud is used by choosing task complexity.

## Summary

1. **Get API key**: https://aistudio.google.com/app/apikey
2. **Add to Options**: Right-click extension → Options → Gemini provider
3. **Reload extension**: chrome://extensions/ → reload
4. **Test**: Try a complex task

That's it! Your extension will now work reliably for both simple and complex pages.
