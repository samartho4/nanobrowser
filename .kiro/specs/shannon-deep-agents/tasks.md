# Shannon Deep Agents Implementation Tasks

## Implementation Plan Overview

This task list converts the Shannon Deep Agents design into actionable implementation steps following your specific 12-task breakdown. Each task builds upon existing Shannon components (HybridAIClient, MessageManager, SidePanel, Options) while adding sophisticated Deep Agents patterns including LangGraph Store backend, Context Engineering four pillars, TodoList middleware, three-tier memory system, workspace isolation, and visual context controls.

**Deep Agents Architecture Approach:**
- **LangGraph Store Backend**: Replace direct Chrome storage with workspace-namespaced persistence
- **Context Engineering Four Pillars**: Implement WRITE/SELECT/COMPRESS/ISOLATE with visual controls
- **Three-Tier Memory System**: Episodic (task patterns), Semantic (facts), Procedural (workflows)
- **TodoList Middleware**: Deep Agents planning tool for task decomposition
- **Workspace Isolation**: Independent contexts with autonomy levels and approval policies
- **Visual Context Builder**: @-mention system with context pills and smart suggestions

## Task List

### Phase 1: Storage & Memory Foundation

- [ ] 1. Enhance Storage with LangGraph Store Backend
  - Create `packages/storage/lib/chat/LangGraphStore.ts` implementing LangGraph Store API patterns
  - Add workspace namespacing with pattern `userId/workspaceId/threadId` for complete isolation
  - Implement core Store API: `put()`, `get()`, `search()`, `delete()` with namespace awareness
  - Add workspace management: `createNamespace()`, `cleanupNamespace()` with autonomy level and approval policies
  - Extend existing `ChatHistoryStore` class with workspace-scoped methods maintaining backward compatibility
  - Integrate with existing Chrome storage API while adding IndexedDB for vector embeddings (future)
  - _Requirements: 1_

- [ ] 1.1 Migration + Rollback with Checkpointing
  - Create `packages/storage/lib/chat/StorageMigration.ts` implementing LangGraph checkpointing patterns
  - Add checkpoint creation: `createCheckpoint()`, `restoreCheckpoint()`, `listCheckpoints()` for conversation time-travel
  - Implement schema versioning for data migrations with rollback capabilities
  - Add one-time migration moving existing data into namespaced format with compatibility shim
  - Enable "what-if" exploration and conversation forking using checkpoint restoration
  - _Requirements: 1_

- [ ] 2. ContextManager with 4 Pillars (CRITICAL)
  - Create `chrome-extension/src/services/context/ContextManager.ts` implementing LangChain's four pillars
  - **WRITE Pillar**: `write()` method for episodic, semantic, procedural memory storage with workspace isolation
  - **SELECT Pillar**: `select()` method with semantic similarity, task relevance, and visual context building
  - **COMPRESS Pillar**: `compress()` method with user-controlled strategies (minimal/balanced/aggressive) and preview
  - **ISOLATE Pillar**: `isolate()` method for workspace-scoped context retrieval with cross-workspace synthesis
  - Add context quality assessment and "lost in the middle" mitigation through item reordering
  - Integrate with existing schema optimization and error handling patterns
  - _Requirements: 2_

- [ ] 2.1 Extend MessageManager (Minimal Changes)
  - Add 3-4 new methods to existing `chrome-extension/src/background/agent/messages/service.ts`
  - `getWorkspaceContext()`: workspace-scoped context selection using ContextManager SELECT pillar
  - `compressMessages()`: user-controlled compression with strategy selection and preview
  - `selectRelevantMessages()`: context selection with workspace boundaries and memory relevance
  - `estimateTokenCount()`: accurate token counting for context budget management
  - Maintain backward compatibility with all existing MessageManager functionality
  - _Requirements: 11_

- [ ] 3. Deep Agents Memory Services (THREE TYPES)
  - Create `chrome-extension/src/services/memory/MemoryService.ts` with three memory types
  - **Episodic Memory**: `saveEpisode()`, `getRecentEpisodes()` storing task execution patterns as few-shot examples
  - **Semantic Memory**: `saveFact()`, `getFact()`, `searchFacts()` with vector embeddings for semantic search
  - **Procedural Memory**: `savePattern()`, `getPattern()`, `listPatterns()` for workflow templates and one-click invocation
  - Implement observation → thoughts → action → result format for episodic memories
  - Add fact extraction from conversations with conflict resolution and confidence scoring
  - Enable workflow pattern capture with success rate tracking and template export
  - _Requirements: 3_

- [ ] 3.1 Extend Executor with Deep Agents Middleware
  - Add middleware hooks to existing `chrome-extension/src/background/agent/executor.ts`
  - `beforeAgentRun()`: context preparation, memory retrieval, workspace isolation setup
  - `afterAgentRun()`: memory storage, learning updates, todo management, pattern capture
  - `onAgentError()`: context-aware error recovery with workspace-scoped error handling
  - Integrate with existing agent execution flow while adding memory awareness
  - Maintain compatibility with existing AgentContext and EventManager patterns
  - _Requirements: 12_

- [ ] 3.2 TodoList Middleware (Deep Agents Planning)
  - Create `chrome-extension/src/background/agent/middleware/TodoList.ts` implementing Deep Agents TodoList pattern
  - `writeTodos()`: task decomposition and planning using write_todos pattern from LangChain Deep Agents
  - `getTodos()`, `updateTodos()`: task progress tracking with workspace isolation
  - Add complex task decomposition with dependency tracking and progress monitoring
  - Integrate with Executor middleware for automatic todo management during agent execution
  - Enable task pattern learning and template creation for recurring workflows
  - _Requirements: 4_

### Phase 2: Visual Context Engineering UI

- [ ] 4. WorkspaceManager + AutonomyController
  - Create `chrome-extension/src/services/workspace/WorkspaceManager.ts` for workspace lifecycle management
  - `createWorkspace()`, `switchWorkspace()`, `getActiveWorkspace()` with namespace isolation
  - Add autonomy level management with trust-based progression and restriction enforcement
  - Create `chrome-extension/src/services/workspace/AutonomyController.ts` for trust scoring and approval policies
  - Implement per-workspace tool permissions and approval policy enforcement
  - Add cross-workspace synthesis capabilities with controlled sharing and user consent
  - _Requirements: 5_

- [ ] 4.1 Workspace Tabs in SidePanel (LEVERAGE EXISTING UI)
  - Add workspace switcher to existing `pages/side-panel/src/SidePanel.tsx` header
  - Create `WorkspaceSwitcher` component with dropdown showing workspaces, token usage, last activity
  - Add autonomy controls with trust indicators: success rate, suggested level, restrictions
  - Implement workspace activity indicators with colored borders and visual confirmation
  - Maintain existing Shannon header design while adding workspace awareness
  - Follow existing responsive design patterns and dark theme consistency
  - _Requirements: 10_

- [ ] 5. Visual Context Builder with @-Autocomplete
  - Create `pages/side-panel/src/components/ContextPills.tsx` for visual context management
  - Display context pills with icon, label, token count, and removal capability
  - Implement drag-to-reorder functionality for "lost in the middle" mitigation
  - Add suggested pills from AmbientMonitor with user approval workflow
  - Create `ContextVisualBuilder.ts` service for context source management and smart suggestions
  - Show real-time token gauge with compression controls and inclusion/exclusion explanations
  - _Requirements: 6_

- [ ] 5.1 @-Autocomplete System
  - Enhance existing `pages/side-panel/src/components/ChatInput.tsx` with @-mention system
  - Add autocomplete dropdown for context sources: @tab:0, @active, @page, @memory[key], @gmail, @history
  - Implement intelligent suggestions based on task type and current workspace activity
  - Add context preview and token estimates before selection
  - Integrate with ContextVisualBuilder for automatic context pill creation
  - Follow existing UI patterns while adding sophisticated context selection capabilities
  - _Requirements: 6_

- [ ] 6. Extend Options Page with Memory & Context Tabs
  - Add "Memory" and "Context" tabs to existing `pages/options/src/Options.tsx` TABS array
  - Create `pages/options/src/components/MemorySettings.tsx` for memory management UI
  - Display three memory types with statistics: episodic count/tokens, semantic facts, procedural patterns
  - Add memory cleanup controls with workspace isolation and selective deletion
  - Create `pages/options/src/components/ContextSettings.tsx` for context engineering controls
  - Implement token budget controls, compression strategies, and live context visualization
  - _Requirements: 9_

- [ ] 6.1 CompressionControls with Visual Preview
  - Create `pages/options/src/components/CompressionPreviewModal.tsx` for before/after compression preview
  - Show original vs compressed content with token counts and compression ratio
  - Implement user confirmation workflow: preview → approve → apply compressed version
  - Add compression strategy selection: minimal (keep detail), balanced (key decisions), aggressive (conclusions only)
  - Provide "Checkpoint and Clear" functionality for context window management
  - Ensure user transparency and control over all compression operations
  - _Requirements: 9_

### Phase 3: Chrome AI Integration + Ambient Intelligence

- [ ] 7. ChromeAIService using Prompt API (Not Summarizer API)
  - Create `chrome-extension/src/services/ai/ChromeAIService.ts` following HybridAIClient patterns
  - Use Chrome's Prompt API (Gemini Nano) for summarization, fact extraction, and context compression
  - Implement availability checking with transparent fallback to Firebase AI
  - Add compression methods with user-selected strategies and quality preservation
  - Provide token counting and memory extraction capabilities
  - Maintain existing error handling and retry logic patterns from HybridAIClient
  - _Requirements: 7_

- [ ] 8. Gmail Memory Extraction (Demo Value)
  - Add memory extraction methods to existing `chrome-extension/src/services/gmail/GmailService.ts`
  - `extractEmailPatterns()`: frequent contacts, response times, common topics for episodic memory
  - `extractUserPreferences()`: communication style, preferred times, urgency patterns for semantic memory
  - Integrate with existing Gmail OAuth and caching while adding memory awareness
  - Use ChromeAIService for pattern analysis and preference extraction
  - Maintain existing Gmail service architecture with minimal additions
  - _Requirements: 7_

- [ ] 9. AmbientMonitor with Proactive Suggestions
  - Create `chrome-extension/src/services/context/AmbientMonitor.ts` for background intelligence
  - Monitor browser activity: tab changes, URL changes, clipboard content, context quality
  - Detect workspace switching opportunities based on domain classification and activity patterns
  - Provide proactive context suggestions: add current page, compress old context, switch workspace
  - Implement context quality assessment with redundancy and staleness detection
  - Add clipboard monitoring for relevant content with preview and token estimates
  - Create `pages/side-panel/src/components/SuggestedPills.tsx` for ambient suggestion UI
  - _Requirements: 8_

### Phase 4: Integration & Polish

- [ ] 10. Analytics Extensions (Simplified)
  - Add memory and context tracking methods to existing `chrome-extension/src/background/services/analytics.ts`
  - `trackMemorySave()`: episodic, semantic, procedural memory operations with token counts
  - `trackContextOperation()`: WRITE/SELECT/COMPRESS/ISOLATE operations with performance metrics
  - `trackCompression()`: compression events with before/after ratios and strategy effectiveness
  - `trackWorkspaceSwitch()`: workspace switching patterns and ambient suggestion acceptance
  - Maintain existing analytics architecture with minimal additions for memory and context tracking
  - _Requirements: 10_

- [ ] 11. Manual Testing Checklist
  - Create comprehensive testing checklist covering all Deep Agents functionality
  - **Core Functionality**: workspace creation/switching, memory operations, context pills, @-mentions
  - **Integration Tests**: Gemini Nano responses, Firebase fallback, Gmail integration, Chrome storage persistence
  - **UI/UX Tests**: dark theme consistency, animations, token counters, context visualization
  - **Demo Flow**: complete workflow from workspace creation through context management and compression
  - Focus on manual testing for hackathon timeline with essential functionality verification
  - _Requirements: All_

- [ ] 12. Performance Monitoring (Simplified)
  - Create `chrome-extension/src/services/performance/PerformanceMonitor.ts` for basic performance tracking
  - Add timing methods: `startTimer()`, `getAverage()`, `getReport()` for operation duration tracking
  - Monitor key operations: context selection, memory retrieval, compression, workspace switching
  - Provide console logging for performance metrics with operation breakdown
  - Add performance thresholds and warnings for memory usage and context processing
  - Keep implementation simple with console-based reporting for development and debugging
  - _Requirements: All_

## Success Criteria

- **Deep Agents Architecture**: Complete LangGraph Store backend, TodoList middleware, three-tier memory system
- **Context Engineering Excellence**: Working WRITE/SELECT/COMPRESS/ISOLATE pillars with visual controls
- **Workspace Isolation**: Functional multi-context workspaces with independent memory and autonomy levels
- **Visual Context Controls**: @-mention system, context pills, drag-to-reorder, smart suggestions
- **Chrome AI Integration**: Meaningful use of Prompt API with intelligent fallback to Firebase
- **User Experience**: Intuitive visual controls, trust-based autonomy progression, transparent context management
- **Production Quality**: Comprehensive testing, performance monitoring, backward compatibility

## Implementation Notes

### File Structure Overview
```
chrome-extension/src/
├── services/
│   ├── context/
│   │   ├── ContextManager.ts (Task 2)
│   │   └── AmbientMonitor.ts (Task 9)
│   ├── memory/
│   │   └── MemoryService.ts (Task 3)
│   ├── workspace/
│   │   ├── WorkspaceManager.ts (Task 4)
│   │   └── AutonomyController.ts (Task 4)
│   ├── ai/
│   │   └── ChromeAIService.ts (Task 7)
│   └── performance/
│       └── PerformanceMonitor.ts (Task 12)
├── background/agent/middleware/
│   └── TodoList.ts (Task 3.2)
packages/storage/lib/chat/
├── LangGraphStore.ts (Task 1)
└── StorageMigration.ts (Task 1.1)
pages/side-panel/src/components/
├── ContextPills.tsx (Task 5)
└── SuggestedPills.tsx (Task 9)
pages/options/src/components/
├── MemorySettings.tsx (Task 6)
├── ContextSettings.tsx (Task 6)
└── CompressionPreviewModal.tsx (Task 6.1)
```

### Integration Points
- **Existing HybridAIClient**: ChromeAIService follows same patterns with Prompt API integration
- **Existing MessageManager**: Enhanced with workspace awareness and memory integration
- **Existing SidePanel**: Extended with workspace tabs, context pills, and autonomy controls
- **Existing Options**: Enhanced with memory management and context engineering tabs
- **Existing Executor**: Extended with Deep Agents middleware hooks and TodoList integration

### Performance Targets
- **Context Operations**: <500ms for SELECT/COMPRESS operations
- **Memory Operations**: <200ms for episodic/semantic/procedural storage and retrieval
- **UI Responsiveness**: <100ms for context pills, workspace switching, @-mention autocomplete
- **Memory Usage**: Efficient namespace isolation with automatic cleanup and compression

This implementation plan transforms Shannon into a sophisticated Deep Agents platform while preserving all existing functionality and maintaining production quality standards. Each task builds incrementally on proven Shannon architecture patterns while adding cutting-edge agent coordination and context engineering capabilities.