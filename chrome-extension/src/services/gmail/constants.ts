/**
 * Gmail API Constants and Configuration
 */

export const GMAIL_API_CONFIG = {
  BASE_URL: 'https://gmail.googleapis.com/gmail/v1',
  OAUTH_AUTHORIZE_URL: 'https://accounts.google.com/o/oauth2/v2/auth',
  OAUTH_TOKEN_URL: 'https://oauth2.googleapis.com/token',
  OAUTH_REVOKE_URL: 'https://oauth2.googleapis.com/revoke',
};

export const GMAIL_OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.labels',
];

export const GMAIL_READONLY_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.labels',
];

/**
 * Service Configuration
 */
export const GMAIL_SERVICE_CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 second
  RETRY_BACKOFF_MULTIPLIER: 2,
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
  TOKEN_REFRESH_BUFFER: 5 * 60 * 1000, // Refresh 5 minutes before expiration
  MAX_MESSAGES_PER_PAGE: 10,
};

/**
 * Storage Keys
 */
export const GMAIL_STORAGE_KEYS = {
  AUTH_TOKEN: 'gmail_auth_token',
  CACHE_PREFIX: 'gmail_cache_',
  PROFILE_CACHE: 'gmail_profile',
  LABELS_CACHE: 'gmail_labels',
};

/**
 * API Operations
 */
export const GMAIL_OPERATIONS = {
  INITIALIZE: 'INITIALIZE',
  AUTHENTICATE: 'AUTHENTICATE',
  GET_PROFILE: 'GET_PROFILE',
  GET_LABELS: 'GET_LABELS',
  LIST_MESSAGES: 'LIST_MESSAGES',
  GET_MESSAGE: 'GET_MESSAGE',
  GET_THREAD: 'GET_THREAD',
  SEARCH_MESSAGES: 'SEARCH_MESSAGES',
  DISCONNECT: 'DISCONNECT',
} as const;

/**
 * Log Prefixes for Console
 */
export const LOG_PREFIX = {
  OAUTH: '[GmailOAuth]',
  SERVICE: '[GmailService]',
  STORAGE: '[GmailStorage]',
  HANDLER: '[GmailHandler]',
  HOOK: '[useGmail]',
} as const;
