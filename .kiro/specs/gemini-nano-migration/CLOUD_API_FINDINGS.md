# Cloud API Findings - Firebase AI Logic SDK

## Problem Summary

Testing cloud-only mode (bypassing Nano) revealed that **Firebase AI Logic SDK has the SAME limitations as Gemini Nano** when using structured output with complex schemas.

## Evidence from Console Logs

```
[FirebaseBridge] Raw structured response: "{ \"observation\": \"Web task detected. I need to open the specified GitHub repository and check for a star. I will navigate to the repository URL and check if the user has starred it. If not, I will
[FirebaseBridge] Final response length: 1107
```

Response is **truncated mid-sentence** at ~400-1100 characters.

## Issues Observed

1. **JSON Truncation**: Responses cut off before completion
2. **Malformed JSON**: Double braces `{{` instead of `{`
3. **Schema Complexity**: Navigator schema with 20+ action properties is too complex
4. **No Simplification**: Schema simplification code didn't trigger (no logs)

## Root Cause

Firebase AI Logic SDK's `responseMimeType: 'application/json'` with `responseSchema` has **token/complexity limits** similar to Nano's Prompt API. Complex schemas cause:
- Incomplete JSON generation
- Truncated responses
- Parse errors

## Why Schema Simplification Didn't Help

The simplification code in `firebaseBridge.ts` reduces properties from 20+ to 8, but:
1. Still too complex for the API
2. Each property can have nested schemas
3. The action schema has 20+ different action types as optional properties

## The Real Solution

**Stop using structured output for complex schemas.** Instead:

### Approach 1: Plain Text with JSON Instructions
- Remove `responseMimeType` and `responseSchema`
- Add instruction in prompt: "Return valid JSON matching this schema: ..."
- Parse response as JSON manually
- This is how LangChain's ChatGoogleGenerativeAI worked before

### Approach 2: Simplify Schema Further
- Reduce to 3-4 properties max
- Remove all optional properties
- Use simpler types (string instead of complex objects)

### Approach 3: Use Cloud API Directly (Not Firebase SDK)
- Call Gemini API directly via REST
- More control over parameters
- Can use `response_mime_type` without Firebase's limitations

## Recommended Next Steps

1. **Remove structured output from Firebase bridge** for complex schemas
2. **Use plain text generation** with JSON instructions in prompt
3. **Keep Nano's schema simplification** (it's still needed)
4. **Test with simplified approach**

## Code Changes Needed

### firebaseBridge.ts
```typescript
// Instead of:
modelToUse = getGenerativeModel(ai, {
  mode: InferenceMode.PREFER_ON_DEVICE,
  inCloudParams: {
    model: 'gemini-1.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',  // ❌ Remove this
      responseSchema: firebaseSchema,         // ❌ Remove this
    },
  },
});

// Do this:
modelToUse = getGenerativeModel(ai, {
  mode: InferenceMode.PREFER_ON_DEVICE,
  inCloudParams: {
    model: 'gemini-1.5-flash',
    // No generationConfig - let model return plain text
  },
});

// Add to prompt:
const jsonInstruction = schema 
  ? `\n\nYou MUST respond with valid JSON matching this schema: ${JSON.stringify(schema)}`
  : '';
parts.push({ text: prompt + jsonInstruction });
```

## Conclusion

Both Nano and Firebase AI Logic SDK struggle with complex structured output. The solution is to:
- Use plain text generation
- Include schema in prompt as instructions
- Parse JSON manually
- Keep schemas as simple as possible

This matches how the old LangChain implementation worked successfully.
