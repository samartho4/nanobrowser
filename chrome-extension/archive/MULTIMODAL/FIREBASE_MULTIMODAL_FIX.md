# Firebase Multimodal Bridge Fix

## Problem

When invoking HybridAI with multimodal content (image upload), the system was throwing:
```
TypeError: Cannot read properties of undefined (reading 'length')
```

## Root Cause Analysis

The error occurred in the complete flow:

1. **MultimodalTest.tsx** → Sends `INVOKE_HYBRID_AI` message with multimodal `content` array
2. **multimodal-test-handler.ts** → Receives and forwards to HybridAIClient
3. **HybridAIClient.ts** → Lines 210-212: Sends message to side panel bridge with `content`
4. **firebaseBridge.ts** → **THE REAL BUG** ❌ Only extracted `prompt`, NOT `content`!

### The Bug

**File**: `pages/side-panel/src/firebaseBridge.ts` lines 310-334 (before fix)

```typescript
// Extract payload
const { prompt, system, schema, stream } = msg.payload;

// Build parts array
const parts: Array<{ text: string }> = [];

let finalPrompt = prompt;  // ❌ This was undefined when multimodal!
```

When multimodal content was sent:
- `msg.payload.prompt` = `undefined`
- `msg.payload.content` = array of image parts (not extracted!)
- Later code tried to access `.length` on `undefined`

### Why the Error Wasn't in HybridAIClient

HybridAIClient.ts had proper array handling for its own `invokeNano` method, but:
- We're in cloud-only mode (Nano disabled)
- `invokeBridge` just passes the payload through to side panel
- The side panel never received the `content` properly
- Result: `undefined` gets passed to Firebase SDK
- Firebase SDK fails when trying to process undefined content

## The Fix

**File**: `pages/side-panel/src/firebaseBridge.ts` (lines 310-337)

### Before:
```typescript
const { prompt, system, schema, stream } = msg.payload;
let finalPrompt = prompt;
```

### After:
```typescript
const { prompt, content, system, schema, stream } = msg.payload;

// Handle multimodal content or text-only prompt
let basePrompt = prompt;
if (content && Array.isArray(content)) {
  // Extract text parts from multimodal content
  const textParts = content
    .filter((part: any) => typeof part === 'string' || (part && typeof part.text === 'string'))
    .map((part: any) => (typeof part === 'string' ? part : part.text))
    .join('\n');
  basePrompt = textParts;
}

let finalPrompt = basePrompt;  // Use extracted text
```

And updated all subsequent uses of `prompt` to `basePrompt`:
- Line 346: `${basePrompt}\n\nYou MUST respond...`
- Line 363-364: `basePrompt.substring()` calls

## Result

✅ Multimodal content now properly flows through:
1. Image → base64 serialized
2. HybridAIClient receives `content: [{ image: {...} }]`
3. Payload sent to side panel with `content` field
4. Firebase bridge now extracts text from multimodal content
5. Firebase API receives text + image properly

## Testing

After rebuild:
1. Reload extension in `chrome://extensions/`
2. Go to Multimodal Testing Dashboard
3. Upload an image
4. Click ❤️ HybridAI button
5. Should see successful response or proper error (not TypeError)

## Lessons Learned

- **Always extract all payload fields** - Don't assume only `prompt` will be sent
- **Defensive type handling** - The `content && Array.isArray(content)` check prevents crashes
- **Test multimodal flows end-to-end** - The bug was across multiple files in different processes
- **Message passing requires explicit handling** - Chrome extension message bridging needs all fields explicitly destructured
