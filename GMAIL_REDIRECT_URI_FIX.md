# 🔧 Fix: Error 400 redirect_uri_mismatch

## ❌ The Error You Got

```
Error 400: redirect_uri_mismatch
The redirect_uri parameter is invalid. 
It must exactly match one of the redirect URIs in Google Cloud Console.
```

## 🎯 What's Happening

The extension is sending a **redirect URI** to Google that doesn't match what you configured in Google Cloud Console.

**Chrome Extension Redirect URI:** `urn:ietf:wg:oauth:2.0:oob` or your extension ID

**What you configured:** Something else (or nothing)

---

## ✅ How to Fix (5 Steps)

### Step 1: Get Your Extension ID

1. Go to `chrome://extensions`
2. Find **Shannon** extension
3. Copy the **Extension ID** (long alphanumeric string)
4. Looks like: `fikabnjhekkfcdlbgccemjabpajbjdda`

### Step 2: Go to Google Cloud Console

1. Open [Google Cloud Console](https://console.cloud.google.com)
2. Select your project (the one with Gmail API)
3. Go to **APIs & Services** → **Credentials**
4. Find your **OAuth 2.0 Client ID** (Chrome Extension type)
5. Click it to edit

### Step 3: Add Redirect URI

In the **Authorized redirect URIs** section, add:

```
urn:ietf:wg:oauth:2.0:oob
```

**Also add:**
```
https://[YOUR_EXTENSION_ID].chromiumapp.org/
```

Replace `[YOUR_EXTENSION_ID]` with your actual ID from Step 1.

**Example:**
```
urn:ietf:wg:oauth:2.0:oob
https://fikabnjhekkfcdlbgccemjabpajbjdda.chromiumapp.org/
```

### Step 4: Save

Click **SAVE** button

### Step 5: Test Again

1. Reload extension at `chrome://extensions`
2. Go to Settings → Tools → Configure Gmail
3. Click "Authenticate with Google"
4. Should now work! ✅

---

## 📋 Complete Redirect URI List

For Chrome Extensions, add **all** of these:

```
urn:ietf:wg:oauth:2.0:oob
https://[EXTENSION_ID].chromiumapp.org/
```

Where `[EXTENSION_ID]` is your extension's ID from `chrome://extensions`.

---

## 🔍 Where to Add These (Step-by-Step)

1. **Google Cloud Console** → [Go here](https://console.cloud.google.com/apis/credentials)
2. **Select your project** (with Gmail API enabled)
3. **APIs & Services** (left sidebar)
4. **Credentials** (left sidebar)
5. **Find** your OAuth 2.0 Client ID
6. **Click** to edit it
7. **Scroll** to "Authorized redirect URIs"
8. **Click** "+ ADD URI"
9. **Paste:** `urn:ietf:wg:oauth:2.0:oob`
10. **Click** "+ ADD URI" again
11. **Paste:** `https://[YOUR_EXTENSION_ID].chromiumapp.org/`
12. **Click** SAVE

---

## 📸 Visual Steps

### Finding OAuth Client

```
Google Cloud Console
  ↓
APIs & Services (left menu)
  ↓
Credentials
  ↓
Find "OAuth 2.0 Client IDs" section
  ↓
Click on "Chrome Extension" client ID
  ↓
Opens edit page
```

### Adding Redirect URIs

```
Edit OAuth Client Page
  ↓
Scroll down to "Authorized redirect URIs"
  ↓
Click "+ ADD URI"
  ↓
Paste: urn:ietf:wg:oauth:2.0:oob
  ↓
Click "+ ADD URI" again
  ↓
Paste: https://[EXTENSION_ID].chromiumapp.org/
  ↓
Click SAVE button
```

---

## ⚠️ Common Mistakes

### ❌ Wrong: Using HTTP instead of HTTPS
```
❌ http://[EXTENSION_ID].chromiumapp.org/
✅ https://[EXTENSION_ID].chromiumapp.org/
```

### ❌ Wrong: Missing chromiumapp.org
```
❌ https://[EXTENSION_ID]
✅ https://[EXTENSION_ID].chromiumapp.org/
```

### ❌ Wrong: Wrong extension ID
```
❌ https://abc123.chromiumapp.org/  (if your ID is different)
✅ https://fikabnjhekkfcdlbgccemjabpajbjdda.chromiumapp.org/
```

### ❌ Wrong: Not using the OOB URI
```
❌ Only https://...chromiumapp.org/
✅ Both urn:ietf:wg:oauth:2.0:oob AND https://...chromiumapp.org/
```

---

## 🔑 What is urn:ietf:wg:oauth:2.0:oob?

This is the standard "Out of Band" redirect URI used by Chrome extensions. It means:
- **urn** = Uniform Resource Name (special URL format)
- **ietf:wg:oauth:2.0:oob** = IETF OAuth 2.0 Out of Band
- Used by Chrome extensions because they can't use regular HTTP URLs

---

## ✅ How to Verify

After adding URIs:

1. **Go back** to your OAuth credentials
2. **Refresh** the page
3. **Check** that both URIs are listed:
   - `urn:ietf:wg:oauth:2.0:oob`
   - `https://[YOUR_ID].chromiumapp.org/`

---

## 🚀 Test Again

Once you've added the redirect URIs:

1. **Reload** extension at `chrome://extensions`
2. **Go** to Settings → Tools → Configure Gmail
3. **Click** "Authenticate with Google"
4. **You should see:**
   - Google login popup ✅
   - Login screen ✅
   - Permission screen ✅
   - "✅ Connected!" ✅

---

## 🎯 If Still Getting Error

### Check 1: Extension ID Correct?
```
chrome://extensions → Shannon → Copy ID
Compare with what you pasted in Google Cloud
```

### Check 2: HTTPS (not HTTP)?
```
✅ https://[ID].chromiumapp.org/
❌ http://[ID].chromiumapp.org/
```

### Check 3: Both URIs Added?
```
✅ urn:ietf:wg:oauth:2.0:oob
✅ https://[ID].chromiumapp.org/
(not just one)
```

### Check 4: Saved in Google Cloud?
```
After adding URIs, click SAVE button
Then reload extension
```

### Check 5: Gmail API Enabled?
```
Google Cloud Console
→ APIs & Services
→ Enabled APIs
→ Should show "Gmail API" ✅
```

---

## 🔑 Get Your Extension ID Easily

Paste this in browser console:

```javascript
chrome.runtime.id
```

It will show your extension ID!

---

## 📚 Related Docs

- **GMAIL_OAUTH_EXPLAINED.md** - How OAuth works
- **GMAIL_HOW_IT_WORKS.md** - Complete flow
- **GMAIL_OAUTH_ARCHITECTURE.md** - Technical details

---

## ✨ Summary

**The Problem:**
- Extension sends redirect URI to Google
- Google doesn't recognize it
- Login fails with `Error 400: redirect_uri_mismatch`

**The Solution:**
1. Get extension ID from `chrome://extensions`
2. Go to Google Cloud Console
3. Add these redirect URIs:
   - `urn:ietf:wg:oauth:2.0:oob`
   - `https://[EXTENSION_ID].chromiumapp.org/`
4. Click SAVE
5. Reload extension
6. Try again ✅

---

**Try these steps and let me know if you still get errors!** 🚀
