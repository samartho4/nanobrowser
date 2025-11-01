# Project Structure

## Monorepo Layout

```
shannon/
├── chrome-extension/          # Main extension code
│   ├── src/
│   │   ├── background/        # Service worker (agents, LLM, handlers)
│   │   ├── content/           # Content scripts (DOM extraction)
│   │   ├── services/          # Core services (memory, context, Gmail)
│   │   └── utils/             # Utilities (token estimation)
│   ├── public/                # Static assets
│   └── vite.config.mts        # Extension build config
├── packages/                  # Shared libraries
│   ├── storage/               # Chrome storage abstractions
│   ├── shared/                # React hooks, contexts, HOCs
│   ├── ui/                    # Reusable UI components
│   ├── i18n/                  # Internationalization
│   ├── hmr/                   # Hot module reload for dev
│   ├── schema-utils/          # JSON schema utilities
│   └── tsconfig/              # Shared TypeScript configs
└── pages/                     # Extension UI pages
    ├── side-panel/            # Main chat interface
    ├── options/               # Settings and configuration
    └── content/               # Content script entry
```

## Key Directories

### `chrome-extension/src/background/`

- **agent/**: Multi-agent system (Planner, Navigator, Executor)
  - `executor.ts`: Main orchestration with Deep Agents middleware
  - `agents/`: Agent implementations (base, planner, navigator)
  - `prompts/`: System prompts and templates
  - `actions/`: Action builders and schemas
  - `middleware/`: TodoList and subagent services
- **llm/**: AI client abstraction (HybridAIClient)
  - `providers/`: LLM provider implementations
  - `utils/`: Multimodal support, error handling
  - `langchain/`: LangChain integration
- **browser/**: Browser automation layer
  - `context.ts`: Browser context management
  - `dom/`: DOM service and clickable detection
- **services/**: Core services
  - `analytics.ts`: PostHog integration
  - `gmail-*.ts`: Gmail integration handlers
  - `guardrails/`: Input sanitization and safety
- **handlers/**: Message handlers for UI communication

### `chrome-extension/src/services/`

- **memory/**: Three-tier memory system (MemoryService)
- **context/**: Context management (ContextManager)
- **workspace/**: Workspace isolation (WorkspaceManager, AutonomyController)
- **gmail/**: Gmail OAuth and API integration
- **demo/**: Demo workflows

### `packages/storage/`

- **chat/**: Chat history and LangGraph store
  - `LangGraphStore.ts`: Workspace-isolated storage
  - `EnhancedChatHistoryStore.ts`: Session management
  - `StorageMigration.ts`: Data migration utilities
- **workspace/**: Workspace management
- **settings/**: User settings (models, providers, firewall)
- **profile/**: User profile data

### `pages/`

- **side-panel/**: Main chat UI with Context Pills
  - `components/`: Chat input, message list, context pills, workspace switcher
- **options/**: Settings UI
  - `components/`: Model settings, workspace settings, memory browser, Gmail setup

## Architecture Patterns

### Agent System

- **Executor**: Orchestrates Planner and Navigator agents
- **Planner**: High-level task planning (uses cloud LLM)
- **Navigator**: Low-level action execution (uses Gemini Nano)
- **Deep Agents Middleware**: beforeAgentRun/afterAgentRun hooks for context assembly

### Memory System

- **Episodic**: Recent conversation steps (per session)
- **Semantic**: Long-term facts with search (per workspace)
- **Procedural**: Reusable workflows with success tracking (per workspace)

### Context Management

- **ContextManager**: Write, select, compress, isolate operations
- **Context Pills**: UI for viewing/editing active context
- **Token Estimation**: Track context window usage

### Workspace Isolation

- **WorkspaceManager**: Namespace-based isolation using LangGraphStore
- **Autonomy Levels**: 1-5 scale controlling approval requirements
- **Session Management**: Multiple sessions per workspace with runID branching

## File Naming Conventions

- **Components**: PascalCase (e.g., `ContextPills.tsx`)
- **Services**: PascalCase (e.g., `MemoryService.ts`)
- **Utilities**: camelCase (e.g., `tokenEstimator.ts`)
- **Types**: PascalCase interfaces/types in dedicated files or inline
- **Tests**: `*.test.ts` or `__tests__/` directories

## Import Aliases

- `@src/*`: Maps to `chrome-extension/src/*`
- `@root`: Maps to `chrome-extension/`
- `@assets`: Maps to `chrome-extension/src/assets/`
- `@extension/*`: Workspace packages (e.g., `@extension/storage`)
