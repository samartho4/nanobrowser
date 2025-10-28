# 📋 Copy-Paste Console Tests for Gmail

## 🚀 Quick Start (Just Copy & Paste!)

### Step 1: Open the Right Console
1. Go to `chrome://extensions`
2. Find **Shannon** extension
3. Click **"Inspect views"** → **"background page"**
4. You'll see a console at the bottom

### Step 2: Copy & Paste Tests Below

---

## ✅ Test 1: Check Gmail Initialization

```javascript
chrome.runtime.sendMessage({
  type: 'TOOL_REQUEST',
  tool: 'gmail',
  action: 'INITIALIZE'
}, (response) => {
  console.log('=== GMAIL INITIALIZE TEST ===');
  console.log('Response:', response);
  if (response?.success) {
    console.log('✅ SUCCESS - Gmail service loaded');
    console.log('   Client ID:', response.data?.clientId);
    console.log('   Authenticated:', response.data?.authenticated);
  } else {
    console.log('❌ FAILED - Error:', response?.error);
  }
});
```

**Expected Output:**
```
=== GMAIL INITIALIZE TEST ===
Response: {success: true, data: {authenticated: false, clientId: "660247393429-..."}}
✅ SUCCESS - Gmail service loaded
   Client ID: 660247393429-0k4m3vuc8or14jvf1kja23b9m7q0dphi.apps.googleusercontent.com
   Authenticated: false
```

**If not authenticated yet**, go to Settings ⚙️ → Tools → Configure Gmail, complete OAuth, then continue.

---

## ✅ Test 2: Get Your Gmail Profile

```javascript
chrome.runtime.sendMessage({
  type: 'TOOL_REQUEST',
  tool: 'gmail',
  action: 'GET_PROFILE'
}, (response) => {
  console.log('=== GMAIL PROFILE TEST ===');
  console.log('Response:', response);
  if (response?.success) {
    console.log('✅ SUCCESS - Got your profile!');
    console.log('   Email:', response.data?.emailAddress);
    console.log('   Total Emails:', response.data?.messagesTotal);
    console.log('   Total Threads:', response.data?.threadsTotal);
  } else {
    console.log('❌ FAILED - Error:', response?.error);
    console.log('   Hint: Make sure you configured Gmail first!');
  }
});
```

**Expected Output:**
```
=== GMAIL PROFILE TEST ===
Response: {success: true, data: {emailAddress: "your@gmail.com", messagesTotal: 1234, ...}}
✅ SUCCESS - Got your profile!
   Email: your@gmail.com
   Total Emails: 1234
   Total Threads: 567
```

---

## ✅ Test 3: Get Your Labels

```javascript
chrome.runtime.sendMessage({
  type: 'TOOL_REQUEST',
  tool: 'gmail',
  action: 'GET_LABELS'
}, (response) => {
  console.log('=== GMAIL LABELS TEST ===');
  if (response?.success) {
    console.log('✅ SUCCESS - Got all labels!');
    console.log('   Total labels:', response.data?.labels?.length);
    console.log('   Labels:');
    response.data?.labels?.forEach(label => {
      console.log(`      - ${label.name} (${label.type})`);
    });
  } else {
    console.log('❌ FAILED - Error:', response?.error);
  }
});
```

**Expected Output:**
```
=== GMAIL LABELS TEST ===
✅ SUCCESS - Got all labels!
   Total labels: 8
   Labels:
      - INBOX (system)
      - SENT (system)
      - DRAFTS (system)
      - SPAM (system)
      - TRASH (system)
      - STARRED (system)
      - IMPORTANT (system)
      - CATEGORY_PROMOTIONS (system)
```

---

## ✅ Test 4: List Your Unread Emails

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
  console.log('=== GMAIL LIST MESSAGES TEST ===');
  if (response?.success) {
    console.log('✅ SUCCESS - Got emails!');
    console.log('   Found:', response.data?.messages?.length, 'unread emails');
    console.log('   Total estimate:', response.data?.resultSizeEstimate);
    console.log('   Messages:');
    response.data?.messages?.forEach((msg, i) => {
      console.log(`      ${i+1}. ID: ${msg.id.slice(0, 10)}... | Thread: ${msg.threadId?.slice(0, 10)}...`);
    });
  } else {
    console.log('❌ FAILED - Error:', response?.error);
  }
});
```

**Expected Output:**
```
=== GMAIL LIST MESSAGES TEST ===
✅ SUCCESS - Got emails!
   Found: 5 unread emails
   Total estimate: 12
   Messages:
      1. ID: 123abc... | Thread: 456def...
      2. ID: 789ghi... | Thread: 012jkl...
      3. ID: 345mno... | Thread: 678pqr...
      4. ID: 901stu... | Thread: 234vwx...
      5. ID: 567yza... | Thread: 890bcd...
```

---

## ✅ Test 5: Get a Specific Email

**Use a message ID from Test 4**, then run:

```javascript
// REPLACE 123abc with a real ID from Test 4
const messageId = '123abc'; 

chrome.runtime.sendMessage({
  type: 'TOOL_REQUEST',
  tool: 'gmail',
  action: 'GET_MESSAGE',
  payload: {
    messageId: messageId,
    format: 'full'
  }
}, (response) => {
  console.log('=== GMAIL GET MESSAGE TEST ===');
  if (response?.success) {
    console.log('✅ SUCCESS - Got email details!');
    const msg = response.data;
    console.log('   Subject:', msg.payload?.headers?.find(h => h.name === 'Subject')?.value);
    console.log('   From:', msg.payload?.headers?.find(h => h.name === 'From')?.value);
    console.log('   Date:', msg.payload?.headers?.find(h => h.name === 'Date')?.value);
    console.log('   Size:', msg.sizeEstimate, 'bytes');
    console.log('   Labels:', msg.labelIds);
  } else {
    console.log('❌ FAILED - Error:', response?.error);
  }
});
```

**Expected Output:**
```
=== GMAIL GET MESSAGE TEST ===
✅ SUCCESS - Got email details!
   Subject: Important Update from GitHub
   From: notifications@github.com
   Date: Sat, 26 Oct 2024 10:30:45 +0000
   Size: 5234 bytes
   Labels: ['INBOX', 'UNREAD']
```

---

## ✅ Test 6: Search Emails

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
  console.log('=== GMAIL SEARCH TEST ===');
  if (response?.success) {
    console.log('✅ SUCCESS - Search results!');
    console.log('   Found:', response.data?.messages?.length, 'messages');
    console.log('   Query:', 'from:github subject:notification');
  } else {
    console.log('❌ FAILED - Error:', response?.error);
  }
});
```

---

## ✅ Test 7: Test Caching (Performance)

```javascript
console.log('=== CACHING TEST ===');
console.log('Running GET_PROFILE twice to test caching...');

// First call (should be slow, ~300-500ms)
console.time('First call');
chrome.runtime.sendMessage({
  type: 'TOOL_REQUEST',
  tool: 'gmail',
  action: 'GET_PROFILE'
}, (response1) => {
  console.timeEnd('First call');
  console.log('First call result:', response1?.data?.emailAddress);
  
  // Second call (should be fast, ~50ms due to cache)
  setTimeout(() => {
    console.time('Second call');
    chrome.runtime.sendMessage({
      type: 'TOOL_REQUEST',
      tool: 'gmail',
      action: 'GET_PROFILE'
    }, (response2) => {
      console.timeEnd('Second call');
      console.log('Second call result:', response2?.data?.emailAddress);
      console.log('✅ Caching works if second call is much faster!');
    });
  }, 100);
});
```

**Expected Output:**
```
=== CACHING TEST ===
Running GET_PROFILE twice...
First call: 342.5 ms
First call result: your@gmail.com
Second call: 15.2 ms
Second call result: your@gmail.com
✅ Caching works if second call is much faster!
```

---

## ✅ Test 8: Check Stored Authentication

```javascript
chrome.storage.local.get(['gmail_auth_token'], (result) => {
  console.log('=== STORED AUTH TOKEN CHECK ===');
  if (result.gmail_auth_token) {
    console.log('✅ Token found in storage!');
    const token = result.gmail_auth_token;
    console.log('   Has access token:', !!token.accessToken);
    console.log('   Has refresh token:', !!token.refreshToken);
    console.log('   Expires in:', token.expiresAt ? Math.ceil((token.expiresAt - Date.now()) / 1000) + 's' : 'unknown');
  } else {
    console.log('❌ No token in storage');
    console.log('   Hint: Configure Gmail first in Settings → Tools');
  }
});
```

**Expected Output:**
```
=== STORED AUTH TOKEN CHECK ===
✅ Token found in storage!
   Has access token: true
   Has refresh token: true
   Expires in: 3598s
```

---

## ❌ Troubleshooting Tests

### If you get "Unauthorized" error:

```javascript
// Check token expiration
chrome.storage.local.get(['gmail_auth_token'], (result) => {
  const token = result.gmail_auth_token;
  if (token) {
    const expiresIn = token.expiresAt - Date.now();
    if (expiresIn < 0) {
      console.log('❌ Token EXPIRED. Needs refresh.');
    } else {
      console.log('✅ Token valid for', Math.ceil(expiresIn / 1000), 'more seconds');
    }
  }
});
```

---

### If you get "Invalid Client ID" error:

```javascript
// Check manifest has the client ID
fetch(chrome.runtime.getURL('manifest.json'))
  .then(r => r.json())
  .then(manifest => {
    console.log('OAuth config in manifest:', manifest.oauth2);
    if (manifest.oauth2?.client_id) {
      console.log('✅ Client ID present:', manifest.oauth2.client_id.slice(0, 20) + '...');
    } else {
      console.log('❌ Client ID missing! Run: pnpm build');
    }
  });
```

---

## 📊 Test All in Sequence

Want to run all tests one after another? Copy this:

```javascript
async function runAllTests() {
  console.log('🚀 Running ALL Gmail Tests...\n');
  
  const tests = [
    {
      name: 'INITIALIZE',
      action: 'INITIALIZE'
    },
    {
      name: 'GET_PROFILE',
      action: 'GET_PROFILE'
    },
    {
      name: 'GET_LABELS',
      action: 'GET_LABELS'
    },
    {
      name: 'LIST_MESSAGES',
      action: 'LIST_MESSAGES',
      payload: { query: 'is:unread', maxResults: 5 }
    }
  ];
  
  for (const test of tests) {
    await new Promise(resolve => {
      chrome.runtime.sendMessage({
        type: 'TOOL_REQUEST',
        tool: 'gmail',
        action: test.action,
        payload: test.payload
      }, (response) => {
        console.log(`\n📧 ${test.name}:`);
        if (response?.success) {
          console.log('✅ SUCCESS');
          console.log(response.data);
        } else {
          console.log('❌ FAILED:', response?.error);
        }
        resolve();
      });
    });
  }
  
  console.log('\n✨ All tests complete!');
}

runAllTests();
```

---

## 🎯 Which Test to Run First?

1. **Start with Test 1** (INITIALIZE) to verify Gmail is loaded
2. **If success**, go to Settings → Tools → Configure Gmail to authenticate
3. **After auth**, run Test 2 (GET_PROFILE) to verify
4. **Then try** Test 4 (LIST_MESSAGES) to get your emails
5. **Optional**: Run Test 7 (Caching) to see performance

---

**Copy a test above, paste in console, press Enter, and let me know what you see!** 🎉
