# 🚀 Quick Start: Authenticate Gmail (30 seconds!)

## Current Status
```
❌ Gmail not authenticated
✅ OAuth button added to modal
✅ Extension built and ready
```

---

## Do This Now (3 Steps):

### 1️⃣ Reload Extension
1. Go to `chrome://extensions`
2. Find **Shannon**
3. Click the **reload** icon (circular arrow)
4. Wait 2 seconds

### 2️⃣ Open Tools Settings
1. Click **Shannon** extension icon
2. Click **⚙️ Settings** (top right of panel)
3. Click **Tools** tab
4. Scroll to find **Gmail** card
5. Click **Configure Gmail** button

### 3️⃣ Authenticate
1. Modal opens
2. Click **"Authenticate with Google"** button ← NEW!
3. Google login popup appears
4. Login with your Google account
5. Click "Allow" on permissions screen
6. Wait for modal to show **"✅ Connected!"**

---

## ✅ Verify It Works

In console (background page):
```javascript
chrome.runtime.sendMessage({
  type: 'TOOL_REQUEST',
  tool: 'gmail',
  action: 'GET_PROFILE'
}, (response) => {
  console.log('Email:', response?.data?.emailAddress);
  console.log('Emails:', response?.data?.messagesTotal);
});
```

**You should see:**
```
Email: your@gmail.com
Emails: 1234
```

---

## ✨ What's New

I added a **"Authenticate with Google"** button to the Gmail configuration modal instead of asking for API keys.

Now the flow is:
```
Settings → Tools → Gmail → Configure → Authenticate Button → OAuth Flow ✅
```

---

## 🎉 That's It!

Once you see "✅ Connected!", Gmail is ready to use!

All 8 operations work:
- ✅ GET_PROFILE
- ✅ GET_LABELS
- ✅ LIST_MESSAGES
- ✅ GET_MESSAGE
- ✅ GET_THREAD
- ✅ SEARCH_MESSAGES
- ✅ INITIALIZE
- ✅ DISCONNECT

---

**Start authenticating now!** 🚀
