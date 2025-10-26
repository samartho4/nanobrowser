# Testing Guide: Hybrid Approach with Navigator Schema

## ✅ Build Complete

The extension has been built with the Hybrid Approach implementation.

---

## 🧪 Testing Steps

### Step 1: Load the Extension

1. Open Chrome/Edge browser
2. Go to `chrome://extensions/` (or `edge://extensions/`)
3. Enable **Developer mode** (toggle in top-right)
4. Click **Load unpacked**
5. Select the `dist` folder: `/Users/khwahishvaid/Desktop/nanobrowserHybrid/dist`

### Step 2: Open DevTools for Side Panel

**Important:** You need to inspect the side panel page to see the Firebase Bridge logs.

1. In browser, click Extensions icon → Shannon
2. The side panel will open
3. **Right-click inside the side panel** → **Inspect**
4. DevTools will open showing the side panel's console
5. **Keep this DevTools window visible** during testing

### Step 3: Set Up Gemini API Key (if not already done)

1. In the side panel, click **Settings** or **Options**
2. Find **LLM Providers** section
3. Add your **Gemini API key**
4. Save

### Step 4: Run a Navigation Task

Give Shannon a task that requires navigation with actions. Examples:

**Simple Test:**
```
Go to google.com and search for "pottery"
```

**Medium Test:**
```
Go to github.com/samartho4/nanobrowser and check if the repo is starred
```

**Complex Test:**
```
Go to amazon.com, search for "laptop", click on the first result, and tell me the price
```

### Step 5: Monitor the Console Logs

Watch the **Side Panel DevTools Console** for these key log messages:

#### ✅ **What You Should See:**

**For Navigator Schema (Complex - 20+ properties):**

```
[FirebaseBridge] Received HYBRID_SDK_INVOKE message
[FirebaseBridge] Schema detected - using HYBRID generation approach
[FirebaseBridge] Schema complexity: 25 (threshold: 5)
[FirebaseBridge] High complexity - using plain text directly
[FirebaseBridge] Using PLAIN TEXT method with JSON instructions
[FirebaseBridge] ✅ Plain text method succeeded, length: 847
[FirebaseBridge] ✅ Generation complete, final response length: 847
```

**Key Indicators:**
- ✅ Complexity score > 5 (should be ~20-30 for Navigator)
- ✅ "High complexity - using plain text directly"
- ✅ "✅ Plain text method succeeded"
- ✅ No truncation errors
- ✅ Response length > 500 chars (complete JSON)

#### ❌ **What You Should NOT See:**

```
[FirebaseBridge] Structured output failed, falling back...
[FirebaseBridge] JSON Truncation
[FirebaseBridge] Malformed JSON
Position 1107 (truncated mid-response)
```

### Step 6: Verify Cache Learning

Run the **same task again** (or a similar navigation task):

**Second Request Should Show:**

```
[FirebaseBridge] Schema complexity: 25 (threshold: 5)
[FirebaseBridge] Using cached method: plaintext
[FirebaseBridge] Using PLAIN TEXT method with JSON instructions
[FirebaseBridge] ✅ Plain text method succeeded
```

**Key Indicator:**
- ✅ "Using cached method: plaintext" (learned from first request!)

### Step 7: Test Simple Schema (Optional)

To verify structured output works for simple schemas, you can:

1. Give a very simple task that doesn't require navigation:
   ```
   Wait 3 seconds
   ```

2. Look for logs:
   ```
   [FirebaseBridge] Schema complexity: 2 (threshold: 5)
   [FirebaseBridge] Low complexity - trying structured output first
   [FirebaseBridge] Using STRUCTURED OUTPUT method
   [FirebaseBridge] ✅ Structured output succeeded
   ```

---

## 📊 Success Criteria

### ✅ **PASS** if you see:

1. **Complexity Detection Working**
   - Navigator schema detected as "High complexity" (>5)
   - Simple schemas detected as "Low complexity" (≤5)

2. **Correct Method Selection**
   - Navigator uses "PLAIN TEXT method"
   - Simple tasks use "STRUCTURED OUTPUT method" (if tested)

3. **No Truncation**
   - Complete JSON responses (length > 500 chars typically)
   - No "Position XXX" truncation errors
   - No malformed JSON errors

4. **Cache Learning**
   - First request: Decides based on complexity
   - Second request: "Using cached method: plaintext"

5. **Actions Execute**
   - Shannon successfully performs the navigation
   - No "Action undefined" errors
   - Task completes successfully

### ❌ **FAIL** if you see:

1. **Truncation Errors**
   ```
   Position 1107
   Incomplete JSON
   ```

2. **Method Failures**
   ```
   Both methods failed
   Could not repair JSON
   ```

3. **Wrong Method Selection**
   - Navigator using "Structured output" (should use plain text)
   - Complexity score too low (<10 for Navigator)

---

## 🐛 Troubleshooting

### Issue: "Firebase not initialized"

**Solution:**
1. Check if Gemini API key is configured in Options
2. Reload the extension
3. Close and reopen the side panel

### Issue: No logs in console

**Solution:**
1. Make sure you're inspecting the **Side Panel** page, not the background page
2. Right-click inside side panel → Inspect
3. Check Console tab in DevTools

### Issue: "Schema complexity: 0"

**Possible causes:**
- Schema not being passed correctly
- Build didn't include new code

**Solution:**
1. Rebuild: `pnpm build`
2. Reload extension in chrome://extensions
3. Refresh side panel

### Issue: Still seeing truncation

**Check logs for:**
```
[FirebaseBridge] Structured output failed, falling back to plain text
```

**If fallback succeeds:** ✅ Working as intended (graceful fallback)

**If fallback also fails:** ❌ Need to investigate further

---

## 📋 Test Report Template

Copy this and fill it out:

```
## Test Results: Hybrid Approach

**Date:** October 25, 2025
**Task:** [Describe the task you gave Shannon]

### Logs Captured:

**Complexity Detection:**
- Schema complexity: [NUMBER]
- Method selected: [STRUCTURED OUTPUT / PLAIN TEXT]

**Generation Result:**
- Success: [YES / NO]
- Response length: [NUMBER] chars
- Truncation: [YES / NO]

**Cache Learning:**
- First request method: [STRUCTURED / PLAIN TEXT]
- Second request cached: [YES / NO]

**Action Execution:**
- Task completed: [YES / NO]
- Errors encountered: [NONE / DESCRIBE]

### Screenshot of Console Logs:
[Attach screenshot]

### Conclusion:
[PASS / FAIL] - [Brief explanation]
```

---

## 🎯 Quick Test Command

For fastest testing, use this task:

```
Go to example.com and click the "More information" link
```

**Why this is good:**
- Simple website (fast loading)
- Requires navigation (go_to_url)
- Requires action (click_element)
- Tests Navigator schema with 20+ properties

**Expected result:**
- Complexity: ~20-30
- Method: Plain text
- Complete JSON response
- Action executes successfully

---

## 📈 Advanced Testing (Optional)

### Test Auto-Learning Over Time

Run these tasks in sequence and watch cache grow:

1. **Task 1:** `Go to google.com`
   - Should decide based on complexity
   - Cache: Empty → Adds entry

2. **Task 2:** `Go to github.com`
   - Should use cached method
   - Cache: Uses existing entry

3. **Task 3:** `Search for "AI" on google.com`
   - Should use cached method
   - Cache: Reuses same entry

**Expected logs:**
- First task: "Schema complexity: X (threshold: 5)"
- Subsequent tasks: "Using cached method: plaintext"

### Test Graceful Fallback

To test fallback (hard to trigger naturally):

1. Look for any edge cases where structured output might initially be tried
2. Watch for logs: "Structured output failed, falling back to plain text"
3. Verify: "✅ Plain text method succeeded"

---

## ✅ When to Mark Todo as Complete

Mark the testing todo as **COMPLETE** when:

1. ✅ You see "High complexity" for Navigator schema
2. ✅ You see "Using PLAIN TEXT method"
3. ✅ No truncation errors occur
4. ✅ Actions execute successfully
5. ✅ Cache learning works (second request uses cached method)

**Then you can confidently say:** 
🎉 **Hybrid Approach is production-ready!**

---

## 💡 Tips

- **Keep DevTools open** during entire test session
- **Take screenshots** of console logs for documentation
- **Test multiple times** to verify cache learning
- **Try different task types** (navigation, interaction, extraction)
- **Compare before/after** if you have logs from old version

---

## 🚀 Next Steps After Testing

Once testing is successful:

1. Document successful test results
2. Update HYBRID_IMPLEMENTATION.md with test findings
3. Mark todo #7 as complete
4. Celebrate! 🎉
5. Prepare for memory layer integration

Good luck with testing! 🧪
