# Tools Integration System - Complete Guide

## 🎯 Overview

The Tools Integration System allows users to connect and configure third-party tools (Gmail, Google Calendar, Slack, Trello, Notion) with API keys for workflow automation.

---

## 📁 File Structure

```
pages/options/src/
├── components/
│   ├── ToolsSettings.tsx         # Main tools settings component
│   ├── ToolCard.tsx              # Reusable tool card component
│   └── ApiKeyModal.tsx           # API key configuration modal
├── types/
│   └── tools.ts                  # Tool types and definitions
└── utils/
    └── toolsManager.ts           # Tool management utilities
```

---

## 🔧 Components

### 1. ToolsSettings Component

**File**: `pages/options/src/components/ToolsSettings.tsx`

Main component that displays all available tools and manages the UI flow.

**Features**:
- Display all available tools in a responsive grid
- Search functionality to find tools
- Category filtering (productivity, communication, calendar, etc.)
- Load tool configurations from storage
- Handle tool configuration and deletion
- Statistics showing configured tools count

**Usage**:
```tsx
<ToolsSettings isDarkMode={true} />
```

**Props**:
- `isDarkMode?: boolean` - Toggle dark mode styling

### 2. ToolCard Component

**File**: `pages/options/src/components/ToolCard.tsx`

Reusable card component for displaying individual tools.

**Features**:
- Display tool icon, name, category, and description
- Show "Configured" badge when tool is set up
- Configure button to open the modal
- Delete button to remove configuration (when configured)
- Dark mode support

**Usage**:
```tsx
<ToolCard
  tool={tool}
  isConfigured={true}
  onConfigure={() => handleConfigure(tool)}
  onDelete={() => handleDelete(tool.id)}
  isDarkMode={false}
/>
```

### 3. ApiKeyModal Component

**File**: `pages/options/src/components/ApiKeyModal.tsx`

Modal dialog for configuring API keys and other credentials.

**Features**:
- Dynamic form fields based on tool configuration requirements
- Support for multiple input types (text, password, textarea, select)
- Required field validation
- Error and success messages
- Security notice about data storage
- Dark mode support

**Usage**:
```tsx
<ApiKeyModal
  tool={selectedTool}
  isOpen={isOpen}
  onClose={handleClose}
  onSave={handleSave}
  isDarkMode={false}
/>
```

---

## 📋 Data Types

### Tool Interface
```typescript
interface Tool {
  id: string;                    // Unique identifier
  name: string;                  // Display name
  description: string;           // Tool description
  icon: string;                  // Emoji or URL
  category: 'productivity' | 'communication' | 'calendar' | 'other';
  isConfigured: boolean;         // Configuration status
  requiresAuth: boolean;         // Whether API is required
  configFields: ConfigField[];   // Required configuration fields
}
```

### ConfigField Interface
```typescript
interface ConfigField {
  id: string;                    // Field identifier
  label: string;                 // Display label
  type: 'text' | 'password' | 'textarea' | 'select';
  placeholder?: string;          // Input placeholder
  required: boolean;             // Whether field is required
  helpText?: string;             // Help message
  options?: { label: string; value: string }[]; // For select type
}
```

### ToolConfig Interface
```typescript
interface ToolConfig {
  toolId: string;                // Reference to tool
  config: Record<string, string>; // Configuration values
  createdAt: string;             // Creation timestamp
  updatedAt: string;             // Last update timestamp
  isActive: boolean;             // Active/inactive status
}
```

---

## 🛠️ Utility Functions

### toolsManager.ts

**File**: `pages/options/src/utils/toolsManager.ts`

**Available Functions**:

#### getToolConfigurations()
```typescript
async function getToolConfigurations(): Promise<Record<string, ToolConfig>>
```
Get all stored tool configurations.

#### getToolConfig(toolId: string)
```typescript
async function getToolConfig(toolId: string): Promise<ToolConfig | null>
```
Get configuration for a specific tool.

#### saveToolConfig(toolId: string, config: Record<string, string>)
```typescript
async function saveToolConfig(toolId: string, config: Record<string, string>): Promise<void>
```
Save or update a tool configuration.

#### deleteToolConfig(toolId: string)
```typescript
async function deleteToolConfig(toolId: string): Promise<void>
```
Delete a tool configuration.

#### isToolConfigured(toolId: string)
```typescript
async function isToolConfigured(toolId: string): Promise<boolean>
```
Check if a tool is configured and active.

#### toggleToolStatus(toolId: string, isActive: boolean)
```typescript
async function toggleToolStatus(toolId: string, isActive: boolean): Promise<void>
```
Enable or disable a tool.

#### getActiveTools()
```typescript
async function getActiveTools(): Promise<string[]>
```
Get list of all active tools.

#### validateToolConfig(config, requiredFields)
```typescript
function validateToolConfig(
  config: Record<string, string>,
  requiredFields: string[]
): { isValid: boolean; errors: string[] }
```
Validate tool configuration.

---

## 📦 Available Tools

### 1. Gmail
- **Icon**: 📧
- **Category**: Communication
- **Required Fields**:
  - API Key (password)
  - Email Address (text)

### 2. Google Calendar
- **Icon**: 📅
- **Category**: Calendar
- **Required Fields**:
  - API Key (password)
  - Calendar ID (text)

### 3. Slack
- **Icon**: 💬
- **Category**: Communication
- **Required Fields**:
  - Webhook URL (password)

### 4. Trello
- **Icon**: 🎯
- **Category**: Productivity
- **Required Fields**:
  - API Key (password)
  - Board ID (text)

### 5. Notion
- **Icon**: 📝
- **Category**: Productivity
- **Required Fields**:
  - API Token (password)
  - Database ID (text)

---

## 💾 Storage Structure

Configuration is stored in `chrome.storage.local` under key `tools_configurations`:

```javascript
{
  "tools_configurations": {
    "gmail": {
      "toolId": "gmail",
      "config": {
        "api_key": "***encrypted***",
        "email": "user@gmail.com"
      },
      "createdAt": "2025-10-26T10:00:00Z",
      "updatedAt": "2025-10-26T10:00:00Z",
      "isActive": true
    },
    "google_calendar": {
      "toolId": "google_calendar",
      "config": {
        "api_key": "***encrypted***",
        "calendar_id": "user-calendar-id@google.com"
      },
      "createdAt": "2025-10-26T10:05:00Z",
      "updatedAt": "2025-10-26T10:05:00Z",
      "isActive": true
    }
  }
}
```

---

## 🎨 UI Features

### Search and Filter
- **Search**: Real-time search across tool names and descriptions
- **Category Filter**: Filter tools by category (all, productivity, communication, calendar, other)
- **Statistics**: Display number of configured tools

### Tool Card
- Tool icon and name
- Category badge
- Description
- "Configured" status badge (green checkmark)
- Configure button (opens modal)
- Delete button (removes configuration)

### API Key Modal
- Tool header with icon and description
- Dynamic form fields based on tool requirements
- Required field indicator (*)
- Help text for each field
- Validation and error messages
- Success confirmation
- Security notice
- Cancel and Save buttons

### Dark Mode
- All components support dark mode
- Consistent color scheme
- Proper contrast ratios

---

## 🔄 Data Flow

```
User Interface
    ↓
ToolsSettings Component
    ├─ Loads configurations via toolsManager
    ├─ Displays ToolCard for each tool
    │
    ├─ User clicks Configure
    ↓
ApiKeyModal opens
    ├─ Shows dynamic form fields
    ├─ User enters API key
    ├─ User clicks Save
    │
    ├─ Validates fields
    ├─ Calls toolsManager.saveToolConfig()
    │
    ├─ Saves to chrome.storage.local
    ├─ Updates UI with success message
    └─ Closes modal
```

---

## 🔐 Security Considerations

1. **Password Fields**: API keys use `type="password"` input
2. **Local Storage Only**: Configurations never sent to external servers
3. **Validation**: Required fields are validated before saving
4. **User Control**: Users can delete configurations anytime
5. **Security Notice**: Modal displays security information
6. **Encryption**: Basic base64 encoding (upgrade to proper encryption in production)

---

## ⚡ Usage Example

```tsx
import { ToolsSettings } from './components/ToolsSettings';

function Options() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  return (
    <main>
      <ToolsSettings isDarkMode={isDarkMode} />
    </main>
  );
}
```

---

## 🎯 Adding New Tools

To add a new tool:

1. **Add to AVAILABLE_TOOLS** in `types/tools.ts`:
```typescript
{
  id: 'my-tool',
  name: 'My Tool',
  description: 'Tool description',
  icon: '🔧',
  category: 'productivity',
  isConfigured: false,
  requiresAuth: true,
  configFields: [
    {
      id: 'api_key',
      label: 'API Key',
      type: 'password',
      placeholder: 'Enter API key',
      required: true,
      helpText: 'Get key from tool dashboard',
    },
  ],
}
```

2. The UI will automatically display the new tool

---

## 📊 Statistics

- **Total Tools**: 5 (Gmail, Google Calendar, Slack, Trello, Notion)
- **Categories**: 4 (productivity, communication, calendar, other)
- **Config Fields per Tool**: 1-2
- **Supported Input Types**: 4 (text, password, textarea, select)

---

## 🚀 Future Enhancements

1. **OAuth Integration**: Support OAuth for tools
2. **Tool Testing**: Test API key validity before saving
3. **Per-Domain Config**: Different configs for different websites
4. **Advanced Encryption**: Proper encryption/decryption
5. **Backup/Export**: Export configurations
6. **Usage Analytics**: Track tool usage
7. **Custom Tools**: Allow users to add custom tools
8. **Automation Workflows**: Chain multiple tools together

---

## 🧪 Testing

### Test Configuration Save
1. Open Settings → Tools
2. Click "Configure" on any tool
3. Fill in the API key fields
4. Click "Save Configuration"
5. Verify success message appears

### Test Search
1. Type tool name in search box
2. Only matching tools appear

### Test Filter
1. Click category filter buttons
2. Tools are filtered by category

### Test Delete
1. Click "Configure" on a configured tool
2. Modal shows existing config
3. Click delete button
4. Confirm deletion
5. Tool marked as not configured

---

## 📚 Dependencies

- React (useState, useEffect)
- react-icons/fi (FiEdit2, FiTrash2, FiSearch, etc.)
- Chrome Storage API

---

## ✨ Summary

The Tools Integration System provides:
- ✅ Clean, reusable component architecture
- ✅ Flexible configuration management
- ✅ Secure credential storage
- ✅ Search and filtering
- ✅ Dark mode support
- ✅ Easy to extend with new tools
- ✅ User-friendly modals and validation
