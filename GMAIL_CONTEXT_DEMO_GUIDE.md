# Gmail Context Demo Guide

## Overview
Demonstrate how Shannon uses Gmail's 3-tier memory system to provide context-aware assistance.

## Current Implementation Status

### ✅ Already Working:
1. **GmailMemoryIntegration.ts** - Classifies emails into:
   - Episodic: Recent conversations
   - Semantic: Contact patterns, preferences
   - Procedural: Email workflows

2. **ChatInput.tsx** - @-mention system with suggestions:
   - `@gmail` - Recent Gmail messages
   - `@memory[facts]` - Semantic memory
   - `@memory[patterns]` - Procedural memory

3. **ContextPills.tsx** - Sunburst visualization showing:
   - Blue: Episodic memory
   - Green: Semantic memory
   - Purple: Procedural memory

4. **ContextManager.ts** - Context Bridge writes Gmail data to pills

### 🔧 What Needs Enhancement:

#### 1. Make @gmail Actually Fetch Real Data

**File: `pages/side-panel/src/components/ChatInput.tsx`**

Currently the @gmail suggestion is just a placeholder. Make it actually trigger Gmail analysis:

```typescript
// In selectAtMention function, add:
if (suggestion.mention === '@gmail') {
  // Trigger Gmail memory analysis
  try {
    const { GmailService } = await import('../../../../chrome-extension/src/services/gmail/GmailService');
    const { GmailMemoryIntegration } = await import('../../../../chrome-extension/src/services/gmail/GmailMemoryIntegration');
    
    const gmailService = new GmailService();
    const gmailMemory = new GmailMemoryIntegration(gmailService);
    
    // Analyze and populate memory
    await gmailMemory.analyzeAndPopulateMemory(workspaceId, {
      maxMessages: 20,
      daysBack: 7,
    });
    
    // Context pills will automatically update via Context Bridge
  } catch (error) {
    console.error('Failed to fetch Gmail context:', error);
  }
}
```

#### 2. Add Visual Feedback During Gmail Fetch

Show a loading state while fetching Gmail data:

```typescript
const [isLoadingGmail, setIsLoadingGmail] = useState(false);

// In @gmail selection:
setIsLoadingGmail(true);
// ... fetch Gmail data ...
setIsLoadingGmail(false);
```

#### 3. Enhance @-mention Suggestions with Real Data

Instead of static suggestions, show actual Gmail data:

```typescript
// Gmail suggestions with real data
if ('gmail'.includes(lowerQuery)) {
  suggestions.push({
    id: 'gmail-urgent',
    mention: '@gmail[urgent]',
    type: 'gmail',
    description: '3 urgent emails requiring response',
    preview: 'From: John Smith, Sarah Lee, Mike Chen',
    tokens: 600,
    icon: FiMail,
  });
  
  suggestions.push({
    id: 'gmail-contacts',
    mention: '@gmail[contacts]',
    type: 'gmail',
    description: 'Top 5 frequent contacts',
    preview: 'John Smith (colleague), Sarah Lee (client)...',
    tokens: 400,
    icon: FiUser,
  });
}
```

## Demo Script

### Setup (Before Demo):
1. Configure Gmail integration in Tools settings
2. Let system analyze last 7 days of emails
3. Open side panel

### Demo Flow:

**Step 1: Show Empty State**
```
"Here's Shannon with no context loaded yet."
```

**Step 2: Type @gmail**
```
User: "@"
→ Shows dropdown with @gmail, @memory, @page options
```

**Step 3: Select @gmail**
```
User: Selects "@gmail"
→ Loading indicator appears
→ System fetches and classifies emails
→ Context Pills appear with Sunburst chart
```

**Step 4: Show Sunburst Visualization**
```
"Notice the three memory types:
- Blue (Episodic): Recent email conversations
- Green (Semantic): Contact patterns and preferences  
- Purple (Procedural): Learned email workflows"
```

**Step 5: Click on Sunburst Sections**
```
Click Blue section → Shows "Email from John: Project Update"
Click Green section → Shows "John Smith - responds within 2 hours, prefers morning emails"
Click Purple section → Shows "Urgent Email Workflow - acknowledge within 15 min"
```

**Step 6: Send Query with Context**
```
User: "@gmail help me respond to urgent emails"
→ Agent uses all 3 memory types:
  - Episodic: Knows which emails are urgent
  - Semantic: Knows contact communication styles
  - Procedural: Applies learned response patterns
```

**Step 7: Show Agent Response**
```
Agent: "I found 3 urgent emails:

1. John Smith (Project Update) - He typically responds within 2 hours and prefers concise updates. Based on your usual workflow, I suggest acknowledging within 15 minutes.

2. Sarah Lee (Client Request) - She's a high-priority client. Your pattern shows you usually respond same-day with detailed explanations.

3. Mike Chen (Meeting Conflict) - Calendar integration shows this conflicts with your 2pm meeting. Your usual pattern is to propose alternative times.

Would you like me to draft responses for any of these?"
```

## Key Selling Points

1. **Three-Tier Memory System**
   - Not just "recent emails" - intelligent classification
   - Episodic: What happened
   - Semantic: What we know
   - Procedural: What we learned

2. **Visual Context Transparency**
   - Sunburst chart shows exactly what context is being used
   - Color-coded by memory type
   - Click to see details
   - Delete unwanted context

3. **@-Mention Discoverability**
   - Type @ to see all context options
   - Autocomplete with previews
   - Shows token counts for transparency

4. **Workspace Isolation**
   - Each workspace has its own context
   - Can synthesize across workspaces
   - Context doesn't leak between projects

## Technical Highlights

### For Technical Audience:
- "We implement LangChain's Four Pillars: WRITE, SELECT, COMPRESS, ISOLATE"
- "Gmail integration uses real OAuth2 with proper scopes"
- "Context compression with user-controlled strategies"
- "Lost-in-the-middle mitigation with priority reordering"

### For Business Audience:
- "Your AI assistant remembers your email patterns"
- "Learns your communication style over time"
- "Suggests responses based on past successful interactions"
- "Respects your privacy - all data stays local"

## Fallback Demo (If Gmail Not Configured)

Use demo mode with synthetic data:

```typescript
// In GmailMemoryIntegration.ts, add demo mode:
async analyzeDemoData(workspaceId: string) {
  // Create synthetic episodic memory
  await this.extractEpisodicMemories(workspaceId, [
    {
      messageId: 'demo-1',
      subject: 'Project Update - Q4 Goals',
      from: 'john.smith@company.com',
      timestamp: Date.now() - 3600000,
      priority: 'urgent',
      category: 'project',
      // ... more demo data
    }
  ]);
  
  // Create synthetic semantic memory
  await this.extractSemanticMemories(workspaceId, [/* demo contacts */]);
  
  // Create synthetic procedural memory
  await this.extractProceduralMemories(workspaceId, [/* demo workflows */]);
}
```

## Next Steps

1. **Immediate (for demo):**
   - Connect @gmail to actual Gmail fetch
   - Add loading states
   - Test with real Gmail account

2. **Short-term (polish):**
   - Add error handling for Gmail API failures
   - Implement demo mode for presentations
   - Add "Refresh Gmail" button

3. **Long-term (enhancement):**
   - Real-time Gmail sync
   - Email draft generation
   - Calendar integration
   - Slack/Teams integration using same pattern

## Code Changes Needed

### Minimal Changes for Working Demo:

1. **ChatInput.tsx** - Connect @gmail to GmailMemoryIntegration (~20 lines)
2. **Add loading state** - Show spinner while fetching (~10 lines)
3. **Test with real Gmail** - Verify OAuth flow works

### Total Effort: ~2 hours

The infrastructure is already there - you just need to wire up the @gmail trigger to actually call the GmailMemoryIntegration service!
