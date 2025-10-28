# 📍 Exact Location: Where to Add Redirect URIs

## 🎯 What I See in Your Screenshot

You're on the right page! This is the **"Client ID for Chrome extension"** page.

---

## 🔍 Where to Scroll Down

Your screenshot shows:
- ✅ Name: "Chrome client 1"
- ✅ Item ID: "hefeiamhgpjjknelibmhkbocmophali"
- ✅ Client ID: "660247393429-0k4m3vuc8or14jvf1kja23b9m7q0dphi.apps.googleusercontent.com"

**BUT** you need to scroll DOWN to find the redirect URIs section!

---

## 📜 Scroll Down Steps

1. **Stay on this page** (you're already on the right page!)
2. **Scroll down** to find the section that says:
   - "Authorized redirect URIs" OR
   - "Redirect URIs" OR
   - "Authorized JavaScript origins"

3. This section should be **below** the "Verify app ownership" section

---

## ✅ What You Should See After Scrolling

After scrolling down, you should see a box like this:

```
┌─────────────────────────────────────────┐
│ Authorized redirect URIs                │
│ (You may add up to 100)                 │
│                                         │
│ ☐ Empty (no URIs added yet)            │
│                                         │
│ [ + ADD URI ] button                    │
│                                         │
│ [ SAVE ] [ CANCEL ] buttons             │
└─────────────────────────────────────────┘
```

---

## 🎬 What to Do When You See It

### Step 1: Click the "+ ADD URI" Button
- A text field will appear

### Step 2: Paste First URI
```
urn:ietf:wg:oauth:2.0:oob
```

### Step 3: Click "+ ADD URI" Again
- Another text field will appear

### Step 4: Paste Second URI
```
https://hefeiamhgpjjknelibmhkbocmophali.chromiumapp.org/
```

**Note:** The extension ID in my example is `hefeiamhgpjjknelibmhkbocmophali` (from your Item ID)

### Step 5: Click SAVE Button
- Settings saved! ✅

---

## 🖼️ Visual Guide

### Current View (from your screenshot):
```
┌─────────────────────────┐
│ Name: Chrome client 1    │  ← You're here
│ Item ID: hefei...       │
│ Client ID: 660247...    │
└─────────────────────────┘
         ↓ SCROLL DOWN
┌─────────────────────────┐
│ Verify app ownership    │  ← Scroll past this
│ (optional)              │
│ [Verify ownership] btn  │
└─────────────────────────┘
         ↓ SCROLL MORE
┌─────────────────────────┐
│ Authorized redirect     │  ← You want this!
│ URIs                    │
│                         │
│ [+ ADD URI] button      │
│ [+ ADD URI] button      │
│                         │
│ [SAVE] [CANCEL]        │
└─────────────────────────┘
```

---

## 📌 Your Extension ID

From your screenshot, I can see:
```
Item ID: hefeiamhgpjjknelibmhkbocmophali
```

**This is your extension ID!**

So your second redirect URI should be:
```
https://hefeiamhgpjjknelibmhkbocmophali.chromiumapp.org/
```

---

## ✨ Complete Instructions for Your Setup

### What to Add:

**First URI:**
```
urn:ietf:wg:oauth:2.0:oob
```

**Second URI:**
```
https://hefeiamhgpjjknelibmhkbocmophali.chromiumapp.org/
```

---

## 🔴 Important: This is Different from JavaScript Origins

You might also see:
- "Authorized JavaScript origins" - **DON'T add to this**
- "Authorized redirect URIs" - **Add to THIS one** ✅

They are different sections!

---

## 💡 If You Still Can't Find It

The redirect URIs section might be:

### Option 1: You're Not Scrolled Down Enough
- Keep scrolling down the page
- It's below "Verify app ownership"

### Option 2: It Might Be Collapsed
- Look for a dropdown arrow or "Show" link
- Click it to expand

### Option 3: Different Tab/Section
- Make sure you're in the "Clients" section (you are ✅)
- Make sure you're editing the Chrome extension client (you are ✅)

---

## 🎯 TL;DR

1. **Scroll down** on your current page
2. Find **"Authorized redirect URIs"** section
3. Click **"+ ADD URI"**
4. Paste: `urn:ietf:wg:oauth:2.0:oob`
5. Click **"+ ADD URI"** again
6. Paste: `https://hefeiamhgpjjknelibmhkbocmophali.chromiumapp.org/`
7. Click **SAVE**
8. Done! ✅

---

## 📸 Send Me a Screenshot

If you still can't find it after scrolling:
1. **Scroll down** to the bottom of the page
2. **Take a screenshot**
3. **Share it** and I'll point you to the exact location!

