# Code Architecture & Implementation Mapping
## Technical Deep Dive: Where Everything Fits

---

## 1. Current Architecture: File-by-File Analysis

### 1.1 HybridAIClient.ts (276 lines)
**Location**: `chrome-extension/src/background/llm/HybridAIClient.ts`

**Current Responsibility**: Unified entry point for Nano + Cloud

**Key Methods**:
- `initialize()` (lines 52-100) - Loads user preference, checks Nano availability
- `invoke()` (lines ~150-200) - Current implementation for single calls
- `getStatus()` (lines ~220-250) - Reports Nano/Cloud availability

**Problem**: No session concept; each `invoke()` may create new session

```typescript
// Current (BEFORE):
async invoke(options: InvokeOptions): Promise<InvokeResponse> {
  // Each invoke is independent - no session reuse
  if (this.nanoModel) {
    return await this.nanoModel.invoke(...);
  }
  return await firebaseInvoke(...);
}
```

**Proposed Addition** (Week 1):
```typescript
// NEW METHOD (add 50 lines):
async createSession(config: SessionConfig): Promise<HybridSession> {
  if (this.nanoModel && config.provider !== 'cloud') {
    return new NanoSession(this.nanoModel, config);
  }
  return new CloudSession(config);
}
```

### 1.2 GeminiNanoChatModel.ts (603 lines)
**Location**: `chrome-extension/src/background/llm/langchain/GeminiNanoChatModel.ts`

**Current Responsibility**: LangChain-compatible Nano wrapper with session reuse

**Key Patterns**:
- Line 27: `private sessionPromise: Promise<AILanguageModelSession> | null = null;`
- Lines 41-65: `getSession()` method - **ALREADY IMPLEMENTS SESSION REUSE**
- Lines 68-98: `createSession()` - Creates session with initialPrompts
- Lines 108-115: `destroySession()` - Cleanup method (exists but rarely called)

**Current Behavior**:
```typescript
private async getSession(): Promise<AILanguageModelSession> {
  if (this.session) return this.session;        // ✅ Reuse if exists
  if (this.sessionPromise) return this.sessionPromise; // ✅ Wait for pending
  
  this.sessionPromise = this.createSession();
  try {
    this.session = await this.sessionPromise;
    return this.session;
  } finally {
    this.sessionPromise = null;
  }
}
```

**Problem**: Session reuse happens WITHIN a model instance, but new instances may be created per step

**How Proposal Uses This**:
```typescript
// NanoSession.ts (NEW FILE):
class NanoSession implements HybridSession {
  constructor(nanoModel: GeminiNanoChatModel, config) {
    this.nanoModel = nanoModel;
    // Don't recreate model; reuse existing one
  }
  
  async invoke(input) {
    return await this.nanoModel.invoke(input);
    // ↑ Uses existing session via getSession()
  }
}
```

**Status**: No changes needed; NanoSession wraps existing behavior.

### 1.3 Executor.ts (431 lines)
**Location**: `chrome-extension/src/background/agent/executor.ts`

**Current Responsibility**: Orchestrates Planner + Navigator agents across steps

**Key Methods**:
- Lines 41-75: `constructor()` - Initializes agents
- Lines 150-250: `execute()` - Main loop running steps
- Line 221: `storeAgentStepHistory()` - Saves history to storage

**Current Agent Initialization** (lines 67-79):
```typescript
this.navigator = new NavigatorAgent(navigatorActionRegistry, {
  aiClient: aiClient,        // Shared client
  context: context,
  prompt: this.navigatorPrompt,
});

this.planner = new PlannerAgent({
  aiClient: aiClient,        // Same client
  context: context,
  prompt: this.plannerPrompt,
});
```

**Problem**: Agents get aiClient but no session management

**Proposed Modification** (Week 2, +20 lines):
```typescript
export class Executor {
  private readonly navigator: NavigatorAgent;
  private readonly planner: PlannerAgent;
  private session: HybridSession;  // ← NEW FIELD
  
  constructor(...) {
    // ... existing code ...
    
    // NEW (Week 2): Create task-scoped session
    this.session = await aiClient.createSession({
      systemPrompt: this.navigatorPrompt.getSystemMessage(),
      initialHistory: messageManager.getSessionInitMessages(),
      provider: 'nano' // Prefer Nano, fallback to Cloud
    });
  }
  
  async execute() {
    // ... existing loop ...
    
    // OLD: const result = await this.planner.invoke(messages);
    // NEW: 
    const result = await this.planner.invoke(messages, this.session);
    // ↑ Pass session to agent
  }
  
  async cleanup() {
    // ... existing cleanup ...
    
    // NEW:
    await this.session.destroy();
  }
}
```

### 1.4 BaseAgent.ts (157 lines)
**Location**: `chrome-extension/src/background/agent/agents/base.ts`

**Current Responsibility**: Abstract base class for Planner/Navigator agents

**Key Methods**:
- Lines 43-48: `invoke()` signature - **NEEDS MODIFICATION**
- Lines 60-100: Current invoke implementation calls `aiClient.invoke()`

**Current Implementation** (lines 63-90):
```typescript
async invoke(inputMessages: BaseMessage[]): Promise<this['ModelOutput']> {
  const systemMessage = this.prompt.getSystemMessage();
  const systemPrompt = systemMessage?.content as string | undefined;
  const prompt = this.convertMessagesToPrompt(inputMessages);
  
  // ← SYSTEM PROMPT RESENT HERE EVERY CALL
  const response = await this.aiClient.invoke({
    prompt,
    system: systemPrompt,    // Sent every invocation ← Problem!
    schema: this.modelOutputSchema,
  });
  
  const parsed = JSON.parse(response.content);
  return this.modelOutputSchema.parse(parsed);
}
```

**Problem**: `system: systemPrompt` sent with every step (redundant)

**Proposed Modification** (Week 2, +15 lines):
```typescript
async invoke(
  inputMessages: BaseMessage[],
  session?: HybridSession  // ← NEW PARAMETER
): Promise<this['ModelOutput']> {
  const prompt = this.convertMessagesToPrompt(inputMessages);
  
  let response;
  
  if (session) {
    // NEW: Use session (system prompt already in session)
    response = await session.invoke({
      messages: inputMessages,
      schema: this.modelOutputSchema,
    });
  } else {
    // FALLBACK: Legacy path (backward compatible)
    const systemPrompt = this.prompt.getSystemMessage()?.content as string;
    response = await this.aiClient.invoke({
      prompt,
      system: systemPrompt,
      schema: this.modelOutputSchema,
    });
  }
  
  const parsed = JSON.parse(response.content);
  return this.modelOutputSchema.parse(parsed);
}
```

**Impact**: When session provided, system prompt not sent repeatedly.

### 1.5 MessageManager.ts (441 lines)
**Location**: `chrome-extension/src/background/agent/messages/service.ts`

**Current Responsibility**: Message history tracking + token estimation

**Key Methods**:
- Lines 44-80: `initTaskMessages()` - Sets up conversation start
- Lines 150-180: `addMessageWithTokens()` - Tracks history + token usage
- Lines 200-250: `getMessages()` - Returns all messages

**Current Usage** (lines 44-80):
```typescript
public initTaskMessages(systemMessage: SystemMessage, task: string): void {
  this.addMessageWithTokens(systemMessage, 'init');
  
  if (messageContext?.length > 0) {
    const contextMessage = new HumanMessage({
      content: `Context for the task: ${messageContext}`,
    });
    this.addMessageWithTokens(contextMessage, 'init');
  }
  
  const taskMessage = MessageManager.taskInstructions(task);
  this.addMessageWithTokens(taskMessage, 'init');
  
  // ... add example output ...
}
```

**Problem**: No distinction between session-init messages and per-step messages

**Proposed Addition** (Week 3, +35 lines):
```typescript
// NEW METHOD (add after initTaskMessages):
public getSessionInitMessages(): BaseMessage[] {
  // Return only: [system, task, examples] - sent once at session start
  return [
    this.systemMessage,
    this.taskMessage,
    ...this.exampleMessages
  ];
}

public getIncrementalMessages(): BaseMessage[] {
  // Return only current step's state (sent per step)
  return this.history.slice(this.sessionInitEndIndex);
}

// This allows:
// Week 1: session.init with getSessionInitMessages() → 1000 tokens once
// Week 2-10: session.step with state only → 500 tokens each
// Total: 6000 vs old 15000 tokens
```

### 1.6 FirebaseBridge.ts (481 lines)
**Location**: `pages/side-panel/src/firebaseBridge.ts`

**Current Responsibility**: Cloud fallback handler (runs in side-panel page context)

**Key Methods**:
- Lines 16-60: `initializeFirebase()` - Sets up Firebase AI Logic SDK
- Lines 280-350: Schema handling and prompt construction
- Lines 350-420: `generateContent()` - Main generation logic

**Current Challenge** (lines 300-340):
```typescript
// Firebase doesn't support native sessions
// So it reconstructs context per call:

const parts: Array<{ text: string }> = [];
if (system) {
  parts.push({ text: system });  // ← System sent every call
}

// For complex schemas, use prompt-based JSON instructions
if (schema) {
  schemaDescription = createSchemaDescription(simplifiedSchema);
  finalPrompt = `${prompt}\n\n${schemaDescription}...`;
  // ← Schema description added every call
}

const response = await modelToUse.generateContent(parts);
```

**How Proposal Handles This**:
```typescript
// CloudSession.ts (NEW FILE):
class CloudSession implements HybridSession {
  private systemPrompt: string;  // Cached from init
  private schemaInstructions: string; // Cached from init
  
  constructor(config: SessionConfig) {
    this.systemPrompt = config.systemPrompt; // Set once
    this.schemaInstructions = config.schemaInstructions; // Set once
  }
  
  async invoke(input) {
    // SystemPrompt and schema already cached
    // Just send incremental state
    const parts = [
      { text: this.systemPrompt },      // ← From cache
      { text: this.schemaInstructions }, // ← From cache
      { text: stateDelta }              // ← New data
    ];
    
    return await baseModel.generateContent(parts);
  }
}
```

**Status**: FirebaseBridge stays as-is; CloudSession is thin wrapper.

### 1.7 New Files to Create (Week 1)

#### `chrome-extension/src/background/llm/sessions/HybridSession.ts` (100 lines)
```typescript
// Interface definition
export interface HybridSession {
  readonly id: string;
  readonly provider: 'nano' | 'cloud';
  readonly inputQuota: number;
  readonly inputUsage: number;
  
  invoke(input: {
    messages: BaseMessage[];
    schema?: any;
  }): Promise<string>;
  
  destroy(): void;
}

export interface SessionConfig {
  systemPrompt: string;
  schemaInstructions?: string;
  initialHistory?: BaseMessage[];
  temperature?: number;
  topK?: number;
  provider?: 'nano' | 'cloud';
}
```

#### `chrome-extension/src/background/llm/sessions/NanoSession.ts` (200 lines)
```typescript
import type { HybridSession, SessionConfig } from './HybridSession';
import type { GeminiNanoChatModel } from '../langchain/GeminiNanoChatModel';

export class NanoSession implements HybridSession {
  id: string;
  provider: 'nano' = 'nano';
  private nanoModel: GeminiNanoChatModel;
  private systemPrompt: string;
  
  constructor(nanoModel: GeminiNanoChatModel, config: SessionConfig) {
    this.id = crypto.randomUUID();
    this.nanoModel = nanoModel;
    this.systemPrompt = config.systemPrompt;
  }
  
  async invoke(input): Promise<string> {
    // Reuse underlying Nano session via nanoModel.getSession()
    return await this.nanoModel.invoke({
      messages: input.messages,
      schema: input.schema
    });
  }
  
  destroy(): void {
    this.nanoModel.destroySession();
  }
}
```

#### `chrome-extension/src/background/llm/sessions/CloudSession.ts` (250 lines)
```typescript
// Similar to NanoSession but for Firebase Cloud
// Reconstructs context on each invoke() call
// See HybridAIClient.invoke() for pattern
```

#### `chrome-extension/src/background/llm/sessions/SessionManager.ts` (300 lines)
```typescript
export class SessionManager {
  private sessions: Map<string, HybridSession> = new Map();
  
  async createSession(config: SessionConfig): Promise<HybridSession> {
    // Detect best provider and create appropriate session
    // Handle fallback: if Nano unavailable, use Cloud
    // Cache decision for future use
  }
  
  async getSession(id: string): Promise<HybridSession> {
    return this.sessions.get(id)!;
  }
  
  async destroySession(id: string): Promise<void> {
    const session = this.sessions.get(id);
    if (session) {
      await session.destroy();
      this.sessions.delete(id);
    }
  }
}
```

---

## 2. Token Flow: Before vs. After

### Before (Current Step-Scoped)

```
Task: Execute Planner (3 steps) + Navigator (7 steps) = 10 steps

Step 1 (Planner):
  │
  ├─ Create new session
  │  └─ initialPrompts: [system message]  → 500 tokens
  │
  ├─ invoke(planner_messages)
  │  ├─ system: systemPrompt  → 500 tokens (REDUNDANT - already in session)
  │  ├─ prompt: state        → 500 tokens
  │  └─ schema: schema       → 300 tokens
  │
  ├─ Response: plan
  │  └─ 200 tokens
  │
  └─ Destroy session

Step 2 (Navigator):
  │
  ├─ Create NEW session  ← PROBLEM: system prompt lost
  │  └─ initialPrompts: [system message]  → 500 tokens (REPEATED)
  │
  ├─ invoke(navigator_messages)
  │  ├─ system: systemPrompt  → 500 tokens (REPEATED)
  │  ├─ prompt: state        → 500 tokens
  │  └─ schema: schema       → 300 tokens
  │
  ├─ Response: actions
  │  └─ 200 tokens
  │
  └─ Destroy session

Steps 3-10: Repeat pattern (8 more times)

TOTAL TOKEN CALCULATION:
  System prompt: 10 steps × 500 tokens = 5000 tokens (WASTE)
  Schema description: 10 steps × 300 tokens = 3000 tokens (WASTE)
  State (useful): 10 steps × 500 tokens = 5000 tokens (USEFUL)
  Responses: 10 steps × 200 tokens = 2000 tokens (USEFUL)
  ─────────────────────────────────
  Grand Total: 15,000 tokens
  Waste Percentage: (5000 + 3000) / 15000 = 53% WASTED
```

### After (Proposed Task-Scoped)

```
Same task with task-scoped session:

Session Init (ONCE at task start):
  │
  ├─ Create session with systemPrompt + schema instructions
  │  ├─ systemPrompt        → 500 tokens (sent ONCE)
  │  ├─ schemaInstructions  → 300 tokens (sent ONCE)
  │  └─ taskDescription     → 200 tokens (sent ONCE)
  │
  └─ Session ID: abc-123 created ✓

Step 1 (Planner) - REUSE session:
  │
  ├─ session.invoke({
  │    messages: [planner_state]  → 500 tokens only
  │  })
  │
  └─ Response: plan → 200 tokens

Steps 2-10 (Navigator) - REUSE session:
  │
  ├─ session.invoke({
  │    messages: [state_delta]  → 500 tokens only
  │  })
  │
  └─ Responses × 9 steps → 200 tokens each

Task Complete:
  │
  └─ session.destroy()

TOTAL TOKEN CALCULATION:
  Session init (once): 1000 tokens (FIXED)
  State per step (10 steps): 10 × 500 = 5000 tokens (USEFUL)
  Responses (10 steps): 10 × 200 = 2000 tokens (USEFUL)
  ─────────────────────────────────
  Grand Total: 8,000 tokens
  Savings: 15,000 - 8,000 = 7,000 tokens (47% reduction)
  
  NOTE: System prompt + schema NOT repeated = 53% → 12% waste ratio
```

---

## 3. Code Call Sequence: Current vs. Proposed

### Current Call Sequence

```
main.ts
  └─ executor.run()
      ├─ this.planner.invoke(messages)  [Step 1]
      │   └─ baseAgent.invoke(messages)
      │       └─ aiClient.invoke({
      │            prompt,
      │            system: systemPrompt,  ← SENT
      │            schema: schema
      │          })
      │           └─ GeminiNanoChatModel.invoke()
      │               └─ getSession()
      │                   ├─ Create new session with systemPrompt
      │                   └─ session.prompt(convertedPrompt)
      │
      ├─ this.navigator.invoke(messages)  [Steps 2-10]
      │   └─ baseAgent.invoke(messages)
      │       └─ aiClient.invoke({
      │            prompt,
      │            system: systemPrompt,  ← SENT AGAIN
      │            schema: schema
      │          })
      │           └─ GeminiNanoChatModel.invoke()
      │               └─ getSession()
      │                   ├─ Create NEW session with systemPrompt ← PROBLEM
      │                   └─ session.prompt(convertedPrompt)
```

### Proposed Call Sequence

```
main.ts
  └─ executor.run()
      │
      ├─ Create session (NEW)
      │   └─ this.session = await aiClient.createSession({
      │        systemPrompt: navigatorPrompt.getSystemMessage(),
      │        initialHistory: messageManager.getSessionInitMessages()
      │      })
      │       └─ SessionManager.createSession()
      │           ├─ Nano available?
      │           │   └─ new NanoSession(nanoModel, config)
      │           │       └─ Caches systemPrompt in session
      │           │
      │           └─ Nano unavailable?
      │               └─ new CloudSession(config)
      │                   └─ Caches systemPrompt + schema in session
      │
      ├─ this.planner.invoke(messages, this.session)  [Step 1]
      │   └─ baseAgent.invoke(messages, session)
      │       └─ session.invoke({  ← Use session!
      │            messages: [...],
      │            schema: schema
      │          })
      │           ├─ NanoSession:
      │           │   └─ nanoModel.invoke() [system already in session]
      │           │
      │           └─ CloudSession:
      │               └─ baseModel.generateContent([
      │                    cached systemPrompt,
      │                    cached schema,
      │                    new state
      │                  ])
      │
      ├─ this.navigator.invoke(messages, this.session)  [Steps 2-10]
      │   └─ baseAgent.invoke(messages, session)
      │       └─ session.invoke({  ← REUSE session!
      │            messages: [...],
      │            schema: schema
      │          })
      │           └─ Same flow, NO systemPrompt repetition
      │
      └─ this.session.destroy()  [Task complete]
          └─ Cleanup resources
```

---

## 4. File Modification Matrix

| File | Week | Lines Changed | Type | Impact |
|------|------|---------------|------|--------|
| HybridAIClient.ts | 1 | +50 | Add method | createSession() entry point |
| Executor.ts | 2 | +20 | Add fields + calls | Session creation/passing/cleanup |
| BaseAgent.ts | 2 | +15 | Modify method | Accept session parameter |
| MessageManager.ts | 3 | +35 | Add method | getSessionInitMessages() |
| SessionManager.ts | 4 | +90 | Add error handling | Fallback chain |
| **New Files** | 1 | ~900 | Create | HybridSession, NanoSession, CloudSession, SessionManager |
| **Total** | 1-4 | ~1210 | Create + Modify | Complete session layer |

---

## 5. Fallback Scenario: Nano → Cloud

```
Scenario: Nano session destroyed mid-task

Before: No recovery
  Step 1: Nano works
  Step 2: Nano destroyed (out of memory / bug)
  Step 3: aiClient.invoke() fails → Exception → Task fails ❌

After: Automatic failover
  Step 1: Nano session works
          session.id = "nano-session-1"
  
  Step 2: Nano destroyed (exception caught)
          SessionManager.handleError({
            session_id: "nano-session-1",
            error: "session destroyed"
          })
  
          → Creates CloudSession with same:
            - systemPrompt (cached)
            - message history
            - schema instructions
  
          session.id = "cloud-session-1" (transparently)
  
  Step 3: CloudSession.invoke()
          Uses cached context + new state
          → Same output quality as if stayed on Nano ✓
          → Task continues successfully ✓
```

---

## 6. Integration Points

### Where Session Comes From
```
Executor constructor
  └─ new Executor(task, taskId, browserContext, aiClient)
      └─ aiClient.createSession(config)
          └─ SessionManager.createSession(config)
              ├─ if (nano available)
              │   └─ return new NanoSession(nanoModel, config)
              │
              └─ else
                  └─ return new CloudSession(config)
```

### How Agents Use Session
```
BaseAgent.invoke(messages, session)
  └─ if (session provided)
      └─ return await session.invoke({
           messages,
           schema: this.modelOutputSchema
         })
      └─ Session handles provider transparently
```

### Message Flow
```
MessageManager.initTaskMessages()
  ├─ addMessage(system)      [Session init]
  ├─ addMessage(task)        [Session init]
  ├─ addMessage(examples)    [Session init]
  └─ For each step:
      └─ addMessage(state)   [Per-step only]

When session.invoke():
  ├─ Init messages: From sessionInitMessages() → sent to session (once)
  ├─ Incremental: From history slice → sent in invoke() call
  └─ Result: Session maintains implicit history
```

---

## 7. Testing Points

### Unit Tests to Add

| Test | File | Lines | Validates |
|------|------|-------|-----------|
| `test_nano_session_reuse` | NanoSession.ts | 30 | Session reused for multiple invokes |
| `test_cloud_session_context` | CloudSession.ts | 30 | System prompt cached and used |
| `test_session_manager_provider_selection` | SessionManager.ts | 30 | Nano preferred, Cloud fallback |
| `test_session_destroy_cleanup` | HybridSession.ts | 25 | Resources freed on destroy |
| `test_executor_session_lifecycle` | Executor.ts | 40 | Session created/destroyed correctly |
| `test_agent_uses_session` | BaseAgent.ts | 35 | Agent calls session.invoke() |
| `test_token_reduction` | Integration | 50 | 70% token savings verified |
| `test_fallback_chain` | SessionManager.ts | 45 | Nano→Cloud failover works |

### Integration Tests
```
Run full tasks (Planner + Navigator) with:
  - Nano available → Verify uses NanoSession
  - Nano unavailable → Verify uses CloudSession
  - Nano fails mid-task → Verify automatic fallback
  - Token count → Verify 70% reduction
  - Session cleanup → Verify no memory leaks
```

---

## Conclusion

This mapping shows:
1. **Current state**: 7 existing files involved in step-scoped sessions
2. **Proposed changes**: ~1210 lines across Week 1-4
3. **Key insights**: 
   - GeminiNanoChatModel already does session reuse ✓
   - Executor needs session lifecycle management (new)
   - BaseAgent needs to accept session parameter (modification)
   - FirebaseBridge unchanged; CloudSession is wrapper
   - MessageManager enhanced to track init vs. incremental

4. **No breaking changes**: Old `aiClient.invoke()` stays for backward compatibility

Ready for implementation.
