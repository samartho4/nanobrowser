# Technical Architecture Diagram: PageCapture System

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         SHANNON EXTENSION                                │
│                                                                           │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    SIDE PANEL (React UI)                         │   │
│  │                                                                   │   │
│  │  ┌───────────────────────────────────────────────────────────┐  │   │
│  │  │           SidePanel.tsx (Main Container)                 │  │   │
│  │  │                                                           │  │   │
│  │  │  🧪 Header Button (Purple when active)                  │  │   │
│  │  │     └─→ Toggles showMultimodalTest state               │  │   │
│  │  │                                                           │  │   │
│  │  │  ┌─────────────────────────────────────────────────────┐ │  │   │
│  │  │  │       PageCaptureTest Component (NEW!)             │ │  │   │
│  │  │  │                                                     │ │  │   │
│  │  │  │  ┌──────────────────────────────────────────────┐  │ │  │   │
│  │  │  │  │ 1. CAPTURE SECTION                           │  │ │  │   │
│  │  │  │  │ ├─ Button: "Capture Current Page"           │  │ │  │   │
│  │  │  │  │ ├─ Status: (🔄/✅/❌) with message          │  │ │  │   │
│  │  │  │  │ └─ Help: "How it works: Captures webpage..." │  │ │  │   │
│  │  │  │  └──────────────────────────────────────────────┘  │ │  │   │
│  │  │  │                                                     │ │  │   │
│  │  │  │  ┌──────────────────────────────────────────────┐  │ │  │   │
│  │  │  │  │ 2. CONTENT DISPLAY                           │  │ │  │   │
│  │  │  │  │ └─ Read-only textarea: Extracted content     │  │ │  │   │
│  │  │  │  │    (~500+ lines with metadata, structure)    │  │ │  │   │
│  │  │  │  └──────────────────────────────────────────────┘  │ │  │   │
│  │  │  │                                                     │ │  │   │
│  │  │  │  ┌──────────────────────────────────────────────┐  │ │  │   │
│  │  │  │  │ 3. VOICE + PROMPT SECTION (NEW!)            │  │ │  │   │
│  │  │  │  │                                              │  │ │  │   │
│  │  │  │  │ Voice Buttons (Right-aligned):              │  │ │  │   │
│  │  │  │  │ ├─ 🎙️ "Speak to Type" (purple-pink)       │  │ │  │   │
│  │  │  │  │ ├─ 🔄 "Continuous" (indigo-purple)        │  │ │  │   │
│  │  │  │  │ ├─ ⏹ "Stop Listening" (red, pulsing)      │  │ │  │   │
│  │  │  │  │ └─ ❌ "Speech not supported" (fallback)    │  │ │  │   │
│  │  │  │  │                                              │  │ │  │   │
│  │  │  │  │ Interim Transcript Box:                      │  │ │  │   │
│  │  │  │  │ └─ "Speaking: What is the price of..." 🎤  │  │ │  │   │
│  │  │  │  │                                              │  │ │  │   │
│  │  │  │  │ Input Field:                                 │  │ │  │   │
│  │  │  │  │ └─ Text area for prompt (voice + manual)    │  │ │  │   │
│  │  │  │  │                                              │  │ │  │   │
│  │  │  │  │ Submit Button:                               │  │ │  │   │
│  │  │  │  │ └─ 🤖 "Get AI Answer" (blue gradient)      │  │ │  │   │
│  │  │  │  └──────────────────────────────────────────────┘  │ │  │   │
│  │  │  │                                                     │ │  │   │
│  │  │  │  ┌──────────────────────────────────────────────┐  │ │  │   │
│  │  │  │  │ 4. RESPONSE DISPLAY                          │  │ │  │   │
│  │  │  │  │ ├─ AI Response (blue box)                    │  │ │  │   │
│  │  │  │  │ └─ Error Message (red box)                   │  │ │  │   │
│  │  │  │  └──────────────────────────────────────────────┘  │ │  │   │
│  │  │  │                                                     │ │  │   │
│  │  │  │ STATE MANAGEMENT:                                   │ │  │   │
│  │  │  │ ├─ captureStatus: 'idle'|'capturing'|'success'|... │ │  │   │
│  │  │  │ ├─ capturedContent: string (formatted DOM)         │ │  │   │
│  │  │  │ ├─ prompt: string (user question)                  │ │  │   │
│  │  │  │ ├─ aiResponse: string (AI answer)                  │ │  │   │
│  │  │  │ ├─ isListening: boolean (speech recognition)       │ │  │   │
│  │  │  │ ├─ interimTranscript: string (live transcription)  │ │  │   │
│  │  │  │ └─ recognitionRef: SpeechRecognition instance      │ │  │   │
│  │  │  │                                                     │ │  │   │
│  │  │  └─────────────────────────────────────────────────────┘ │  │   │
│  │  └───────────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │              BACKGROUND SERVICE WORKER                          │   │
│  │                                                                   │   │
│  │  Message Listener (onMessage):                                   │   │
│  │  ├─ 'get_ai_status'        → get HybridAIClient status         │   │
│  │  ├─ 'CAPTURE_CURRENT_PAGE' → handleDOMCaptureMessage()         │   │
│  │  └─ 'TEST_MULTIMODAL'      → handleTestMultimodal()            │   │
│  │                                                                   │   │
│  │  ┌────────────────────────────────────────────────────────────┐ │   │
│  │  │ DOM Capture Handler                                         │ │   │
│  │  │ (dom-capture-handler.ts)                                   │ │   │
│  │  │                                                             │ │   │
│  │  │ captureCurrentPage():                                      │ │   │
│  │  │ 1. Get active tab via chrome.tabs.query()                │ │   │
│  │  │ 2. Validate: HTTP/HTTPS only                             │ │   │
│  │  │ 3. Inject content script:                                │ │   │
│  │  │    ├─ Check if exists (PING)                            │ │   │
│  │  │    ├─ Try chrome.scripting.executeScript()              │ │   │
│  │  │    └─ Fallback: chrome.tabs.executeScript()            │ │   │
│  │  │ 4. Send EXTRACT_PAGE_CONTENT message                    │ │   │
│  │  │ 5. Return formatted response                             │ │   │
│  │  └────────────────────────────────────────────────────────────┘ │   │
│  │                                                                   │   │
│  │  ┌────────────────────────────────────────────────────────────┐ │   │
│  │  │ Multimodal Test Handler                                    │ │   │
│  │  │ (multimodal-test-handler.ts)                              │ │   │
│  │  │                                                             │ │   │
│  │  │ handleTestMultimodal(payload, hybridAIClient):            │ │   │
│  │  │ 1. Decode base64 content                                 │ │   │
│  │  │ 2. If HybridAIClient available:                          │ │   │
│  │  │    └─ Call invoke({ prompt: question + content })       │ │   │
│  │  │ 3. Return AI response or fallback test response         │ │   │
│  │  │ 4. Include metadata: provider, timestamp                │ │   │
│  │  └────────────────────────────────────────────────────────────┘ │   │
│  │                                                                   │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                    CONTENT SCRIPT (Injected into Page)                  │
│                                                                           │
│  /pages/content/src/index.ts (220 lines)                                │
│                                                                           │
│  onMessage Listener:                                                     │
│  ├─ 'PING_CONTENT_SCRIPT' → Responds { success: true }                 │
│  └─ 'EXTRACT_PAGE_CONTENT' → Calls extractPageContent()                │
│                                                                           │
│  Core Functions:                                                         │
│  │                                                                       │
│  ├─ classifyPageType()                                                  │
│  │  ├─ URL matching: amazon.com → 'product'                            │
│  │  ├─ URL matching: twitter.com → 'social'                            │
│  │  ├─ Content analysis: "purchase" → 'ecommerce'                      │
│  │  └─ Default: 'generic'                                              │
│  │                                                                       │
│  ├─ extractMainText(maxLength: 12000)                                  │
│  │  ├─ Query selectors: <article> → <main> → [role="main"] → body    │
│  │  ├─ Clone DOM (avoid affecting rendering)                           │
│  │  ├─ Remove scripts, styles, noscripts                              │
│  │  ├─ Clean whitespace and normalize                                  │
│  │  └─ Truncate to maxLength if needed                                │
│  │                                                                       │
│  ├─ extractHeadings()                                                   │
│  │  ├─ Query: h1, h2, h3, h4, h5, h6                                  │
│  │  ├─ Extract text and heading level                                  │
│  │  └─ Return: { level: 1-6, text: string }[]                         │
│  │                                                                       │
│  ├─ extractLinks()                                                      │
│  │  ├─ Query: a[href]                                                  │
│  │  ├─ Resolve relative → absolute URLs                               │
│  │  ├─ Extract link text                                              │
│  │  └─ Limit to 50 most relevant                                      │
│  │                                                                       │
│  ├─ extractInteractive()                                               │
│  │  ├─ Extract buttons: <button>, [role="button"]                     │
│  │  ├─ Extract forms: <form>, [role="form"]                           │
│  │  ├─ Deduplicate and dedup form fields                              │
│  │  └─ Limit: 20 buttons, 10 forms                                    │
│  │                                                                       │
│  └─ extractPageContent(options)                                        │
│     ├─ Measure performance: performance.now()                          │
│     ├─ Return structured ExtractedContent:                             │
│     │  ├─ metadata: { title, url, pageType, domain }                  │
│     │  ├─ content: { mainText, headings[], links[] }                  │
│     │  ├─ interactive: { buttons[], forms[] }                         │
│     │  └─ performance: { textLength, elementCount, extractionTime }   │
│     └─ Send response back via chrome.runtime.sendMessage()            │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                     MESSAGE FLOW DIAGRAM                                 │
│                                                                           │
│  SCENARIO 1: Page Capture                                               │
│  ════════════════════════════════════════════════════════════════════   │
│                                                                           │
│  1. User clicks "Capture Current Page"                                  │
│     ↓                                                                     │
│  2. PageCaptureTest sends:                                              │
│     chrome.runtime.sendMessage({                                         │
│       type: 'CAPTURE_CURRENT_PAGE',                                     │
│       options: { includeInteractive: true, maxTextLength: 12000 }      │
│     })                                                                   │
│     ↓                                                                     │
│  3. Background receives, routes to handleDOMCaptureMessage()           │
│     ↓                                                                     │
│  4. Handler queries active tab: chrome.tabs.query({active: true})     │
│     ↓                                                                     │
│  5. Validates URL: starts with 'http' ✓                                 │
│     ↓                                                                     │
│  6. Injects content script: chrome.scripting.executeScript(...)       │
│     ↓                                                                     │
│  7. Sends extraction request to tab:                                    │
│     chrome.tabs.sendMessage({                                           │
│       type: 'EXTRACT_PAGE_CONTENT',                                     │
│       options: { includeInteractive: true, maxTextLength: 12000 }      │
│     })                                                                   │
│     ↓                                                                     │
│  8. Content script (in page context) receives message                   │
│     ↓                                                                     │
│  9. Extracts page content and returns:                                  │
│     {                                                                    │
│       success: true,                                                    │
│       content: ExtractedContent                                         │
│     }                                                                    │
│     ↓                                                                    │
│  10. Background receives and formats response                           │
│      ↓                                                                    │
│  11. Returns to PageCaptureTest:                                        │
│      {                                                                    │
│        success: true,                                                   │
│        content: { metadata, content, interactive, performance }        │
│      }                                                                    │
│      ↓                                                                    │
│  12. Component formats and displays in textarea                         │
│                                                                           │
│  ─────────────────────────────────────────────────────────────────────   │
│  SCENARIO 2: Voice Input + AI Analysis                                  │
│  ═════════════════════════════════════════════════════════════════════   │
│                                                                           │
│  1. User clicks 🎙️ "Speak to Type"                                     │
│     ↓                                                                     │
│  2. Browser SpeechRecognition starts (Web Speech API)                  │
│     ↓                                                                     │
│  3. User speaks: "What is the price?"                                   │
│     ↓                                                                     │
│  4. Real-time interim results shown in purple box                      │
│     ↓                                                                     │
│  5. User pauses, speech ends                                            │
│     ↓                                                                     │
│  6. Final transcript added to prompt field                              │
│     ↓                                                                     │
│  7. User clicks 🤖 "Get AI Answer"                                      │
│     ↓                                                                     │
│  8. PageCaptureTest encodes content:                                    │
│     base64 = btoa(unescape(encodeURIComponent(capturedContent)))       │
│     ↓                                                                     │
│  9. Sends chrome.runtime.sendMessage:                                   │
│     {                                                                    │
│       type: 'TEST_MULTIMODAL',                                          │
│       payload: {                                                         │
│         fileType: 'text',                                               │
│         mimeType: 'text/plain',                                         │
│         base64: ENCODED_CONTENT,                                        │
│         prompt: 'Based on... What is the price?',                      │
│         fileName: 'page_capture.txt'                                    │
│       }                                                                  │
│     }                                                                    │
│     ↓                                                                    │
│  10. Background routes to handleTestMultimodal()                       │
│      ↓                                                                    │
│  11. Handler decodes: content = atob(payload.base64)                   │
│      ↓                                                                    │
│  12. Invokes HybridAIClient:                                            │
│      response = await hybridAIClient.invoke({                           │
│        prompt: 'User question\n\n---\n\nContent:\n' + content          │
│      })                                                                  │
│      ↓                                                                    │
│  13. HybridAIClient (cloud AI) analyzes and returns:                   │
│      { content: 'The Alienware Aurora...', provider: 'cloud' }        │
│      ↓                                                                    │
│  14. Handler returns response to PageCaptureTest                        │
│      ↓                                                                    │
│  15. Component displays AI response in blue box:                        │
│      "The Alienware Aurora gaming desktop costs $1,499..."            │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Data Structure Reference

### ExtractedContent (Content Script Output)
```typescript
{
  metadata: {
    title: "Amazon.ca",
    url: "https://amazon.ca/?tag=...",
    pageType: "ecommerce",
    domain: "amazon.ca"
  },
  content: {
    mainText: "Shop millions of products. Free shipping on orders over $35...",
    headings: [
      { level: 1, text: "Welcome to Amazon" },
      { level: 2, text: "Today's Deals" },
      { level: 2, text: "New Arrivals" }
    ],
    links: [
      { text: "Home", url: "https://amazon.ca/" },
      { text: "Cart", url: "https://amazon.ca/gp/cart" }
    ]
  },
  interactive: {
    buttons: ["Search", "Add to Cart", "Buy Now", "View More"],
    forms: ["Form 1: Search input"]
  },
  performance: {
    textLength: 8234,
    elementCount: 1247,
    extractionTime: 45
  }
}
```

### TestMultimodalPayload (PageCaptureTest → Background)
```typescript
{
  fileType: "text",
  mimeType: "text/plain",
  base64: "QWzYXpvbiBDYS4gU2hvcCBtaWxsaW9ucyBvZiBwcm9kdWN0cy4uLg==",
  prompt: "Based on the webpage content below, please answer: What is the price School Alienware Aurora gaming desktop",
  fileName: "page_capture.txt"
}
```

### TestMultimodalResponse (Background → PageCaptureTest)
```typescript
{
  ok: true,
  text: "The Alienware Aurora gaming desktop shown on this page is priced at $1,499.99. It features an Intel Core i7 processor, RTX 4060 Ti graphics...",
  data: {
    answer: "The Alienware Aurora gaming desktop shown on this page is priced at $1,499.99...",
    provider: "cloud",
    timestamp: 1729999999999
  }
}
```

---

## Performance Metrics

| Component | Size | Lines | Extraction Time |
|-----------|------|-------|-----------------|
| Content Script | 3.67 kB | 220 | 40-100ms |
| DOM Handler | - | 150 | 50-200ms |
| Multimodal Handler | - | 165 | 100-5000ms (AI) |
| PageCaptureTest | - | 180 (voice) | - |
| Total Build | 1,142.99 kB | 960+ | 2.9-3.3s |

---

## Error Handling Flowchart

```
User Action
    ↓
┌───────────────────┐
│ Try Operation     │
└───────┬───────────┘
        ↓
    ┌───────────┐
    │ Success? │
    └─┬─────────┘
      │
      ├─ YES → Return Success Response
      │
      └─ NO →  Check Error Type
               ├─ "No active tab" → Message: "No active tab found"
               ├─ "Not HTTP/HTTPS" → Message: "Only HTTP/HTTPS supported"
               ├─ "Injection failed" → Message: "Failed to inject content script"
               ├─ "Communication failed" → Message: "Failed to communicate with page"
               ├─ "Invalid character" → (UTF-8 encoding fix applied)
               ├─ "AI unavailable" → Return fallback test response
               └─ "Unknown" → Message: "Unknown error occurred"
                    ↓
               Display Error to User
```

