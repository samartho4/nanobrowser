# Gemini Nano Test Guide

## Quick Test in Service Worker Console

Open your extension's service worker console and run these tests:

### Test 1: Verify LanguageModel API is available
```javascript
console.log('LanguageModel available:', typeof globalThis.LanguageModel);
// Expected: "function"
```

### Test 2: Check capabilities (not availability)
```javascript
const capabilities = await globalThis.LanguageModel.capabilities();
console.log('Gemini Nano capabilities:', capabilities);
// Expected: { available: "readily", defaultTopK: 3, maxTopK: 8, defaultTemperature: 0.8 }
```

### Test 3: Test basic prompt (reuse session)
```javascript
// Create session once
const session = await globalThis.LanguageModel.create({
  temperature: 0.7,
  topK: 3
});

// Use it multiple times
const result1 = await session.prompt('What is 2+2? Answer with just the number.');
console.log('Basic prompt result:', result1);
console.log('Tokens left:', session.tokensLeft);

const result2 = await session.prompt('What is 5*5? Answer with just the number.');
console.log('Second prompt result:', result2);
console.log('Tokens left:', session.tokensLeft);

// Destroy when done
session.destroy();
// Expected: "4" and "25"
```

### Test 4: Test structured output with responseConstraint
```javascript
const session = await globalThis.LanguageModel.create({
  temperature: 0.7,
  topK: 3
});

// Schema MUST have type: "object" and properties
const schema = {
  type: "object",
  properties: {
    answer: { type: "number" },
    explanation: { type: "string" }
  },
  required: ["answer", "explanation"]
};

// responseConstraint goes in prompt() call, not create()
const result = await session.prompt(
  'What is 2+2? Explain your answer.',
  { responseConstraint: schema }
);

console.log('Structured output result:', result);
const parsed = JSON.parse(result);
console.log('Parsed:', parsed);
console.log('Tokens left:', session.tokensLeft);

session.destroy();
// Expected: { answer: 4, explanation: "..." }
```

### Test 5: Test with system prompt
```javascript
const session = await globalThis.LanguageModel.create({
  temperature: 0.7,
  topK: 3,
  initialPrompts: [{
    role: 'system',
    content: 'You are a helpful math tutor. Always respond in JSON format.'
  }]
});

const schema = {
  type: "object",
  properties: {
    result: { type: "number" }
  },
  required: ["result"]
};

const result = await session.prompt(
  'Calculate 5 * 8',
  { responseConstraint: schema }
);

console.log('With system prompt:', result);
console.log('Parsed:', JSON.parse(result));
session.destroy();
// Expected: { result: 40 }
```

## What Changed

### ✅ Fixed Issues (Per Chrome Docs):

1. **Session Management** (https://developer.chrome.com/docs/ai/session-management):
   - Sessions are now REUSED instead of destroyed after each call
   - Better performance and token management
   - Added `getSession()` method to manage session lifecycle

2. **Correct API Methods**:
   - Using `capabilities()` instead of `availability()`
   - Checking for `available: 'readily'` status
   - Using proper token tracking: `tokensLeft`, `tokensSoFar`, `maxTokens`

3. **Structured Output** (https://developer.chrome.com/docs/ai/structured-output-for-prompt-api):
   - Schema MUST have `type: "object"` and `properties`
   - `responseConstraint` goes in `session.prompt()`, NOT `create()`
   - Added schema validation before sending

4. **System Prompt Format**: Using `initialPrompts: [{ role: 'system', content: '...' }]`

5. **Better Error Handling**: Added fallback to prompt engineering if `responseConstraint` fails

6. **Improved Logging**: Added detailed console logs with token usage tracking

## Troubleshooting

### If you still see "Other generic failures occurred":

1. **Check Chrome version**: Run `navigator.userAgent` in console - should be Chrome 127+
2. **Check Gemini Nano is enabled**: Go to `chrome://flags/#optimization-guide-on-device-model` and ensure it's enabled
3. **Check availability**: Run `await globalThis.LanguageModel.availability()` - should return "available"
4. **Check console logs**: Look for `[GeminiNano]` prefixed messages to see where it's failing

### Common Issues:

- **"LanguageModel is not defined"**: Gemini Nano is not available in your Chrome version
- **available: "no"**: Gemini Nano is not supported on this device
- **available: "after-download"**: Wait for the model to download
- **"The model execution session has been destroyed"**: Session was destroyed prematurely - now fixed with session reuse
- **JSON parse errors**: The model returned non-JSON text - check the fallback is working
- **Schema validation errors**: Make sure schema has `type: "object"` and `properties`

## Next Steps

Once these tests pass, try using the Navigator agent:
1. Reload the extension
2. Try a simple navigation task
3. Check the service worker console for `[GeminiNano]` logs
4. If it fails, the logs will show exactly where and why
