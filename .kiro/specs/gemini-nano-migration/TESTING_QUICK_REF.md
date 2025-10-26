# Quick Testing Reference Card

## 🎯 **In 3 Minutes:**

1. **Load Extension**
   - `chrome://extensions/` → Load unpacked → Select `dist` folder

2. **Open DevTools**
   - Right-click side panel → Inspect → Watch Console

3. **Run Task**
   - Example: "Go to google.com and search for pottery"

4. **Check Logs**
   - Look for: `[FirebaseBridge] Schema complexity: XX`
   - Should say: `High complexity - using plain text`

---

## ✅ **Success Looks Like:**

```
[FirebaseBridge] Schema complexity: 25 (threshold: 5)
[FirebaseBridge] High complexity - using plain text directly
[FirebaseBridge] ✅ Plain text method succeeded, length: 847
```

## ❌ **Failure Looks Like:**

```
Position 1107 (truncated)
Malformed JSON
Could not repair JSON
```

---

## 📊 **What to Test:**

| Test | Expected Complexity | Expected Method |
|------|-------------------|-----------------|
| Navigation task | 20-30 | Plain text |
| Simple "wait" | 2-3 | Structured output |
| Second request | Any | "Using cached method" |

---

## 🐛 **Quick Fixes:**

**No logs?** → Inspect side panel (not background)
**No API key?** → Options → Add Gemini API key
**Old code?** → Run `pnpm build` again

---

## 📝 **Report Format:**

```
Task: [What you asked]
Complexity: [Number]
Method: [Structured/Plain text]
Result: [Success/Fail]
```

---

**Full guide:** See `TESTING_GUIDE.md`
