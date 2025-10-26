# How to Test Multimodal in the UI - Complete Guide

## 🎯 Quick Start (5 Minutes)

### Prerequisites
1. ✅ Extension built: `pnpm build` (already done ✓)
2. ✅ Extension loaded in Chrome
3. ✅ Any website open (e.g., google.com)

### Step-by-Step

```
1. Click extension icon in top-right toolbar
2. Select "Show side panel" (or click side panel icon)
3. You should see "Multimodal Testing" component
4. Upload image or audio file
5. Click test button
6. View results in real-time
```

---

## 🖥️ Opening the Testing UI

### Method 1: Via Extension Icon
```
1. Click extension icon in Chrome toolbar (top-right)
2. You'll see a dropdown menu
3. Click "Show side panel"
4. Side panel appears on the right
5. You should see the Multimodal Testing component
```

### Method 2: Via Side Panel
```
1. Click the side panel icon (right edge of toolbar)
2. Extension side panel opens
3. Multimodal Testing component loads
```

### Method 3: Via Keyboard Shortcut
```
1. Try Ctrl+Shift+Y (Windows/Linux)
2. Or Cmd+Shift+Y (Mac)
3. Side panel toggles open/closed
```

---

## 🧪 Test Scenarios

### Scenario 1: Validate Image MIME Type

**Setup**:
1. Open any website in Chrome
2. Click extension → Show side panel
3. You see the Multimodal Testing panel

**Test Steps**:
```
1. Click "📁 Choose Image" button
2. Select a JPEG or PNG file from your computer
   (< 5MB recommended)
3. File name appears in the input
4. Click "🔍 Validate MIME Type" button
```

**Expected Result**:
```
Status: ✅ SUCCESS (green)
Message: "MIME type validation passed"
Result Details:
  - MIME Type: image/jpeg (or image/png)
  - Category: image
  - File Size: 123.45 KB
  - Is Valid Size: true
```

**Possible Errors**:
- ❌ "File size exceeds 5MB limit" → Try smaller image
- ❌ "GIF not supported, use JPEG/PNG/WebP" → Use supported format
- ❌ "No file selected" → Click Choose button first

---

### Scenario 2: Convert Image to Base64

**Setup**: Continue from Scenario 1 (image already uploaded)

**Test Steps**:
```
1. Image file still selected from Step 1
2. Click "🔀 Base64 Convert" button
```

**Expected Result**:
```
Status: ✅ SUCCESS (green)
Message: "Base64 conversion successful"
Result Details:
  - Base64 Length: 45,628 characters
  - Encoding Time: 125ms
  - First 100 chars: data:image/jpeg;base64,/9j/4AAQSkZJRgABA...
```

**What's Happening**:
- File is being converted to Base64 format
- This Base64 will be sent to AI models
- Timing shows how long encoding took

---

### Scenario 3: Send to Background Service Worker

**Setup**: Continue from Scenario 2 (image converted)

**Test Steps**:
```
1. Image file still selected
2. Click "📤 Send to Background" button
```

**Expected Result**:
```
Status: ✅ SUCCESS (green)
Message: "Message sent to background"
Result Details:
  - Message Type: TEST_MULTIMODAL
  - Payload Size: 45.6 KB
  - Response Time: 45ms
  - Stages Completed:
    ✓ MIME Validation
    ✓ Size Validation
    ✓ Base64 Encoding
```

**What's Happening**:
- Side panel sends message to background service worker
- Background validates the file
- Results come back to UI
- All validation stages complete

---

### Scenario 4: Full HybridAI Test (Most Important!)

**Setup**:
1. Open extension side panel
2. Upload image or audio file
3. (Optional) Customize the prompt in the textarea

**Test Steps**:
```
1. Click "📁 Choose Image" (or "📁 Choose Audio")
2. Select file < size limit
3. (Optional) Edit prompt text: "What do you see?"
4. Click "🤖 Test HybridAI Client" button
5. Wait 1-5 seconds for AI response
```

**Expected Result - LOCAL Mode (Fast)**:
```
Status: ✅ SUCCESS (green)
Processing Mode: 🖥️ LOCAL (device-side Gemini Nano)
Invocation Time: 680ms
Response Length: 245 characters
Response: "This image shows a person working at a desk with..."

Test History:
└─ 2024-10-24 14:32:15 - LOCAL - 245 chars - 680ms ✓
```

**Expected Result - CLOUD Mode (Slower)**:
```
Status: ✅ SUCCESS (green)
Processing Mode: ☁️ CLOUD (Firebase AI)
Invocation Time: 2,340ms
Response Length: 512 characters
Response: "The image depicts a detailed scene of someone..."

Test History:
└─ 2024-10-24 14:33:42 - CLOUD - 512 chars - 2340ms ✓
```

**Expected Result - UNKNOWN Mode**:
```
Status: ⚠️ UNKNOWN (yellow)
Processing Mode: ❓ UNKNOWN
Message: "Neither LOCAL nor CLOUD available"
Possible Issues:
  1. API keys not configured
  2. Chrome AI flag not enabled (for LOCAL)
  3. Network connection down (for CLOUD)
```

---

## 📊 Understanding the Results

### Color-Coded Status

| Color | Meaning | Action |
|-------|---------|--------|
| 🟢 Green | Success | Look at results |
| 🔴 Red | Error | Check error message |
| 🟡 Yellow | Warning | May need to configure |
| ⚪ Gray | Processing | Wait for response |

### Processing Mode Icons

| Icon | Mode | Meaning |
|------|------|---------|
| 🖥️ LOCAL | Local | Device processing (Gemini Nano) |
| ☁️ CLOUD | Cloud | Server processing (Firebase) |
| ❓ UNKNOWN | Unknown | Neither available |

### Timing Interpretation

| Time | Meaning |
|------|---------|
| 10-50ms | Validation only (TEST_MULTIMODAL) |
| 500-2000ms | LOCAL mode (device processing) |
| 1000-5000ms | CLOUD mode (server processing) |
| 5000+ ms | Network latency or large file |

---

## 🎬 Advanced Testing

### Test with Different File Types

#### Image Testing
```
Test 1: JPEG Image
├─ Upload: photo.jpg (2MB)
├─ Click: Validate MIME Type
├─ Result: ✓ Accepted (image/jpeg)
└─ Next: Click Test HybridAI

Test 2: PNG Image
├─ Upload: screenshot.png (1.5MB)
├─ Click: Validate MIME Type
├─ Result: ✓ Accepted (image/png)
└─ Next: Click Test HybridAI

Test 3: WebP Image
├─ Upload: modern.webp (800KB)
├─ Click: Validate MIME Type
├─ Result: ✓ Accepted (image/webp)
└─ Next: Click Test HybridAI
```

#### Audio Testing
```
Test 1: MP3 Audio
├─ Upload: song.mp3 (5MB)
├─ Click: Validate MIME Type
├─ Result: ✓ Accepted (audio/mpeg)
└─ Next: Click Test HybridAI

Test 2: WAV Audio
├─ Upload: recording.wav (8MB)
├─ Click: Validate MIME Type
├─ Result: ✓ Accepted (audio/wav)
└─ Next: Click Test HybridAI

Test 3: OGG Audio
├─ Upload: podcast.ogg (6MB)
├─ Click: Validate MIME Type
├─ Result: ✓ Accepted (audio/ogg)
└─ Next: Click Test HybridAI
```

### Error Testing

```
Test: Oversized File
├─ Upload: huge_image.jpg (10MB)
├─ Click: Validate MIME Type
├─ Result: ❌ File size exceeds 5MB limit
└─ Expected: Clear error message

Test: Unsupported Format
├─ Upload: document.pdf or image.psd
├─ Click: Validate MIME Type
├─ Result: ❌ PDF not supported, use JPEG/PNG/WebP
└─ Expected: Format suggestion

Test: No File Selected
├─ Don't upload anything
├─ Click: Validate MIME Type
├─ Result: ❌ No file selected
└─ Expected: User-friendly message
```

### Performance Testing

```
Test: Measure Encoding Speed
├─ Upload: image_1mb.jpg
├─ Click: Base64 Convert
├─ Note: Encoding time shown
├─ Typical: 50-150ms for 1MB image
└─ Note timing for reference

Test: Measure AI Response Time
├─ Upload: image.jpg
├─ Click: Test HybridAI
├─ Note: Invocation time shown
├─ LOCAL: 500-2000ms (device)
├─ CLOUD: 1000-5000ms (server)
└─ Compare to expected ranges
```

---

## 📋 Test Checklist

### Basic Functionality
- [ ] Side panel opens without errors
- [ ] File upload button works
- [ ] Can select image file
- [ ] Can select audio file
- [ ] Test buttons visible
- [ ] Results display properly

### Validation Testing
- [ ] JPEG validation passes
- [ ] PNG validation passes
- [ ] WebP validation passes
- [ ] MP3 validation passes
- [ ] WAV validation passes
- [ ] OGG validation passes

### Error Handling
- [ ] Oversized image rejected (> 5MB)
- [ ] Oversized audio rejected (> 10MB)
- [ ] Unsupported format rejected
- [ ] Error messages are clear
- [ ] No crashes on errors

### LLM Integration
- [ ] Image processed by HybridAI
- [ ] Audio processed by HybridAI
- [ ] Response displays properly
- [ ] Mode detected (LOCAL/CLOUD)
- [ ] Timing metrics shown
- [ ] Test history tracked

### UI/UX
- [ ] Colors match: green=success, red=error
- [ ] Status indicators update in real-time
- [ ] Results formatted nicely (JSON preview)
- [ ] No console errors
- [ ] No UI freezing
- [ ] Test history list works

---

## 🔧 Troubleshooting While Testing

### Issue: Side Panel Won't Open

**Solution**:
1. Reload extension: `chrome://extensions` → Find extension → Reload
2. Check service worker: `chrome://extensions` → Details → Service Worker
3. Look for errors in console
4. Try visiting a new website first

### Issue: File Upload Button Doesn't Work

**Solution**:
1. Check browser console (F12 → Console)
2. Look for "File input error" messages
3. Try refreshing side panel (reload extension)
4. Verify file is valid format

### Issue: Test Button Does Nothing

**Solution**:
1. Right-click side panel → Inspect
2. Check Console tab for errors
3. Check if file is still selected
4. Try smaller file (< 1MB)
5. Check background service worker logs

### Issue: Results Show Errors

**Common Errors & Fixes**:

```
Error: "File size exceeds 5MB limit"
Fix: Use smaller image (< 5MB)

Error: "GIF not supported"
Fix: Convert GIF to PNG or JPEG

Error: "FLAC not supported"
Fix: Use MP3, WAV, or OGG format

Error: "No file selected"
Fix: Click file upload button first

Error: "HybridAIClient not initialized"
Fix: Wait 2-3 seconds and retry (loading)

Error: "Network error"
Fix: Check internet connection (CLOUD mode)
```

### Issue: Mode Shows "UNKNOWN"

**Troubleshooting**:
1. **LOCAL mode not available?**
   - Check: `chrome://flags` → Search "Chrome AI"
   - Enable: "Chrome AI API" flag
   - Restart Chrome
   - Try again

2. **CLOUD mode not available?**
   - Check: Internet connection
   - Check: API keys configured
   - Check: Firebase setup
   - Review: Background service worker logs

3. **Both unavailable?**
   - Check: Extension permissions
   - Check: API keys in .env
   - Check: Firebase credentials
   - Review: Getting Started guide

---

## 📸 What You'll See

### Initial State
```
┌─────────────────────────────────────────────┐
│  Multimodal Testing                         │
├─────────────────────────────────────────────┤
│                                             │
│  IMAGE TESTING                              │
│  [📁 Choose Image]      (no file selected)  │
│  [🔍] [🔀] [📤] [🤖]    (buttons disabled)  │
│                                             │
│  AUDIO TESTING                              │
│  [📁 Choose Audio]      (no file selected)  │
│  [🔍] [🔀] [📤] [🤖]    (buttons disabled)  │
│                                             │
│  Custom Prompt:                             │
│  [Analyze this file]                        │
│                                             │
└─────────────────────────────────────────────┘
```

### After File Selection
```
┌─────────────────────────────────────────────┐
│  Multimodal Testing                         │
├─────────────────────────────────────────────┤
│                                             │
│  IMAGE TESTING                              │
│  [📁 photo.jpg]                             │
│  [🔍 VALIDATE] [🔀] [📤] [🤖]  (enabled)   │
│                                             │
└─────────────────────────────────────────────┘
```

### After Test Result
```
┌─────────────────────────────────────────────┐
│  Multimodal Testing                         │
├─────────────────────────────────────────────┤
│  ✅ SUCCESS                                 │
│                                             │
│  Processing Mode: 🖥️ LOCAL                 │
│  Invocation Time: 680ms                     │
│  Response Length: 245 chars                 │
│                                             │
│  Response:                                  │
│  "This image shows a person at a desk..."   │
│                                             │
│  Test History:                              │
│  └─ 14:32 LOCAL 245c 680ms ✓               │
│  └─ 14:31 CLOUD 512c 2340ms ✓              │
│                                             │
└─────────────────────────────────────────────┘
```

---

## ✅ Success Criteria

You'll know it's working when:

1. ✅ **File Upload Works**
   - Click "Choose Image" → Select file → Name appears

2. ✅ **Validation Works**
   - Click validate → See "Success" status (green)

3. ✅ **Base64 Converts**
   - Click convert → See timing and Base64 length

4. ✅ **Background Receives Message**
   - Click "Send to Background" → See response

5. ✅ **HybridAI Responds**
   - Click "Test HybridAI" → Get AI response within 5 seconds

6. ✅ **Mode Detected**
   - Response shows either "LOCAL" or "CLOUD"

7. ✅ **History Tracked**
   - Multiple tests appear in history list

---

## 🎓 Learning Path

If results confuse you:

1. **"What's MIME type validation?"**
   → See [TESTING_GUIDE.md - Validation Pipeline](./TESTING_GUIDE.md)

2. **"Why is it LOCAL vs CLOUD?"**
   → See [MULTIMODAL_ARCHITECTURE.md - Hybrid Routing](../MULTIMODAL_ARCHITECTURE.md)

3. **"How do messages work?"**
   → See [TESTING_GUIDE.md - Message Flow](./TESTING_GUIDE.md)

4. **"Why is it taking so long?"**
   → See [QUICK_REFERENCE.md - Performance Tips](../../QUICK_REFERENCE.md)

---

## 📞 Still Stuck?

1. Check [QUICK_REFERENCE.md - Common Issues](../../QUICK_REFERENCE.md)
2. Review [TESTING_GUIDE.md - Troubleshooting](./TESTING_GUIDE.md)
3. Check background console: `chrome://extensions` → Details → Service Worker
4. Try with different file
5. Reload extension and retry

---

**You're ready to test! Pick a file and click a button. 🚀**
