# Requirements Document

## Introduction

This feature migrates the Nanobrowser Chrome extension to Shannon, replacing the current multi-provider LLM architecture with a Gemini Nano-first approach using Chrome's built-in AI capabilities. The system will maintain a single cloud fallback through Firebase AI Logic to the Gemini Developer API. The migration preserves all existing multi-agent functionality (Planner/Navigator/Validator) while centralizing LLM access behind a unified client interface. Additionally, the extension will be rebranded from Nanobrowser to Shannon, with a new logo inspired by Maxwell's demon and information theory.

## Requirements

### Requirement 1: Unified AI Client Architecture

**User Story:** As a developer, I want a single unified AI client interface, so that all LLM interactions are centralized and consistent across the codebase.

#### Acceptance Criteria

1. WHEN the system initializes THEN it SHALL create a HybridAIClient that manages all LLM interactions
2. WHEN an agent requests LLM inference THEN the system SHALL route the request through HybridAIClient.invoke()
3. WHEN the HybridAIClient interface is defined THEN it SHALL support both prompt-based and schema-based invocations
4. WHEN streaming is currently supported in the codebase THEN the HybridAIClient SHALL maintain streaming capabilities
5. WHEN the unified client is implemented THEN it SHALL replace all direct calls to OpenAI, Anthropic, Ollama, and other provider-specific APIs

### Requirement 2: Gemini Nano Provider Implementation

**User Story:** As a user, I want the extension to use Chrome's built-in Gemini Nano AI, so that I can benefit from fast, private, on-device inference without network latency.

#### Acceptance Criteria

1. WHEN the extension starts THEN it SHALL detect Gemini Nano availability using `(globalThis as any)?.ai?.languageModel?.capabilities?.available === true`
2. WHEN Gemini Nano is available THEN the system SHALL create a GeminiNanoProvider instance
3. WHEN the GeminiNanoProvider is created THEN it SHALL support the Chrome Prompt API for text generation
4. WHEN the GeminiNanoProvider is created THEN it SHALL provide helper methods for Summarizer API
5. WHEN the GeminiNanoProvider is created THEN it SHALL provide helper methods for Translator API
6. WHEN Gemini Nano is available and functional THEN the system SHALL prefer it over cloud-based alternatives
7. WHEN using Gemini Nano THEN the system SHALL handle API-specific response formats and error conditions

### Requirement 3: Hybrid Fallback Strategy

**User Story:** As a user, I want the extension to automatically fall back to cloud-based AI when on-device AI is unavailable, so that the extension continues to function reliably across all environments.

#### Acceptance Criteria

1. WHEN Gemini Nano is unavailable THEN the HybridAIClient SHALL automatically route requests to the cloud fallback
2. WHEN Gemini Nano fails during inference THEN the HybridAIClient SHALL retry the request using the cloud fallback
3. WHEN using cloud fallback THEN the system SHALL call Firebase AI Logic endpoints
4. WHEN Firebase AI Logic is invoked THEN it SHALL route to the Gemini Developer API
5. WHEN the fallback mechanism activates THEN it SHALL log the reason for fallback (unavailable vs. failure)
6. WHEN cloud fallback is used THEN the system SHALL use only Google Gemini models, not other LLM providers

### Requirement 4: Agent Integration

**User Story:** As a developer, I want all existing agents (Planner, Navigator, Validator) to use the new unified client, so that the migration is complete and consistent.

#### Acceptance Criteria

1. WHEN the Planner agent executes THEN it SHALL invoke the HybridAIClient instead of provider-specific models
2. WHEN the Navigator agent executes THEN it SHALL invoke the HybridAIClient instead of provider-specific models
3. WHEN the Validator agent executes THEN it SHALL invoke the HybridAIClient instead of provider-specific models
4. WHEN agents invoke the HybridAIClient THEN the functional behavior SHALL remain unchanged from the current implementation
5. WHEN the migration is complete THEN no agent SHALL directly reference OpenAI, Anthropic, Ollama, or other non-Google providers
6. WHEN the Executor creates agents THEN it SHALL pass the HybridAIClient instead of BaseChatModel instances

### Requirement 5: Provider Cleanup

**User Story:** As a developer, I want all unused LLM provider code removed, so that the codebase is clean and maintainable.

#### Acceptance Criteria

1. WHEN the migration is complete THEN the system SHALL have no references to OpenAI provider registration
2. WHEN the migration is complete THEN the system SHALL have no references to Anthropic provider registration
3. WHEN the migration is complete THEN the system SHALL have no references to Ollama provider registration
4. WHEN the migration is complete THEN the system SHALL have no references to DeepSeek, Groq, Cerebras, XAI, or other non-Google providers
5. WHEN package.json is updated THEN it SHALL remove unused dependencies (@langchain/openai, @langchain/anthropic, @langchain/ollama, etc.)
6. WHEN package.json is updated THEN it SHALL retain minimal type definitions and fetch polyfills required for the new architecture
7. WHEN UI components reference provider selection THEN those components SHALL be removed or updated to remove non-Google options

### Requirement 6: Status Indication

**User Story:** As a user, I want to see the current AI model status in the side panel, so that I understand whether I'm using on-device or cloud-based AI.

#### Acceptance Criteria

1. WHEN the side panel is displayed THEN it SHALL show a model status badge
2. WHEN Gemini Nano is available and ready THEN the badge SHALL display "Nano: ready"
3. WHEN Gemini Nano is unavailable THEN the badge SHALL display "Nano: unavailable"
4. WHEN the system is using cloud fallback THEN the badge SHALL display "using cloud fallback"
5. WHEN implementing the status badge THEN the system SHALL reuse existing status area UI if present
6. WHEN implementing the status badge THEN the system SHALL not redesign the side panel layout

### Requirement 7: Manifest and Permissions

**User Story:** As a developer, I want the extension manifest to reflect only necessary permissions, so that the extension follows the principle of least privilege.

#### Acceptance Criteria

1. WHEN the manifest is updated THEN it SHALL use Manifest V3 format
2. WHEN the manifest is updated THEN it SHALL maintain the background service worker configuration
3. WHEN the manifest is updated THEN it SHALL maintain the side panel configuration
4. WHEN the manifest is updated THEN it SHALL include only necessary permissions (alarms, storage, scripting, activeTab)
5. WHEN the manifest is updated THEN it SHALL NOT include host permissions for non-Google LLM providers
6. WHEN the manifest is updated THEN it SHALL include appropriate permissions for Chrome built-in AI APIs if required

### Requirement 8: Branding Update to Shannon

**User Story:** As a user, I want the extension to be rebranded as Shannon with appropriate visual identity, so that it reflects the information theory heritage and new AI-first approach.

#### Acceptance Criteria

1. WHEN the extension is displayed THEN all references to "Nanobrowser" SHALL be replaced with "Shannon"
2. WHEN the extension icon is displayed THEN it SHALL show a new logo inspired by Maxwell's demon
3. WHEN the new logo is designed THEN it SHALL visually suggest James Clerk Maxwell's ideas that led to information theory
4. WHEN the manifest is updated THEN the extension name SHALL be "Shannon"
5. WHEN UI text is updated THEN all user-facing strings SHALL use "Shannon" instead of "Nanobrowser"
6. WHEN documentation is updated THEN README and other docs SHALL reflect the Shannon branding

### Requirement 9: Development and Testing Support

**User Story:** As a developer, I want a way to force cloud fallback during development, so that I can test the fallback mechanism without disabling Gemini Nano.

#### Acceptance Criteria

1. WHEN a developer needs to test cloud fallback THEN the system SHALL provide a settings toggle "Force cloud fallback"
2. WHEN "Force cloud fallback" is enabled THEN the system SHALL bypass Gemini Nano even if available
3. WHEN "Force cloud fallback" is enabled THEN the system SHALL route all requests through the cloud fallback path
4. WHEN "Force cloud fallback" is disabled THEN the system SHALL resume normal hybrid behavior
5. WHEN the toggle is implemented THEN it SHALL be accessible in the extension settings UI

### Requirement 10: Build and CI Compatibility

**User Story:** As a developer, I want the build process and CI pipeline to continue working, so that the migration doesn't break existing workflows.

#### Acceptance Criteria

1. WHEN the build command is executed THEN it SHALL complete successfully without errors
2. WHEN the build completes THEN the output SHALL contain no references to removed LLM providers
3. WHEN CI test scripts exist THEN they SHALL continue to pass after the migration
4. WHEN the extension is built THEN it SHALL be installable in Chrome without errors
5. WHEN the extension runs THEN all existing user flows SHALL function as before
6. WHEN the extension runs THEN all keyboard shortcuts SHALL continue to work
