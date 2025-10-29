# Shannon Deep Agents Implementation Tasks
## LangChain Deep Agents + Visual Context Engineering with Human-in-the-Loop

## Implementation Context

**What You Have (Existing Shannon UI):**
✅ Polished side panel with Gemini Nano integration
✅ Settings with tabs: General, Models, Firewall, Analytics, Tools, Help
✅ Gmail integration working (showing inbox in side panel)
✅ Multi-agent system (PlannerAgent, NavigatorAgent)
✅ Chrome storage with chatHistoryStore
✅ Clean React UI with dark theme

**What You Want (Deep Agents + Visual Context Control):**
🎯 Deep Agents architecture (TodoList, filesystem, subagents, long-term memory)
🎯 Visual context builder (@-mentions, context pills, drag-to-reorder)
🎯 Ambient monitoring (proactive suggestions + human approval checkpoints)
🎯 User-controlled compression (Minimal/Balanced/Aggressive strategies)
🎯 Multi-workspace isolation with autonomy levels + visual indicators
🎯 Persistent, resumable agent runs with checkpoints and time travel like LangGraph durable execution + interrupts for human-in-the-loop
🎯 Subagents for delegation like LangChain Deep Agents' planner/subtasks model

**Deep Agents Architecture Approach:**
- **LangGraph Store Backend**: Workspace namespacing with runId branching for time-travel and debugging
- **Context Engineering Four Pillars**: WRITE/SELECT/COMPRESS/ISOLATE with agentId tracking and visual controls
- **Three-Tier Memory System**: Episodic (session steps), Semantic (long-term facts), Procedural (workflow skills)
- **TodoList Middleware**: Deep Agents planning tool with subagent delegation
- **Human-in-the-Loop**: Autonomy levels with approval gates and LangGraph-style interrupts
- **Ambient Intelligence**: Proactive suggestions respecting workspace autonomy policies

## Task List

### Phase 1: Storage & Memory Foundation

- [ ] 1. Enhance Storage with LangGraph Store Backend
  - **AUGMENTATION**: Add `runId` for branching/"time travel" and replay/inspect specific agent runs (LangGraph durable execution)
  - Create `packages/storage/lib/chat/LangGraphStore.ts` with namespace pattern `userId/workspaceId/threadId/runId`
  - Implement core Store API: `put()`, `get()`, `search()`, `delete()` with runId branching support
  - Add workspace management: `createNamespace()`, `cleanupNamespace()` with autonomy level and approval policies
  - Extend existing `ChatHistoryStore` class with workspace + run awareness maintaining backward compatibility
  - Add `saveCompressedSession()` helper for CompressionPreviewModal integration
  - **Integration Points**: Chrome storage grouped by workspace/thread/run, plays with MessageManager and Executor
  - _Requirements: 1_

- [ ] 1.1 Migration + Rollback with Checkpointing
  - **AUGMENTATION**: When restoring, treat checkpoint as new runId branch so we don't overwrite original thread
  - Create `packages/storage/lib/chat/StorageMigration.ts` implementing LangGraph checkpointing patterns
  - Add checkpoint creation: `createCheckpoint()`, `restoreCheckpoint()`, `listCheckpoints()` for conversation time-travel
  - Implement schema versioning for data migrations with rollback capabilities
  - **Key Feature**: Each checkpoint becomes its own runId branch for safe exploration without clobbering original data
  - Enable "what-if" exploration and conversation forking using checkpoint restoration into branched timelines
  - **Why This Matters**: Deep agents need branching and rewind to debug and explore alternate outcomes
  - _Requirements: 1_

- [ ] 2. ContextManager with 4 Pillars (CRITICAL)
  - **AUGMENTATION**: Add `agentId`/`sourceType` to track which subagent produced context (Deep Agents = planner + subagents)
  - **AUGMENTATION**: Add `getContextStats()` for Options > Context tab live breakdown
  - **AUGMENTATION**: Add `removeItem()` for AmbientMonitor and pills to delete context
  - Create `chrome-extension/src/services/context/ContextManager.ts` implementing LangChain's four pillars
  - **WRITE Pillar**: Persist context items into workspace-scoped store (how subagents drop artifacts in shared workspace)
  - **SELECT Pillar**: Context engineering layer/harness - pull only relevant content under token budget
  - **COMPRESS Pillar**: User-controlled strategies with transparency (no silent truncation like other IDE agents)
  - **ISOLATE Pillar**: Workspace-scoped snapshots with cross-workspace synthesis capabilities
  - Add "lost in the middle" mitigation through priority-based reordering
  - **Integration Points**: Uses LangGraphStore, ChromeAIService, exposes clean API for MessageManager and Executor
  - _Requirements: 2_

- [ ] 2.1 Extend MessageManager (Minimal Changes)
  - **AUGMENTATION**: Add `buildModelContext()` helper that prepares final prompt context from ContextManager
  - **AUGMENTATION**: Use `estimateTokenCount()` consistently throughout
  - Add 3-4 new methods to existing `chrome-extension/src/background/agent/messages/service.ts`
  - `buildModelContext()`: Deep Agent harness - wrapper that preps context/tools/memory per run
  - `getWorkspaceContext()`: workspace-scoped context selection using ContextManager SELECT pillar
  - `compressMessages()`: user-controlled compression with strategy selection and preview
  - `selectRelevantMessages()`: context selection with workspace boundaries and memory relevance
  - **Integration**: Single call for Executor to generate final prompt context, maintains backward compatibility
  - _Requirements: 11_

- [ ] 3. Deep Agents Memory Services (THREE TYPES)
  - **AUGMENTATION**: Add `getMemoryStats()`, `clearMemory()`, `deleteFact()` for Task 6 UI
  - **AUGMENTATION**: Track `usageCount` & `lastUsed` for procedural patterns to surface "best workflows"
  - Create `chrome-extension/src/services/memory/MemoryService.ts` with three memory types
  - **Episodic Memory**: Short-term per session - recent conversation steps and decisions
  - **Semantic Memory**: Long-term facts/preferences with vector embeddings for semantic search
  - **Procedural Memory**: Reusable workflows/skills - learned patterns as templates for one-click invocation
  - **Memory Mapping**: Episodic (short-term working memory), Semantic (long-term memory), Procedural (skill library)
  - Add comprehensive management methods for Options UI integration
  - **Why Three Types**: Maps to Deep Agents' split between short-term working memory and long-term skill library
  - _Requirements: 3_

- [ ] 3.1 Extend Executor with Deep Agents Middleware
  - **AUGMENTATION**: Add subagent planning hook (delegation to "research agent", "writer agent", etc.)
  - **AUGMENTATION**: Add human approval checkpoints based on workspace autonomyLevel (LangGraph interrupts)
  - **AUGMENTATION**: Document Executor as "Deep Agent Harness"
  - Add middleware hooks to existing `chrome-extension/src/background/agent/executor.ts`
  - `beforeAgentRun()`: assembles context, memory, todos, and subagent plans up front
  - `afterAgentRun()`: logs success/failure to episodic/procedural memory for reuse
  - `maybePauseForHumanApproval()`: can pause for human approval based on workspace autonomyLevel/approvalPolicies
  - **Key Feature**: Executor = Deep Agent Harness that enforces human approval checkpoints before risky actions
  - **Integration**: Matches LangGraph "interrupts"/human-in-the-loop and Deep Agents' planner/subagent handoff
  - _Requirements: 12_

- [ ] 3.2 TodoList Middleware (Deep Agents Planning)
  - **AUGMENTATION**: Add `SubagentService` stub for planning + delegation logic co-location
  - **AUGMENTATION**: Subagents = "research", "writer", etc. - each gets slice of plan (Deep Agents scaling pattern)
  - Create `chrome-extension/src/background/agent/middleware/TodoList.ts` implementing Deep Agents TodoList pattern
  - `writeTodos()`: task decomposition using write_todos pattern from LangChain Deep Agents
  - `getTodos()`, `updateTodos()`: persistent plan that survives across turns (agent's scratchpad)
  - Add `SubagentService` for delegation mapping - classify tasks and route to focused subagents
  - **Why This Matters**: Todo list = persistent plan, SubagentService = delegation map (Deep Agents pattern)
  - **Integration**: Literally the Deep Agents pattern (planner breaks work into explicit subtasks for helper agents)
  - _Requirements: 4_

- [ ] 3.2.1 SubagentService Implementation (CRITICAL - CURRENTLY STUB)
  - **CRITICAL**: Replace placeholder `return []` with actual delegation logic
  - Implement `SubagentService.planDelegations()` using `ChromeAIService.classifyTaskType()`
  - **Task Classification**: 'research' → research agent, 'drafting' → writer agent, 'calendar' → calendar agent
  - Return concrete delegation plans with agentId and goal per subagent
  - Add confidence scoring for delegation decisions and fallback to main agent
  - **Integration**: Called by Executor.beforeAgentRun() to generate real subagent coordination plans
  - **Why Critical**: Referenced in 4+ places (Tasks 3.1, 5.1, 7, 10) but never actually implemented
  - _Requirements: 4, 12_

### Phase 2: Visual Context Engineering UI

- [ ] 4. WorkspaceManager + AutonomyController
  - **AUGMENTATION**: Add `getWorkspace()` for Executor + AmbientMonitor integration
  - **AUGMENTATION**: Document autonomyLevel and approvalPolicies as human-in-the-loop gate
  - Create `chrome-extension/src/services/workspace/WorkspaceManager.ts` for workspace lifecycle management
  - `createWorkspace()`, `switchWorkspace()`, `getActiveWorkspace()`, `getWorkspace()` with namespace isolation
  - **Autonomy Control**: Low autonomy → always ask, High autonomy → act unless policy blocks
  - **Human-in-the-Loop**: autonomyLevel 1-2 = ask always, 3-4 = ask for sensitive surfaces, 5 = mostly autonomous
  - **Integration**: Matches LangGraph "interrupts" where agent pauses for approval based on workspace policies
  - Add cross-workspace synthesis capabilities with controlled sharing and user consent
  - _Requirements: 5_

- [ ] 4.1 Workspace Tabs in SidePanel (LEVERAGE EXISTING UI)
  - **AUGMENTATION**: Show autonomy badge color next to workspace switcher so user always knows safety mode
  - Add workspace switcher to existing `pages/side-panel/src/SidePanel.tsx` header
  - Create `WorkspaceSwitcher` component with dropdown showing workspaces, token usage, last activity
  - Add `AutonomyBadge` component with color coding: yellow (Ask First), teal (Balanced), green (Auto)
  - Implement workspace activity indicators with colored borders and visual confirmation
  - **Visual Design**: Follow existing dark theme + teal accents, minimal changes to proven UI
  - **Integration**: Maintains existing Shannon header design while adding workspace + autonomy awareness
  - _Requirements: 10_

- [ ] 4.2 ApprovalModal Component (CRITICAL - MISSING)
  - **CRITICAL**: Create UI component to handle `AGENT_APPROVAL_REQUIRED` messages from Executor
  - Create `pages/side-panel/src/components/ApprovalModal.tsx` for human-in-the-loop UI
  - Listen for `AGENT_APPROVAL_REQUIRED` messages and display planned actions in modal
  - Add clear approve/reject buttons with safety indicators showing autonomy level and risk assessment
  - Send `AGENT_APPROVAL_GRANTED` or `AGENT_APPROVAL_REJECTED` responses back to Executor
  - **Integration**: Add `<ApprovalModal />` to SidePanel.tsx root component
  - **Why Critical**: Task 3.1 sends approval messages but no UI component receives them
  - **Visual Design**: Warning colors for low autonomy, info colors for confirmations
  - _Requirements: 5, 12_

- [ ] 4.3 Session Management in WorkspaceManager (CRITICAL - UNDEFINED)
  - **CRITICAL**: Resolve "sessionId TBD" references throughout Tasks 1, 2.1, 3, 6.1
  - Add `getActiveSession(workspaceId)` method to WorkspaceManager
  - Auto-generate sessionId on first message per workspace using timestamp + random
  - Store active sessionId per workspace in chrome.storage.local with key pattern: `session_${workspaceId}`
  - Add session lifecycle: `createSession()`, `switchSession()`, `listSessions()`
  - **Integration**: Resolves sessionId parameter in LangGraphStore, MessageManager, MemoryService, CompressionPreviewModal
  - **Why Critical**: Multiple tasks reference sessionId but no task explains how to get it
  - _Requirements: 5_

- [ ] 5. Visual Context Builder with @-Autocomplete
  - **AUGMENTATION**: Add `agentId` to pills so we can see which subagent contributed context (Research Agent vs Main Agent)
  - **AUGMENTATION**: Persist pill reordering back into ContextManager priority
  - **AUGMENTATION**: Include SuggestedPills (AmbientMonitor) inline
  - Create `pages/side-panel/src/components/ContextPills.tsx` for visual context management
  - Display context pills with icon, label, token count, agentId badge, and removal capability
  - Implement drag-to-reorder functionality for "lost in the middle" mitigation with priority updates
  - Add suggested pills from AmbientMonitor with user approval workflow
  - **Key Feature**: updatePillPriorities should update each pill's priority back into ContextManager
  - **Visual Design**: Use current dark theme + teal accents, show agentId badges for subagent attribution
  - _Requirements: 6_

- [ ] 5.1 @-Autocomplete System
  - **AUGMENTATION**: Add `@agent:*` options so user can explicitly pull in subagent results ("@agent:research")
  - **AUGMENTATION**: When user selects subagent option, create pill with agentId
  - Enhance existing `pages/side-panel/src/components/ChatInput.tsx` with @-mention system
  - Add autocomplete dropdown: @tab:0, @active, @page, @memory[key], @gmail, @history, @agent:research, @agent:writer
  - Implement intelligent suggestions based on task type and current workspace activity
  - Add context preview and token estimates before selection
  - **Integration**: When @agent:* selected, creates context pill with agentId for subagent attribution
  - **Pattern**: @page:0, @active, @gmail, @memory[key], @agent:research, @agent:writer
  - _Requirements: 6_

- [ ] 6. Extend Options Page with Memory & Context Tabs
  - **AUGMENTATION**: MemorySettings uses new MemoryService methods: getMemoryStats, clearMemory, deleteFact, listPatterns
  - **AUGMENTATION**: Add clear explanation of Episodic/Semantic/Procedural aligned with Deep Agents memory model
  - **AUGMENTATION**: ContextSettings uses ContextManager.getContextStats()
  - Add "Memory" and "Context" tabs to existing `pages/options/src/Options.tsx` TABS array
  - Create `pages/options/src/components/MemorySettings.tsx` with three memory type explanations
  - **Memory Explanation**: Episodic (recent steps), Semantic (long-term facts), Procedural (reusable workflows)
  - Display comprehensive statistics, cleanup controls, and pattern export functionality
  - Create `pages/options/src/components/ContextSettings.tsx` for context engineering controls
  - **Integration**: Uses ContextManager.getContextStats() for live breakdown and token visualization
  - _Requirements: 9_

- [ ] 6.1 CompressionControls with Visual Preview
  - **AUGMENTATION**: Before applying compression, create checkpoint via StorageMigration.createCheckpoint() for time-travel
  - **AUGMENTATION**: Use MessageManager.estimateTokenCount consistently
  - Create `pages/options/src/components/CompressionPreviewModal.tsx` for before/after compression preview
  - Show original vs compressed content with token counts and compression ratio
  - **Key Feature**: Create checkpoint BEFORE overwriting messages so user can time-travel back (LangGraph pattern)
  - Add compression strategy selection: minimal (keep detail), balanced (key decisions), aggressive (conclusions only)
  - **Why This Matters**: No silent summarization behind user's back (unlike other IDE agents), transparency = trust
  - **Integration**: Checkpoint before compressing enables LangGraph time travel, user can restore previous state
  - _Requirements: 9_

### Phase 3: Chrome AI Integration + Ambient Intelligence

- [ ] 7. ChromeAIService using Prompt API (Not Summarizer API)
  - **AUGMENTATION**: Add `classifyTaskType()` for SubagentService routing (research vs writer, etc.)
  - **AUGMENTATION**: Keep Prompt API (Gemini Nano) first, with Firebase fallback
  - Create `chrome-extension/src/services/ai/ChromeAIService.ts` following HybridAIClient patterns
  - Use Chrome's Prompt API (Gemini Nano) for summarization, fact extraction, context compression, AND task classification
  - Add `classifyTaskType()` method for subagent routing decisions (research/drafting/calendar/other)
  - Implement availability checking with transparent fallback to Firebase AI
  - **Integration**: SubagentService can call classifyTaskType to decide agent routing, satisfies Chrome hackathon rules
  - **Key Feature**: Powers summarization, compression, key-fact extraction, AND lightweight task classification
  - _Requirements: 7_

- [ ] 8. Gmail Memory Extraction (Demo Value)
  - **AUGMENTATION**: Explicitly saves derived preferences into Semantic Memory (long-term facts)
  - **AUGMENTATION**: This is how Shannon "learns" from email without re-scraping every time
  - Add memory extraction methods to existing `chrome-extension/src/services/gmail/GmailService.ts`
  - `extractEmailPatterns()`: frequent contacts, response times, common topics → saves to semantic memory
  - `extractUserPreferences()`: communication style, preferred times → persists as reusable facts
  - **Key Feature**: Behavioral patterns extracted once and stored in semantic memory for cross-session reuse
  - **Integration**: Uses ChromeAIService for analysis, MemoryService for persistence, existing Gmail OAuth
  - **Demo Value**: Shows cross-app context awareness and learning from email patterns
  - _Requirements: 7_

- [ ] 9. AmbientMonitor with Proactive Suggestions
  - **AUGMENTATION**: Integrate WorkspaceManager + autonomyLevel to decide if suggestion should auto-apply or ask
  - **AUGMENTATION**: Treat suggestions as "interrupts": pause, notify, wait for user (LangGraph human-in-the-loop)
  - Create `chrome-extension/src/services/context/AmbientMonitor.ts` for background intelligence
  - Monitor browser activity: tab changes, URL changes, clipboard content, context quality
  - **Human-in-the-Loop**: Respect autonomyLevel before taking actions (low autonomy → ask, high autonomy → act unless blocked)
  - Provide proactive context suggestions: add current page, compress old context, switch workspace
  - **Key Feature**: Suggestions respect workspace autonomy policies - low autonomy workspaces always ask first
  - Create `pages/side-panel/src/components/SuggestedPills.tsx` with accept/dismiss workflow
  - **Integration**: Maps to LangGraph "interrupts" where agent pauses for approval based on workspace settings
  - _Requirements: 8_

- [ ] 9.1 AmbientMonitor Helper Methods (CRITICAL - REFERENCED BUT NOT IMPLEMENTED)
  - **CRITICAL**: Implement methods referenced in Task 9 code but never defined
  - Implement `findOrCreateWorkspace(domainType)` for intelligent workspace routing
    - Search existing workspaces for matching description/tags based on domain classification
    - Create new workspace with appropriate autonomy level if not found (work=2, research=3, social=4)
    - Return workspaceId for workspace switching suggestions
  - Implement `extractPageContent(tabId)` for page context extraction
    - Inject content script to scrape visible page text (first 1000 characters)
    - Sanitize content and handle errors gracefully with fallback to page title + URL
    - Return formatted content for context suggestions
  - **Integration**: Called by AmbientMonitor.handleActiveTab() for context and workspace suggestions
  - **Why Critical**: Task 9 references these methods at lines ~180 and ~220 but they don't exist
  - _Requirements: 8_

### Phase 4: Integration & Polish

- [ ] 10. Analytics Extensions (Simplified)
  - **AUGMENTATION**: Add `trackSubagentDelegation()` to measure subagent usage (Deep Agents rely on subagent handoff)
  - Add memory and context tracking methods to existing `chrome-extension/src/background/services/analytics.ts`
  - `trackMemorySave()`: episodic, semantic, procedural memory operations with token counts
  - `trackContextOperation()`: WRITE/SELECT/COMPRESS/ISOLATE operations with performance metrics
  - `trackCompression()`: compression events with before/after ratios and strategy effectiveness
  - `trackWorkspaceSwitch()`: workspace switching patterns and ambient suggestion acceptance
  - `trackSubagentDelegation()`: measure how often subagents are used for task delegation
  - **Integration**: Maintains existing analytics architecture with minimal additions
  - _Requirements: 10_

- [ ] 11. Manual Testing Checklist
  - **AUGMENTATION**: Add checkpoints/time travel testing
  - **AUGMENTATION**: Add autonomy/approval gate testing
  - **AUGMENTATION**: Add subagent delegation + ambient suggestions testing
  - Create comprehensive testing checklist covering all Deep Agents functionality
  - **Core Functionality**: workspace creation/switching, autonomy levels, memory operations, context pills, @-mentions
  - **Human-in-the-Loop**: low-autonomy workspace forces approval, high-autonomy skips approval for safe actions
  - **Deep Agents Features**: subagent delegation plans, agentId badges, checkpoint/restore time travel
  - **Integration Tests**: Gemini Nano responses, Firebase fallback, Gmail memory extraction, ambient suggestions
  - **Demo Flow**: workspace creation → autonomy testing → context management → compression with checkpoints
  - **Time**: 2-3 hours manual testing with focus on autonomy gates and time travel features
  - _Requirements: All_

- [ ] 12. Performance Monitoring (Simplified)
  - **AUGMENTATION**: Wrap Executor.beforeAgentRun, Executor.afterAgentRun, compression calls for step latency
  - **AUGMENTATION**: Measure "durable execution" / long-running agents (aligns with LangGraph resumable runs)
  - Create `chrome-extension/src/services/performance/PerformanceMonitor.ts` for basic performance tracking
  - Add timing methods: `startTimer()`, `getAverage()`, `getReport()` for operation duration tracking
  - **Key Operations**: executor.beforeAgentRun, context.compress, memory operations, workspace switching
  - **Focus**: Time each major Deep Agent step for debugging/resume story
  - **Integration**: Simple perf monitor for debugging resumable agent runs and checkpoint performance
  - **Usage**: Wrap major operations like context selection, memory retrieval, agent execution phases
  - _Requirements: All_

- [ ] 13. Shared Token Estimator Utility (MINOR - REDUCES DUPLICATION)
  - **MINOR**: Consolidate token estimation logic from Tasks 2 and 2.1 to reduce maintenance burden
  - Create `chrome-extension/src/utils/tokenEstimator.ts` with single implementation
  - Export `estimateTokenCount(text: string): number` using 4-char-per-token approximation
  - Update ContextManager and MessageManager to import from shared utility instead of duplicate methods
  - **Benefit**: Single source of truth for token estimation across entire codebase
  - **Integration**: Used by ContextManager, MessageManager, MemoryService for consistent token counting
  - _Requirements: All_

## Success Criteria

- **Deep Agents Architecture**: Complete LangGraph Store with runId branching, TodoList middleware, SubagentService delegation
- **Context Engineering Excellence**: Working WRITE/SELECT/COMPRESS/ISOLATE pillars with agentId tracking and visual controls
- **Human-in-the-Loop**: Autonomy levels with approval gates, LangGraph-style interrupts, workspace-scoped policies
- **Time Travel & Checkpointing**: Checkpoint creation before compression, runId branching, conversation forking
- **Workspace Isolation**: Multi-context workspaces with independent memory, autonomy levels, and visual indicators
- **Visual Context Controls**: @-mention system with @agent:* options, context pills with agentId badges, ambient suggestions
- **Chrome AI Integration**: Prompt API for compression/classification with intelligent Firebase fallback
- **Production Quality**: Comprehensive testing including autonomy gates, performance monitoring, backward compatibility

## Implementation Notes

### File Structure Overview
```
chrome-extension/src/
├── services/
│   ├── context/
│   │   ├── ContextManager.ts (Task 2) - 4 pillars + agentId tracking + getContextStats/removeItem
│   │   └── AmbientMonitor.ts (Task 9, 9.1) - proactive suggestions + autonomy gating + helper methods
│   ├── memory/
│   │   └── MemoryService.ts (Task 3) - episodic/semantic/procedural + stats/cleanup
│   ├── workspace/
│   │   ├── WorkspaceManager.ts (Task 4, 4.3) - autonomyLevel + getWorkspace + session management
│   │   └── AutonomyController.ts (Task 4) - human-in-the-loop gates
│   ├── ai/
│   │   └── ChromeAIService.ts (Task 7) - Prompt API + classifyTaskType for subagents
│   ├── performance/
│   │   └── PerformanceMonitor.ts (Task 12) - executor step timing
│   └── utils/
│       └── tokenEstimator.ts (Task 13) - shared token counting utility
├── background/agent/
│   ├── executor.ts (Task 3.1) - Deep Agent harness + human approval checkpoints
│   └── middleware/
│       └── TodoList.ts (Task 3.2, 3.2.1) - TodoList + SubagentService implementation
packages/storage/lib/chat/
├── LangGraphStore.ts (Task 1) - runId branching + workspace namespacing
└── StorageMigration.ts (Task 1.1) - checkpointing + time travel
pages/side-panel/src/
├── SidePanel.tsx (Task 4.1) - WorkspaceSwitcher + AutonomyBadge + ApprovalModal
└── components/
    ├── ContextPills.tsx (Task 5) - agentId badges + drag-to-reorder
    ├── ChatInput.tsx (Task 5.1) - @agent:* autocomplete
    ├── SuggestedPills.tsx (Task 9) - ambient suggestions UI
    └── ApprovalModal.tsx (Task 4.2) - human-in-the-loop approval UI
pages/options/src/components/
├── MemorySettings.tsx (Task 6) - three memory types + stats/cleanup
├── ContextSettings.tsx (Task 6) - token budget + compression controls
└── CompressionPreviewModal.tsx (Task 6.1) - checkpoint before compression
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
- **Agent Execution**: <1000ms for beforeAgentRun/afterAgentRun middleware (measured by PerformanceMonitor)
- **Memory Usage**: Efficient namespace isolation with automatic cleanup and compression

### Final Implementation Summary
**Total Code to Write**: ~25 files, ~4,500+ lines, ~35-44 days raw / ~3-4 weeks with AI assist

**Critical Additions Made**: 5 essential tasks added to fix implementation gaps:
- **Task 3.2.1**: SubagentService actual implementation (was just stub)
- **Task 4.2**: ApprovalModal component (handles AGENT_APPROVAL_REQUIRED messages)
- **Task 4.3**: Session management (resolves "sessionId TBD" throughout)
- **Task 9.1**: AmbientMonitor helper methods (implements referenced but missing methods)
- **Task 13**: Shared token estimator (reduces code duplication)

**What to Tell Kiro**: "Implement Shannon Deep Agents architecture task-by-task using the exact augmented code provided. The spec now includes 5 critical additions that were missing from the original plan. Start with Task 1 (LangGraphStore with runId branching) and wait for confirmation before proceeding to the next task."

**Priority Order**: 
1. **Week 1**: Foundation (Tasks 1, 1.1, 4.3, 2, 2.1, 13) - Storage + Session + Context + Token utils
2. **Week 2**: Core Features (Tasks 3, 3.1, 3.2, 3.2.1, 4, 4.1, 4.2) - Memory + Executor + Workspace + Approval
3. **Week 3**: Visual & Intelligence (Tasks 5, 5.1, 6, 6.1, 7, 8, 9, 9.1) - Context Pills + Options + AI + Ambient
4. **Week 4**: Polish (Tasks 10, 11, 12) - Analytics + Testing + Performance

This implementation plan transforms Shannon into a sophisticated Deep Agents platform with LangGraph-style checkpointing, human-in-the-loop interrupts, subagent delegation, and visual context engineering while preserving all existing functionality and maintaining production quality standards.