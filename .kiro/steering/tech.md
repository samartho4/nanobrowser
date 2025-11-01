# Technology Stack

## Build System

- **Monorepo**: Turborepo with pnpm workspaces
- **Bundler**: Vite 6.3.6 with custom plugins for Chrome extension manifest generation
- **Package Manager**: pnpm 9.15.1
- **Node Version**: >=22.12.0

## Core Technologies

- **TypeScript 5.5.4**: Strict typing throughout
- **React 18.3.1**: UI components (side panel, options page)
- **Chrome Extension APIs**: Manifest V3, chrome.debugger, chrome.storage
- **Puppeteer Core 24.10.1**: CDP-based browser automation
- **LangChain 0.3.78**: Agent orchestration and LLM integration
- **Firebase 12.4.0**: Cloud AI fallback and authentication
- **Zod 3.25.76**: Runtime schema validation

## Key Libraries

- **@hello-pangea/dnd**: Drag-and-drop for context management
- **echarts-for-react**: Sunburst charts for context visualization
- **posthog-js**: Analytics tracking
- **jsonrepair**: Robust JSON parsing for LLM responses
- **webextension-polyfill**: Cross-browser compatibility

## Code Quality

- **ESLint**: React, TypeScript, a11y, Tailwind plugins
- **Prettier**: 120 char width, single quotes, trailing commas
- **Husky**: Pre-commit hooks with lint-staged
- **Vitest**: Unit and integration testing

## Common Commands

```bash
# Development
pnpm dev                    # Start dev server with HMR
pnpm build                  # Production build
pnpm zip                    # Build and create dist.zip

# Code Quality
pnpm lint                   # Run ESLint
pnpm lint:fix              # Auto-fix linting issues
pnpm prettier              # Format code
pnpm type-check            # TypeScript validation

# Testing
pnpm test                   # Run tests (in chrome-extension)

# Maintenance
pnpm clean                  # Clean all build artifacts
pnpm clean:install         # Fresh install
```

## Project Structure

- Monorepo with `packages/` (shared libs) and `pages/` (UI components)
- Chrome extension source in `chrome-extension/src/`
- Build output to `dist/` at root level
- Custom Vite plugins for manifest generation and HMR
