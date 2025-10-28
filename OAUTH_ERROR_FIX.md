# ✅ Fixed: OAuth Client ID Error

## 🎯 The Problem

When loading the extension, you saw:
```
Error
Invalid value for 'oauth2.client_id'.
Could not load manifest.
```

## 🔧 What Was Wrong

1. **manifest.js** was reading `process.env.VITE_GMAIL_CLIENT_ID`
2. But environment variables weren't being loaded at **build time**
3. The manifest was generated with an **empty client ID**

## ✅ Solution Applied

### 1. Updated `manifest.js` to load `.env` directly:
```javascript
import dotenv from 'dotenv';

// Load .env file from parent directory
const envPath = resolve(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envConfig = dotenv.parse(fs.readFileSync(envPath));
  Object.assign(process.env, envConfig);
}
```

### 2. Updated `vite.config.mts` to pass env to build:
```typescript
define: {
  'import.meta.env.VITE_GMAIL_CLIENT_ID': JSON.stringify(env.VITE_GMAIL_CLIENT_ID || ''),
}
```

### 3. Installed `dotenv` package:
```bash
pnpm add -w dotenv
```

## ✅ Verification

The dist/manifest.json now contains:
```json
"oauth2": {
  "client_id": "660247393429-0k4m3vuc8or14jvf1kja23b9m7q0dphi.apps.googleusercontent.com",
  "scopes": [...]
}
```

## 🚀 Next Steps

1. **Reload the extension in Chrome:**
   - Go to `chrome://extensions`
   - Find Shannon extension
   - Click the **reload** icon (circular arrow)

2. **Verify it loads without error:**
   - Should no longer see "Invalid value for 'oauth2.client_id'" error
   - Extension should show as "Enabled"

3. **Test Gmail integration:**
   - Open extension side panel
   - Go to Settings → Tools
   - Click "Configure Gmail"
   - You should see OAuth popup

## 📋 Files Changed

1. ✅ `chrome-extension/manifest.js` - Added dotenv loading
2. ✅ `chrome-extension/vite.config.mts` - Added VITE_GMAIL_CLIENT_ID to define
3. ✅ `package.json` - Added dotenv dependency
4. ✅ `dist/manifest.json` - Now contains correct client_id (rebuilt)

## 💡 How It Works Now

**Build Time Flow:**
```
1. pnpm build runs
2. vite.config.mts loads .env using Vite's loadEnv()
3. manifest.js imports and reads .env using dotenv.parse()
4. process.env.VITE_GMAIL_CLIENT_ID is set
5. manifest.js generates oauth2.client_id with actual value
6. dist/manifest.json written with correct oauth2 config
7. Chrome can now validate and load extension
```

## 🐛 If Still Having Issues

1. **Make sure .env has the correct format:**
   ```
   VITE_GMAIL_CLIENT_ID=XXX.apps.googleusercontent.com
   ```

2. **Verify Google OAuth Client ID:**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - APIs & Services → Credentials
   - OAuth 2.0 Client ID should show your app

3. **Rebuild and reload:**
   ```bash
   pnpm build
   # Then in chrome://extensions, click reload button for Shannon
   ```

4. **Check Developer Console:**
   - `chrome://extensions` → Shannon → "Inspect views" → background page
   - Look for any errors related to OAuth

---

**✅ Extension should now load without manifest errors!** 🎉
