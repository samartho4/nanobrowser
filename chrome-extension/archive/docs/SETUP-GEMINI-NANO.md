# Setup Gemini Nano - Step by Step

## ✅ Prerequisites

1. Chrome Canary with Gemini Nano enabled (you already have this)
2. Extension built (just completed)

## 📝 Exact Steps to Configure

### Step 1: Reload Extension

1. Go to `chrome://extensions/`
2. Find "Nanobrowser" extension
3. Click the **reload** button (circular arrow icon)

### Step 2: Add Gemini Nano Provider

1. Click the extension icon in Chrome toolbar
2. Go to **Settings** (gear icon)
3. Navigate to **LLM Providers** section
4. Click **"Add Provider"** or **"+"** button
5. Fill in:
   - **Provider Name:** `gemini-nano` (exactly this)
   - **API Key:** `local` (or leave empty)
   - **Base URL:** `local` (required field, but value doesn't matter)
   - **Models:** `gemini-nano`
6. Click **Save**

**Note:** The provider will auto-configure with correct defaults once saved.

### Step 3: Configure Agents to Use Gemini Nano

1. Still in Settings, go to **Agents** section
2. For **Planner Agent:**
   - Provider: Select `Gemini Nano`
   - Model: Select `gemini-nano`
3. For **Navigator Agent:**
   - Provider: Select `Gemini Nano`
   - Model: Select `gemini-nano`
4. Click **Save** or **Apply**

### Step 4: Test It!

1. Open any webpage (e.g., `https://google.com`)
2. Click your extension icon
3. Give it a task (e.g., "Search for weather")
4. Watch the console - you should see:
   ```
   [Nano Inject] Script injected into main page context
   [Nano Inject] window.LanguageModel available: true
   [Nano Bridge] Received message from background: nano:generateText
   [Nano Inject] Processing message: nano:generateText
   ```

## 🎉 Success Indicators

You'll know it's working when:
- ✅ No API key errors
- ✅ Agent executes tasks
- ✅ Console shows `[Nano Inject]` and `[Nano Bridge]` logs
- ✅ No network requests to OpenAI/Anthropic/etc.

## ⚠️ Important Notes

**Tab Requirement:**
- Gemini Nano requires an active webpage to be open
- The agent will use the current tab's context to access the API
- If no tab is open, you'll get an error

**Model Limitations:**
- Gemini Nano is smaller than cloud models
- Best for simple tasks
- May not handle complex multi-step reasoning as well

## 🐛 Troubleshooting

**"No active tab found"**
- Make sure you have a webpage open when running the agent
- The extension needs a tab context to access Gemini Nano

**Provider not showing in dropdown**
- Reload the extension
- Clear browser cache
- Check that build completed successfully

**Agent still using cloud API**
- Verify Settings → Agents shows "Gemini Nano" selected
- Check Settings → LLM Providers has Gemini Nano configured
- Reload extension after changing settings

**Console shows no [Nano Inject] logs**
- Refresh the webpage
- Check that inject script is loaded: look for "content script loaded" in console
- Verify extension has permission to access the page

## 📊 How to Verify It's Using Nano

1. Open DevTools on the webpage
2. Go to Console tab
3. Run a task with your agent
4. Look for these logs:
   ```
   [Nano Bridge] Received message from background: nano:generateText
   [Nano Inject] Processing message: nano:generateText id: nano-xxxxx
   [Nano Inject] generateText called with prompt: ...
   [Nano Inject] Using LanguageModel API
   [Nano Inject] Session created, sending prompt...
   [Nano Inject] Response received: ...
   ```

If you see these logs, **Gemini Nano is working!** 🎉

## 🚀 Next Steps

Once this works:
1. Test with various tasks to see Nano's capabilities
2. Implement CloudFallbackProvider (Task 3) for when Nano isn't available
3. Create HybridAIClient (Task 4) that tries Nano first, falls back to cloud
4. Get best of both worlds: free local AI with cloud backup!
