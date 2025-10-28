# 🔐 Gmail OAuth Setup Guide

## ❌ Current Issue

```
Error: Not authenticated. Call authenticate() first.
```

This means you need to complete the OAuth flow. **No problem - very quick!**

---

## ✅ Solution: 3 Easy Steps

### Step 1: Open Extension Settings

1. **Click Shannon extension icon** in Chrome toolbar
2. A side panel opens on the right
3. Click **⚙️ Settings** icon (top right)
4. Click **Tools** tab

You should see the Tools marketplace.

---

### Step 2: Find & Configure Gmail

1. Scroll to find **Gmail** card
2. Click **Configure Gmail** button (or gear icon ⚙️)
3. An API key modal appears

---

### Step 3: Complete OAuth Flow

**Two options:**

#### Option A: Use OAuth (Recommended) ⭐
1. Modal shows "OAuth Configuration"
2. Click **"Authenticate with Google"** button
3. Google login popup appears
4. Login with your Google account
5. Grant permissions on permissions screen
6. Return to extension
7. Should show **"✅ Connected"**

#### Option B: Use API Key
1. Get API key from [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Paste in the modal
3. Click Save

---

## ✅ Verify It Works

After authentication, **run this test in console:**

```javascript
chrome.runtime.sendMessage({
  type: 'TOOL_REQUEST',
  tool: 'gmail',
  action: 'GET_PROFILE'
}, (response) => {
  console.log('Response:', response);
  if (response?.success) {
    console.log('✅ SUCCESS! Your email:', response.data.emailAddress);
  } else {
    console.log('❌ Failed:', response?.error);
  }
});
```

**Expected:**
```
Response: {success: true, data: {emailAddress: "your@gmail.com", messagesTotal: 1234, ...}}
✅ SUCCESS! Your email: your@gmail.com
```

---

## 🎯 If You Don't See the Gmail Card

### Check 1: Make Sure You're in the Right Place
- ✅ Click Shannon icon
- ✅ Go to Settings ⚙️
- ✅ Click **Tools** tab (not other tabs)
- ✅ Scroll through all tools

### Check 2: If Still Not Visible
Rebuild and reload:
```bash
pnpm build
# Then at chrome://extensions, click reload button for Shannon
```

---

## 🔍 If "Configure Gmail" Button Doesn't Work

**Try manual OAuth in console:**

```javascript
// Step 1: Initiate OAuth flow
chrome.runtime.sendMessage({
  type: 'TOOL_REQUEST',
  tool: 'gmail',
  action: 'INITIALIZE'
}, (response) => {
  console.log('Init response:', response);
  if (response?.success) {
    console.log('✅ Gmail initialized');
    console.log('   Client ID:', response.data.clientId);
    console.log('   Authenticated:', response.data.authenticated);
  }
});
```

If still not authenticated, the OAuth modal should open automatically.

---

## 📋 Full OAuth Test Flow

After you complete OAuth in the UI:

```javascript
// Test 1: Check if authenticated
console.log('=== TEST 1: Check Authentication ===');
chrome.runtime.sendMessage({
  type: 'TOOL_REQUEST',
  tool: 'gmail',
  action: 'INITIALIZE'
}, (response) => {
  console.log('Authenticated:', response?.data?.authenticated);
  
  if (response?.data?.authenticated) {
    // Test 2: Get profile
    console.log('\n=== TEST 2: Get Profile ===');
    chrome.runtime.sendMessage({
      type: 'TOOL_REQUEST',
      tool: 'gmail',
      action: 'GET_PROFILE'
    }, (profileResponse) => {
      if (profileResponse?.success) {
        console.log('✅ Email:', profileResponse.data.emailAddress);
        console.log('✅ Total emails:', profileResponse.data.messagesTotal);
      } else {
        console.log('❌ Error:', profileResponse?.error);
      }
    });
  }
});
```

---

## ⚠️ Troubleshooting

### Issue 1: "Invalid Client ID" Error
```
Error: Invalid value for 'oauth2.client_id'
```

**Fix:**
1. Check `.env` has correct ID:
   ```
   VITE_GMAIL_CLIENT_ID=660247393429-0k4m3vuc8or14jvf1kja23b9m7q0dphi.apps.googleusercontent.com
   ```
2. Rebuild: `pnpm build`
3. Reload extension

---

### Issue 2: OAuth Modal Doesn't Appear
```
Error: chrome.identity is undefined
```

**Fix:**
1. Manifest needs `identity` permission (already added ✓)
2. Rebuild & reload extension
3. Try again

---

### Issue 3: "Permission Denied" After Google Login
```
Error: User cancelled the operation
```

**Fix:**
1. This is normal - you rejected permissions
2. Try again
3. Click "Allow" on permissions screen
4. Don't click "Cancel"

---

## 🎬 Step-by-Step UI Flow

```
1. Click Shannon icon
   ↓
2. Right side panel opens
   ↓
3. Click ⚙️ Settings (top right of panel)
   ↓
4. Click "Tools" tab
   ↓
5. Scroll to "Gmail" card
   ↓
6. Click "Configure Gmail" button (or gear icon)
   ↓
7. Modal appears
   ↓
8. Click "Authenticate with Google"
   ↓
9. Google login popup appears
   ↓
10. Login with your Google account
    ↓
11. Grant permissions
    ↓
12. Popup closes
    ↓
13. Modal shows "✅ Connected"
    ↓
14. Done! Gmail authenticated ✅
```

---

## ✨ What Happens After Auth

Once authenticated:
- ✅ Token stored securely in Chrome storage
- ✅ Token auto-refreshes 5 min before expiry
- ✅ GET_PROFILE now works
- ✅ Can list emails
- ✅ Can search emails
- ✅ Can get full email details

---

## 🚀 Next Tests After OAuth

Once authenticated, try these:

### Test: List Your Unread Emails
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
  if (response?.success) {
    console.log('✅ Unread emails:', response.data.messages.length);
    response.data.messages.forEach((msg, i) => {
      console.log(`   ${i+1}. ${msg.id}`);
    });
  }
});
```

### Test: Get Your Labels
```javascript
chrome.runtime.sendMessage({
  type: 'TOOL_REQUEST',
  tool: 'gmail',
  action: 'GET_LABELS'
}, (response) => {
  if (response?.success) {
    console.log('✅ Labels:', response.data.labels.length);
    response.data.labels.forEach(label => {
      console.log(`   - ${label.name}`);
    });
  }
});
```

---

## 🎯 Summary

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click Shannon icon | Side panel opens |
| 2 | Go to Settings → Tools | Gmail card visible |
| 3 | Click "Configure Gmail" | Modal appears |
| 4 | Click "Authenticate" | Google popup appears |
| 5 | Login & grant permissions | Popup closes |
| 6 | See "✅ Connected" | Gmail authenticated! |
| 7 | Run GET_PROFILE test | Shows your email |

---

## 📞 Need Help?

If OAuth modal doesn't appear:
1. Check browser console for errors
2. Make sure identity permission in manifest ✓
3. Try reloading extension
4. Try in incognito mode
5. Check Google Cloud Console has OAuth client set up

---

**Complete authentication now and then run the GET_PROFILE test!** 🎉
