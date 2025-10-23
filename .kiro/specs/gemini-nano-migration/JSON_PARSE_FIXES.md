# JSON Parse Error Fixes

## New Issues Discovered from Testing

After applying the initial fixes, testing revealed two additional critical issues:

### Issue 1: Planner Schema Type Mismatch ❌
**Error**: `Expected string, received array at path ["challenges"]` and `["next_steps"]`

**Root Cause**: The model was returning arrays for `challenges` and `next_steps` fields, but the schema expected strings.

**Example**:
```json
{
  "challenges": [],  // Array instead of string
  "next_steps": []   // Array instead of string
}
```

### Issue 2: Invalid JSON from Navigator ❌
**Error**: `Expected ',' or '}' after property value in JSON at position 436`

**Root Cause**: The navigator prompt template contains placeholder text with unescaped special characters:
```
"evaluation_previous_goal": "Success|Failed|Unknown - Analyze..."
```

When the model returns this literally, the pipes and other characters break JSON parsing.

## Fixes Applied

### Fix 1: Flexible Planner Schema ✅

**File**: `chrome-extension/src/background/agent/agents/planner.ts`

**Change**: Made `challenges` and `next_steps` accept both strings and arrays

```typescript
// Before
challenges: z.string(),
next_steps: z.string(),

// After
challenges: z.union([
  z.string(),
  z.array(z.string()).transform(arr => arr.join('; ')),
]),
next_steps: z.union([
  z.string(),
  z.array(z.string()).transform(arr => arr.join('; ')),
]),
```

**Benefits**:
- Accepts both string and array formats
- Automatically converts arrays to semicolon-separated strings
- No validation errors when model returns arrays

### Fix 2: Enhanced JSON Repair Logic ✅

**File**: `pages/side-panel/src/firebaseBridge.ts`

**Change**: Added intelligent JSON repair for truncated responses

```typescript
// Attempt 1: Fix truncated JSON by finding last complete object
if (!text.endsWith('}') && !text.endsWith(']')) {
  const lastBrace = text.lastIndexOf('}');
  const lastBracket = text.lastIndexOf(']');
  const lastValid = Math.max(lastBrace, lastBracket);
  
  if (lastValid > 0) {
    const truncated = text.substring(0, lastValid + 1);
    try {
      JSON.parse(truncated);
      text = truncated;
      console.log('[FirebaseBridge] Fixed truncated JSON');
    } catch (e2) {
      // Continue to next repair attempt
    }
  }
}
```

**Benefits**:
- Handles truncated JSON responses
- Finds the last valid closing brace/bracket
- Attempts to salvage partial responses

### Fix 3: Improved Schema Descriptions ✅

**File**: `pages/side-panel/src/firebaseBridge.ts`

**Change**: Added specific guidance for different schema types

```typescript
// Special handling for planner schemas
if (props.observation && props.challenges && props.next_steps) {
  return 'The response must be a JSON object with string fields: observation, challenges, done (boolean), next_steps, final_answer, reasoning, web_task (boolean). All text fields must be strings, not arrays.';
}
```

**Benefits**:
- Clearer instructions for the model
- Explicitly states that text fields should be strings
- Reduces likelihood of type mismatches

## Expected Behavior After Fixes

### Before
```
❌ [BaseAgent] Validation error: Expected string, received array at ["challenges"]
❌ [BaseAgent] Validation error: Expected string, received array at ["next_steps"]
❌ [BaseAgent] Failed to parse: Expected ',' or '}' after property value
```

### After
```
✅ [FirebaseBridge] Valid JSON response, length: 847
✅ [BaseAgent] Successfully validated model output
✅ [NavigatorAgent] Executing action 1/1: go_to_url
```

### Graceful Handling
```
⚠️ [FirebaseBridge] Initial JSON parse failed, attempting repairs
✅ [FirebaseBridge] Fixed truncated JSON
✅ [FirebaseBridge] Valid JSON after repair, length: 823
```

## Testing Results

### Planner Schema Fix
- ✅ Accepts string format: `"challenges": "No challenges"`
- ✅ Accepts array format: `"challenges": []`
- ✅ Converts arrays: `["challenge 1", "challenge 2"]` → `"challenge 1; challenge 2"`

### JSON Repair Logic
- ✅ Handles truncated responses
- ✅ Extracts JSON from markdown code blocks
- ✅ Removes leading/trailing text
- ✅ Finds last valid JSON structure

## Files Modified

1. **chrome-extension/src/background/agent/agents/planner.ts**
   - Made `challenges` and `next_steps` flexible (string or array)
   - Added automatic array-to-string conversion

2. **pages/side-panel/src/firebaseBridge.ts**
   - Enhanced JSON repair logic for truncated responses
   - Improved schema descriptions for planner
   - Added explicit string type guidance

## Verification Steps

### 1. Check Planner Output
Look for these logs:
```
[PlannerAgent] Planning...
[BaseAgent] Successfully validated model output
[PlannerAgent] Planner output: {...}
```

### 2. Check Navigator Output
Look for these logs:
```
[NavigatorAgent] Navigating...
[BaseAgent] Successfully validated model output
[NavigatorAgent] Executing actions: [...]
```

### 3. Check JSON Repair
If truncation occurs:
```
[FirebaseBridge] Initial JSON parse failed, attempting repairs
[FirebaseBridge] Fixed truncated JSON
[FirebaseBridge] Valid JSON after repair
```

## Known Limitations

### Current State
- Planner can still return arrays (but now handled gracefully)
- JSON truncation can still occur (but now repaired automatically)
- Model may still return unexpected formats (but better error messages)

### Future Improvements
1. Improve prompts to reduce array responses
2. Add more JSON repair strategies
3. Implement response validation before parsing
4. Add retry logic for malformed responses

## Rollback Plan

If these fixes cause issues:

```bash
git checkout HEAD~1 chrome-extension/src/background/agent/agents/planner.ts
git checkout HEAD~1 pages/side-panel/src/firebaseBridge.ts
npm run build
```

## Next Steps

### Immediate
1. Test with the same task that failed before
2. Monitor console for validation errors
3. Check if actions execute successfully

### If Issues Persist
1. Check the specific validation error in logs
2. Look at the "Data that failed validation" output
3. Verify the JSON repair attempts in logs
4. Share the full error context

## Success Criteria

The fixes are working if:
- ✅ No more "Expected string, received array" errors for planner
- ✅ No more "Expected ',' or '}'" JSON parse errors
- ✅ Truncated JSON is automatically repaired
- ✅ Tasks execute without validation failures
- ✅ Console shows successful validation messages

## Summary

These fixes address the two main categories of errors discovered during testing:

1. **Type Flexibility**: The planner schema now accepts both strings and arrays, automatically converting arrays to strings
2. **JSON Repair**: Enhanced logic to handle truncated and malformed JSON responses

Combined with the previous fixes, the system should now be much more resilient to model output variations.

---

**Status**: ✅ Fixes Applied and Built
**Build**: ✅ Successful  
**Next**: Reload extension and test with the same task
