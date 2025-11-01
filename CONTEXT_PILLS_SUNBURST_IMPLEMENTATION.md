# 🌟 Context Pills Sunburst Visualization - Implementation Guide

## Overview

This document describes the new Context Pills implementation using Nivo Sunburst visualization, inspired by DaisyDisk's beautiful disk space visualization.

## Features

### 1. **Sunburst Visualization** (Primary View)
- Interactive hierarchical visualization of context items
- Organized by memory type (Episodic, Semantic, Procedural)
- Size represents token usage
- Color-coded by memory type:
  - 🔵 **Blue**: Episodic (recent interactions)
  - 🟢 **Green**: Semantic (long-term facts)
  - 🟣 **Purple**: Procedural (workflows/patterns)
  - ⚫ **Gray**: Other context

### 2. **Real-Time Context Management**
- Click any segment to view details
- Delete context items with immediate backend update
- Real-time token usage updates
- Workspace-aware context isolation

### 3. **Dual View Modes**
- **Sunburst View**: Visual, hierarchical representation
- **List View**: Traditional pill-based layout

### 4. **Interactive Features**
- Hover tooltips with context preview
- Click to select and view full details
- Delete button with confirmation
- Smooth animations and transitions

## Architecture

### Data Flow

```
Gmail API → HybridAIClient (Prompt API) → Classification
    ↓
Three-Tier Memory System (Episodic/Semantic/Procedural)
    ↓
ContextManager.write() → LangGraphStore
    ↓
Context Pills (Sunburst Visualization)
```

### Component Structure

```typescript
ContextPills
├── Sunburst Visualization (Nivo)
│   ├── Episodic Layer
│   │   └── Individual Email Contexts
│   ├── Semantic Layer
│   │   └── Contact/Fact Contexts
│   └── Procedural Layer
│       └── Workflow Pattern Contexts
├── Selected Node Details Panel
└── List View (Fallback)
```

## Installation

### 1. Install Dependencies

```bash
pnpm install
```

This will install:
- `@nivo/core@^0.87.0`
- `@nivo/sunburst@^0.87.0`

### 2. Build the Extension

```bash
pnpm build
```

### 3. Load in Chrome

1. Open `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `dist` folder

## Usage

### Basic Usage

The Context Pills component automatically displays Gmail-derived context:

```typescript
<ContextPills
  workspaceId={currentWorkspace.id}
  pills={contextPills}
  onPillRemove={handleRemove}
  onPillsReorder={handleReorder}
  maxTokens={100000}
  isDarkMode={isDarkMode}
/>
```

### Data Structure

Context pills are automatically populated from Gmail data:

```typescript
interface ContextPill {
  id: string;
  type: 'gmail' | 'memory' | 'page' | 'file';
  label: string;
  tokens: number;
  removable: boolean;
  priority: number;
  memoryType?: 'episodic' | 'semantic' | 'procedural';
  preview?: string;
  agentId?: string;
}
```

### Sunburst Data Transformation

The component automatically transforms pills into hierarchical sunburst data:

```typescript
{
  name: 'Context',
  children: [
    {
      name: 'Episodic',
      color: '#3B82F6',
      children: [
        { name: 'Email 1', value: 245, id: 'ep1', pill: {...} },
        { name: 'Email 2', value: 189, id: 'ep2', pill: {...} }
      ]
    },
    {
      name: 'Semantic',
      color: '#10B981',
      children: [...]
    },
    {
      name: 'Procedural',
      color: '#8B5CF6',
      children: [...]
    }
  ]
}
```

## User Interactions

### 1. View Context Details

**Action**: Click any segment in the sunburst

**Result**: 
- Details panel appears on the right
- Shows: label, type, tokens, priority, memory type, preview
- Delete button available

### 2. Delete Context

**Action**: Click "Delete Context" button in details panel

**Result**:
- Item removed from LangGraphStore
- Context Pills updated in real-time
- Token usage recalculated
- Workspace memory stats updated

### 3. Switch View Modes

**Action**: Click view mode toggle buttons

**Options**:
- 🔍 **Sunburst**: Visual hierarchical view
- 📋 **List**: Traditional pill layout

### 4. Hover for Preview

**Action**: Hover over any segment

**Result**:
- Tooltip shows:
  - Context label
  - Token count
  - Content preview (first 100 chars)

## Backend Integration

### Context Writing

When Gmail data is synced, context items are automatically written:

```typescript
// In gmail-memory-handler.ts
await writeGmailContextItems(workspaceId, emailData);

// This calls:
await contextManager.write(workspaceId, {
  type: 'gmail',
  content: emailContent,
  agentId: 'gmail-integration',
  sourceType: 'main',
  metadata: {
    source: 'gmail-conversation',
    priority: 5,
    sessionId: `gmail_${date}`,
    relevanceScore: 0.9,
  }
}, 'episodic'); // Memory type
```

### Context Deletion

When user deletes a context item:

```typescript
// Frontend
await contextManager.removeItem(workspaceId, pillId);

// Backend (ContextManager)
async removeItem(workspaceId: string, itemId: string) {
  const namespace = { userId: 'default', workspaceId, threadId: 'default' };
  
  // Find and delete from LangGraphStore
  const keys = await getContextKeys(workspaceId);
  const keysToRemove = keys.filter(key => key.includes(itemId));
  
  for (const key of keysToRemove) {
    await langGraphStore.delete(namespace, key);
  }
  
  // Update tracked keys
  await updateContextKeys(workspaceId, updatedKeys);
}
```

### Real-Time Updates

Context Pills automatically refresh when:
- Gmail sync completes
- Context item is deleted
- Workspace is switched
- Memory stats are updated

## Styling

### Color Scheme

```typescript
const MEMORY_COLORS = {
  episodic: {
    primary: '#3B82F6',   // Blue
    light: '#60A5FA',
    dark: '#2563EB'
  },
  semantic: {
    primary: '#10B981',   // Green
    light: '#34D399',
    dark: '#059669'
  },
  procedural: {
    primary: '#8B5CF6',   // Purple
    light: '#A78BFA',
    dark: '#7C3AED'
  }
};
```

### Dark Mode Support

The component automatically adapts to dark mode:

```typescript
theme={{
  background: isDarkMode ? '#1F2937' : '#FFFFFF',
  textColor: isDarkMode ? '#D1D5DB' : '#374151',
  tooltip: {
    container: {
      background: isDarkMode ? '#111827' : '#FFFFFF',
      color: isDarkMode ? '#F3F4F6' : '#111827',
    },
  },
}}
```

## Performance Optimization

### 1. Memoization

```typescript
const sunburstData = React.useMemo(() => {
  // Transform pills to sunburst data
  return transformToSunburst(pills);
}, [pills, isDarkMode]);
```

### 2. Lazy Loading

Context items are loaded on-demand:
- Initial load: 10 most recent items
- Scroll/expand: Load more as needed

### 3. Token Estimation

Fast token counting using character-based estimation:

```typescript
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4); // ~4 chars per token
}
```

## Testing

### Unit Tests

```bash
pnpm test pages/side-panel/src/components/ContextPills.test.tsx
```

### Integration Tests

```bash
# Run the comprehensive test
node chrome-extension/test-prompt-api-gmail.js

# Or test in browser console
chrome.runtime.sendMessage({
  type: 'GET_CONTEXT_PILLS',
  payload: { workspaceId: 'test-workspace' }
}, console.log);
```

### Visual Testing

1. Load extension
2. Sync Gmail data
3. Open side panel
4. Verify sunburst displays correctly
5. Test interactions (click, hover, delete)
6. Switch to list view and back

## Troubleshooting

### Issue: Sunburst Not Rendering

**Symptoms**: Empty space where sunburst should be

**Solutions**:
1. Check if pills array has data: `console.log(pills)`
2. Verify Nivo is installed: `pnpm list @nivo/sunburst`
3. Check browser console for errors
4. Verify `sunburstData` is not null

### Issue: Context Items Not Showing

**Symptoms**: Sunburst renders but no segments

**Solutions**:
1. Check Gmail sync completed: Run memory stats query
2. Verify context bridge: Check `[ContextManager] Successfully wrote` logs
3. Check namespace consistency in LangGraphStore
4. Run: `chrome.storage.local.get('context_keys_YOUR_WORKSPACE')`

### Issue: Delete Not Working

**Symptoms**: Click delete but item remains

**Solutions**:
1. Check console for errors
2. Verify `contextManager.removeItem()` is called
3. Check LangGraphStore delete operation
4. Verify context keys are updated in Chrome storage

### Issue: Performance Lag

**Symptoms**: Slow rendering with many items

**Solutions**:
1. Limit initial items to 20
2. Implement pagination
3. Use React.memo for child components
4. Debounce hover events

## Future Enhancements

### Planned Features

1. **Search/Filter**
   - Search context by content
   - Filter by memory type
   - Filter by date range

2. **Compression Preview**
   - Show before/after compression
   - Highlight removed items
   - Preview compressed content

3. **Export/Import**
   - Export context as JSON
   - Import context from file
   - Share context between workspaces

4. **Analytics**
   - Context usage patterns
   - Most accessed items
   - Token usage trends

5. **AI Suggestions**
   - Suggest relevant context
   - Auto-remove stale context
   - Optimize token usage

## API Reference

### ContextPills Props

```typescript
interface ContextPillsProps {
  workspaceId: string;              // Current workspace ID
  pills: ContextPill[];             // Array of context items
  suggestions?: ContextSuggestion[]; // AI-suggested context
  onPillRemove: (id: string) => void; // Delete callback
  onPillsReorder: (pills: ContextPill[]) => void; // Reorder callback
  onSuggestionAccept: (suggestion: ContextSuggestion) => void;
  onSuggestionDismiss: (id: string) => void;
  maxTokens?: number;               // Token budget (default: 100000)
  isDarkMode?: boolean;             // Theme mode
}
```

### ContextManager Methods

```typescript
// Write context item
await contextManager.write(workspaceId, contextItem, memoryType);

// Get context items
const items = await contextManager.select(workspaceId, query, tokenLimit);

// Remove context item
await contextManager.removeItem(workspaceId, itemId);

// Update priorities
await contextManager.updatePillPriorities(workspaceId, priorities);
```

## Best Practices

### 1. Context Lifecycle

```typescript
// Write context when Gmail syncs
onGmailSync → writeGmailContextItems()

// Display in Context Pills
onWorkspaceSwitch → loadContextPills()

// Clean up when deleted
onContextDelete → removeItem() → updateUI()
```

### 2. Token Management

```typescript
// Always check token budget before adding
if (totalTokens + newItemTokens <= maxTokens) {
  await contextManager.write(...);
}

// Compress when approaching limit
if (totalTokens > maxTokens * 0.8) {
  await contextManager.compress(...);
}
```

### 3. Error Handling

```typescript
try {
  await contextManager.removeItem(workspaceId, itemId);
  onPillRemove(itemId); // Update UI
} catch (error) {
  console.error('Failed to delete context:', error);
  showErrorToast('Failed to delete context item');
}
```

## Resources

- [Nivo Sunburst Documentation](https://nivo.rocks/sunburst/)
- [DaisyDisk Inspiration](https://daisydiskapp.com/)
- [Context Engineering Best Practices](./CONTEXT_BRIDGE_IMPLEMENTATION.md)
- [Prompt API Testing Guide](./PROMPT_API_TESTING_GUIDE.md)

---

**Built with ❤️ using Nivo, React, and Chrome's Prompt API**
