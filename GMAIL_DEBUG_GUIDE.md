# 🎯 Gmail Integration: Quick Debugging Guide

## 📊 What These Logs Mean

### ✅ Good Signs
```
[SecurityGuardrails] enabled: true
[background] background loaded
[HybridAIClient] Nano availability: available
[HybridAIClient] Initialized with Gemini Nano
[Analytics] Analytics initialized
[ToolsUtils] Tool configuration saved: gmail
```

**Translation:** Extension is working! Gmail tool is configured!

---

## 🧪 Test Gmail Integration (Right Now!)

### Quick Test #1: Check if Gmail Service Initialized

Open console and run:
```javascript
// In chrome://extensions → Shannon → "Inspect views" → background page
chrome.runtime.sendMessage({
  type: 'TOOL_REQUEST',
  tool: 'gmail',
  action: 'INITIALIZE'
}, (response) => {
  console.log('📧 Gmail Status:', response);
  if (response?.success) {
    console.log('✅ Gmail is ready!');
  } else {
    console.log('⚠️ Gmail needs OAuth setup');
  }
});
```

**Expected Output:**
```json
{
  "success": true,
  "data": {
    "authenticated": false,  // or true if already authed
    "clientId": "660247393429-0k4m3vuc8or14jvf1kja23b9m7q0dphi.apps.googleusercontent.com"
  }
}
```

---

### Quick Test #2: Get Gmail Profile

```javascript
// After INITIALIZE succeeds
chrome.runtime.sendMessage({
  type: 'TOOL_REQUEST',
  tool: 'gmail',
  action: 'GET_PROFILE'
}, (response) => {
  console.log('👤 Gmail Profile:', response);
  if (response?.success) {
    console.log('✅ Your email:', response.data.emailAddress);
    console.log('📧 Total emails:', response.data.messagesTotal);
  } else {
    console.log('❌ Error:', response?.error);
  }
});
```

**Expected if authenticated:**
```json
{
  "success": true,
  "data": {
    "emailAddress": "your@gmail.com",
    "messagesTotal": 1234,
    "threadsTotal": 567
  }
}
```

---

### Quick Test #3: List Unread Emails

```javascript
chrome.runtime.sendMessage({
  type: 'TOOL_REQUEST',
  tool: 'gmail',
  action: 'LIST_MESSAGES',
  payload: {
    query: 'is:unread',
    maxResults: 5
  }
}, (response) => {
  console.log('📬 Unread Messages:', response);
  if (response?.success) {
    console.log(`✅ Found ${response.data.messages.length} unread`);
    response.data.messages.forEach((msg, i) => {
      console.log(`   ${i+1}. ID: ${msg.id}`);
    });
  }
});
```

---

## 🔍 Common Scenarios & What to Check

### Scenario 1: "OAuth not configured yet"
```
response.data.authenticated: false
```

**What to do:**
1. Go to extension side panel
2. Click Settings ⚙️ → Tools
3. Find Gmail card
4. Click "Configure Gmail" button
5. Complete Google login
6. Grant permissions

Then retry the GET_PROFILE test above.

---

### Scenario 2: "Invalid Client ID"
```
error: "Invalid value for 'oauth2.client_id'"
```

**What to do:**
1. Check `.env` file has correct value:
   ```
   VITE_GMAIL_CLIENT_ID=660247393429-0k4m3vuc8or14jvf1kja23b9m7q0dphi.apps.googleusercontent.com
   ```
2. Rebuild: `pnpm build`
3. Reload extension at `chrome://extensions`

---

### Scenario 3: "Manifest error"
```
error: "Could not load manifest"
```

**What to do:**
1. Go to `chrome://extensions`
2. Click "Details" on Shannon
3. Look for red error message
4. If mentions oauth2.client_id:
   - Check .env is set
   - Run: `pnpm build`
   - Reload extension

---

## 🎬 Complete Setup (If Starting Fresh)

### Step 1: Get Google OAuth Client ID
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create OAuth 2.0 Client ID (Chrome Extension)
3. Copy the client ID

### Step 2: Add to .env
Edit `/Users/khwahishvaid/Desktop/nanobrowserHybrid/.env`:
```
VITE_GMAIL_CLIENT_ID=YOUR_CLIENT_ID_HERE.apps.googleusercontent.com
```

### Step 3: Rebuild
```bash
cd /Users/khwahishvaid/Desktop/nanobrowserHybrid
pnpm build
```

### Step 4: Load Extension
1. Go to `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `/Users/khwahishvaid/Desktop/nanobrowserHybrid/dist`

### Step 5: Verify
1. Extension should load without errors
2. Run "Quick Test #1" above
3. Should see OAuth client ID in response

### Step 6: Authenticate
1. Open extension side panel
2. Settings ⚙️ → Tools → Gmail
3. Click "Configure"
4. Complete Google OAuth
5. Return to extension (should show "Connected")

### Step 7: Test API
1. Run "Quick Test #2" above
2. Should see your Gmail profile

---

## 📋 Debugging Checklist

- [ ] `.env` has `VITE_GMAIL_CLIENT_ID` set
- [ ] Extension built with `pnpm build`
- [ ] Extension loaded at `chrome://extensions`
- [ ] No red errors on extension details page
- [ ] `INITIALIZE` test returns `success: true`
- [ ] OAuth Client ID visible in response
- [ ] Can click "Configure Gmail" in Settings
- [ ] OAuth login popup appears
- [ ] Can login with Google account
- [ ] `GET_PROFILE` returns email address
- [ ] `LIST_MESSAGES` returns email list

---

## 🔧 Advanced Debugging

### View All Logs
Open background page console:
```
chrome://extensions → Shannon → "Inspect views" → background page
```

Look for these prefixes:
- `[GmailOAuth]` - Authentication issues
- `[GmailService]` - API errors
- `[GmailStorage]` - Storage problems
- `[GmailHandler]` - Message routing
- `[useGmail]` - React hook issues

### Force Refresh Token
If token expired:
```javascript
// Disconnect (clears token)
chrome.runtime.sendMessage({
  type: 'TOOL_REQUEST',
  tool: 'gmail',
  action: 'DISCONNECT'
}, (res) => console.log('Disconnected:', res));

// Then re-authenticate through UI
// Go to Settings → Tools → Configure Gmail
```

### Check Stored Token
```javascript
chrome.storage.local.get(['gmail_auth_token'], (result) => {
  console.log('Stored token:', result.gmail_auth_token ? '✅ Found' : '❌ Not found');
  if (result.gmail_auth_token) {
    console.log('Token data:', {
      ...result.gmail_auth_token,
      accessToken: '***REDACTED***',
      refreshToken: '***REDACTED***'
    });
  }
});
```

### Check Cache
```javascript
chrome.storage.session.get(null, (result) => {
  const gmailCache = Object.keys(result).filter(k => k.startsWith('gmail_'));
  console.log('Gmail cache entries:', gmailCache);
  gmailCache.forEach(key => {
    console.log(`  ${key}:`, result[key]);
  });
});
```

---

## 🚀 Success Criteria

**You'll know it's working when:**

1. ✅ Extension loads without errors
2. ✅ `INITIALIZE` returns success
3. ✅ Can configure Gmail via Settings
4. ✅ OAuth login completes
5. ✅ `GET_PROFILE` shows your email
6. ✅ `LIST_MESSAGES` shows emails
7. ✅ No console errors

---

## 💡 Pro Tips

- **First test is slow** (300-500ms) due to network
- **Second test is fast** (50ms) due to caching
- **Token auto-refreshes** 5 minutes before expiry
- **Cache expires** after 5 minutes automatically
- **Retry logic** auto-retries 3 times on failure

---

## 📞 If Still Issues

1. **Screenshot the error** from extension details page
2. **Copy logs** from background console
3. **Check `.env`** has correct format
4. **Verify Google OAuth** is set up correctly
5. **Rebuild** with `pnpm build`
6. **Reload** extension at `chrome://extensions`

---

**Start with "Quick Test #1" above and let me know what you see!** 🎉
