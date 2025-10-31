/**
 * Simple integration test to verify LangGraph Store modules can be imported and instantiated
 * This is not a unit test but a compilation/integration verification
 */

import { createLangGraphStore, createStorageMigration, createEnhancedChatHistoryStorage } from '@extension/storage';

// Test that we can create instances of the new storage modules
export function testStorageIntegration() {
  try {
    // Test LangGraph Store creation
    const langGraphStore = createLangGraphStore();
    console.log('✓ LangGraph Store created successfully');

    // Test Storage Migration creation
    const storageMigration = createStorageMigration(langGraphStore);
    console.log('✓ Storage Migration created successfully');

    // Test Enhanced Chat History Store creation
    const enhancedChatHistory = createEnhancedChatHistoryStorage(langGraphStore, storageMigration);
    console.log('✓ Enhanced Chat History Store created successfully');

    return {
      langGraphStore,
      storageMigration,
      enhancedChatHistory,
      success: true,
    };
  } catch (error) {
    console.error('✗ Storage integration test failed:', error);
    return {
      success: false,
      error,
    };
  }
}

// Export types for use in other modules
export type {
  MemoryNamespace,
  WorkspaceConfig,
  LangGraphStore,
  StorageMigration,
  EnhancedChatHistoryStorage,
  Checkpoint,
  CheckpointMetadata,
} from '@extension/storage';
