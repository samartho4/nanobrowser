/**
 * Gmail Storage Manager
 * Handles secure token storage and caching
 */

import { GmailAuthToken } from './types';
import { GMAIL_STORAGE_KEYS, GMAIL_SERVICE_CONFIG, LOG_PREFIX } from './constants';

interface CacheData {
  data: any;
  timestamp: number;
}

export class GmailStorageManager {
  /**
   * Save authentication token to storage
   */
  static async saveToken(token: GmailAuthToken): Promise<void> {
    try {
      await chrome.storage.local.set({
        [GMAIL_STORAGE_KEYS.AUTH_TOKEN]: token,
      });
      console.log(`${LOG_PREFIX.STORAGE} Token saved successfully`);
    } catch (error) {
      console.error(`${LOG_PREFIX.STORAGE} Failed to save token:`, error);
      throw error;
    }
  }

  /**
   * Load authentication token from storage
   */
  static async loadToken(): Promise<GmailAuthToken | null> {
    try {
      const result = await chrome.storage.local.get([GMAIL_STORAGE_KEYS.AUTH_TOKEN]);
      const token = result[GMAIL_STORAGE_KEYS.AUTH_TOKEN];

      if (token) {
        console.log(`${LOG_PREFIX.STORAGE} Token loaded from storage`);
      } else {
        console.log(`${LOG_PREFIX.STORAGE} No token found in storage`);
      }

      return token || null;
    } catch (error) {
      console.error(`${LOG_PREFIX.STORAGE} Failed to load token:`, error);
      return null;
    }
  }

  /**
   * Clear authentication token
   */
  static async clearToken(): Promise<void> {
    try {
      await chrome.storage.local.remove([GMAIL_STORAGE_KEYS.AUTH_TOKEN]);
      console.log(`${LOG_PREFIX.STORAGE} Token cleared`);
    } catch (error) {
      console.error(`${LOG_PREFIX.STORAGE} Failed to clear token:`, error);
    }
  }

  /**
   * Save data to session cache with expiration
   */
  static async saveCache(key: string, data: any): Promise<void> {
    try {
      const cacheKey = `${GMAIL_STORAGE_KEYS.CACHE_PREFIX}${key}`;
      const cacheData: CacheData = {
        data,
        timestamp: Date.now(),
      };

      // Use session storage for temporary cache (cleared on tab close)
      await chrome.storage.session.set({
        [cacheKey]: cacheData,
      });

      console.log(`${LOG_PREFIX.STORAGE} Cache saved: ${key}`);
    } catch (error) {
      console.error(`${LOG_PREFIX.STORAGE} Failed to save cache:`, error);
      // Non-critical error, don't throw
    }
  }

  /**
   * Load cached data with expiration check
   */
  static async loadCache(key: string): Promise<any | null> {
    try {
      const cacheKey = `${GMAIL_STORAGE_KEYS.CACHE_PREFIX}${key}`;
      const result = await chrome.storage.session.get([cacheKey]);
      const cached = result[cacheKey] as CacheData | undefined;

      if (!cached) {
        console.log(`${LOG_PREFIX.STORAGE} Cache miss: ${key}`);
        return null;
      }

      // Check if cache is expired
      const isExpired = Date.now() - cached.timestamp > GMAIL_SERVICE_CONFIG.CACHE_DURATION;

      if (isExpired) {
        console.log(`${LOG_PREFIX.STORAGE} Cache expired: ${key}`);
        await chrome.storage.session.remove([cacheKey]);
        return null;
      }

      console.log(`${LOG_PREFIX.STORAGE} Cache hit: ${key}`);
      return cached.data;
    } catch (error) {
      console.error(`${LOG_PREFIX.STORAGE} Failed to load cache:`, error);
      return null;
    }
  }

  /**
   * Clear all cache entries
   */
  static async clearAllCache(): Promise<void> {
    try {
      const items = await chrome.storage.session.get(null);
      const cacheKeys = Object.keys(items).filter(key => key.startsWith(GMAIL_STORAGE_KEYS.CACHE_PREFIX));

      if (cacheKeys.length > 0) {
        await chrome.storage.session.remove(cacheKeys);
        console.log(`${LOG_PREFIX.STORAGE} Cleared ${cacheKeys.length} cache entries`);
      }
    } catch (error) {
      console.error(`${LOG_PREFIX.STORAGE} Failed to clear cache:`, error);
    }
  }

  /**
   * Clear specific cache entry
   */
  static async clearCacheEntry(key: string): Promise<void> {
    try {
      const cacheKey = `${GMAIL_STORAGE_KEYS.CACHE_PREFIX}${key}`;
      await chrome.storage.session.remove([cacheKey]);
      console.log(`${LOG_PREFIX.STORAGE} Cache entry cleared: ${key}`);
    } catch (error) {
      console.error(`${LOG_PREFIX.STORAGE} Failed to clear cache entry:`, error);
    }
  }

  /**
   * Clear all storage (token + cache)
   */
  static async clearAll(): Promise<void> {
    try {
      await Promise.all([this.clearToken(), this.clearAllCache()]);
      console.log(`${LOG_PREFIX.STORAGE} All storage cleared`);
    } catch (error) {
      console.error(`${LOG_PREFIX.STORAGE} Failed to clear all storage:`, error);
    }
  }
}
