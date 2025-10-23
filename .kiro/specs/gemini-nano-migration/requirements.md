# Requirements Document

## Introduction

This document outlines the requirements for migrating the browser extension to a Gemini Nano-first architecture with Firebase AI Logic SDK fallback. The migration will maintain the existing working Gemini Nano (Prompt API) implementation in the service worker while adding Firebase AI Logic SDK (`mode: InferenceMode.PREFER_ON_DEVICE`) in the side panel for cloud fallback when on-device AI is unavailable. All non-Google LLM providers will be removed to simplify the codebase. The extension will be rebranded from Nanobrowser to Shannon. All existing agent functionality must be preserved throughout this migration.

## Requirements

### Requirement 1: HybridAIClient

**User Story:** As a developer, I want a single AI client interface for all LLM interactions, so that I can simplify the codebase and have a consistent API for both on-device and cloud inference.

#### Acceptance Criteria

1. WHEN the system initializes THEN HybridAIClient SHALL manage all LLM interactions
2. WHEN agents request inference THEN the requests SHALL route through HybridAIClient.invoke()
3. WHEN invoked THEN HybridAIClient SHALL support both prompt-based and schema-based invocations
4. WHEN implemented THEN HybridAIClient SHALL keep the existing GeminiNanoChatModel code untouched
5. WHEN migration is complete THEN all OpenAI, Anthropic, and Ollama provider calls SHALL be replaced with HybridAIClient calls

### Requirement 2: Gemini Nano (Keep Existing)

**User Story:** As a user, I want on-device AI for fast, private inference, so that my data stays local and responses are near-instantaneous.

#### Acceptance Criteria

1. WHEN the extension starts THEN the system SHALL detect Gemini Nano availability via `await globalThis.LanguageModel.availability()`
2. WHEN Gemini Nano is available THEN the system SHALL use the existing GeminiNanoChatModel implementation at `chrome-extension/src/background/llm/langchain/GeminiNanoChatModel.ts`
3. WHEN Gemini Nano is used THEN the system SHALL maintain existing session reuse, structured output, and streaming support capabilities
4. WHEN Gemini Nano is available THEN the system SHALL prefer Nano over cloud inference
5. WHEN implementing HybridAIClient THEN the existing GeminiNanoChatModel code SHALL remain untouched

### Requirement 3: Firebase AI Logic SDK Fallback

**User Story:** As a user, I want automatic cloud fallback when on-device AI is unavailable, so that the extension continues to function seamlessly regardless of device capabilities.

#### Acceptance Criteria

1. WHEN Gemini Nano is unavailable THEN HybridAIClient SHALL send a message to the side panel for cloud fallback
2. WHEN the side panel receives a fallback request THEN it SHALL use Firebase AI Logic SDK with `mode: InferenceMode.PREFER_ON_DEVICE`
3. WHEN Firebase SDK is initialized THEN it SHALL use `getGenerativeModel(ai, { mode: InferenceMode.PREFER_ON_DEVICE, inCloudParams: { model: 'gemini-1.5-flash' } })` with GoogleAIBackend
4. WHEN cloud inference completes THEN the side panel SHALL return a normalized result to the service worker
5. WHEN fallback is activated THEN the system SHALL log the fallback reason for debugging

### Requirement 4: Agent Integration

**User Story:** As a developer, I want all agents to use HybridAIClient, so that there is a single, consistent inference path throughout the codebase.

#### Acceptance Criteria

1. WHEN Planner or Navigator agents execute THEN they SHALL invoke HybridAIClient for inference
2. WHEN agents are invoked THEN their functional behavior SHALL remain unchanged from the current implementation
3. WHEN migration is complete THEN no agent SHALL reference non-Google LLM providers
4. WHEN the Executor creates agents THEN it SHALL pass HybridAIClient instead of BaseChatModel instances

### Requirement 5: Provider Cleanup

**User Story:** As a developer, I want unused LLM provider code removed, so that the codebase is simpler, the bundle size is smaller, and maintenance is easier.

#### Acceptance Criteria

1. WHEN cleanup is complete THEN the codebase SHALL contain no references to OpenAI, Anthropic, Ollama, DeepSeek, Groq, Cerebras, or XAI providers
2. WHEN package.json is updated THEN it SHALL not include @langchain/openai, @langchain/anthropic, @langchain/ollama, or other non-Google provider dependencies
3. WHEN the UI is updated THEN all provider selection components SHALL be removed from the options page

### Requirement 6: Status Chip

**User Story:** As a user, I want to see the current AI model status, so that I know whether I'm using on-device or cloud inference.

#### Acceptance Criteria

1. WHEN the side panel is displayed THEN it SHALL show a status chip indicating the current AI provider
2. WHEN Gemini Nano is available THEN the status chip SHALL display "Nano: ready"
3. WHEN Gemini Nano is unavailable THEN the status chip SHALL display "Cloud via Firebase"
4. WHEN the status is read THEN it SHALL be retrieved from HybridAIClient.getStatus()

### Requirement 7: Manifest & Permissions

**User Story:** As a developer, I want minimal necessary permissions, so that users trust the extension and it follows security best practices.

#### Acceptance Criteria

1. WHEN the manifest is updated THEN it SHALL use Manifest V3 with service worker and side panel architecture
2. WHEN the manifest is updated THEN it SHALL include only these permissions: storage, activeTab, scripting, sidePanel, alarms
3. WHEN the manifest is updated THEN it SHALL include host_permissions for Firebase API domains
4. WHEN the manifest is updated THEN it SHALL include connect-src CSP directives for Firebase endpoints (firebasevertexai.googleapis.com, firebasestorage.googleapis.com, www.googleapis.com, generativelanguage.googleapis.com)
5. WHEN the manifest is updated THEN it SHALL remove any permissions specific to non-Google LLM providers

### Requirement 8: Side Panel Bridge

**User Story:** As a developer, I want a message bridge for cloud fallback, so that the service worker can delegate to the side panel when on-device AI is unavailable.

#### Acceptance Criteria

1. WHEN the side panel initializes THEN it SHALL set up Firebase AI Logic SDK with `mode: InferenceMode.PREFER_ON_DEVICE` and GoogleAIBackend
2. WHEN the side panel initializes THEN it SHALL register a chrome.runtime.onMessage listener for 'HYBRID_SDK_INVOKE' messages
3. WHEN the service worker needs cloud fallback THEN it SHALL send a 'HYBRID_SDK_INVOKE' message with prompt, system, schema, and stream parameters
4. WHEN the side panel receives the message THEN it SHALL call model.generateContent() for non-streaming or model.generateContentStream() for streaming requests
5. WHEN inference completes successfully THEN the side panel SHALL return { ok: true, provider: 'cloud', text: <result> }
6. WHEN an error occurs THEN the side panel SHALL return { ok: false, error: <error_message> }

### Requirement 9: Testing

**User Story:** As a developer, I want tests for both Nano and cloud paths, so that I can verify the system works correctly in all scenarios.

#### Acceptance Criteria

1. WHEN unit tests run THEN they SHALL mock LanguageModel.availability() to return both 'available' and 'unavailable' states
2. WHEN unit tests run THEN they SHALL assert the correct inference path is chosen (Nano vs bridge) based on availability
3. WHEN integration tests run THEN they SHALL test complete workflows with Nano disabled to verify cloud fallback
4. WHEN UI tests run THEN they SHALL confirm the status chip correctly reflects the active provider
5. WHEN all tests complete THEN they SHALL verify that all existing agent functionality works as expected

### Requirement 10: Dependencies

**User Story:** As a developer, I want clean dependencies, so that the project has minimal external dependencies and a smaller bundle size.

#### Acceptance Criteria

1. WHEN dependencies are updated THEN the firebase package SHALL be added (which includes firebase/ai)
2. WHEN dependencies are cleaned THEN @langchain/openai, @langchain/anthropic, @langchain/ollama, and other non-Google provider packages SHALL be removed
3. WHEN the project is built THEN the output SHALL contain no references to removed provider packages
4. WHEN dependencies are installed THEN the installation SHALL complete without errors

### Requirement 11: Shannon Branding

**User Story:** As a user, I want the extension rebranded as Shannon, so that it has a distinct identity that reflects its information-processing capabilities.

#### Acceptance Criteria

1. WHEN the extension is displayed THEN all "Nanobrowser" references SHALL be replaced with "Shannon"
2. WHEN the extension icon is displayed THEN it SHALL show a new logo inspired by Maxwell's demon
3. WHEN the manifest is updated THEN the extension name SHALL be "Shannon"
4. WHEN the UI is updated THEN all user-facing strings SHALL use "Shannon" branding
5. WHEN documentation is updated THEN the README and all related docs SHALL reflect Shannon branding
