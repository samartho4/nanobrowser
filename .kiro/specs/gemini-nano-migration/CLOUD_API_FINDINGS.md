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

## The Real Solution: HYBRID APPROACH ✅

**Use BOTH structured output AND plain text, automatically choosing the best method based on schema complexity.**

This approach:
- ✅ Uses structured output for simple schemas (FAST, reliable)
- ✅ Uses plain text for complex schemas (RELIABLE, no truncation)
- ✅ Auto-learns which schemas work best with which method
- ✅ Gracefully falls back if structured output fails
- ✅ Future-proof for episodic memory layer (90% fast queries, 10% complex reasoning)

### How It Works

```typescript
async generateStructured(messages, schema) {
  const complexity = calculateComplexity(schema);
  
  if (complexity <= THRESHOLD) {
    try {
      // Try structured output (fast)
      return await generateWithStructuredOutput(messages, schema);
    } catch (error) {
      // Fallback to plain text
      return await generateWithPlainText(messages, schema);
    }
  } else {
    // Complex schema: use plain text directly
    return await generateWithPlainText(messages, schema);
  }
}
```

### Method 1: Structured Output (Simple Schemas)
Following the Prompt API pattern from Chrome 137:
```typescript
const firebaseSchema = convertToFirebaseSchema(jsonSchema);

const model = getGenerativeModel(ai, {
  model: 'gemini-1.5-flash',
  generationConfig: {
    responseMimeType: 'application/json',
    responseSchema: firebaseSchema,
  },
});

const response = await model.generateContent(parts);
return JSON.parse(response.text());
```

**When to use:**
- Schema has ≤5 top-level properties
- Total complexity score ≤5
- Examples: memory queries, simple actions (wait, done)

### Method 2: Plain Text with JSON Instructions (Complex Schemas)
```typescript
const model = getGenerativeModel(ai, {
  model: 'gemini-1.5-flash',
  // No generationConfig
});

// Add JSON Schema instructions to prompt
const jsonInstruction = `
CRITICAL: You MUST respond with ONLY valid JSON.

Required JSON Schema:
${JSON.stringify(jsonSchema, null, 2)}

Rules:
1. Must be parseable by JSON.parse()
2. Must match the schema exactly
3. No text before or after JSON
4. No markdown code blocks
`;

const enhancedPrompt = prompt + jsonInstruction;
const response = await model.generateContent(enhancedPrompt);

// Extract and parse JSON
const text = cleanJsonResponse(response.text());
return JSON.parse(text);
```

**When to use:**
- Schema has >5 top-level properties
- Navigator schema (20+ action properties)
- Complex nested structures
- Total complexity score >5

### Auto-Learning Cache

The system remembers which schemas work with structured output:

```typescript
// First attempt: try structured, learn result
try {
  result = await generateWithStructuredOutput(messages, schema);
  cache.set(schemaHash, 'structured'); // ✅ Works!
} catch (error) {
  result = await generateWithPlainText(messages, schema);
  cache.set(schemaHash, 'plaintext'); // Remember for next time
}

// Future attempts: use cached knowledge
const preferredMethod = cache.get(schemaHash);
```

## Recommended Next Steps

1. **Implement complexity calculator** - Count properties, nesting depth
2. **Add both generation methods** - Structured output + Plain text
3. **Add auto-learning cache** - Remember which schemas work with which method
4. **Add graceful fallback** - If structured fails, retry with plain text
5. **Keep Nano's schema handling** - It already works well
6. **Test with Navigator schema** - Verify complex schemas work

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
