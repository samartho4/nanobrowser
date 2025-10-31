export type { BaseStorage } from './base/types';
export * from './settings';
export * from './settings/theme';
export * from './chat';
export * from './profile';
export * from './prompt/favorites';
export * from './workspace/WorkspaceManager';

// Re-export the favorites instance for direct use
export { default as favoritesStorage } from './prompt/favorites';
