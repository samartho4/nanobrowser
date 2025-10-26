/**
 * Tool definitions and types for workflow automation
 */

// Get the public path for logos based on environment
const getLogoPath = (toolId: string) => {
  // Map tool IDs to actual file names (handles naming variations)
  const fileMap: Record<string, string> = {
    gmail: 'gmail.png',
    google_calendar: 'google_calender.png', // Note: your file has typo "calender"
    slack: 'slack.png',
    trello: 'trello.png', // Your file is .webp format
    notion: 'notion.png',
  };

  const fileName = fileMap[toolId] || `${toolId}.png`;

  // For Chrome extension, use chrome-extension:// URL with full path
  // The path is relative to the extension root, so we need to include 'options/'
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    return chrome.runtime.getURL(`options/logos/${fileName}`);
  }

  // Fallback for development
  return `/logos/${fileName}`;
};

export interface Tool {
  id: string;
  name: string;
  description: string;
  logo: string; // Path to logo image
  icon?: string; // Fallback emoji icon
  category: 'productivity' | 'communication' | 'calendar' | 'other';
  isConfigured: boolean;
  requiresAuth: boolean;
  configFields: ConfigField[];
}

export interface ConfigField {
  id: string;
  label: string;
  type: 'text' | 'password' | 'textarea' | 'select';
  placeholder?: string;
  required: boolean;
  helpText?: string;
  options?: { label: string; value: string }[];
}

export interface ToolConfig {
  toolId: string;
  config: Record<string, string>;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface ToolsState {
  tools: Tool[];
  configurations: Record<string, ToolConfig>;
}

// Available tools catalog
export const AVAILABLE_TOOLS: Tool[] = [
  {
    id: 'gmail',
    name: 'Gmail',
    description: 'Send emails and manage Gmail account',
    logo: getLogoPath('gmail'),
    icon: '📧', // Fallback emoji
    category: 'communication',
    isConfigured: false,
    requiresAuth: true,
    configFields: [
      {
        id: 'api_key',
        label: 'API Key',
        type: 'password',
        placeholder: 'Enter your Gmail API key',
        required: true,
        helpText: 'Get your API key from Google Cloud Console',
      },
      {
        id: 'email',
        label: 'Email Address',
        type: 'text',
        placeholder: 'your-email@gmail.com',
        required: true,
        helpText: 'The Gmail account to use for automation',
      },
    ],
  },
  {
    id: 'google_calendar',
    name: 'Google Calendar',
    description: 'Create and manage calendar events',
    logo: getLogoPath('google_calendar'),
    icon: '📅', // Fallback emoji
    category: 'calendar',
    isConfigured: false,
    requiresAuth: true,
    configFields: [
      {
        id: 'api_key',
        label: 'API Key',
        type: 'password',
        placeholder: 'Enter your Google Calendar API key',
        required: true,
        helpText: 'Get your API key from Google Cloud Console',
      },
      {
        id: 'calendar_id',
        label: 'Calendar ID',
        type: 'text',
        placeholder: 'your-calendar-id@google.com',
        required: true,
        helpText: 'The calendar ID to use for automation',
      },
    ],
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Send messages to Slack channels',
    logo: getLogoPath('slack'),
    icon: '💬', // Fallback emoji
    category: 'communication',
    isConfigured: false,
    requiresAuth: true,
    configFields: [
      {
        id: 'webhook_url',
        label: 'Webhook URL',
        type: 'password',
        placeholder: 'https://hooks.slack.com/services/...',
        required: true,
        helpText: 'Get your webhook URL from Slack App settings',
      },
    ],
  },
  {
    id: 'trello',
    name: 'Trello',
    description: 'Create and manage Trello cards',
    logo: getLogoPath('trello'),
    icon: '🎯', // Fallback emoji
    category: 'productivity',
    isConfigured: false,
    requiresAuth: true,
    configFields: [
      {
        id: 'api_key',
        label: 'API Key',
        type: 'password',
        placeholder: 'Enter your Trello API key',
        required: true,
        helpText: 'Get your API key from Trello account settings',
      },
      {
        id: 'board_id',
        label: 'Board ID',
        type: 'text',
        placeholder: 'Your Trello board ID',
        required: true,
        helpText: 'The board ID where cards will be created',
      },
    ],
  },
  {
    id: 'notion',
    name: 'Notion',
    description: 'Add items to Notion databases',
    logo: getLogoPath('notion'),
    icon: '📝', // Fallback emoji
    category: 'productivity',
    isConfigured: false,
    requiresAuth: true,
    configFields: [
      {
        id: 'api_token',
        label: 'API Token',
        type: 'password',
        placeholder: 'Enter your Notion API token',
        required: true,
        helpText: 'Get your API token from Notion integrations',
      },
      {
        id: 'database_id',
        label: 'Database ID',
        type: 'text',
        placeholder: 'Your Notion database ID',
        required: true,
        helpText: 'The database ID where items will be added',
      },
    ],
  },
];
