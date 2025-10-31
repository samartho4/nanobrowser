export type Theme = 'light' | 'dark';

export interface ThemeStorageService {
  getTheme(): Promise<Theme>;
  setTheme(theme: Theme): Promise<void>;
  onThemeChange(callback: (theme: Theme) => void): void;
}

class ChromeThemeStorageService implements ThemeStorageService {
  private static readonly THEME_KEY = 'user_theme_preference';
  private listeners: ((theme: Theme) => void)[] = [];

  async getTheme(): Promise<Theme> {
    try {
      const result = await chrome.storage.sync.get(ChromeThemeStorageService.THEME_KEY);
      return result[ChromeThemeStorageService.THEME_KEY] || 'dark';
    } catch (error) {
      console.error('Failed to get theme from storage:', error);
      return 'dark'; // Fallback to dark theme
    }
  }

  async setTheme(theme: Theme): Promise<void> {
    try {
      await chrome.storage.sync.set({ [ChromeThemeStorageService.THEME_KEY]: theme });

      // Notify all listeners
      this.listeners.forEach(callback => callback(theme));

      // Send message to all extension pages for synchronization
      try {
        chrome.runtime.sendMessage({ type: 'theme_changed', theme });
      } catch (error) {
        // Ignore errors if no listeners are available
        console.debug('No message listeners available for theme sync');
      }
    } catch (error) {
      console.error('Failed to set theme in storage:', error);
      throw error;
    }
  }

  onThemeChange(callback: (theme: Theme) => void): void {
    this.listeners.push(callback);

    // Listen for storage changes from other extension pages
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'sync' && changes[ChromeThemeStorageService.THEME_KEY]) {
        const newTheme = changes[ChromeThemeStorageService.THEME_KEY].newValue;
        if (newTheme) {
          callback(newTheme);
        }
      }
    });

    // Listen for runtime messages from other extension pages
    chrome.runtime.onMessage.addListener(message => {
      if (message.type === 'theme_changed' && message.theme) {
        callback(message.theme);
      }
    });
  }
}

export const themeStorageService = new ChromeThemeStorageService();
