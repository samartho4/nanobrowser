# UI Testing Visual Flowchart

## 📊 Complete Testing Flow

```
START HERE
    │
    ▼
┌─────────────────────────────────────┐
│  EXTENSION LOADED?                  │
│  chrome://extensions                │
│  (Should see extension enabled)     │
└─────────────────┬───────────────────┘
                  │
    NO: Reload    │ YES
    extension    │
                 ▼
         ┌──────────────────────┐
         │ OPEN SIDE PANEL      │
         │                      │
         │ Extension icon →     │
         │ "Show side panel"    │
         └─────────┬────────────┘
                   │
                   ▼
         ┌──────────────────────────────────┐
         │ SEE MULTIMODAL TESTING PANEL     │
         │                                  │
         │ [IMAGE TESTING]                  │
         │ [📁] [🔍] [🔀] [📤] [🤖]       │
         │                                  │
         │ [AUDIO TESTING]                  │
         │ [📁] [🔍] [🔀] [📤] [🤖]       │
         └─────────┬────────────────────────┘
                   │
                   ▼
         ┌──────────────────────────────────┐
         │ CHOOSE YOUR TEST PATH            │
         │                                  │
         │ [A] Quick Test (2 min)  ← Pick   │
         │ [B] Full Test (5 min)   ← Pick   │
         │ [C] Error Test (5 min)  ← Pick   │
         └──────────────────────────────────┘
         │      │              │
    QUICK  FULL         ERROR
```

---

## 🅰️ Path A: Quick Test (Verify it Works)

```
QUICK TEST FLOW
    ▼
┌─────────────────────────┐
│ 1. UPLOAD IMAGE         │
│    Click [📁]           │
│    Select: photo.jpg    │
└──────────┬──────────────┘
           ▼
┌─────────────────────────┐
│ 2. VALIDATE MIME TYPE   │
│    Click [🔍]           │
│    Takes: 10-50ms       │
└──────────┬──────────────┘
           ▼
       Is it ✅?
      /        \
    YES        NO
    │           │
    │           └─→ ❌ Error message
    │              → Try different file
    │
    ▼
┌─────────────────────────┐
│ ✅ SUCCESS              │
│ Image format verified!  │
│                         │
│ Result:                 │
│ • MIME: image/jpeg      │
│ • Size: Valid           │
│ • Status: Ready         │
└─────────────────────────┘

TIME: ~30ms
RESULT: Format verified ✓
```

---

## 🅱️ Path B: Full Test (Get AI Response)

```
FULL TEST FLOW
    ▼
┌─────────────────────────┐
│ 1. UPLOAD IMAGE         │
│    Click [📁]           │
│    Select: photo.jpg    │
└──────────┬──────────────┘
           ▼
┌─────────────────────────┐
│ 2. VALIDATE             │
│    Click [🔍]           │
│    Wait: ~30ms          │
└──────────┬──────────────┘
           ▼
       ✅ SUCCESS?
      /        \
    NO        YES
    │           │
    │           ▼
    │      ┌──────────────────────┐
    │      │ 3. CONVERT TO BASE64 │
    │      │    Click [🔀]        │
    │      │    Wait: 50-150ms    │
    │      └────────┬─────────────┘
    │              ▼
    │          ✅ SUCCESS?
    │         /        \
    │       NO        YES
    │        │          │
    │        │          ▼
    │        │     ┌────────────────────┐
    │        │     │ 4. TEST HYBRIDAI   │
    │        │     │    Click [🤖]      │
    │        │     │    Wait: 1-5sec    │
    │        │     └────────┬───────────┘
    │        │             ▼
    │        │         ✅ SUCCESS?
    │        │        /        \
    │        │      YES        NO
    │        │       │          │
    │        │       ▼          ▼
    │        │  ┌─────────┐  ❌ Error
    │        │  │ ✅ GOT  │     │
    │        │  │AI RESP  │     └─→ Check error
    │        │  │  MODE:  │         message
    │        │  │LOCAL or │
    │        │  │CLOUD    │
    │        │  └─────────┘
    │        │
    └───────→ Try different file
             or check setup

TIME: ~2-7 seconds total
RESULT: AI response received with mode ✓
```

---

## 🅲️ Path C: Error Handling Test

```
ERROR HANDLING TEST FLOW
    ▼
┌──────────────────────────┐
│ UPLOAD PROBLEM FILE      │
│ [Oversized / Wrong Type] │
│                          │
│ Options:                 │
│ • image.psd (no support) │
│ • photo.jpg (15MB big)   │
│ • broken.jpg (corrupted) │
└────────────┬─────────────┘
             ▼
┌──────────────────────────┐
│ VALIDATE MIME TYPE       │
│ Click [🔍]               │
│ Takes: 10-50ms           │
└────────────┬─────────────┘
             ▼
         ❌ ERROR!
        /           \
    Expected:    OR: No file
    "File size   "No file
     exceeds     selected"
     5MB limit"
      │            │
      ▼            ▼
  ┌─────────┐  ┌─────────┐
  │ Error   │  │ Error   │
  │ Handled │  │ Handled │
  │ ✓       │  │ ✓       │
  └─────────┘  └─────────┘

TIME: ~50ms
RESULT: Error message clear ✓
ACTION: Upload correct file, try again
```

---

## 🎨 Visual Results Display

### SUCCESS Result
```
┌────────────────────────────────────────┐
│ ✅ SUCCESS                             │
├────────────────────────────────────────┤
│                                        │
│ Processing Mode: 🖥️ LOCAL              │
│ Invocation Time: 680ms                 │
│ Response Length: 245 characters        │
│                                        │
│ Response:                              │
│ "This image shows a person working     │
│  at a desk with a computer..."         │
│                                        │
│ ────────────────────────────────────   │
│ Test History:                          │
│ └─ 14:32 LOCAL 245c 680ms ✓           │
│ └─ 14:31 CLOUD 512c 2340ms ✓          │
│ └─ 14:30 LOCAL 180c 750ms ✓           │
│                                        │
└────────────────────────────────────────┘
```

### ERROR Result
```
┌────────────────────────────────────────┐
│ ❌ ERROR                               │
├────────────────────────────────────────┤
│                                        │
│ Error Type: File Size Validation       │
│                                        │
│ Message:                               │
│ "File size exceeds 5MB limit"          │
│                                        │
│ Details:                               │
│ • Max Size: 5 MB                       │
│ • Your File: 12.5 MB                   │
│ • Exceeds By: 7.5 MB                   │
│                                        │
│ Solution:                              │
│ Use a smaller image file               │
│ (try < 2 MB for faster testing)        │
│                                        │
└────────────────────────────────────────┘
```

### UNKNOWN Mode
```
┌────────────────────────────────────────┐
│ ⚠️ UNKNOWN MODE                        │
├────────────────────────────────────────┤
│                                        │
│ Processing Mode: ❓ UNKNOWN             │
│                                        │
│ Possible Issues:                       │
│ 1. API keys not configured             │
│ 2. Chrome AI flag not enabled          │
│ 3. Network connection down             │
│                                        │
│ Try:                                   │
│ 1. Check chrome://flags                │
│ 2. Search "Chrome AI"                  │
│ 3. Enable the flag                     │
│ 4. Restart Chrome                      │
│ 5. Try again                           │
│                                        │
└────────────────────────────────────────┘
```

---

## ⏱️ Timing Indicators

```
Processing time tells you which mode:

< 200ms
  └─ Validation only (not AI)
     Status: ✅ File is valid

500-2000ms
  └─ LOCAL mode (🖥️ Device processing)
     Status: ✅ Fast response
     Note: Gemini Nano on device

1000-5000ms
  └─ CLOUD mode (☁️ Server processing)
     Status: ✅ Full AI capabilities
     Note: Firebase on server

> 5000ms
  └─ Slow network or large file
     Status: ⚠️ May be network latency
     Note: Check connection
```

---

## 🎯 Decision Tree for Troubleshooting

```
PROBLEM?
    │
    ├─→ "Nothing happens when I click button"
    │   └─→ Check: Is file selected?
    │       └─→ Click [📁] first
    │
    ├─→ "I see an error message"
    │   └─→ Read the error message
    │       ├─→ "File size exceeds..." → Use smaller file
    │       ├─→ "Format not supported" → Use supported type
    │       ├─→ "No file selected" → Click [📁] first
    │       └─→ Other → Check troubleshooting guide
    │
    ├─→ "Result shows mode: UNKNOWN"
    │   └─→ Check API setup:
    │       ├─→ For LOCAL: Enable Chrome AI flag
    │       ├─→ For CLOUD: Check API keys
    │       └─→ Restart Chrome & retry
    │
    ├─→ "It's taking too long (> 10 seconds)"
    │   └─→ Check:
    │       ├─→ Network connection (for CLOUD)
    │       ├─→ File size (< 5MB for images)
    │       └─→ Reload extension & retry
    │
    └─→ "Still not working?"
        └─→ Check troubleshooting guide
            or open console for errors
```

---

## ✅ Quick Checklist

Before testing, verify:

- [ ] Extension loaded in chrome://extensions
- [ ] Extension is enabled (toggle ON)
- [ ] You're on a normal website (not chrome://)
- [ ] Side panel button visible (right edge)
- [ ] Side panel opens when clicked
- [ ] Multimodal Testing component visible
- [ ] File upload button clickable
- [ ] Test file ready (image or audio)

✅ All checked? **You're ready to test!**

---

## 🚀 One-Button Test

Want the simplest possible test?

```
1. Have image ready
2. Click extension icon
3. Click "Show side panel"
4. Click [📁 Choose Image]
5. Select your image
6. Click [🤖 Test HybridAI]
7. Wait 1-5 seconds
8. See ✅ and AI response

If you see "✅ SUCCESS" with a response:
  🎉 IT WORKS!
```

---

**Pick a path above and get started!**

Questions? Check the detailed guides:
- Visual guide: [UI_TESTING_QUICK_REFERENCE.md](./UI_TESTING_QUICK_REFERENCE.md)
- Detailed guide: [HOW_TO_TEST_UI.md](./HOW_TO_TEST_UI.md)
