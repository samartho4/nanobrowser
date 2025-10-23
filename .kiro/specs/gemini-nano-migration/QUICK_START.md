# Quick Start - Test Shannon in Chrome

## 🚀 Immediate Steps

### 1. Load Extension (2 minutes)

```bash
# Your dist folder is ready at:
# /Users/sam/Pictures/nanobrowser/dist
```

**In Chrome:**
1. Open: `chrome://extensions/`
2. Enable "Developer mode" (top-right toggle)
3. Click "Load unpacked"
4. Navigate to: `/Users/sam/Pictures/nanobrowser/dist`
5. Click "Select"

✅ You should see "Shannon" extension appear!

### 2. Quick Verification (1 minute)

**Check for errors:**
- Look at the Shannon extension card
- No red error badge = good!
- Click "service worker" link to see background logs

**Open side panel:**
- Click Shannon icon in toolbar
- Side panel should open on the right
- Look for status indicator at top

### 3. Configure API Key (2 minutes)

**Get Gemini API Key:**
- Go to: https://aistudio.google.com/app/apikey
- Click "Create API Key"
- Copy the key

**Add to Shannon:**
1. Right-click Shannon icon → Options
2. Find "Gemini" provider section
3. Paste API key
4. Click "Save"

### 4. Test Basic Functionality (2 minutes)

**Simple test:**
1. Open side panel
2. Status should show either:
   - "Nano: ready" (if you have Nano enabled)
   - "Cloud via Firebase" (using your API key)
3. Try a simple command in the chat

## 🔍 What to Look For

### ✅ Good Signs
- Extension loads without errors
- Side panel opens
- Status indicator shows connection method
- No console errors in background worker

### ⚠️ Potential Issues
- **"Nano: not available"** - Normal if you haven't enabled Chrome flags
- **"No API key configured"** - Need to add Gemini API key in options
- **TypeScript errors in options page** - Known issue, doesn't affect core functionality

## 🧪 Optional: Enable Gemini Nano

If you want to test local AI (no API key needed):

1. **Enable flags:**
   - `chrome://flags/#optimization-guide-on-device-model` → "Enabled BypassPerfRequirement"
   - `chrome://flags/#prompt-api-for-gemini-nano` → "Enabled"
   - Restart Chrome

2. **Download model:**
   ```javascript
   // In DevTools console (F12):
   await ai.languageModel.create()
   // Wait for download (2-3 minutes)
   ```

3. **Verify:**
   ```javascript
   (await ai.languageModel.capabilities()).available
   // Should return "readily"
   ```

## 📊 Current Status

**Build:** ✅ Complete
- All files in dist/ folder
- Manifest configured correctly
- Firebase integration ready

**Known Issues:**
- Options page has TypeScript warnings (doesn't affect functionality)
- ModelSettings.tsx needs cleanup (follow-up task)

**Ready to Test:**
- ✅ HybridAIClient (Nano + Firebase fallback)
- ✅ Navigator agent
- ✅ Planner agent
- ✅ Side panel UI
- ⚠️ Options page (may have minor UI issues)

## 🐛 If Something Goes Wrong

**Extension won't load:**
```bash
# Rebuild
pnpm build

# Check dist folder exists
ls -la dist/
```

**Service worker errors:**
1. Go to `chrome://extensions/`
2. Click "service worker" under Shannon
3. Check console for errors
4. Look for Firebase or API key issues

**Need help:**
- Check: `.kiro/specs/gemini-nano-migration/CHROME_TESTING_GUIDE.md`
- Full testing checklist and debugging tips

## 📝 Report Results

After testing, note:
- Did extension load? ✅/❌
- Did side panel open? ✅/❌
- Status indicator showing? ✅/❌
- Any console errors? (copy/paste)
- Which mode working? (Nano/Cloud/Neither)

---

**Ready to go!** Start with step 1 above. The extension is built and waiting in the `dist/` folder.
