# Complete Firebase Setup Guide

## You're Right - Firebase Project IS Required!

Even though we use `GoogleAIBackend`, Firebase AI Logic SDK requires a proper Firebase project setup. Here are the exact steps:

---

## Step 1: Create Firebase Project

1. **Go to Firebase Console**:
   - Visit: https://console.firebase.google.com/

2. **Create New Project**:
   - Click "Add project" or "Create a project"
   - Enter project name: `shannon-extension` (or your choice)
   - Click "Continue"

3. **Google Analytics** (Optional):
   - You can disable this for simplicity
   - Click "Continue"

4. **Wait for project creation**:
   - Takes ~30 seconds
   - Click "Continue" when done

---

## Step 2: Enable Firebase AI Logic

1. **In Firebase Console**, find your project

2. **Go to AI Logic**:
   - In left sidebar, click "AI Logic" (under "Build" section)
   - OR go to: https://console.firebase.google.com/project/YOUR_PROJECT_ID/ailogic

3. **Click "Get started"**:
   - This sets up required APIs
   - Enables Firebase AI Logic for your project

4. **Select Provider**:
   - Choose "Gemini Developer API"
   - This connects to your Gemini API key

---

## Step 3: Register Your Web App

1. **Go to Project Settings**:
   - Click gear icon ⚙️ next to "Project Overview"
   - Select "Project settings"

2. **Add Web App**:
   - Scroll down to "Your apps" section
   - Click the Web icon `</>`
   - Enter app nickname: `Shannon Extension`
   - **Don't** check "Firebase Hosting" (not needed)
   - Click "Register app"

3. **Copy Firebase Config**:
   - You'll see a config object like this:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSyB...",
     authDomain: "shannon-2b338.firebaseapp.com",
     projectId: "shannon-2b338",
     storageBucket: "shannon-2b338.firebasestorage.app",
     messagingSenderId: "318348906255",
     appId: "1:318348906255:web:f45a5912987e59215f87a"
   };
   ```
   - **Copy this entire object** - you'll need it!

4. **Click "Continue to console"**

---

## Step 4: Update Your Code

Now update the code with your real Firebase config:

### Option A: Use Environment Variables (Recommended)

1. **Create/Update `.env` file** in project root:
   ```env
   VITE_FIREBASE_API_KEY=AIzaSyB...
   VITE_FIREBASE_AUTH_DOMAIN=shannon-2b338.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=shannon-2b338
   VITE_FIREBASE_STORAGE_BUCKET=shannon-2b338.firebasestorage.app
   VITE_FIREBASE_MESSAGING_SENDER_ID=318348906255
   VITE_FIREBASE_APP_ID=1:318348906255:web:f45a5912987e59215f87a
   ```

2. **Update `firebaseBridge.ts`**:
   ```typescript
   const firebaseConfig = {
     apiKey: apiKey, // From storage
     projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
     authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
     storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
     messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
     appId: import.meta.env.VITE_FIREBASE_APP_ID,
   };
   ```

### Option B: Hardcode Values (Quick Test)

Directly update `firebaseBridge.ts`:

```typescript
const firebaseConfig = {
  apiKey: apiKey, // Still from storage
  projectId: 'shannon-2b338', // Your project ID
  authDomain: 'shannon-2b338.firebaseapp.com',
  storageBucket: 'shannon-2b338.firebasestorage.app',
  messagingSenderId: '318348906255',
  appId: '1:318348906255:web:f45a5912987e59215f87a',
};
```

---

## Step 5: Add Gemini API Key to Extension

1. **Get Gemini API Key** (if you haven't):
   - Go to: https://aistudio.google.com/app/apikey
   - Create API key
   - Copy it

2. **Add to Extension**:
   - Right-click Shannon icon → Options
   - Find "Gemini" provider
   - Paste API key
   - Click Save

---

## Step 6: Rebuild and Test

1. **Rebuild Extension**:
   ```bash
   pnpm build
   ```

2. **Reload Extension**:
   - Go to `chrome://extensions/`
   - Find Shannon
   - Click reload icon

3. **Test**:
   - Try a task
   - Check console for:
     ```
     [FirebaseBridge] Loaded API key from storage
     [FirebaseBridge] Initialized successfully
     ```

---

## What Each Config Value Does

| Field | Purpose | Example |
|-------|---------|---------|
| `apiKey` | Your Gemini API key | `AIzaSyB...` |
| `projectId` | Firebase project identifier | `shannon-2b338` |
| `authDomain` | Firebase auth domain | `shannon-2b338.firebaseapp.com` |
| `storageBucket` | Firebase storage bucket | `shannon-2b338.firebasestorage.app` |
| `messagingSenderId` | FCM sender ID | `318348906255` |
| `appId` | Firebase app identifier | `1:318348906255:web:...` |

**Important**: Even though we use `GoogleAIBackend` (which bypasses most Firebase services), the SDK still validates these config values!

---

## Troubleshooting

### "Firebase: Error (auth/invalid-api-key)"

**Problem**: API key is wrong or not enabled

**Solution**:
1. Check API key in Options page
2. Verify it's enabled in Google Cloud Console
3. Make sure it's the Gemini API key, not Firebase API key

### "Firebase: Firebase App named '[DEFAULT]' already exists"

**Problem**: Firebase initialized twice

**Solution**: Reload the extension completely

### "Project ID mismatch"

**Problem**: Using wrong Firebase config

**Solution**: Copy config again from Firebase Console → Project Settings

---

## Summary

✅ **What You Need**:
1. Firebase project created
2. Firebase AI Logic enabled
3. Web app registered in Firebase
4. Real Firebase config values
5. Gemini API key

✅ **What Gets Updated**:
1. `.env` file (or hardcoded values)
2. `firebaseBridge.ts` config
3. Extension Options (API key)

✅ **Result**:
- Nano works for simple pages
- Cloud fallback works for complex pages
- No more initialization errors!

---

## Quick Checklist

- [ ] Created Firebase project
- [ ] Enabled Firebase AI Logic
- [ ] Registered web app
- [ ] Copied Firebase config
- [ ] Updated code with real config
- [ ] Added Gemini API key to extension
- [ ] Rebuilt extension
- [ ] Tested and verified

Once all checked, you're done! 🎉
