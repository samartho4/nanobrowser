# Aggressive Schema Simplification - Round 2

## Issue After First Fix

The initial simplification (max 10 properties) helped but wasn't enough:
- Still getting truncated JSON at position 1180 (vs 559 before)
- Nano adding extra fields not in schema
- "Unterminated string" errors

## Root Cause

Navigator agent schema is VERY complex:
- Top-level: 7+ properties (current_state, action, observation, etc.)
- Action array items: 20+ optional action types
- Total complexity overwhelms Nano's capacity

## Aggressive Solution

Reduced limits from 10 → 5 properties:

### Changes Made

1. **Array Items: Max 5 Properties** (was 10)
   ```typescript
   if (propCount > 5) {  // was > 10
     // Keep only required or first 5
     keptProps.slice(0, 5)  // was slice(0, 10)
   }
   ```

2. **Top-Level Object: Max 5 Properties** (new)
   ```typescript
   if (simplified.type === 'object' && currentDepth === 0) {
     if (propCount > 5) {
       // Limit to 5 most important properties
     }
   }
   ```

3. **Added Logging**
   ```typescript
   console.log(`[GeminiNano] Simplified array items from ${propCount} to ${n} properties`);
   console.log(`[GeminiNano] Simplified top-level from ${propCount} to ${n} properties`);
   ```

## Why 5 Properties?

Based on Nano's behavior:
- Successfully generates ~500-600 chars before truncating
- 5 properties ≈ 400-500 chars of JSON
- Leaves safety margin for nested content
- Balances functionality vs reliability

## Expected Impact

### Before (10 properties):
```json
{
  "current_state": {...},
  "action": [{
    "click_element": null,
    "input_text": null,
    "go_to_url": null,
    "search_google": null,
    "done": {...},
    // ... 5 more properties
  }],
  "observation": "...",
  "next_steps": [],
  "final_answer": "I haven't starred..." // TRUNCATED HERE
}
```

### After (5 properties):
```json
{
  "current_state": {...},
  "action": [{
    "click_element": null,
    "input_text": null,
    "go_to_url": null,
    "search_google": null,
    "done": {...}
  }]
}
```

Much shorter, more likely to complete!

## Trade-offs

### Lost Functionality:
- Fewer action types available per call
- May need multiple calls for complex tasks
- Some optional fields removed

### Gained Reliability:
- Complete JSON generation
- No truncation errors
- Higher success rate
- Faster responses (less to generate)

## Testing Strategy

1. **Check logs** for simplification messages:
   ```
   [GeminiNano] Simplified array items from 20 to 5 properties
   [GeminiNano] Simplified top-level from 7 to 5 properties
   ```

2. **Verify complete JSON** - No more "Unterminated string"

3. **Monitor success rate** - Should see fewer cloud fallbacks

## Alternative If This Fails

If 5 is still too many, we can:
1. Reduce to 3 properties
2. Remove nested objects (flatten structure)
3. Use prompt engineering only (no responseConstraint)
4. Split complex schemas into multiple simpler calls

## Build Status

✅ Build successful - 5.5s
✅ Ready to test

## Files Modified

- `chrome-extension/src/background/llm/langchain/GeminiNanoChatModel.ts`
  - Reduced max properties from 10 → 5
  - Added top-level property limiting
  - Added simplification logging

## Next Test

Reload extension and try the same task. Look for:
1. Simplification logs showing property reduction
2. Complete JSON (no truncation)
3. Successful Navigator actions
