# Chrome Testing Guide for Shannon Extension

## Installation Steps

1. **Open Chrome Extensions Page**
   - Navigate to `chrome://extensions/`
   - Or click the three dots menu → Extensions → Manage Extensions

2. **Enable Developer Mode**
   - Toggle "Developer mode" switch in the top-right corner

3. **Load Unpacked Extension**
   - Click "Load unpacked" button
   - Navigate to your project directory
   - Select the `dist` folder
   - Click "Select" or "Open"

4. **Verify Installation**
   - You should see "Shannon" extension card appear
   - Extension ID will be displayed
   - Icon should show in the extensions toolbar

## Testing Checklist

### Basic Functionality Tests

- [ ] **Extension Loads Without Errors**
  - Check for any red error badges on the extension card
  - Click "Errors" button if present to view details
  - Open DevTools → Console for background page (click "service worker" link)

- [ ] **Side Panel Opens**
  - Click the Shannon icon in the toolbar
  - Side panel should open on the right side
  - Check for console errors in side panel DevTools

- [ ] **Options Page Opens**
  - Right-click Shannon icon → Options
  - Or click "Extension options" in chrome://extensions
  - Options page should load without errors

### Gemini Nano Testing (if available)

- [ ] **Check Nano Availability**
  - Open side panel
  - Look for status indicator showing "Nano: ready" or "Nano: not available"
  - If not available, see "Enabling Gemini Nano" section below

- [ ] **Test with Nano Enabled**
  - Ensure Nano status shows "ready"
  - Try a simple agent task
  - Verify responses come from local Nano model
  - Check response time (should be fast, local)

### Firebase Cloud Fallback Testing

- [ ] **Configure Gemini API Key**
  - Open Options page
  - Navigate to Model Settings
  - Add Gemini API key
  - Save configuration

- [ ] **Test Cloud Fallback**
  - If Nano is not available, extension should use Firebase
  - Status should show "Cloud via Firebase"
  - Try an agent task
  - Verify responses come from cloud API

### Agent Testing

- [ ] **Test Navigator Agent**
  - Open side panel on any webpage
  - Try a navigation task (e.g., "Click the search button")
  - Verify agent can see page elements
  - Check if actions are executed correctly

- [ ] **Test Planner Agent**
  - Try a multi-step task
  - Verify planner breaks it down into steps
  - Check if navigator executes each step

### Error Scenarios

- [ ] **No API Key + No Nano**
  - Remove Gemini API key
  - Disable Nano
  - Try to use extension
  - Should show appropriate error message

- [ ] **Invalid API Key**
  - Enter invalid Gemini API key
  - Try to use extension
  - Should show authentication error

## Enabling Gemini Nano (Chrome Built-in AI)

### Prerequisites
- Chrome version 127 or later
- Sufficient disk space (~2GB for model download)

### Steps

1. **Enable Optimization Guide**
   - Navigate to `chrome://flags/#optimization-guide-on-device-model`
   - Set to "Enabled BypassPerfRequirement"
   - This bypasses performance checks for testing

2. **Enable Prompt API**
   - Navigate to `chrome://flags/#prompt-api-for-gemini-nano`
   - Set to "Enabled"

3. **Restart Chrome**
   - Click "Relaunch" button at bottom of flags page

4. **Download Model**
   - Open DevTools Console (F12)
   - Run: `await ai.languageModel.create()`
   - Wait for model to download (may take several minutes)
   - Check status: `(await ai.languageModel.capabilities()).available`
   - Should return "readily" when ready

5. **Verify in Shannon**
   - Open Shannon side panel
   - Status should show "Nano: ready"

## Debugging Tips

### View Background Service Worker Logs
1. Go to `chrome://extensions/`
2. Find Shannon extension
3. Click "service worker" link under "Inspect views"
4. DevTools will open showing background logs

### View Side Panel Logs
1. Open Shannon side panel
2. Right-click in the panel
3. Select "Inspect"
4. DevTools will open for the side panel

### View Options Page Logs
1. Open Options page
2. Press F12 or right-click → Inspect
3. Check Console for errors

### Common Issues

**Extension won't load:**
- Check that you selected the `dist` folder, not the project root
- Verify build completed successfully
- Check for manifest.json errors

**Service worker crashes:**
- Check background service worker console for errors
- Look for Firebase configuration issues
- Verify API keys are valid

**Nano not available:**
- Verify Chrome version (127+)
- Check flags are enabled correctly
- Ensure model downloaded successfully
- Try `chrome://components/` and look for "Optimization Guide On Device Model"

**Side panel won't open:**
- Check for JavaScript errors in background worker
- Verify side panel HTML file exists in dist/
- Check manifest.json has side_panel configuration

## Test Results Template

```
## Test Results - [Date]

### Environment
- Chrome Version: 
- OS: macOS
- Shannon Version: 0.1.12

### Installation
- [ ] Extension loaded successfully
- [ ] No manifest errors
- [ ] Service worker started

### Gemini Nano
- [ ] Nano available: Yes/No
- [ ] Status indicator correct
- [ ] Local inference working

### Firebase Fallback
- [ ] API key configured
- [ ] Cloud fallback working
- [ ] Responses received

### Agents
- [ ] Navigator agent functional
- [ ] Planner agent functional
- [ ] Multi-step tasks working

### Issues Found
1. [List any issues discovered]

### Notes
[Any additional observations]
```

## Next Steps After Testing

1. Document any bugs or issues found
2. Test edge cases and error scenarios
3. Verify performance (response times, memory usage)
4. Test on different websites
5. Check for console warnings or errors
