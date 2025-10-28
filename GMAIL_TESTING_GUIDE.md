# 🧪 Gmail Integration Testing Guide

## ⚠️ IMPORTANT: Before Testing

### Step 1: Get Google OAuth Client ID
**You MUST have a Google OAuth Client ID before testing**

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project (or select existing)
3. Enable **Gmail API** in APIs & Services
4. Go to **Credentials** → **Create OAuth 2.0 Client ID**
   - Select **Chrome Extension** type
   - Add your extension ID (from `chrome://extensions`)
5. Copy the **Client ID**

### Step 2: Configure Environment
```bash
# Edit .env file in project root
VITE_GMAIL_CLIENT_ID=YOUR_CLIENT_ID_HERE.apps.googleusercontent.com
```

### Step 3: Build Extension
```bash
pnpm build
```

### Step 4: Load Extension in Chrome
1. Open `chrome://extensions`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select `/Users/khwahishvaid/Desktop/nanobrowserHybrid/dist` folder
5. Note your **Extension ID** (copy it for Google Console if needed)

---

## 🎯 Testing Methods

### Method 1: Quick Console Test (FASTEST ⚡)

Open **Developer Tools** in the extension background page:

```javascript
// In chrome://extensions → Shannon → "Inspect views" → background page
// Copy & paste these tests one by one:

// TEST 1: Check if Gmail handler is registered
chrome.runtime.sendMessage({
  type: 'TOOL_REQUEST',
  tool: 'gmail',
  action: 'INITIALIZE'
}, (response) => {
  console.log('✅ INITIALIZE Response:', response);
});

// Wait 2-3 seconds for response, then run TEST 2

// TEST 2: Get Profile (needs OAuth first)
chrome.runtime.sendMessage({
  type: 'TOOL_REQUEST',
  tool: 'gmail',
  action: 'GET_PROFILE'
}, (response) => {
  console.log('✅ GET_PROFILE Response:', response);
});

// TEST 3: Get Labels
chrome.runtime.sendMessage({
  type: 'TOOL_REQUEST',
  tool: 'gmail',
  action: 'GET_LABELS'
}, (response) => {
  console.log('✅ GET_LABELS Response:', response);
});

// TEST 4: List Messages (first 5)
chrome.runtime.sendMessage({
  type: 'TOOL_REQUEST',
  tool: 'gmail',
  action: 'LIST_MESSAGES',
  payload: {
    query: 'is:unread',
    maxResults: 5
  }
}, (response) => {
  console.log('✅ LIST_MESSAGES Response:', response);
});
```

**Expected Results:**
- ✅ No errors in console
- ✅ `success: true` in response
- ✅ Data contains expected properties

---

### Method 2: UI Testing (RECOMMENDED 🎨)

#### Test in Side Panel

1. Open any website
2. Click **Shannon extension icon** → Open side panel
3. Go to **Settings** (⚙️ icon)
4. Click **Tools** tab
5. Find **Gmail** tool card
6. Click **Configure Gmail** button

**Expected Flow:**
- ✅ OAuth popup appears
- ✅ You can login to Google
- ✅ You see "Permissions" screen
- ✅ After accepting, "OAuth configured" message appears
- ✅ Gmail is marked as "Connected"

#### Test in Options Page

1. Click **Shannon extension icon** → **Options**
2. Go to **Tools** tab
3. Find **Gmail** card
4. Click **Gear icon** to configure

**Expected Flow:**
- Same as side panel
- Can run operations after OAuth success

---

### Method 3: Manual API Testing (DETAILED 🔍)

#### 3.1 Test Authentication Flow

```javascript
// Console Test: Check auth status
chrome.runtime.sendMessage({
  type: 'TOOL_REQUEST',
  tool: 'gmail',
  action: 'INITIALIZE'
}, (response) => {
  console.log('Auth Status:', response);
  if (response.data?.authenticated) {
    console.log('✅ Already authenticated as:', response.data.clientId);
  } else {
    console.log('⚠️ Not authenticated - need to run OAuth flow');
  }
});
```

**Expected:**
```json
{
  "success": true,
  "data": {
    "authenticated": true,
    "clientId": "XXX...apps.googleusercontent.com"
  }
}
```

#### 3.2 Test User Profile

```javascript
chrome.runtime.sendMessage({
  type: 'TOOL_REQUEST',
  tool: 'gmail',
  action: 'GET_PROFILE'
}, (response) => {
  console.log('Profile:', response);
  if (response.success) {
    console.log(`✅ Email: ${response.data.emailAddress}`);
    console.log(`   Total Messages: ${response.data.messagesTotal}`);
    console.log(`   Total Threads: ${response.data.threadsTotal}`);
  }
});
```

**Expected:**
```json
{
  "success": true,
  "data": {
    "emailAddress": "your@gmail.com",
    "messagesTotal": 1234,
    "threadsTotal": 567,
    "historyId": "123456789"
  }
}
```

#### 3.3 Test Labels

```javascript
chrome.runtime.sendMessage({
  type: 'TOOL_REQUEST',
  tool: 'gmail',
  action: 'GET_LABELS'
}, (response) => {
  console.log('Labels:', response);
  if (response.success) {
    console.log(`✅ Found ${response.data.labels.length} labels:`);
    response.data.labels.forEach(label => {
      console.log(`   - ${label.name} (${label.messagesUnread} unread)`);
    });
  }
});
```

**Expected:**
```json
{
  "success": true,
  "data": {
    "labels": [
      { "id": "INBOX", "name": "INBOX", "type": "system", "messagesUnread": 5 },
      { "id": "SENT", "name": "SENT", "type": "system", "messagesUnread": 0 },
      { "name": "Custom Label", "type": "user", "messagesUnread": 2 }
    ]
  }
}
```

#### 3.4 Test List Messages

```javascript
chrome.runtime.sendMessage({
  type: 'TOOL_REQUEST',
  tool: 'gmail',
  action: 'LIST_MESSAGES',
  payload: {
    query: 'is:unread',
    maxResults: 10
  }
}, (response) => {
  console.log('Messages:', response);
  if (response.success) {
    console.log(`✅ Found ${response.data.messages.length} unread messages`);
    response.data.messages.forEach((msg, i) => {
      console.log(`   ${i+1}. ID: ${msg.id}, Thread: ${msg.threadId}`);
    });
  }
});
```

**Expected:**
```json
{
  "success": true,
  "data": {
    "messages": [
      { "id": "123456", "threadId": "abc123" },
      { "id": "789012", "threadId": "def456" }
    ],
    "resultSizeEstimate": 2,
    "nextPageToken": "optional_token"
  }
}
```

#### 3.5 Test Get Message

```javascript
// First list messages to get an ID, then:
chrome.runtime.sendMessage({
  type: 'TOOL_REQUEST',
  tool: 'gmail',
  action: 'GET_MESSAGE',
  payload: {
    messageId: '123456', // Replace with real ID
    format: 'full' // or 'minimal'
  }
}, (response) => {
  console.log('Message Details:', response);
  if (response.success) {
    const msg = response.data;
    console.log(`✅ From: ${msg.payload?.headers?.find(h => h.name === 'From')?.value}`);
    console.log(`   Subject: ${msg.payload?.headers?.find(h => h.name === 'Subject')?.value}`);
    console.log(`   Size: ${msg.sizeEstimate} bytes`);
  }
});
```

**Expected:**
```json
{
  "success": true,
  "data": {
    "id": "123456",
    "threadId": "abc123",
    "labelIds": ["INBOX", "UNREAD"],
    "payload": {
      "mimeType": "text/plain",
      "headers": [
        { "name": "From", "value": "sender@example.com" },
        { "name": "Subject", "value": "Test Subject" }
      ],
      "body": {
        "size": 500,
        "data": "base64_encoded_body"
      }
    },
    "sizeEstimate": 1234
  }
}
```

#### 3.6 Test Search

```javascript
chrome.runtime.sendMessage({
  type: 'TOOL_REQUEST',
  tool: 'gmail',
  action: 'SEARCH_MESSAGES',
  payload: {
    query: 'from:github subject:notification',
    maxResults: 5
  }
}, (response) => {
  console.log('Search Results:', response);
  if (response.success) {
    console.log(`✅ Found ${response.data.messages.length} matching messages`);
  }
});
```

---

## 🐛 Debugging

### Enable Detailed Logging

Edit `chrome-extension/src/services/gmail/constants.ts`:

```typescript
// Change DEBUG level if exists, or logs are always on
// All logs are prefixed:
// [GmailOAuth] - OAuth operations
// [GmailService] - API operations  
// [GmailStorage] - Storage operations
// [GmailHandler] - Message handling
// [useGmail] - React hook operations
```

### View Logs

1. **Background Logs:**
   - `chrome://extensions` → Shannon → Inspect views → background page

2. **Content Script Logs:**
   - Open any webpage, right-click → Inspect → Console

3. **Options Page Logs:**
   - Open Options page → Right-click → Inspect → Console

### Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| **"Unauthorized" error** | OAuth Client ID wrong or expired token. Re-authenticate. |
| **"quota exceeded"** | Hit Gmail API quota. Wait or upgrade quota in Google Cloud. |
| **Empty labels** | Account might not have labels. Check Gmail manually. |
| **Messages not loading** | Query syntax wrong. Use `is:unread` or `from:sender@domain.com` |
| **Slow responses** | First request is slower (no cache). Second call should be faster. |
| **Chrome throws permission error** | Manifest permissions missing. Rebuild and reload extension. |

---

## ✅ Full Testing Checklist

### Phase 1: Setup ✓
- [ ] Google OAuth Client ID obtained
- [ ] Client ID added to `.env`
- [ ] Extension built with `pnpm build`
- [ ] Extension loaded in Chrome at `chrome://extensions`
- [ ] Extension ID visible

### Phase 2: Authentication ✓
- [ ] Click "Configure Gmail" button
- [ ] OAuth popup appears
- [ ] Can login to Google
- [ ] Permissions screen shown
- [ ] After accept, returns to extension
- [ ] "Connected" status shown

### Phase 3: API Operations ✓
- [ ] INITIALIZE returns `authenticated: true`
- [ ] GET_PROFILE returns email address
- [ ] GET_LABELS returns list of labels
- [ ] LIST_MESSAGES returns message array
- [ ] GET_MESSAGE returns full message details
- [ ] SEARCH_MESSAGES finds matching messages

### Phase 4: Caching ✓
- [ ] First GET_PROFILE call takes ~500ms
- [ ] Second GET_PROFILE call takes ~50ms (cached)
- [ ] After 5 minutes, cache expires
- [ ] Fresh call after expiration

### Phase 5: Error Handling ✓
- [ ] Invalid query returns error message
- [ ] Network error handled gracefully
- [ ] Token refresh happens automatically
- [ ] Retry logic kicks in on failure

### Phase 6: UI Integration ✓
- [ ] useGmail hook works in components
- [ ] Loading state shown during request
- [ ] Error state shown on failure
- [ ] Data state shows results

---

## 🎬 Step-by-Step Test Run

### Quick Test (2 minutes)

1. Open `chrome://extensions` → Shannon → Inspect background page
2. Run this in console:
```javascript
chrome.runtime.sendMessage({
  type: 'TOOL_REQUEST',
  tool: 'gmail',
  action: 'INITIALIZE'
}, (res) => console.log('Step 1 - Auth:', res));
```
3. Should see `success: true` or `authenticated` status
4. If error → OAuth Client ID issue
5. If success → Go to Phase 3 tests

### Complete Test (10 minutes)

1. ✅ Phase 1: Setup checklist
2. ✅ Phase 2: Authentication flow
3. ✅ Phase 3: Run all 6 API tests
4. ✅ Phase 4: Check caching performance
5. ✅ Phase 5: Try error case (wrong query)
6. ✅ Phase 6: Use React hook in component

---

## 📊 Performance Benchmarks

| Operation | Expected Time | Notes |
|-----------|---------------|-------|
| INITIALIZE | 100-200ms | Checks cached auth |
| GET_PROFILE (1st) | 300-500ms | Network + parsing |
| GET_PROFILE (2nd) | 10-50ms | From cache |
| LIST_MESSAGES | 400-700ms | Depends on query |
| GET_MESSAGE | 300-600ms | Full payload |
| Token Refresh | 500-1000ms | Only on 401 or expiry |

---

## 🚀 Success Criteria

✅ **All Passing When:**
- [ ] OAuth flow completes without errors
- [ ] All 6 operations return `success: true`
- [ ] API data contains expected fields
- [ ] Caching works (2nd call faster)
- [ ] No console errors
- [ ] Extension doesn't crash

---

## 📞 Troubleshooting Contacts

If tests fail:

1. **Check OAuth Client ID**
   - Is it in `.env`?
   - Is it correct format? `XXX.apps.googleusercontent.com`
   - Did you add extension ID to authorized origins?

2. **Check Manifest Permissions**
   - Look at `chrome-extension/manifest.js`
   - Has `identity` permission? ✓
   - Has Gmail API hosts? ✓

3. **Check Background Handler**
   - Is `handleGmailMessage` imported in `background/index.ts`?
   - Is listener registered in message handler?

4. **Clear Chrome Cache**
   - Sometimes Chrome caches old version
   - Rebuild: `pnpm build`
   - Reload extension: Click reload button at `chrome://extensions`

---

## 💡 Pro Tips

- **Save Message IDs**: When testing GET_MESSAGE, save IDs for repeated tests
- **Use Filters**: Test with `is:unread`, `from:`, `subject:` filters
- **Monitor Network**: Open DevTools Network tab to see Gmail API calls
- **Check Quota**: Google Cloud Console → Gmail API → Quotas to see usage

---

**Happy Testing! 🎉**

Once all tests pass, Gmail integration is production-ready!
