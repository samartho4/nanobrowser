# Implementation Plan

- [x] 1. Add Firebase dependencies
  - Run `pnpm add firebase` in chrome-extension directory (firebase/ai is included)
  - Verify package.json updated
  - _Requirements: 10.1_

- [x] 2. Create message constants
  - Create `chrome-extension/src/background/llm/constants.ts`
  - Export `HYBRID_SDK_INVOKE` constant
  - Define `HybridSDKInvokeMessage` and `HybridSDKResponse` interfaces
  - _Requirements: 8.2, 8.3_

- [x] 3. Create HybridAIClient
  - [x] 3.1 Create HybridAIClient class structure
    - Create `chrome-extension/src/background/llm/HybridAIClient.ts`
    - Implement `initialize()` method to check Nano availability via `globalThis.LanguageModel.availability()`
    - Store availability status and create GeminiNanoChatModel if available
    - _Requirements: 1.1, 2.1, 2.2_

  - [x] 3.2 Implement invoke method with Nano-first logic
    - Implement `invoke({ prompt, system, schema, stream })` method
    - Try Nano first if available:
      - Convert string prompt to `[new HumanMessage(prompt)]`
      - Add `new SystemMessage(system)` at start if system param exists
      - If schema provided, use `nanoModel.withStructuredOutput(schema).invoke(messages)`
        - Note: This LangChain wrapper internally passes the schema as `responseConstraint` to Prompt API's `session.prompt()`
      - If no schema, use `nanoModel.invoke(messages)` and extract content
      - Handle streaming with LangChain's streaming methods if stream param is true
    - On Nano failure or unavailability, call `invokeBridge()`
    - Return normalized `{ content, provider }` response
    - _Requirements: 1.2, 1.3, 2.4, 3.1_

  - [x] 3.3 Implement bridge fallback method
    - Implement `invokeBridge()` private method
    - Send `chrome.runtime.sendMessage` with type 'HYBRID_SDK_INVOKE'
    - Include payload: prompt, system, schema, stream
    - Handle response and errors
    - _Requirements: 3.1, 8.3_

  - [x] 3.4 Implement getStatus method
    - Implement `getStatus()` returning `{ provider, nano: { availability }, lastError? }`
    - Track current provider ('nano' | 'cloud')
    - _Requirements: 6.4_

  - [x] 3.5 Write unit tests for HybridAIClient
    - Mock `globalThis.LanguageModel.availability()` for 'available' case
    - Assert Nano path is used
    - Mock for 'unavailable' case
    - Assert bridge path is used
    - Test error handling
    - _Requirements: 9.1, 9.2_

- [x] 4. Create Firebase bridge in side panel
  - [x] 4.1 Create firebaseBridge.ts file
    - Create `pages/side-panel/src/firebaseBridge.ts`
    - Import from 'firebase/app' and 'firebase/ai' (NOT '@firebase/ai-logic')
    - Import `GoogleAIBackend`, `InferenceMode`, `Schema` from 'firebase/ai'
    - Import HYBRID_SDK_INVOKE constant
    - _Requirements: 8.1, 10.1_

  - [x] 4.2 Initialize Firebase AI Logic SDK
    - Load Firebase config from extension storage or environment
    - Call `initializeApp(firebaseConfig)`
    - Call `getAI(app, { backend: new GoogleAIBackend() })`
    - Create model with `getGenerativeModel(ai, { mode: InferenceMode.PREFER_ON_DEVICE, inCloudParams: { model: 'gemini-1.5-flash' } })`
    - Note: model name must be inside `inCloudParams`, not at top level
    - Import `GoogleAIBackend`, `InferenceMode`, `Schema` from 'firebase/ai'
    - _Requirements: 3.2, 3.3, 8.1_

  - [x] 4.3 Implement message listener
    - Register `chrome.runtime.onMessage.addListener`
    - Check for `msg.type === 'HYBRID_SDK_INVOKE'`
    - Extract prompt, system, schema, stream from payload
    - Build parts array (system + prompt)
    - _Requirements: 8.2, 8.4_

  - [x] 4.4 Implement content generation with structured output support
    - Implement `convertToFirebaseSchema(jsonSchema)` helper with correct signatures:
      - For objects: `Schema.object({ properties: {...}, optionalProperties: [...] })`
      - For arrays: `Schema.array({ items: ... })`
      - Handle `required` field from JSON Schema to compute `optionalProperties`
      - Example implementation:
        ```typescript
        function convertToFirebaseSchema(jsonSchema: any): any {
          if (jsonSchema.type === 'object') {
            const props: Record<string, any> = {};
            const required = jsonSchema.required || [];
            for (const [key, value] of Object.entries(jsonSchema.properties)) {
              props[key] = convertPropertySchema(value);
            }
            const optionalProps = Object.keys(props).filter(k => !required.includes(k));
            return Schema.object({
              properties: props,
              ...(optionalProps.length && { optionalProperties: optionalProps })
            });
          }
          // ... handle other types
        }
        ```
    - Implement `convertPropertySchema(propSchema)` helper for recursive conversion:
      - `string` → `Schema.string()`
      - `number` → `Schema.number()`
      - `boolean` → `Schema.boolean()`
      - `array` → `Schema.array({ items: convertPropertySchema(propSchema.items) })`
      - `object` → `convertToFirebaseSchema(propSchema)`
    - JSON Schema validation details:
      - Use `additionalProperties: false` in JSON Schema to prevent extra fields
      - Use `required` array to mark mandatory fields
      - These map to Firebase Schema's `properties` and `optionalProperties` structure
    - If schema provided:
      - Convert JSON schema to Firebase Schema format
      - Create model with full structured output config for BOTH cloud and on-device:
        ```typescript
        inCloudParams: {
          model: 'gemini-1.5-flash',
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: firebaseSchema
          }
        },
        onDeviceParams: {
          promptOptions: {
            responseConstraint: firebaseSchema
          }
        }
        ```
      - Note: This creates a new model instance per request with schema (document performance implications)
    - Build parts array: `[{ text: system }, { text: prompt }]`
    - Call `model.generateContent(parts)` for non-streaming
    - Call `model.generateContentStream(parts)` for streaming
    - Implement `collectStream()` to aggregate chunks
    - Return `{ ok: true, provider: 'cloud', text }` on success
    - Return `{ ok: false, error }` on failure
    - _Requirements: 8.4, 8.5, 8.6_

  - [x] 4.5 Wire bridge into side panel initialization
    - Import firebaseBridge in side panel entry point
    - Ensure it initializes when side panel loads
    - _Requirements: 8.1_

- [x] 5. Update BaseAgent to use HybridAIClient
  - [x] 5.1 Modify BaseAgent interface
    - Update `BaseAgentOptions` to accept `aiClient: HybridAIClient` instead of `chatLLM: BaseChatModel`
    - Update constructor to store `aiClient`
    - Remove `chatLLM` references
    - _Requirements: 4.1, 4.4_

  - [x] 5.2 Rewrite invoke method
    - Replace LangChain-based invoke with HybridAIClient calls
    - Implement `convertMessagesToPrompt()` helper
    - Extract system prompt from `this.prompt.getSystemMessage()`
    - Call `this.aiClient.invoke({ prompt, system, schema: this.modelOutputSchema })`
    - Parse response content as JSON and validate with schema
    - _Requirements: 1.2, 4.2_

  - [x] 5.3 Write tests for BaseAgent changes
    - Test message conversion
    - Test invoke with HybridAIClient
    - Verify functional equivalence
    - _Requirements: 9.5_

- [x] 6. Update Executor
  - Modify `chrome-extension/src/background/agent/executor.ts`
  - Change constructor to accept `aiClient: HybridAIClient` instead of `navigatorLLM: BaseChatModel`
  - Pass `aiClient` to PlannerAgent and NavigatorAgent constructors
  - Update ActionBuilder if it uses LLM directly
  - _Requirements: 4.4_

- [x] 7. Update individual agents
  - [x] 7.1 Update PlannerAgent
    - Modify `chrome-extension/src/background/agent/agents/planner.ts`
    - Ensure it uses `aiClient` from BaseAgent
    - Verify no direct LLM calls
    - _Requirements: 4.1_

  - [x] 7.2 Update NavigatorAgent
    - Modify `chrome-extension/src/background/agent/agents/navigator.ts`
    - Ensure it uses `aiClient` from BaseAgent
    - Verify no direct LLM calls
    - _Requirements: 4.1_

- [x] 8. Update background service worker initialization
  - Modify `chrome-extension/src/background/index.ts`
  - Create and initialize HybridAIClient on startup
  - Pass HybridAIClient to Executor when creating tasks
  - Handle initialization errors
  - _Requirements: 1.1, 2.1_

- [x] 9. Remove old provider code
  - [x] 9.1 Remove helper.ts
    - Delete `chrome-extension/src/background/agent/helper.ts`
    - Remove all imports of helper.ts
    - _Requirements: 5.1_

  - [x] 9.2 Clean package.json dependencies
    - Remove `@langchain/openai`
    - Remove `@langchain/anthropic`
    - Remove `@langchain/ollama`
    - Remove `@langchain/xai`
    - Remove `@langchain/groq`
    - Remove `@langchain/cerebras`
    - Remove `@langchain/deepseek`
    - Remove `@langchain/google-genai` (if not needed)
    - Run `pnpm install` to update lock file
    - _Requirements: 5.2, 10.2_

  - [x] 9.3 Remove provider UI components
    - Find provider selection dropdowns in options page
    - Remove provider configuration UI
    - Remove references to non-Google providers
    - _Requirements: 5.3_

  - [x] 9.4 Remove provider storage types
    - Update `packages/storage/lib/settings/types.ts`
    - Remove non-Google provider enums
    - Update `packages/storage/lib/settings/llmProviders.ts`
    - _Requirements: 5.1_

- [x] 10. Add status chip to side panel
  - [x] 10.1 Create status component
    - Add status chip component to side panel UI
    - Display "Nano: ready" or "Cloud via Firebase"
    - Style to fit existing UI
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 10.2 Wire status updates
    - Call HybridAIClient.getStatus() via message or storage
    - Update chip when status changes
    - Test status transitions
    - _Requirements: 6.4, 9.4_

- [ ] 11. Update manifest and permissions
  - [x] 11.1 Update manifest.js
    - Change name to "Shannon"
    - Ensure permissions: storage, activeTab, scripting, sidePanel, alarms
    - Add host_permissions for Firebase domains (or use `<all_urls>`)
    - Add connect-src CSP for specific Firebase endpoints:
      - `https://firebasevertexai.googleapis.com`
      - `https://firebasestorage.googleapis.com`
      - `https://www.googleapis.com`
      - `https://generativelanguage.googleapis.com`
    - Remove non-Google LLM provider permissions
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 11.3_

- [x] 12. Shannon branding
  - [x] 12.1 Design and create logo
    - Design logo inspired by Maxwell's demon
    - Create 128x128px icon
    - Create 32x32px icon
    - Save as PNG in `chrome-extension/public/`
    - _Requirements: 11.2_

  - [x] 12.2 Update text references
    - Update package.json name and description
    - Update README.md and localized versions
    - Find and replace "Nanobrowser" with "Shannon" in UI components
    - Update locale files in `chrome-extension/public/_locales/*/messages.json`
    - _Requirements: 11.1, 11.4, 11.5_

- [x] 13. Write integration tests
  - Test Planner with HybridAIClient (both Nano and cloud paths)
  - Test Navigator with HybridAIClient (both paths)
  - Test complete task execution with Nano available
  - Test complete task execution with Nano unavailable
  - _Requirements: 9.3, 9.5_

- [x] 14. Verify build and functionality
  - Run build command and verify success
  - Verify no references to removed providers in output
  - Install extension in Chrome
  - Test with Nano enabled
  - Test with Nano disabled
  - Verify all existing functionality works
  - _Requirements: 10.3, 10.4_

- [ ] 15. Documentation
  - Update README with Shannon branding
  - Document HybridAIClient API
  - Document Firebase bridge setup
  - Add troubleshooting guide
  - _Requirements: 11.5_
