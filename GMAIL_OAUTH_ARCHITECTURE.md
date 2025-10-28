# 🏗️ Gmail OAuth Architecture - How It Works

## Simple Version

```
YOU                    EXTENSION              GOOGLE
│                         │                      │
├─ Click "Authenticate"──→ │                      │
│                         ├─ Open Google login ──→│
│                         │                    [Google login page opens]
│                         │                      │
├─ Login with email ─────────────────────────→ │
├─ Enter password ─────────────────────────→ │
├─ Click "Allow" ──────────────────────────→ │
│                         │                      │
│                         │← Send token back ────┤
│                         ├─ Save token locally   │
│                         │                      │
├─ Ask for emails ──→ │                      │
│                         ├─ Add token to request→│
│                         │                    [Gmail API]
│                         │← Return emails ──────┤
│                         │                      │
├─ See emails ←────────── │                      │
│                         │                      │
```

---

## Detailed Technical Flow

### 1. Authentication Phase

```
EXTENSION CODE DOES:

chrome.identity.launchWebAuthFlow(
  url: "https://accounts.google.com/o/oauth2/auth?..."
)
↓
GOOGLE HANDLES:
1. Shows login page
2. User enters email + password
3. Shows permissions dialog
4. User clicks "Allow"
5. Returns authorization code
↓
EXTENSION RECEIVES:
code = "4/0AFY-rXXXXXXXXXXXXXXXXXXXXX"
```

### 2. Token Exchange Phase

```
EXTENSION SENDS:
POST https://oauth2.googleapis.com/token
{
  code: "4/0AFY-rXXXXXXXXXXXXXXXXXXXXX",
  client_id: "660247393429-0k4m3vuc8or14jvf1kja23b9m7q0dphi.apps.googleusercontent.com",
  grant_type: "authorization_code"
}
↓
GOOGLE RESPONDS:
{
  access_token: "ya29.a0AfH6SMBx2c8r...",
  refresh_token: "1//0gF2...",
  expires_in: 3599,
  token_type: "Bearer"
}
↓
EXTENSION STORES:
chrome.storage.local.set({
  gmail_auth_token: {
    accessToken: "ya29.a0AfH6SMBx2c8r...",
    refreshToken: "1//0gF2...",
    expiresAt: Date.now() + (3599 * 1000)
  }
})
```

### 3. API Request Phase

```
WHEN USER ASKS FOR EMAILS:

EXTENSION:
1. Load stored accessToken
2. Check if expired
   - If yes → Refresh token
   - If no → Use existing
3. Make request:
   GET https://gmail.googleapis.com/gmail/v1/users/me/messages?q=is:unread
   Header: "Authorization: Bearer ya29.a0AfH6SMBx2c8r..."
↓
GMAIL API:
1. Receives request + token
2. Validates token:
   - Is it a real token?
   - Is it not expired?
   - Is it for Gmail API?
3. Checks user:
   - Is it for khwahish@gmail.com?
   - Did they grant permission?
4. Checks scopes:
   - Does token have gmail.readonly scope?
↓
IF ALL VALID:
↓
GMAIL API RETURNS:
{
  messages: [
    { id: "123abc", threadId: "thread123" },
    { id: "456def", threadId: "thread456" },
    ...
  ],
  resultSizeEstimate: 12
}
↓
EXTENSION SHOWS TO USER:
"You have 12 unread emails"
```

---

## File Structure (What I Created)

```
chrome-extension/src/services/gmail/
├── types.ts ← Defines all interfaces
├── constants.ts ← API URLs, scopes, etc
├── StorageManager.ts ← Saves/loads tokens
├── OAuthManager.ts ← OAuth flow implementation
├── GmailService.ts ← Wraps Gmail API
└── index.ts ← Exports

background/
└── toolHandlers/
    └── gmailHandler.ts ← Handles TOOL_REQUEST messages

pages/side-panel/
└── hooks/
    └── useGmail.ts ← React hook for UI
```

---

## The OAuthManager (Core Logic)

```typescript
// What happens in OAuthManager.ts:

class OAuthManager {
  
  // Step 1: Start OAuth flow
  async startAuthFlow() {
    // Opens Google login popup
    // User logs in
    // User grants permission
    // Returns authorization code
  }
  
  // Step 2: Exchange code for token
  async exchangeCodeForToken(code) {
    // Sends code to Google backend
    // Google returns access token + refresh token
    // Stores tokens in chrome.storage.local
  }
  
  // Step 3: Schedule auto-refresh
  async scheduleTokenRefresh() {
    // Token expires in 1 hour?
    // Set timer for 55 minutes
    // Before expiry → auto-refresh
    // Get new token
    // Update storage
  }
  
  // Step 4: Revoke token (logout)
  async revokeToken() {
    // Remove token from storage
    // Send revoke request to Google
    // User is logged out
  }
}
```

---

## The GmailService (API Wrapper)

```typescript
// What happens in GmailService.ts:

class GmailService {
  
  // Every API call:
  async getProfile() {
    // 1. Load token from storage
    // 2. Check if expired?
    //    - If yes → refresh token
    //    - If no → use existing
    // 3. Add to request header
    // 4. Send to Gmail API
    // 5. Handle errors (401 → refresh & retry)
    // 6. Cache result for 5 minutes
    // 7. Return to user
  }
  
  // Same pattern for:
  // - getLabels()
  // - listMessages()
  // - getMessage()
  // - getThread()
  // - searchMessages()
}
```

---

## The Storage System

```
chrome.storage.local (Persistent)
├── gmail_auth_token
│   ├── accessToken: "ya29.a0AfH6SMBx2c8r..."
│   ├── refreshToken: "1//0gF2..."
│   ├── expiresAt: 1635123456789
│   └── scope: "gmail.readonly gmail.modify ..."
│
└── [Gmail cache data]
    ├── gmail_cache_profile: { data, expiresAt }
    └── gmail_cache_labels: { data, expiresAt }

chrome.storage.session (Temporary - cleared on tab close)
├── [Temporary request cache]
└── [Temporary processing state]
```

---

## Security Mechanisms

### 1. Token Expiration
```
Token issued: 10:00 AM
Token expires: 11:00 AM (1 hour)
Extension checks: 10:55 AM
Extension refreshes: Gets new token
Extension runs: 2:00 PM with new token
```

### 2. Scope Limitation
```
Token granted for:
✓ gmail.readonly - read emails
✓ gmail.modify - move emails
✓ gmail.send - send emails
✓ gmail.labels - manage labels

Token CANNOT:
✗ Access Google Drive
✗ Access Google Calendar
✗ Access personal info
✗ Delete account
```

### 3. User Revocation
```
User can revoke anytime:
https://myaccount.google.com/permissions

Extension token becomes:
INVALID immediately
All API calls fail
Extension must re-authenticate
```

### 4. Automatic Refresh
```
Before expiry:
1. Detect token expires in 5 min
2. Use refresh token
3. Get new access token
4. Update storage
5. User never knows

Seamless experience!
```

---

## Error Handling

```
When API call fails:

401 Unauthorized (token invalid/expired)
  ↓
Automatically refresh token
  ↓
Retry request with new token
  ↓
If still fails → Return error to user

Network error
  ↓
Retry up to 3 times
  ↓
Exponential backoff: 1s, 2s, 4s
  ↓
If all fail → Return error to user

Rate limit (429)
  ↓
Wait and retry
  ↓
Respect Google's quota
```

---

## Chrome Identity API (The Magic Part)

```javascript
// This line opens Google login:

chrome.identity.launchWebAuthFlow(
  {
    url: "https://accounts.google.com/o/oauth2/auth?" +
         "client_id=660247393429..." +
         "&redirect_uri=https://..." +
         "&scope=gmail.readonly%20gmail.modify..." +
         "&response_type=code",
    interactive: true
  },
  callback: (redirectUrl) => {
    // User logged in!
    // redirectUrl contains authorization code
  }
);

// Chrome handles:
✓ Opening login popup
✓ User authentication
✓ Permission dialog
✓ Capture authorization code
✓ Return to extension
```

---

## Why No API Keys Needed

### Before (API Key Method)
```
1. Developer creates API key in Google Cloud
2. Developer pastes key in form
3. Extension uses key for all requests
4. Problem: Key is hardcoded/exposed
```

### After (OAuth Method)
```
1. Developer tells extension: "Use OAuth"
2. User authenticates when needed
3. Google gives token to user's extension
4. Extension uses token (temporary, user-specific)
5. Benefit: Secure, user-controlled, auto-revocable
```

---

## Complete Request Example

```
USER REQUESTS: "Get my unread emails"
    ↓
EXTENSION BACKGROUND WORKER:
    ↓
GmailService.listMessages("is:unread")
    ↓
Check token in storage:
  - accessToken: "ya29.a0AfH6SMBx2c8r..."
  - expiresAt: 1635123456789
  - Current time: 1635123400000
  - Token valid: YES
    ↓
Make HTTP request:
  GET https://gmail.googleapis.com/gmail/v1/users/me/messages?q=is:unread
  Headers: {
    "Authorization": "Bearer ya29.a0AfH6SMBx2c8r...",
    "Content-Type": "application/json"
  }
    ↓
GMAIL API VALIDATES:
  - Check token signature: ✓ Valid
  - Check token expiry: ✓ Not expired
  - Check user: ✓ khwahish@gmail.com
  - Check permission: ✓ User allowed
  - Check scope: ✓ gmail.readonly granted
    ↓
GMAIL API RESPONDS:
  {
    "messages": [
      { "id": "123abc", "threadId": "thread1" },
      { "id": "456def", "threadId": "thread2" },
      ...
    ],
    "resultSizeEstimate": 12
  }
    ↓
EXTENSION CACHES FOR 5 MINUTES
    ↓
RETURN TO USER:
  ✅ 12 unread emails found
```

---

## Summary

```
OLD WAY (API Keys):
You → Paste secret API key → Extension uses it

NEW WAY (OAuth):
You → Click authenticate → Google login → You grant permission →
Google gives extension a time-limited token → Extension uses token

BENEFITS:
✓ No secrets to manage
✓ No passwords stored
✓ Tokens expire automatically
✓ User-controlled
✓ Industry standard
✓ Google handles security
```

---

**This is how modern web apps work!** 🎉
