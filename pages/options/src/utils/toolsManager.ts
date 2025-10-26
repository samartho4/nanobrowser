/**
 * Utility functions for managing tool configurations
 */

import { ToolConfig, ToolsState } from '../types/tools';

const TOOLS_STORAGE_KEY = 'tools_configurations';

/**
 * Get all tool configurations from storage
 */
export async function getToolConfigurations(): Promise<Record<string, ToolConfig>> {
  try {
    const result = await chrome.storage.local.get(TOOLS_STORAGE_KEY);
    return result[TOOLS_STORAGE_KEY] || {};
  } catch (error) {
    console.error('[ToolsUtils] Failed to get configurations:', error);
    return {};
  }
}

/**
 * Get a specific tool configuration
 */
export async function getToolConfig(toolId: string): Promise<ToolConfig | null> {
  try {
    const configs = await getToolConfigurations();
    return configs[toolId] || null;
  } catch (error) {
    console.error('[ToolsUtils] Failed to get tool config:', error);
    return null;
  }
}

/**
 * Save or update a tool configuration
 */
export async function saveToolConfig(toolId: string, config: Record<string, string>): Promise<void> {
  try {
    const configurations = await getToolConfigurations();
    const now = new Date().toISOString();

    configurations[toolId] = {
      toolId,
      config,
      createdAt: configurations[toolId]?.createdAt || now,
      updatedAt: now,
      isActive: true,
    };

    await chrome.storage.local.set({ [TOOLS_STORAGE_KEY]: configurations });
    console.log('[ToolsUtils] Tool configuration saved:', toolId);
  } catch (error) {
    console.error('[ToolsUtils] Failed to save tool config:', error);
    throw error;
  }
}

/**
 * Delete a tool configuration
 */
export async function deleteToolConfig(toolId: string): Promise<void> {
  try {
    const configurations = await getToolConfigurations();
    delete configurations[toolId];
    await chrome.storage.local.set({ [TOOLS_STORAGE_KEY]: configurations });
    console.log('[ToolsUtils] Tool configuration deleted:', toolId);
  } catch (error) {
    console.error('[ToolsUtils] Failed to delete tool config:', error);
    throw error;
  }
}

/**
 * Check if a tool is configured
 */
export async function isToolConfigured(toolId: string): Promise<boolean> {
  const config = await getToolConfig(toolId);
  return config !== null && config.isActive;
}

/**
 * Toggle tool active status
 */
export async function toggleToolStatus(toolId: string, isActive: boolean): Promise<void> {
  try {
    const configurations = await getToolConfigurations();
    if (configurations[toolId]) {
      configurations[toolId].isActive = isActive;
      await chrome.storage.local.set({ [TOOLS_STORAGE_KEY]: configurations });
      console.log('[ToolsUtils] Tool status updated:', toolId, isActive);
    }
  } catch (error) {
    console.error('[ToolsUtils] Failed to toggle tool status:', error);
    throw error;
  }
}

/**
 * Get all active tools
 */
export async function getActiveTools(): Promise<string[]> {
  try {
    const configurations = await getToolConfigurations();
    return Object.values(configurations)
      .filter(config => config.isActive)
      .map(config => config.toolId);
  } catch (error) {
    console.error('[ToolsUtils] Failed to get active tools:', error);
    return [];
  }
}

/**
 * Validate API configuration
 */
export function validateToolConfig(
  config: Record<string, string>,
  requiredFields: string[],
): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  for (const field of requiredFields) {
    if (!config[field] || config[field].trim() === '') {
      errors.push(`${field} is required`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Encrypt sensitive data (basic implementation)
 * Note: This is a simple implementation. For production, use proper encryption
 */
export function encryptSensitiveData(data: string): string {
  // For now, just base64 encode
  // In production, use crypto APIs
  return btoa(data);
}

/**
 * Decrypt sensitive data (basic implementation)
 */
export function decryptSensitiveData(encryptedData: string): string {
  try {
    return atob(encryptedData);
  } catch (error) {
    console.error('[ToolsUtils] Failed to decrypt data:', error);
    return '';
  }
}
