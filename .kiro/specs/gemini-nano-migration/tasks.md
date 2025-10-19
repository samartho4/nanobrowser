# Implementation Plan

- [x] 1. Create core LLM infrastructure
  - Set up `chrome-extension/src/background/llm/` directory structure with subdirectories for `client/`, `providers/`, and `utils/`
  - Create type definitions for provider interfaces, client options, and response models
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Implement Gemini Nano detection and provider
  - [x] 2.1 Create Nano capability detection utility
    - Write `chrome-extension/src/background/llm/utils/detection.ts` with `detectGeminiNano()` function
    - Implement checks for Prompt API, Summarizer, and Translator availability
    - Add unit tests for detection logic with mocked Chrome AI APIs
    - _Requirements: 2.1, 2.2_

  - [x] 2.2 Implement GeminiNanoProvider class
    - Create `chrome-extension/src/background/llm/providers/GeminiNanoProvider.ts`
    - Implement session management (create, destroy)
    - Implement `generateText()`, `generateStructured()`, and `generateStream()` methods
    - Add helper methods for Summarizer and Translator APIs
    - Write unit tests for all provider methods
    - _Requirements: 2.3, 2.4, 2.5, 2.7_

- [ ] 3. Implement cloud fallback provider
  - [ ] 3.1 Create CloudFallbackProvider class
    - Create `chrome-extension/src/background/llm/providers/CloudFallbackProvider.ts`
    - Implement Firebase AI Logic endpoint integration
    - Implement request payload formatting for Gemini API
    - Add response parsing and error handling
    - Write unit tests with mocked Firebase endpoints
    - _Requirements: 3.3, 3.4, 3.6_

  - [ ] 3.2 Add streaming support to cloud provider
    - Implement `generateStream()` method with SSE or chunked response handling
    - Add timeout and retry logic
    - Write tests for streaming responses
    - _Requirements: 1.4, 3.3_

- [ ] 4. Implement HybridAIClient
  - [ ] 4.1 Create HybridAIClient class with provider management
    - Create `chrome-extension/src/background/llm/client/HybridAIClient.ts`
    - Implement constructor with provider initialization
    - Add status tracking and reporting (`getStatus()` method)
    - Implement `setForceCloudFallback()` for dev testing
    - _Requirements: 1.1, 1.2, 9.2, 9.3_

  - [ ] 4.2 Implement fallback logic in HybridAIClient
    - Write `invoke()` method with Nano-first, cloud-fallback strategy
    - Implement `tryNano()` and `fallbackToCloud()` private methods
    - Add logging for fallback events with reasons
    - Write unit tests for fallback scenarios
    - _Requirements: 3.1, 3.2, 3.5, 1.3_

  - [ ] 4.3 Add streaming support to HybridAIClient
    - Implement `invokeStream()` method
    - Route streaming to appropriate provider
    - Handle fallback during streaming
    - Write tests for streaming with both providers
    - _Requirements: 1.4_

- [ ] 5. Create error handling utilities
  - Create `chrome-extension/src/background/llm/utils/errors.ts`
  - Implement error class hierarchy (AIError, NanoUnavailableError, NanoInferenceError, CloudFallbackError, SchemaValidationError)
  - Add error logging and reporting utilities
  - Write unit tests for error handling
  - _Requirements: 2.7, 3.5_

- [ ] 6. Update BaseAgent to use HybridAIClient
  - [ ] 6.1 Modify BaseAgent interface and constructor
    - Update `chrome-extension/src/background/agent/agents/base.ts`
    - Change `BaseAgentOptions` to accept `aiClient: HybridAIClient` instead of `chatLLM: BaseChatModel`
    - Update constructor to store `aiClient` instead of `chatLLM`
    - _Requirements: 4.1, 4.2, 4.3, 4.6_

  - [ ] 6.2 Rewrite BaseAgent invoke method
    - Replace LangChain-based `invoke()` with HybridAIClient calls
    - Implement `convertMessagesToPrompt()` helper to convert LangChain messages to string prompts
    - Update response parsing to handle both structured and unstructured responses
    - Add error handling for schema validation
    - Write unit tests for message conversion and invocation
    - _Requirements: 4.4, 1.3_

- [ ] 7. Update Executor to create and pass HybridAIClient
  - Modify `chrome-extension/src/background/agent/executor.ts`
  - Update constructor to accept `aiClient: HybridAIClient` instead of `navigatorLLM: BaseChatModel`
  - Pass `aiClient` to PlannerAgent and NavigatorAgent constructors
  - Update ActionBuilder if it uses LLM directly
  - Write integration tests for Executor with HybridAIClient
  - _Requirements: 4.6, 4.4_

- [ ] 8. Update individual agent implementations
  - [ ] 8.1 Update PlannerAgent
    - Modify `chrome-extension/src/background/agent/agents/planner.ts`
    - Ensure it uses `aiClient` from BaseAgent
    - Verify functional behavior matches previous implementation
    - Write integration tests
    - _Requirements: 4.1, 4.4_

  - [ ] 8.2 Update NavigatorAgent
    - Modify `chrome-extension/src/background/agent/agents/navigator.ts`
    - Ensure it uses `aiClient` from BaseAgent
    - Verify functional behavior matches previous implementation
    - Write integration tests
    - _Requirements: 4.2, 4.4_

  - [ ] 8.3 Update ValidatorAgent (if exists)
    - Find and modify validator agent file
    - Ensure it uses `aiClient` from BaseAgent
    - Verify functional behavior matches previous implementation
    - Write integration tests
    - _Requirements: 4.3, 4.4_

- [ ] 9. Update background service worker initialization
  - Modify background service worker entry point
  - Initialize HybridAIClient on startup
  - Pass client instance to Executor when creating tasks
  - Add error handling for client initialization failures
  - _Requirements: 1.1, 2.1_

- [ ] 10. Remove old provider code
  - [ ] 10.1 Remove helper.ts and provider creation logic
    - Delete or deprecate `chrome-extension/src/background/agent/helper.ts`
    - Remove any provider factory functions
    - Remove provider selection logic
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ] 10.2 Clean up package.json dependencies
    - Remove `@langchain/openai`, `@langchain/anthropic`, `@langchain/ollama`
    - Remove other non-Google LLM provider dependencies
    - Keep minimal type definitions and fetch polyfills
    - Run `npm install` to update lock file
    - _Requirements: 5.5, 5.6_

  - [ ] 10.3 Remove provider UI components
    - Find and remove provider selection dropdowns/toggles
    - Remove provider configuration UI
    - Remove references to OpenAI, Anthropic, Ollama from UI
    - _Requirements: 5.7_

- [ ] 11. Add status badge to side panel
  - [ ] 11.1 Create status component
    - Create status badge component in side panel
    - Implement status display logic (ready/unavailable/cloud fallback)
    - Style badge to fit existing UI
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ] 11.2 Wire status updates
    - Connect status component to HybridAIClient status
    - Implement polling or event-based status updates
    - Test status changes during provider switching
    - _Requirements: 6.6_

- [ ] 12. Add force cloud fallback toggle
  - Create settings toggle in options page or side panel
  - Wire toggle to HybridAIClient.setForceCloudFallback()
  - Persist toggle state in extension storage
  - Add visual indicator when force mode is active
  - Write tests for toggle functionality
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [ ] 13. Update manifest and permissions
  - [ ] 13.1 Update manifest.js for Shannon branding
    - Change extension name from "Nanobrowser" to "Shannon"
    - Update description to reflect new AI-first approach
    - _Requirements: 8.4, 7.1_

  - [ ] 13.2 Clean up permissions
    - Remove host_permissions for non-Google LLM providers
    - Keep only necessary permissions (storage, scripting, activeTab, etc.)
    - Verify MV3 compliance
    - Add Chrome AI API permissions if required
    - _Requirements: 7.2, 7.3, 7.4, 7.5, 7.6_

- [ ] 14. Rebrand to Shannon
  - [ ] 14.1 Design and create logo assets
    - Design logo inspired by Maxwell's demon
    - Create 128x128px extension icon
    - Create 32x32px toolbar icon
    - Export in PNG and SVG formats
    - _Requirements: 8.2, 8.3_

  - [ ] 14.2 Update text references throughout codebase
    - Update package.json name and description
    - Update README.md and localized versions
    - Update all locale files in `chrome-extension/public/_locales/*/messages.json`
    - Find and replace "Nanobrowser" with "Shannon" in UI components
    - _Requirements: 8.1, 8.5, 8.6_

- [ ] 15. Write integration tests
  - [ ] 15.1 Test agent integration with HybridAIClient
    - Write tests for Planner with both Nano and cloud providers
    - Write tests for Navigator with both providers
    - Write tests for Validator with both providers
    - Verify functional equivalence with old system
    - _Requirements: 4.4, 4.5_

  - [ ] 15.2 Write end-to-end tests
    - Test complete task execution with Nano available
    - Test complete task execution with cloud fallback
    - Test provider switching mid-task
    - Test error recovery scenarios
    - _Requirements: 10.5, 10.6_

- [ ] 16. Verify build and CI
  - Run build command and verify success
  - Verify no references to removed providers in build output
  - Run existing CI tests and ensure they pass
  - Test extension installation in Chrome
  - Verify all keyboard shortcuts still work
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

- [ ] 17. Create configuration and environment setup
  - Create or update `.env` file with Firebase endpoint and API key
  - Update configuration loading in background service worker
  - Implement storage schema for extension settings
  - Add migration logic for existing user settings if needed
  - _Requirements: 3.3, 3.4_

- [ ] 18. Add documentation
  - Update README with Shannon branding and new architecture
  - Document HybridAIClient API
  - Document provider interfaces
  - Add troubleshooting guide for Nano availability
  - Document force cloud fallback toggle for developers
  - _Requirements: 8.6, 9.1_
