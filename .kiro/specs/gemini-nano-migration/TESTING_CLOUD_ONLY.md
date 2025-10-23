# Testing Cloud-Only Mode

## ✅ What We Did

Temporarily disabled Nano to test Firebase cloud fallback.

### Code Change

In `HybridAIClient.ts`, we:
- Commented out Nano logic
- Force all requests to go to cloud
- Added console log to confirm testing mode

---

## 🧪 How to Test

### 1. Reload Extension
```
chrome://extensions/ → Reload Shannon
```

### 2. Try a Task

Open Shannon and try any task (simple or complex)

### 3. Check Console Logs

Click "service worker" link and look for:

```
[HybridAIClient] TESTING MODE: Skipping Nano, using cloud only
[FirebaseBridge] Loaded API key from storage
[FirebaseBridge] Initialized successfully
[FirebaseBridge] Generating non-streaming content
```

### 4. Verify It Works

- ✅ Task completes successfully
- ✅ No Nano errors
- ✅ All requests use cloud
- ✅ Firebase config is working

---

## 🔄 To Re-Enable Nano Later

When you want to restore Nano:

1. **Open `HybridAIClient.ts`**

2. **Uncomment the original code**:
   ```typescript
   async invoke(options: InvokeOptions): Promise<InvokeResponse> {
     // Try Nano first if available
     if (this.nanoModel && (this.availability === 'available' || this.availability === 'readily')) {
       try {
         const result = await this.invokeNano(options);
         return { content: result, provider: 'nano' };
       } catch (error) {
         console.warn('[HybridAIClient] Nano failed, falling back to cloud:', error);
         this.lastError = error instanceof Error ? error.message : String(error);
       }
     }

     // Fallback to side panel bridge
     return await this.invokeBridge(options);
   }
   ```

3. **Remove the testing code**:
   ```typescript
   // DELETE THESE LINES:
   console.log('[HybridAIClient] TESTING MODE: Skipping Nano, using cloud only');
   return await this.invokeBridge(options);
   ```

4. **Rebuild**: `pnpm build`

5. **Reload extension**

---

## 📊 What to Look For

### Success Indicators:
- ✅ `[HybridAIClient] TESTING MODE: Skipping Nano, using cloud only`
- ✅ `[FirebaseBridge] Initialized successfully`
- ✅ Tasks complete without errors
- ✅ No "API key not configured" errors

### Failure Indicators:
- ❌ `[FirebaseBridge] Initialization failed`
- ❌ `Gemini API key not configured`
- ❌ `Firebase: Error (auth/invalid-api-key)`
- ❌ Tasks fail with cloud errors

---

## 🐛 If Cloud Fails

### Check These:

1. **API Key Added?**
   - Options → Gemini provider → API key saved?

2. **Firebase Config Correct?**
   - Check `firebaseBridge.ts` has real values (not dummy)

3. **Firebase AI Logic Enabled?**
   - Firebase Console → AI Logic → "Get started" clicked?

4. **Console Errors?**
   - Check for specific error messages
   - Share them for debugging

---

## 💡 Why This Is Useful

Testing cloud-only helps you:
1. **Verify Firebase setup** - Confirms config is correct
2. **Test API key** - Ensures key works
3. **Isolate issues** - Separates Nano problems from cloud problems
4. **Validate fallback** - Confirms cloud works when Nano can't

Once cloud works, you can re-enable Nano for the hybrid approach!

---

## 🎯 Current Status

- ✅ Nano: Disabled (for testing)
- ✅ Cloud: Active (Firebase + Gemini API)
- ✅ Build: Successful
- ⏳ Testing: Ready to test!

**Next**: Reload extension and try a task!
